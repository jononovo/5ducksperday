// N8N Workflow tables migration script
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from 'pg';
const { Pool } = pg;
import dotenv from "dotenv";

// Initialize environment variables
dotenv.config();

// SQL queries to create tables
const createTablesSQL = `
-- Create n8n_workflows table if it doesn't exist
CREATE TABLE IF NOT EXISTS n8n_workflows (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  workflow_data JSONB,
  strategy_id INTEGER REFERENCES search_approaches(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create n8n_workflow_executions table if it doesn't exist
CREATE TABLE IF NOT EXISTS n8n_workflow_executions (
  id SERIAL PRIMARY KEY,
  workflow_id INTEGER NOT NULL REFERENCES n8n_workflows(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  input_data JSONB,
  output_data JSONB,
  error TEXT
);
`;

async function runMigration() {
  console.log("Starting database migration for N8N workflow tables...");
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Execute the SQL to create tables
    await pool.query(createTablesSQL);
    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);