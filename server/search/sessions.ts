/**
 * Search Session Management Module
 * Handles search session tracking and status updates
 */

import { Express, Request, Response } from "express";
import type { SearchSessionResult } from "./types";

declare global {
  var searchSessions: Map<string, SearchSessionResult>;
}

// Constants for session management
const MAX_SESSIONS = 500; // Limit to prevent memory issues
const MAX_SESSION_AGE = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 minutes

// Initialize global search sessions storage
global.searchSessions = global.searchSessions || new Map();

/**
 * Check if a session should be cleaned up
 * Single source of truth for cleanup logic
 */
function shouldCleanupSession(session: SearchSessionResult): boolean {
  const now = Date.now();
  const age = now - session.timestamp;
  
  // Remove if older than max age
  if (age > MAX_SESSION_AGE) return true;
  
  // Remove if email search completed and 5+ minutes old
  if (session.emailSearchStatus === 'completed' && 
      session.emailSearchCompleted && 
      (now - session.emailSearchCompleted) > 5 * 60 * 1000) {
    return true;
  }
  
  // Remove if exceeded TTL
  if (age > session.ttl) return true;
  
  return false;
}

/**
 * Clean up old or completed sessions
 * Consolidated cleanup function used everywhere
 */
function cleanupSessions(): number {
  let cleanedCount = 0;
  const sessions = Array.from(global.searchSessions.entries());
  
  for (const [sessionId, session] of sessions) {
    if (shouldCleanupSession(session)) {
      global.searchSessions.delete(sessionId);
      cleanedCount++;
      console.log(`[Session Cleanup] Removed expired session: ${sessionId}`);
    }
  }
  
  return cleanedCount;
}

/**
 * Enforce maximum session limit
 * Removes oldest sessions when limit exceeded
 */
function enforceSessionLimit(): void {
  if (global.searchSessions.size >= MAX_SESSIONS) {
    const sortedSessions = Array.from(global.searchSessions.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove oldest 20% to make room
    const toRemove = Math.ceil(MAX_SESSIONS * 0.2);
    sortedSessions.slice(0, toRemove).forEach(([id]) => {
      global.searchSessions.delete(id);
      console.log(`[Session Limit] Removed old session to enforce limit: ${id}`);
    });
  }
}

// Run cleanup every 10 minutes
const cleanupInterval = setInterval(cleanupSessions, CLEANUP_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(cleanupInterval);
  console.log('[Sessions] Cleanup interval cleared on shutdown');
});

/**
 * Register session management routes
 */
