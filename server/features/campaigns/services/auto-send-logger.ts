import { db } from '../../../db';
import { sql } from 'drizzle-orm';

export class AutoSendLogger {
  private static logs: Array<{
    timestamp: Date;
    method: string;
    details: any;
  }> = [];

  static log(method: string, details: any) {
    const logEntry = {
      timestamp: new Date(),
      method,
      details
    };
    
    this.logs.push(logEntry);
    
    // Log to console with prominent prefix
    console.log(`[AUTO-SEND-TRACKER] ${method}:`, {
      timestamp: logEntry.timestamp.toISOString(),
      ...details
    });
    
    // Also write to database for persistent tracking
    this.persistLog(method, details).catch(error => {
      console.error('[AUTO-SEND-TRACKER] Failed to persist log:', error);
    });
  }
  
  private static async persistLog(method: string, details: any) {
    try {
      // Create a simple logging table if it doesn't exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS auto_send_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
          method VARCHAR(255) NOT NULL,
          details JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
      
      // Insert log entry
      await db.execute(sql`
        INSERT INTO auto_send_logs (method, details)
        VALUES (${method}, ${JSON.stringify(details)}::jsonb)
      `);
    } catch (error) {
      // Silently fail if table creation or insert fails
      // This is just for debugging, shouldn't break the app
    }
  }
  
  static getRecentLogs(minutes: number = 60) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.logs.filter(log => log.timestamp >= cutoff);
  }
  
  static async getDatabaseLogs(hours: number = 24) {
    try {
      const result = await db.execute(sql`
        SELECT * FROM auto_send_logs
        WHERE timestamp >= NOW() - INTERVAL '${hours} hours'
        ORDER BY timestamp DESC
        LIMIT 100
      `);
      return result.rows;
    } catch (error) {
      console.error('[AUTO-SEND-TRACKER] Failed to retrieve logs:', error);
      return [];
    }
  }
}