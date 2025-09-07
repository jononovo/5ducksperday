/**
 * Service layer for Email Replies functionality
 * Note: This feature is currently inactive and uses placeholder implementations
 */

import { getEmailProvider } from '../services/emailService';
import type { 
  ActiveContact,
  EmailThread,
  ThreadWithMessages,
  CreateThreadRequest,
  CreateMessageRequest,
  EmailMessage
} from './types';

export class EmailRepliesService {
  /**
   * Get active contacts with thread information
   */
  static async getActiveContacts(userId: number, gmailToken: string | null): Promise<ActiveContact[]> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    return await emailProvider.getActiveContacts(userId);
  }

  /**
   * Get threads for a specific contact
   */
  static async getThreadsByContact(contactId: number, userId: number, gmailToken: string | null): Promise<EmailThread[]> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    return await emailProvider.getThreadsByContact(contactId, userId);
  }

  /**
   * Get a specific thread with all its messages
   */
  static async getThreadWithMessages(threadId: number, userId: number, gmailToken: string | null): Promise<ThreadWithMessages | null> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    const threadData = await emailProvider.getThreadWithMessages(threadId, userId);
    
    if (threadData) {
      // Mark thread as read
      await emailProvider.markThreadAsRead(threadId);
    }
    
    return threadData;
  }

  /**
   * Create a new email thread
   */
  static async createThread(data: CreateThreadRequest, userId: number, gmailToken: string | null): Promise<EmailThread> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    return await emailProvider.createThread({
      ...data,
      userId
    });
  }

  /**
   * Create a new message in a thread
   */
  static async createMessage(data: CreateMessageRequest, userId: number, gmailToken: string | null): Promise<EmailMessage> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    return await emailProvider.createMessage(data);
  }

  /**
   * Mark a thread as read
   */
  static async markThreadAsRead(threadId: number, userId: number, gmailToken: string | null): Promise<void> {
    const emailProvider = getEmailProvider(userId, gmailToken);
    await emailProvider.markThreadAsRead(threadId);
  }
}