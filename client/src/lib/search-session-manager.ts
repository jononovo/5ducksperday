import type { Company, Contact } from "@shared/schema";

export interface SearchSession {
  id: string;
  query: string;
  status: 'pending' | 'companies_found' | 'contacts_complete' | 'failed';
  startTime: number;
  quickResults?: Company[];
  fullResults?: Array<Company & { contacts?: Contact[] }>;
  lastChecked: number;
  strategyId?: number;
  contactSearchConfig?: any;
}

export class SearchSessionManager {
  private static readonly SESSION_PREFIX = 'searchSession_';
  private static readonly MAX_SESSION_AGE = 30 * 60 * 1000; // 30 minutes
  
  /**
   * Create a new search session
   */
  static createSession(query: string, strategyId?: number, contactSearchConfig?: any): SearchSession {
    const sessionId = `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: SearchSession = {
      id: sessionId,
      query,
      status: 'pending',
      startTime: Date.now(),
      lastChecked: Date.now(),
      strategyId,
      contactSearchConfig
    };
    
    this.saveSession(session);
    console.log('Created search session:', sessionId, 'for query:', query);
    return session;
  }
  
  /**
   * Update session with quick results (companies only)
   */
  static updateWithQuickResults(sessionId: string, companies: Company[]): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = 'companies_found';
      session.quickResults = companies;
      session.lastChecked = Date.now();
      this.saveSession(session);
      console.log('Updated session with quick results:', sessionId, companies.length, 'companies');
    }
  }
  
  /**
   * Update session with full results (companies + contacts)
   */
  static updateWithFullResults(sessionId: string, companies: Array<Company & { contacts?: Contact[] }>): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = 'contacts_complete';
      session.fullResults = companies;
      session.lastChecked = Date.now();
      this.saveSession(session);
      console.log('Updated session with full results:', sessionId, companies.length, 'companies with contacts');
    }
  }
  
  /**
   * Mark session as failed
   */
  static markSessionFailed(sessionId: string): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.status = 'failed';
      session.lastChecked = Date.now();
      this.saveSession(session);
      console.log('Marked session as failed:', sessionId);
    }
  }
  
  /**
   * Get active search sessions (not complete or failed)
   */
  static getActiveSessions(): SearchSession[] {
    const sessions = this.getAllSessions();
    return sessions.filter(session => 
      session.status === 'pending' || session.status === 'companies_found'
    );
  }
  
  /**
   * Get the most recent complete session
   */
  static getMostRecentCompleteSession(): SearchSession | null {
    const sessions = this.getAllSessions();
    const completeSessions = sessions
      .filter(session => session.status === 'contacts_complete')
      .sort((a, b) => b.startTime - a.startTime);
    
    return completeSessions[0] || null;
  }
  
  /**
   * Get session by ID
   */
  static getSession(sessionId: string): SearchSession | null {
    try {
      const sessionData = localStorage.getItem(`${this.SESSION_PREFIX}${sessionId}`);
      if (sessionData) {
        return JSON.parse(sessionData);
      }
    } catch (error) {
      console.error('Error loading search session:', error);
    }
    return null;
  }
  
  /**
   * Save session to localStorage
   */
  private static saveSession(session: SearchSession): void {
    try {
      localStorage.setItem(`${this.SESSION_PREFIX}${session.id}`, JSON.stringify(session));
    } catch (error) {
      console.error('Error saving search session:', error);
    }
  }
  
  /**
   * Get all sessions
   */
  private static getAllSessions(): SearchSession[] {
    const sessions: SearchSession[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SESSION_PREFIX)) {
        try {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            // Filter out old sessions
            if (Date.now() - session.startTime < this.MAX_SESSION_AGE) {
              sessions.push(session);
            } else {
              // Clean up old session
              localStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.error('Error parsing session:', error);
          // Remove corrupted session
          localStorage.removeItem(key);
        }
      }
    }
    
    return sessions.sort((a, b) => b.startTime - a.startTime);
  }
  
  /**
   * Clean up completed or failed sessions older than 24 hours
   */
  static cleanupOldSessions(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SESSION_PREFIX)) {
        try {
          const sessionData = localStorage.getItem(key);
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.startTime < cutoffTime && 
                (session.status === 'contacts_complete' || session.status === 'failed')) {
              localStorage.removeItem(key);
              console.log('Cleaned up old session:', session.id);
            }
          }
        } catch (error) {
          // Remove corrupted sessions
          localStorage.removeItem(key);
        }
      }
    }
  }
  
  /**
   * Clear all search sessions (for testing/debugging)
   */
  static clearAllSessions(): void {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.SESSION_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach(key => localStorage.removeItem(key));
    console.log('Cleared all search sessions');
  }
}