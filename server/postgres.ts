import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

// Replit auto-provides DATABASE_URL for Neon PostgreSQL
const sql = neon(process.env.DATABASE_URL!);

export const pgDb = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development'
});