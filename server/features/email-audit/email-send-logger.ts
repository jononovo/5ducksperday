import { db } from '../../db';
import { emailSendLogs, communicationHistory } from '@shared/schema';
import type { EmailSendLog as EmailSendLogType, InsertEmailSendLog } from '@shared/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

// Configurable duplicate detection window (in minutes)
const DUPLICATE_DETECTION_WINDOW_MINUTES = parseInt(process.env.EMAIL_DUPLICATE_WINDOW_MINUTES || '10');

export interface EmailSendLogEntry {
  service: 'gmail_oauth' | 'sendgrid_campaign' | 'sendgrid_nudge' | 'sendgrid_daily_outreach';
  campaignId?: number;
  contactId?: number;
  recipientEmail: string;
  subject: string;
  status: 'attempting' | 'sent' | 'failed' | 'blocked_duplicate';
  error?: string;
  metadata?: Record<string, any>;
  userId: number;
  messageId?: string;
  threadId?: string;
}

/**
 * Comprehensive email sending logger to track all email sends across the system
 * This helps identify duplicate sends and debug email delivery issues
 */
export class EmailSendLogger {
  private static instance: EmailSendLogger;
  
  private constructor() {}
  
  static getInstance(): EmailSendLogger {
    if (!EmailSendLogger.instance) {
      EmailSendLogger.instance = new EmailSendLogger();
    }
    return EmailSendLogger.instance;
  }

  /**
   * Log an email send attempt
   */
  async logEmailSend(log: EmailSendLogEntry): Promise<void> {
    try {
      const insertData: InsertEmailSendLog = {
        service: log.service,
        campaignId: log.campaignId || null,
        contactId: log.contactId || null,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        status: log.status,
        error: log.error || null,
        metadata: log.metadata || {},
        userId: log.userId,
        messageId: log.messageId || null,
        threadId: log.threadId || null
      };

      await db.insert(emailSendLogs).values(insertData);
      
      console.log(`[EmailSendLogger] Logged ${log.status} email send via ${log.service} to ${log.recipientEmail}`);
    } catch (error) {
      // Don't fail the email send if logging fails
      console.error('[EmailSendLogger] Failed to log email send:', error);
    }
  }

  /**
   * Log state transitions (attempt -> sent/failed)
   */
  async logEmailAttempt(log: EmailSendLogEntry): Promise<number | null> {
    try {
      log.status = 'attempting';
      const [result] = await db.insert(emailSendLogs).values({
        service: log.service,
        campaignId: log.campaignId || null,
        contactId: log.contactId || null,
        recipientEmail: log.recipientEmail,
        subject: log.subject,
        status: log.status,
        userId: log.userId,
        metadata: log.metadata || {}
      }).returning({ id: emailSendLogs.id });
      
      console.log(`[EmailSendLogger] Logged email attempt via ${log.service} to ${log.recipientEmail}, logId: ${result.id}`);
      return result.id;
    } catch (error) {
      console.error('[EmailSendLogger] Failed to log email attempt:', error);
      return null;
    }
  }

  async updateEmailStatus(
    logId: number,
    status: 'sent' | 'failed' | 'blocked_duplicate',
    messageId?: string,
    threadId?: string,
    error?: string
  ): Promise<void> {
    try {
      await db
        .update(emailSendLogs)
        .set({
          status,
          messageId: messageId || null,
          threadId: threadId || null,
          error: error || null
        })
        .where(eq(emailSendLogs.id, logId));
      
      console.log(`[EmailSendLogger] Updated log ${logId} to status: ${status}`);
    } catch (error) {
      console.error('[EmailSendLogger] Failed to update email status:', error);
    }
  }

  /**
   * Check if an email was already sent to avoid duplicates
   * Falls back to communication_history if email_send_logs is not available
   */
  async wasEmailAlreadySent(
    campaignId: number,
    contactId: number,
    recipientEmail: string,
    withinMinutes?: number
  ): Promise<boolean> {
    const detectionWindow = withinMinutes || DUPLICATE_DETECTION_WINDOW_MINUTES;
    const cutoffTime = new Date(Date.now() - detectionWindow * 60 * 1000);
    
    try {
      // First try to check email_send_logs
      const logsResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailSendLogs)
        .where(
          and(
            eq(emailSendLogs.campaignId, campaignId),
            eq(emailSendLogs.contactId, contactId),
            eq(emailSendLogs.status, 'sent'),
            gte(emailSendLogs.createdAt, cutoffTime)
          )
        );
      
      const logsCount = logsResult[0]?.count || 0;
      
      if (logsCount > 0) {
        console.log(`[EmailSendLogger] Found ${logsCount} email(s) already sent for campaign ${campaignId}, contact ${contactId} within ${detectionWindow} minutes (via logs)`);
        return true;
      }
    } catch (logError) {
      console.error('[EmailSendLogger] Error checking email_send_logs, falling back to communication_history:', logError);
    }
    
