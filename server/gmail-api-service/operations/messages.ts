import { gmail_v1 } from 'googleapis';
import { ContactOperations } from './contacts';

export class MessageOperations {
  private gmail: gmail_v1.Gmail;
  private userId: number;
  private contactOps: ContactOperations;

  constructor(gmail: gmail_v1.Gmail, userId: number, contactOps: ContactOperations) {
    this.gmail = gmail;
    this.userId = userId;
    this.contactOps = contactOps;
  }

  // Helper to convert Gmail message format to our internal format
  async parseGmailMessage(message: gmail_v1.Schema$Message, threadId: number) {
    // Parse the Gmail message payload
    const headers = message.payload?.headers || [];
    const from = headers.find(h => h.name === 'From')?.value || '';
    const to = headers.find(h => h.name === 'To')?.value || '';
    const subject = headers.find(h => h.name === 'Subject')?.value || '';
    
    // Parse email addresses and names
    const fromMatch = from.match(/(.+) <(.+)>/) || [null, from, from];
    const toMatch = to.match(/(.+) <(.+)>/) || [null, to, to];
    
    const fromName = fromMatch[1] || '';
    const fromEmail = fromMatch[2] || '';
    const toName = toMatch[1] || '';
    const toEmail = toMatch[2] || '';
    
    // Get message body
    let content = '';
    if (message.payload?.body?.data) {
      // Decode base64 content
      content = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
    } else if (message.payload?.parts) {
      // Check for multipart content
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          content = Buffer.from(part.body.data, 'base64').toString('utf-8');
          break;
        }
      }
    }
    
    // Determine direction based on sender
    const userEmail = await this.contactOps.getUserEmail();
    const direction = fromEmail === userEmail ? 'outbound' : 'inbound';
    const timestamp = new Date(parseInt(message.internalDate || '0'));
    
    return {
      id: parseInt(message.id || '0'),
      threadId,
      from: fromName,
      fromEmail,
      to: toName,
      toEmail,
      content,
      timestamp,
      isRead: !message.labelIds?.includes('UNREAD'),
      direction
    };
  }

  // Create a new message (reply to existing thread)
  async createMessage(data: any) {
    try {
      // Get the original thread to find the recipient
      const thread = await this.gmail.users.threads.get({
        userId: 'me',
        id: data.threadId.toString()
      });
      
      if (!thread.data.messages || thread.data.messages.length === 0) {
        throw new Error('Thread not found');
      }
      
      // Get the last message to determine recipient
      const lastMessage = thread.data.messages[thread.data.messages.length - 1];
      const headers = lastMessage.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const to = headers.find(h => h.name === 'To')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      
      // Extract email addresses
      const fromEmail = from.match(/<(.+)>/)?.[1] || from;
      const toEmail = to.match(/<(.+)>/)?.[1] || to;
      
      // Determine recipient (whoever is not the current user)
      const userEmail = await this.contactOps.getUserEmail();
      const recipientEmail = fromEmail === userEmail ? toEmail : fromEmail;
      
      // Create the message with In-Reply-To header for threading
      const messageId = lastMessage.payload?.headers?.find(h => h.name === 'Message-ID')?.value || '';
      
      const message = [
        `To: ${recipientEmail}`,
        `Subject: Re: ${subject.replace(/^Re:\s*/i, '')}`,
        `In-Reply-To: ${messageId}`,
        `References: ${messageId}`,
        '',
        data.content
      ].join('\n');
      
      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
      
      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: data.threadId.toString()
        }
      });
      
      // Get the sent message details
      const sentMessage = await this.gmail.users.messages.get({
        userId: 'me',
        id: response.data.id || ''
      });
      
      // Parse and return the message
      return await this.parseGmailMessage(sentMessage.data, data.threadId);
    } catch (error) {
      console.error('Error creating message in Gmail:', error);
      throw error;
    }
  }
}