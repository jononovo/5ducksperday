// Email provider interface - will be implemented by different email services
export interface EmailProvider {
  getActiveContacts(userId: number): Promise<any[]>;
  getThreadsByContact(contactId: number, userId: number): Promise<any[]>;
  getThreadWithMessages(threadId: number, userId: number): Promise<any>;
  createThread(data: any): Promise<any>;
  createMessage(data: any): Promise<any>;
  markThreadAsRead(threadId: number): Promise<void>;
}