export function registerSessionRoutes(app: Express) {
  // Session status update endpoint
  app.post("/api/sessions/:sessionId/status", (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const { status } = req.body;
      
      // Get or create session
      let session = global.searchSessions.get(sessionId);
      if (!session) {
        // Enforce size limit before creating new session
        enforceSessionLimit();
        
        session = {
          sessionId,
          query: '',
          status: status || 'testing',
          timestamp: Date.now(),
          ttl: 30 * 60 * 1000
        };
        global.searchSessions.set(sessionId, session);
      } else {
        session.status = status;
        session.timestamp = Date.now();
      }
      
      res.json({
        success: true,
        sessionId,
        status: session.status,
        message: `Session ${sessionId} status updated`
      });
      
    } catch (error) {
      console.error('Session status update error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to update session status"
      });
    }
  });

  // Session status endpoint for polling
  app.get("/api/search-sessions/:sessionId/status", (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const session = global.searchSessions.get(sessionId);
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: "Session not found"
        });
        return;
      }
      
      // Check if session should be cleaned up
      if (shouldCleanupSession(session)) {
        global.searchSessions.delete(sessionId);
        res.status(404).json({
          success: false,
          error: "Session expired"
        });
        return;
      }
      
      res.json({
        success: true,
        session: {
          id: session.sessionId,
          query: session.query,
          status: session.status,
          quickResults: session.quickResults,
          fullResults: session.fullResults,
          error: session.error,
          timestamp: session.timestamp,
          emailSearchStatus: session.emailSearchStatus || 'none',
          emailSearchCompleted: session.emailSearchCompleted
        }
      });
      
    } catch (error) {
      console.error('Session status error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to get session status"
      });
    }
  });

  // Session termination endpoint
  app.delete("/api/search-sessions/:sessionId", (req: Request, res: Response) => {
    try {
      const sessionId = req.params.sessionId;
      const session = global.searchSessions.get(sessionId);
      
      if (session) {
        // Clean up the session
        global.searchSessions.delete(sessionId);
        console.log(`[Session Cleanup] Terminated session: ${sessionId}`);
        
        // If this session had background processes, they should naturally stop
        // when they check for session existence
        
        res.json({
          success: true,
          message: `Session ${sessionId} terminated successfully`
        });
      } else {
        res.status(404).json({
          success: false,
          error: "Session not found"
        });
      }
      
    } catch (error) {
      console.error('Session termination error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to terminate session"
      });
    }
  });

  // Session cleanup endpoint
  app.post("/api/sessions/cleanup", (req: Request, res: Response) => {
    try {
      const cleanedCount = cleanupSessions();
      
      res.json({
        success: true,
        cleanedCount,
        message: `Cleaned up ${cleanedCount} expired sessions`
      });
      
    } catch (error) {
      console.error('Session cleanup error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to cleanup sessions"
      });
    }
  });

  // Bulk session cleanup endpoint (reuses same cleanup logic)
  app.delete("/api/search-sessions", (req: Request, res: Response) => {
    try {
      const cleanedCount = cleanupSessions();
      
      res.json({
        success: true,
        message: `Cleaned up ${cleanedCount} sessions`,
        cleanedCount
      });
      
    } catch (error) {
      console.error('Bulk cleanup error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to clean up sessions"
      });
    }
  });

  // Session monitoring endpoint
  app.get("/api/sessions/stats", (req: Request, res: Response) => {
    try {
      const sessions = Array.from(global.searchSessions.values());
      const now = Date.now();
      
      res.json({
        success: true,
        total: sessions.length,
        maxAllowed: MAX_SESSIONS,
        byStatus: {
          pending: sessions.filter(s => s.status === 'pending').length,
          companies_found: sessions.filter(s => s.status === 'companies_found').length,
          contacts_complete: sessions.filter(s => s.status === 'contacts_complete').length,
          failed: sessions.filter(s => s.status === 'failed').length,
          email_running: sessions.filter(s => s.emailSearchStatus === 'running').length,
          email_completed: sessions.filter(s => s.emailSearchStatus === 'completed').length
        },
        oldestAge: sessions.length ? Math.max(...sessions.map(s => now - s.timestamp)) : 0,
        newestAge: sessions.length ? Math.min(...sessions.map(s => now - s.timestamp)) : 0,
        averageAge: sessions.length ? sessions.reduce((sum, s) => sum + (now - s.timestamp), 0) / sessions.length : 0,
        memoryEstimate: JSON.stringify(sessions).length // Rough estimate in bytes
      });
      
    } catch (error) {
      console.error('Session stats error:', error);
      res.status(500).json({
        success: false,
        error: "Failed to get session statistics"
      });
    }
  });
}

/**
 * Session management utilities
 */
export const SessionManager = {
  /**
   * Create or update a session
   */
  createOrUpdateSession(sessionId: string, data: Partial<SearchSessionResult>): void {
    const existing = global.searchSessions.get(sessionId);
    if (existing) {
      Object.assign(existing, data);
      global.searchSessions.set(sessionId, existing);
    } else {
      // Enforce size limit before adding new session
      enforceSessionLimit();
      
      global.searchSessions.set(sessionId, {
        sessionId,
        query: '',
        status: 'pending',
        timestamp: Date.now(),
        ttl: 30 * 60 * 1000, // 30 minutes default
        ...data
      } as SearchSessionResult);
    }
  },

  /**
   * Get a session
   */
  getSession(sessionId: string): SearchSessionResult | undefined {
    return global.searchSessions.get(sessionId);
  },

  /**
   * Mark session as companies found
   */
  markCompaniesFound(sessionId: string, companies: any[]): void {
    const session = global.searchSessions.get(sessionId);
    if (session) {
      session.status = 'companies_found';
      session.quickResults = companies;
      session.timestamp = Date.now();
      global.searchSessions.set(sessionId, session);
      console.log(`[Session Update] Session ${sessionId} marked as companies_found with ${companies.length} companies`);
    }
  },

  /**
   * Mark session as contacts complete
   */
  markContactsComplete(sessionId: string, companies: any[]): void {
    const session = global.searchSessions.get(sessionId);
    if (session) {
      session.status = 'contacts_complete';
      session.fullResults = companies;
      session.timestamp = Date.now();
      global.searchSessions.set(sessionId, session);
      console.log(`[Session Update] Session ${sessionId} marked as contacts_complete`);
    }
  },

  /**
   * Mark email search as started
   */
  markEmailSearchStarted(sessionId: string): void {
    const session = global.searchSessions.get(sessionId);
    if (session) {
      session.emailSearchStatus = 'running';
      global.searchSessions.set(sessionId, session);
      console.log(`[Session Update] Session ${sessionId} marked as email search running`);
    }
  },

  /**
   * Mark email search as completed
   */
  markEmailSearchCompleted(sessionId: string): void {
    const session = global.searchSessions.get(sessionId);
    if (session) {
      session.emailSearchStatus = 'completed';
      session.emailSearchCompleted = Date.now();
      global.searchSessions.set(sessionId, session);
      console.log(`[Session Update] Session ${sessionId} marked as email search completed`);
    }
  }
};