    // Fallback to communication_history table
    try {
      const historyResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(communicationHistory)
        .where(
          and(
            eq(communicationHistory.campaignId, campaignId),
            eq(communicationHistory.contactId, contactId),
            eq(communicationHistory.status, 'sent'),
            gte(communicationHistory.sentAt, cutoffTime)
          )
        );
      
      const historyCount = historyResult[0]?.count || 0;
      
      if (historyCount > 0) {
        console.log(`[EmailSendLogger] Found ${historyCount} email(s) already sent for campaign ${campaignId}, contact ${contactId} within ${detectionWindow} minutes (via communication_history)`);
        return true;
      }
      
      // Also check by recipient email as an additional safety net
      const emailHistoryResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(communicationHistory)
        .where(
          and(
            eq(communicationHistory.campaignId, campaignId),
            sql`metadata->>'recipientEmail' = ${recipientEmail}`,
            eq(communicationHistory.status, 'sent'),
            gte(communicationHistory.sentAt, cutoffTime)
          )
        );
      
      const emailHistoryCount = emailHistoryResult[0]?.count || 0;
      
      if (emailHistoryCount > 0) {
        console.log(`[EmailSendLogger] Found ${emailHistoryCount} email(s) already sent for campaign ${campaignId} to ${recipientEmail} within ${detectionWindow} minutes (via communication_history email check)`);
        return true;
      }
    } catch (historyError) {
      console.error('[EmailSendLogger] Error checking communication_history for duplicates:', historyError);
      // If we can't check, assume it wasn't sent to avoid blocking sends
      return false;
    }
    
    return false;
  }

  /**
   * Get recent email sends for debugging
   */
  async getRecentSends(limit: number = 100): Promise<EmailSendLogType[]> {
    try {
      const result = await db
        .select()
        .from(emailSendLogs)
        .orderBy(desc(emailSendLogs.createdAt))
        .limit(limit);
      
      return result;
    } catch (error) {
      console.error('[EmailSendLogger] Error fetching recent sends:', error);
      return [];
    }
  }

  /**
   * Find duplicate sends in both email_send_logs and communication_history
   */
  async findDuplicateSends(hoursBack: number = 24): Promise<any[]> {
    const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const duplicates: any[] = [];
    
    try {
      // Check email_send_logs for duplicates
      const logsResult = await db.execute(sql`
        SELECT 
          campaign_id,
          contact_id,
          recipient_email,
          COUNT(*) as send_count,
          STRING_AGG(service, ', ') as services_used,
          MIN(created_at) as first_send,
          MAX(created_at) as last_send
        FROM email_send_logs
        WHERE status = 'sent'
        AND created_at >= ${cutoffTime}
        AND campaign_id IS NOT NULL
        GROUP BY campaign_id, contact_id, recipient_email
        HAVING COUNT(*) > 1
        ORDER BY send_count DESC, last_send DESC
      `);
      
      duplicates.push(...(logsResult.rows || []));
    } catch (error) {
      console.error('[EmailSendLogger] Error finding duplicates in email_send_logs:', error);
    }
    
    // Also check communication_history for duplicates
    try {
      const historyResult = await db.execute(sql`
        SELECT 
          campaign_id,
          contact_id,
          COUNT(*) as send_count,
          MIN(sent_at) as first_send,
          MAX(sent_at) as last_send
        FROM communication_history
        WHERE status = 'sent'
        AND sent_at >= ${cutoffTime}
        AND campaign_id IS NOT NULL
        GROUP BY campaign_id, contact_id
        HAVING COUNT(*) > 1
        ORDER BY send_count DESC, last_send DESC
      `);
      
      // Mark these as from communication_history for clarity
      const historyDuplicates = (historyResult.rows || []).map((row: any) => ({
        ...row,
        source: 'communication_history'
      }));
      
      duplicates.push(...historyDuplicates);
    } catch (error) {
      console.error('[EmailSendLogger] Error finding duplicates in communication_history:', error);
    }
    
    return duplicates;
  }
}

export const emailSendLogger = EmailSendLogger.getInstance();