import { Request, Response } from 'express';
import type { EmailTemplate, InsertEmailTemplate } from '@shared/schema';

export interface EmailTemplatesService {
  listTemplates(userId: number): Promise<EmailTemplate[]>;
  getTemplate(id: number, userId: number): Promise<EmailTemplate | undefined>;
  createTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;
  updateTemplate(id: number, data: Partial<EmailTemplate>, userId: number): Promise<EmailTemplate | undefined>;
  deleteTemplate(id: number, userId: number): Promise<void>;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

export interface EmailTemplatesRouteHandlers {
  list: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  get: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  create: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  update: (req: AuthenticatedRequest, res: Response) => Promise<void>;
  delete: (req: AuthenticatedRequest, res: Response) => Promise<void>;
}