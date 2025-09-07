/**
 * Type definitions for Email Replies module
 */

import { Request } from 'express';

// Thread data structure
export interface EmailThread {
  id: number;
  contactId: number;
  userId: number;
  subject: string;
  lastUpdated: Date;
  createdAt: Date;
  isArchived: boolean;
}

// Message data structure
export interface EmailMessage {
  id: number;
  threadId: number;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  direction: 'inbound' | 'outbound';
}

// Active contact with thread info
export interface ActiveContact {
  id: number;
  name: string;
  email: string;
  companyId: number;
  userId: number;
  lastMessage: string;
  lastMessageDate: Date;
  unread: boolean;
}

// Thread with messages response
export interface ThreadWithMessages {
  thread: EmailThread;
  messages: EmailMessage[];
}

// Create thread request
export interface CreateThreadRequest {
  contactId: number;
  subject: string;
  userId?: number;
}

// Create message request  
export interface CreateMessageRequest {
  threadId: number;
  from: string;
  fromEmail: string;
  to: string;
  toEmail: string;
  content: string;
  direction: 'inbound' | 'outbound';
}

// Authenticated request with Gmail token
export interface AuthenticatedRequestWithGmail extends Request {
  user?: any;
  session?: any;
}