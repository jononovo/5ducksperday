import { gmail_v1 } from 'googleapis';
import { storage } from '../../storage';

export class ThreadOperations {
  private gmail: gmail_v1.Gmail;
  private userId: number;
  private parseGmailMessage: (message: gmail_v1.Schema$Message, threadId: number) => Promise<any>;

  constructor(
    gmail: gmail_v1.Gmail, 
    userId: number,
    parseGmailMessage: (message: gmail_v1.Schema$Message, threadId: number) => Promise<any>
  ) {
    this.gmail = gmail;
    this.userId = userId;
    this.parseGmailMessage = parseGmailMessage;
  }

  // Get email threads for a specific contact
  async getThreadsByContact(contactId: number, userId: number) {
    try {
      // 1. Get the contact details
      const contact = await storage.getContact(contactId, userId);
      
      if (!contact || !contact.email) {
        throw new Error('Contact not found or has no email');
      }
      
      // 2. Search Gmail for threads with this contact
      const response = await this.gmail.users.threads.list({
        userId: 'me',
        q: `from:${contact.email} OR to:${contact.email}`,
        maxResults: 20
      });
      
      const threads = response.data.threads || [];
      const threadResults = [];
      
      // 3. Process each thread
      for (const thread of threads) {
        // Get full thread data
        const threadData = await this.gmail.users.threads.get({
          userId: 'me',
          id: thread.id || ''
        });
        
        // Skip threads without messages
        if (!threadData.data.messages || threadData.data.messages.length === 0) {
          continue;
        }
        
        // Get the first message for subject
        const firstMessage = threadData.data.messages[0];
        const headers = firstMessage.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
        
        // Get the latest message for timestamp
        const latestMessage = threadData.data.messages[threadData.data.messages.length - 1];
        const timestamp = new Date(parseInt(latestMessage.internalDate || '0'));
        
        // Check if any message is unread
        const hasUnread = threadData.data.messages.some(
          msg => msg.labelIds?.includes('UNREAD')
        );
        
        threadResults.push({
          id: parseInt(thread.id || '0'),
          contactId,
          userId,
          subject,
          lastUpdated: timestamp,
          createdAt: new Date(parseInt(firstMessage.internalDate || '0')),
          isArchived: false,
          hasUnread
        });
      }
      
      // Sort by last updated (newest first)
      return threadResults.sort((a, b) => 
        b.lastUpdated.getTime() - a.lastUpdated.getTime()
      );
    } catch (error) {
      console.error('Error getting threads from Gmail:', error);
      return [];
    }
  }
  
  // Get a specific thread with all its messages
  async getThreadWithMessages(threadId: number, userId: number) {
    try {
      // 1. Get thread data from Gmail
      const response = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId.toString()
      });
      
      if (!response.data.messages || response.data.messages.length === 0) {
        return null;
      }
      
      // 2. Parse the first message for thread details
      const firstMessage = response.data.messages[0];
      const headers = firstMessage.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
      
      // 3. Parse all messages
      const messages = [];
      
      for (const message of response.data.messages) {
        messages.push(await this.parseGmailMessage(message, threadId));
      }
      
      // 4. Find the contact
      const firstMessageHeaders = firstMessage.payload?.headers || [];
      const from = firstMessageHeaders.find(h => h.name === 'From')?.value || '';
      const to = firstMessageHeaders.find(h => h.name === 'To')?.value || '';
      
      // Extract email addresses
      const fromEmail = from.match(/<(.+)>/)?.[1] || from;
      const toEmail = to.match(/<(.+)>/)?.[1] || to;
      
      // Find the contact (assuming one of them is in our database)
      const contacts = await storage.listContacts(userId);
      const contact = contacts.find(c => 
        c.email === fromEmail || c.email === toEmail
      );
      
      return {
        thread: {
          id: threadId,
          contactId: contact?.id || 0,
          userId,
          subject,
          lastUpdated: new Date(parseInt(messages[messages.length - 1].timestamp)),
          createdAt: new Date(parseInt(firstMessage.internalDate || '0')),
          isArchived: false
        },
        messages
      };
    } catch (error) {
      console.error('Error getting thread with messages from Gmail:', error);
      return null;
    }
  }
  
  // Create a new thread by sending an email
  async createThread(data: any) {
    try {
      const message = [
        `To: ${data.to}`,
        `Subject: ${data.subject}`,
        '',
        data.content
      ].join('\n');
      
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage
        }
      });
      
      // Get the sent message to extract thread ID
      const sentMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: response.data.id || ''
      });
      
      return {
        id: parseInt(sentMessage.data.threadId || '0'),
        ...data,
        createdAt: new Date(),
        lastUpdated: new Date(),
        isArchived: false
      };
    } catch (error) {
      console.error('Error creating thread in Gmail:', error);
      throw error;
    }
  }
  
  // Mark thread as read
  async markThreadAsRead(threadId: number) {
    try {
      // Get all messages in the thread
      const thread = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadId.toString()
      });
      
      if (!thread.data.messages) {
        return;
      }
      
      // Mark each unread message as read
      for (const message of thread.data.messages) {
        if (message.labelIds?.includes('UNREAD')) {
          await this.gmail.users.messages.modify({
            userId: 'me',
            id: message.id || '',
            requestBody: {
              removeLabelIds: ['UNREAD']
            }
          });
        }
      }
    } catch (error) {
      console.error('Error marking thread as read in Gmail:', error);
      throw error;
    }
  }
}