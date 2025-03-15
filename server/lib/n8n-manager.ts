/**
 * N8N Manager - Handles starting, configuring, and interacting with n8n
 * 
 * This module provides robust handling of the N8N instance lifecycle, including:
 * - Starting and stopping the N8N server
 * - Monitoring N8N server status
 * - Providing connection details for the N8N API and UI
 * - Handling server crashes and automatic restarts
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
const MAX_RESTART_ATTEMPTS = 3;
const RESTART_DELAY_MS = 3000;

// N8N process reference
let n8nProcess: ChildProcess | null = null;
let restartAttempts = 0;
let isRestarting = false;

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
        DB_POSTGRESDB_PASSWORD: process.env.PGPASSWORD,
        // Fix SSL mode issue
        DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED: 'false',
        DB_POSTGRESDB_SSL: 'true',
        // Fix permissions issue
        N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false'
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
          
          // Reset restart attempts after a successful start
          if (restartAttempts > 0) {
            setTimeout(() => {
              // Only reset if there's been no crash for a minute
              if (n8nProcess) {
                restartAttempts = 0;
                log('Restart attempt counter reset after successful running period', 'n8n');
              }
            }, 60000); // Reset counter after 1 minute of successful running
          }
          
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
        if (code !== 0) {
          log(`N8N process exited with code ${code}`, 'n8n-error');
          
          if (!ready) {
            n8nProcess = null;
            reject(new Error(`N8N failed to start: ${output}`));
          } else {
            // If N8N was running and crashed, attempt to restart it
            n8nProcess = null;
            
            if (!isRestarting && restartAttempts < MAX_RESTART_ATTEMPTS) {
              isRestarting = true;
              restartAttempts++;
              
              log(`Attempting to restart N8N (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})`, 'n8n');
              
              setTimeout(async () => {
                try {
                  await startN8n();
                  log(`N8N successfully restarted after crash`, 'n8n');
                  isRestarting = false;
                } catch (error) {
                  log(`Failed to restart N8N: ${error}`, 'n8n-error');
                  isRestarting = false;
                }
              }, RESTART_DELAY_MS);
            } else if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
              log(`Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. N8N will not be restarted.`, 'n8n-error');
            }
          }
        } else {
          log(`N8N process exited normally with code ${code}`, 'n8n');
          n8nProcess = null;
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

/**
 * Check N8N health by making a request to its API
 */
export async function checkN8nHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getN8nApiUrl()}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      timeout: 5000, // 5 second timeout
    });
    
    return response.ok;
  } catch (error) {
    log(`Health check failed: ${error}`, 'n8n-error');
    return false;
  }
}

/**
 * Force restart N8N service
 * This can be used by the application to recover from a non-responsive state
 */
export async function forceRestartN8n(): Promise<boolean> {
  try {
    // First stop the current instance if it exists
    await stopN8n();
    
    // Reset counter and flags
    restartAttempts = 0;
    isRestarting = false;
    
    // Start a new instance
    await startN8n();
    
    log('N8N service was forcefully restarted', 'n8n');
    return true;
  } catch (error) {
    log(`Force restart failed: ${error}`, 'n8n-error');
    return false;
  }
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