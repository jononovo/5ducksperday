import { MOCK_ACTIVE_CONTACTS, MOCK_EMAIL_THREADS } from "../../email-replies/example_email_threads/emailData";
import type { EmailProvider } from "../types";

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