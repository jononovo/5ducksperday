import { MOCK_ACTIVE_CONTACTS, MOCK_EMAIL_THREADS } from "../mock/emailData";
import type { Contact } from "@shared/schema";

// Email provider interface - will be implemented by different email services
export interface EmailProvider {
  getActiveContacts(userId: number): Promise<any[]>;
  getThreadsByContact(contactId: number, userId: number): Promise<any[]>;
  getThreadWithMessages(threadId: number, userId: number): Promise<any>;
  createThread(data: any): Promise<any>;
  createMessage(data: any): Promise<any>;
  markThreadAsRead(threadId: number): Promise<void>;
}

// Mock email provider for development/testing
export class MockEmailProvider implements EmailProvider {
  async getActiveContacts(userId: number) {
    return MOCK_ACTIVE_CONTACTS.filter(contact => contact.userId === userId);
  }

  async getThreadsByContact(contactId: number, userId: number) {
    return MOCK_EMAIL_THREADS
      .filter(thread => thread.contactId === contactId && thread.userId === userId)
      .map(thread => ({
        id: thread.id,
        contactId: thread.contactId,
        userId: thread.userId,
        subject: thread.subject,
        lastUpdated: thread.lastUpdated,
        createdAt: thread.createdAt,
        isArchived: thread.isArchived
      }));
  }

  async getThreadWithMessages(threadId: number, userId: number) {
    const thread = MOCK_EMAIL_THREADS.find(t => t.id === threadId && t.userId === userId);
    
    if (!thread) {
      return null;
    }
    
    return {
      thread: {
        id: thread.id,
        contactId: thread.contactId,
        userId: thread.userId,
        subject: thread.subject,
        lastUpdated: thread.lastUpdated,
        createdAt: thread.createdAt,
        isArchived: thread.isArchived
      },
      messages: thread.messages
    };
  }

  async createThread(data: any) {
    // In a real implementation, this would add to the database
    // For mock, we'll just return a new thread with the data
    return {
      id: Date.now(),
      ...data,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isArchived: false
    };
  }

  async createMessage(data: any) {
    // In a real implementation, this would add to the database
    // For mock, we'll just return a new message with the data
    return {
      id: Date.now(),
      ...data,
      timestamp: new Date(),
      isRead: data.direction === "outbound" // Outbound messages are read by default
    };
  }

  async markThreadAsRead(threadId: number) {
    // In a real implementation, this would update messages in the database
    // For mock, we'll just log that the action was performed
    console.log(`Marked thread ${threadId} as read (mock)`);
  }
}

// Gmail provider - future implementation
export class GmailProvider implements EmailProvider {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  // These methods will be implemented later when Gmail API integration is ready
  async getActiveContacts(userId: number) {
    // Will use Gmail API to get actual emails
    // For now, return mock data to avoid implementation errors
    return MOCK_ACTIVE_CONTACTS.filter(contact => contact.userId === userId);
  }
  
  async getThreadsByContact(contactId: number, userId: number) {
    // Will use Gmail API to get actual threads
    return MOCK_EMAIL_THREADS
      .filter(thread => thread.contactId === contactId && thread.userId === userId)
      .map(thread => ({
        id: thread.id,
        contactId: thread.contactId,
        userId: thread.userId,
        subject: thread.subject,
        lastUpdated: thread.lastUpdated,
        createdAt: thread.createdAt,
        isArchived: thread.isArchived
      }));
  }
  
  async getThreadWithMessages(threadId: number, userId: number) {
    // Will use Gmail API to get actual thread and messages
    const thread = MOCK_EMAIL_THREADS.find(t => t.id === threadId && t.userId === userId);
    
    if (!thread) {
      return null;
    }
    
    return {
      thread: {
        id: thread.id,
        contactId: thread.contactId,
        userId: thread.userId,
        subject: thread.subject,
        lastUpdated: thread.lastUpdated,
        createdAt: thread.createdAt,
        isArchived: thread.isArchived
      },
      messages: thread.messages
    };
  }
  
  async createThread(data: any) {
    // Will use Gmail API to create a new thread
    return {
      id: Date.now(),
      ...data,
      createdAt: new Date(),
      lastUpdated: new Date(),
      isArchived: false
    };
  }
  
  async createMessage(data: any) {
    // Will use Gmail API to send a message
    return {
      id: Date.now(),
      ...data,
      timestamp: new Date(),
      isRead: data.direction === "outbound"
    };
  }
  
  async markThreadAsRead(threadId: number) {
    // Will use Gmail API to mark messages as read
    console.log(`Would mark thread ${threadId} as read in Gmail`);
  }
}

// Factory to get appropriate email provider based on environment and user settings
export function getEmailProvider(userId: number, accessToken?: string): EmailProvider {
  // Check if we're in development mode or don't have Gmail token
  const isDevMode = process.env.NODE_ENV !== 'production';
  const useGmail = accessToken && !isDevMode;
  
  if (useGmail) {
    return new GmailProvider(accessToken);
  } else {
    return new MockEmailProvider();
  }
}