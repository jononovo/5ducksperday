// migration.js
import pg from 'pg';
const { Pool } = pg;

// Use the same database URL as in server/db.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('Checking if column alternative_emails exists in contacts table...');
    
    // Check if column exists first
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' 
      AND column_name = 'alternative_emails'
    `);
    
    if (checkResult.rows.length === 0) {
      console.log('Adding alternative_emails column to contacts table...');
      
      // Add the column
      await pool.query(`
        ALTER TABLE contacts 
        ADD COLUMN alternative_emails TEXT[]
      `);
      
      console.log('Migration completed successfully');
    } else {
      console.log('Column alternative_emails already exists');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runMigration();