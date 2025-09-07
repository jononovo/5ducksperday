import { google, gmail_v1 } from 'googleapis';
import type { EmailProvider } from '../types';
import { ContactOperations } from '../operations/contacts';
import { ThreadOperations } from '../operations/threads';
import { MessageOperations } from '../operations/messages';

export class GmailProvider implements EmailProvider {
  private accessToken: string;
  private userId: number;
  private gmail: gmail_v1.Gmail;
  private contactOps: ContactOperations;
  private threadOps: ThreadOperations;
  private messageOps: MessageOperations;
  
  constructor(accessToken: string, userId: number) {
    this.accessToken = accessToken;
    this.userId = userId;
    
    // Create an OAuth2 client with the access token
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: accessToken
    });
    
    // Create the Gmail client
    this.gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client
    });

    // Initialize operations
    this.contactOps = new ContactOperations(this.gmail, userId);
    this.messageOps = new MessageOperations(this.gmail, userId, this.contactOps);
    
    // Create thread operations with message parser
    this.threadOps = new ThreadOperations(
      this.gmail, 
      userId,
      this.messageOps.parseGmailMessage.bind(this.messageOps)
    );
  }
  
  async getActiveContacts(userId: number) {
    return this.contactOps.getActiveContacts(userId);
  }
  
  async getThreadsByContact(contactId: number, userId: number) {
    return this.threadOps.getThreadsByContact(contactId, userId);
  }
  
  async getThreadWithMessages(threadId: number, userId: number) {
    return this.threadOps.getThreadWithMessages(threadId, userId);
  }
  
  async createThread(data: any) {
    return this.threadOps.createThread(data);
  }
  
  async createMessage(data: any) {
    return this.messageOps.createMessage(data);
  }
  
  async markThreadAsRead(threadId: number) {
    return this.threadOps.markThreadAsRead(threadId);
  }
}