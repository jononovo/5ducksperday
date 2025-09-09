import { DailyOutreachBatch, DailyOutreachItem, Contact, Company } from "@shared/schema";

export interface DailyBatch extends DailyOutreachBatch {
  items: DailyOutreachItemWithDetails[];
  hasContacts: boolean;
  companiesByType: { type: string; count: number }[];
}

export interface DailyOutreachItemWithDetails extends DailyOutreachItem {
  contact: Contact;
  company: Company;
}

export interface EmailNotificationContent {
  subject: string;
  html: string;
  text?: string;
}

export interface OutreachScheduleCheck {
  userId: number;
  shouldSendNow: boolean;
  lastSentToday: boolean;
}