/**
 * N8N Manager - Handles starting, configuring, and interacting with n8n
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../vite';

// Configuration
const N8N_PORT = process.env.N8N_PORT || 5678;
const N8N_ENCRYPTION_KEY = process.env.N8N_ENCRYPTION_KEY || 'a-random-string-for-encryption';
const N8N_BASE_URL = process.env.N8N_BASE_URL || `http://localhost:${N8N_PORT}`;
const N8N_USER = process.env.N8N_USER || 'admin@example.com';
const N8N_PASSWORD = process.env.N8N_PASSWORD || 'password';

// N8N process reference
let n8nProcess: ChildProcess | null = null;

/**
 * Start N8N server
 */
export async function startN8n(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (n8nProcess) {
        log('N8N is already running', 'n8n');
        return resolve();
      }

      log('Starting N8N server...', 'n8n');

      // Create .n8n directory if it doesn't exist
      const n8nDir = path.join(process.cwd(), '.n8n');
      if (!fs.existsSync(n8nDir)) {
        fs.mkdirSync(n8nDir);
      }

      // Environment for n8n process
      const env = {
        ...process.env,
        N8N_PORT: N8N_PORT.toString(),
        N8N_ENCRYPTION_KEY,
        N8N_PROTOCOL: 'http',
        N8N_HOST: 'localhost',
        N8N_PATH: '/',
        N8N_USER_MANAGEMENT_DISABLED: 'true',
        NODE_ENV: 'production',
        N8N_LOG_LEVEL: 'info',
        DB_TYPE: 'postgresdb',
        DB_POSTGRESDB_DATABASE: process.env.PGDATABASE, 
        DB_POSTGRESDB_HOST: process.env.PGHOST,
        DB_POSTGRESDB_PORT: process.env.PGPORT,
        DB_POSTGRESDB_USER: process.env.PGUSER,
        DB_POSTGRESDB_PASSWORD: process.env.PGPASSWORD
      };

      // Start n8n process
      n8nProcess = spawn('npx', ['n8n', 'start'], {
        env,
        stdio: 'pipe',
        shell: true,
      });

      let ready = false;
      let output = '';

      // Handle stdout
      n8nProcess.stdout?.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        log(dataStr, 'n8n');

        // Check if n8n is ready
        if (dataStr.includes('Editor is now accessible via') && !ready) {
          ready = true;
          log('N8N server is ready!', 'n8n');
          resolve();
        }
      });

      // Handle stderr
      n8nProcess.stderr?.on('data', (data) => {
        const dataStr = data.toString();
        output += dataStr;
        log(dataStr, 'n8n-error');
      });

      // Handle process exit
      n8nProcess.on('exit', (code) => {
        n8nProcess = null;
        if (code !== 0 && !ready) {
          log(`N8N process exited with code ${code}`, 'n8n-error');
          reject(new Error(`N8N failed to start: ${output}`));
        } else {
          log(`N8N process exited with code ${code}`, 'n8n');
        }
      });

      // Set a timeout in case n8n doesn't start
      setTimeout(() => {
        if (!ready) {
          log('N8N server failed to start within timeout', 'n8n-error');
          if (n8nProcess) {
            n8nProcess.kill();
            n8nProcess = null;
          }
          reject(new Error('N8N server failed to start within timeout'));
        }
      }, 30000);

    } catch (error) {
      log(`Error starting N8N: ${error}`, 'n8n-error');
      reject(error);
    }
  });
}

/**
 * Stop N8N server
 */
export function stopN8n(): Promise<void> {
  return new Promise((resolve) => {
    if (!n8nProcess) {
      log('N8N is not running', 'n8n');
      return resolve();
    }

    log('Stopping N8N server...', 'n8n');
    
    // Send SIGTERM to n8n process
    n8nProcess.on('exit', () => {
      n8nProcess = null;
      log('N8N server stopped', 'n8n');
      resolve();
    });
    
    n8nProcess.kill('SIGTERM');
    
    // Force kill after 5 seconds if it hasn't exited
    setTimeout(() => {
      if (n8nProcess) {
        log('Force killing N8N process', 'n8n');
        n8nProcess.kill('SIGKILL');
        n8nProcess = null;
        resolve();
      }
    }, 5000);
  });
}

/**
 * Check if N8N server is running
 */
export function isN8nRunning(): boolean {
  return n8nProcess !== null;
}

/**
 * Get N8N API URL
 */
export function getN8nApiUrl(): string {
  return `${N8N_BASE_URL}/api/v1`;
}

/**
 * Get N8N Editor URL
 */
export function getN8nEditorUrl(): string {
  return N8N_BASE_URL;
}

// Ensure n8n process is cleaned up on exit
process.on('exit', () => {
  if (n8nProcess) {
    n8nProcess.kill('SIGKILL');
  }
});

process.on('SIGINT', () => {
  stopN8n().finally(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  stopN8n().finally(() => {
    process.exit(0);
  });
});