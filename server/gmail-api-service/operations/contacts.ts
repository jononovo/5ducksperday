import { gmail_v1 } from 'googleapis';
import { storage } from '../../storage';
import { TokenService } from '../../features/billing/tokens/service';
import type { Contact } from "@shared/schema";

export class ContactOperations {
  private gmail: gmail_v1.Gmail;
  private userId: number;

  constructor(gmail: gmail_v1.Gmail, userId: number) {
    this.gmail = gmail;
    this.userId = userId;
  }

  // Helper to get the user's email address
  async getUserEmail() {
    try {
      const gmailUserInfo = await TokenService.getGmailUserInfo(this.userId);
      return gmailUserInfo?.email || '';
    } catch (error) {
      console.error('Error getting user email:', error);
      return '';
    }
  }
  
  // Helper to find contact by email
  async findContactByEmail(email: string) {
    try {
      // Get all contacts for the user
      const contacts = await storage.listContacts(this.userId);
      
      // Find contact with matching email
      return contacts.find((contact: Contact) => contact.email === email);
    } catch (error) {
      console.error('Error finding contact by email:', error);
      return undefined;
    }
  }
  
  // Get contacts with recent email threads
  async getActiveContacts(userId: number) {
    try {
      // 1. Get all contacts for the user
      const contacts = await storage.listContacts(userId);
      
      // 2. Get recent threads from Gmail
      const response = await this.gmail.users.threads.list({
        userId: 'me',
        maxResults: 50, // Get recent threads
        q: 'is:sent OR is:inbox' // Get both sent and received emails
      });
      
      const threads = response.data.threads || [];
      const activeContacts: any[] = [];
      
      // Create a mapping of email to contact
      const emailContactMap = new Map();
      contacts.forEach((contact: Contact) => {
        if (contact.email) {
          emailContactMap.set(contact.email.toLowerCase(), contact);
        }
      });
      
      // Process each thread to find contacts
      for (const thread of threads) {
        // Get full thread data
        const threadData = await this.gmail.users.threads.get({
          userId: 'me',
          id: thread.id!
        });
        
        // Get the first message to extract contact info
        const messages = threadData.data.messages || [];
        if (messages.length === 0) continue;
        
        const lastMessage = messages[messages.length - 1];
        const headers = lastMessage.payload?.headers || [];
        
        // Get sender and recipient info
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        
        // Extract email addresses
        const fromEmail = from.match(/<(.+)>/)?.[1] || from;
        const toEmail = to.match(/<(.+)>/)?.[1] || to;
        
        // Determine which email is the contact (not the user)
        const userEmail = await this.getUserEmail();
        const contactEmail = fromEmail === userEmail ? toEmail : fromEmail;
        
        // Look up contact in our database
        const contact = emailContactMap.get(contactEmail.toLowerCase());
        
        if (contact) {
          // Extract latest message content snippet
          let snippet = lastMessage.snippet || '';
          
          // Get the timestamp of the last message
          const lastMessageDate = new Date(parseInt(lastMessage.internalDate || '0'));
          
          // Check if thread has unread messages
          const isUnread = threadData.data.messages?.some(msg => 
            msg.labelIds?.includes('UNREAD')
          ) || false;
          
          activeContacts.push({
            ...contact,
            threadId: thread.id,
            lastMessage: snippet,
            lastMessageDate,
            unread: isUnread
          });
        }
      }
      
      // Sort by most recent interaction
      activeContacts.sort((a, b) => 
        b.lastMessageDate.getTime() - a.lastMessageDate.getTime()
      );
      
      return activeContacts;
      
    } catch (error) {
      console.error('Error getting active contacts:', error);
      return [];
    }
  }
}