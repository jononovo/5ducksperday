import { type Company, type InsertCompany } from "@shared/schema";
import { type Contact, type InsertContact } from "@shared/schema";
import { type List, type InsertList } from "@shared/schema";
import { type EmailTemplate, type InsertEmailTemplate } from "@shared/schema";
import { type User, type InsertUser } from "@shared/schema";
import { type StrategicProfile, type InsertStrategicProfile } from "@shared/schema";

// Base storage interface that defines all storage operations
export interface IStorage {
  // New User methods
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Lists
  getList(listId: number, userId: number): Promise<List | undefined>;
  listLists(userId: number): Promise<List[]>;
  createList(list: InsertList & { userId: number }): Promise<List>;
  updateList(listId: number, data: Partial<InsertList>, userId: number): Promise<List | undefined>;
  getNextListId(): Promise<number>;

  // Companies
  getCompany(id: number, userId: number): Promise<Company | undefined>;
  listCompanies(userId: number): Promise<Company[]>;
  listCompaniesByList(listId: number, userId: number): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;
  updateCompanyList(companyId: number, listId: number): Promise<Company | undefined>;

  // Contacts
  getContact(id: number, userId: number): Promise<Contact | undefined>;
  listContactsByCompany(companyId: number, userId: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContactsByCompany(companyId: number, userId: number): Promise<void>;

  // Search Approaches (simplified stubs)
  getSearchApproach(id: number): Promise<any>;
  listSearchApproaches(): Promise<any[]>;
  createSearchTestResult(data: any): Promise<void>;
  getTestResultsByStrategy(strategyId: number, userId: number): Promise<any[]>;

  // Email Templates
  getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined>;
  listEmailTemplates(userId: number): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate & { userId: number }): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>, userId: number): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number, userId: number): Promise<void>;

  // Strategic Profiles
  getStrategicProfile(id: number, userId: number): Promise<StrategicProfile | undefined>;
  listStrategicProfiles(userId: number): Promise<StrategicProfile[]>;
  createStrategicProfile(profile: InsertStrategicProfile & { userId: number }): Promise<StrategicProfile>;
  updateStrategicProfile(id: number, updates: Partial<StrategicProfile>, userId: number): Promise<StrategicProfile | undefined>;
  deleteStrategicProfile(id: number, userId: number): Promise<void>;
}

export * from './database';