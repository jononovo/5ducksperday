/**
 * Search Session Management Module
 * Handles search session tracking and status updates
 */

import { Express, Request, Response } from "express";
import type { SearchSessionResult } from "./types";

declare global {
  var searchSessions: Map<string, SearchSessionResult>;
}

// Initialize global search sessions storage
global.searchSessions = global.searchSessions || new Map();

/**
 * Clean up old or completed sessions periodically
 */
function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of global.searchSessions.entries()) {
    // Clean up sessions older than 1 hour or completed email searches
    const isOld = now - session.timestamp > (60 * 60 * 1000); // 1 hour
    const isEmailComplete = session.emailSearchStatus === 'completed';
    
    if (isOld || (isEmailComplete && now - (session.emailSearchCompleted || 0) > 5 * 60 * 1000)) {
      global.searchSessions.delete(sessionId);
      console.log(`[Session Cleanup] Removed expired session: ${sessionId}`);
    }
  }
}

// Run cleanup every 10 minutes
setInterval(cleanupSessions, 10 * 60 * 1000);

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
      
      // Check if session has expired
      if (Date.now() - session.timestamp > session.ttl) {
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
      const before = global.searchSessions.size;
      cleanupSessions();
      const after = global.searchSessions.size;
      const cleanedCount = before - after;
      
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

  // Bulk session cleanup endpoint
  app.delete("/api/search-sessions", (req: Request, res: Response) => {
    try {
      const userSessions = Array.from(global.searchSessions.values());
      let cleanedCount = 0;
      
      for (const [sessionId, session] of global.searchSessions.entries()) {
        // Clean up sessions older than 1 hour or completed email searches
        const isOld = Date.now() - session.timestamp > (60 * 60 * 1000); // 1 hour
        const isEmailComplete = session.emailSearchStatus === 'completed';
        
        if (isOld || isEmailComplete) {
          global.searchSessions.delete(sessionId);
          cleanedCount++;
          console.log(`[Bulk Cleanup] Removed session: ${sessionId}`);
        }
      }
      
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