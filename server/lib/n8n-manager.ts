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
import axios from 'axios';
import * as path from 'path';
import { log } from '../vite';

// Configuration
const N8N_PORT = process.env.N8N_PORT || 5678;
const N8N_BASE_URL = `http://localhost:${N8N_PORT}`;
const N8N_API_PATH = '/api/v1';
const N8N_API_URL = `${N8N_BASE_URL}${N8N_API_PATH}`;
const N8N_EDITOR_URL = N8N_BASE_URL;

// State variables
let n8nProcess: ChildProcess | null = null;
let restartAttempts = 0;
const MAX_RESTART_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second
let isHealthy = false;
let healthCheckTimer: NodeJS.Timeout | null = null;
let startupTimer: NodeJS.Timeout | null = null;
let lastError: Error | null = null;
let statusMessage = 'N8N service not started';
let pendingRestart = false;

// Auto-restart configuration with exponential backoff
const calculateBackoff = (attempt: number) => {
  return Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), 30000); // max 30 seconds
};

/**
 * Start N8N server
 */
export async function startN8n(): Promise<void> {
  if (n8nProcess) {
    log('N8N process is already running', 'n8n');
    return;
  }

  try {
    // Clear any previous pending restart
    if (pendingRestart) {
      pendingRestart = false;
    }
    
    log('Initializing n8n process', 'n8n');
    statusMessage = 'Starting N8N service...';
    
    const options = {
      env: {
        ...process.env,
        N8N_PORT: N8N_PORT.toString(),
        N8N_METRICS: 'false',
        N8N_DIAGNOSTICS_ENABLED: 'false',
        N8N_USER_MANAGEMENT_DISABLED: 'true',
        N8N_PUBLIC_API_DISABLED: 'false',
        N8N_LOG_LEVEL: 'info',
        NODE_ENV: 'production',
        EXECUTIONS_PROCESS: 'main',
        DB_TYPE: 'sqlite',
        DB_PATH: path.join(process.cwd(), '.n8n', 'database.sqlite'),
        N8N_PATH: path.join(process.cwd(), '.n8n'),
      },
    };

    // Start N8N process
    n8nProcess = spawn('npx', ['n8n', 'start'], options);
    
    // Handle process output for logging
    n8nProcess.stdout?.on('data', (data) => {
      log(data.toString().trim(), 'n8n');
    });
    
    n8nProcess.stderr?.on('data', (data) => {
      log(data.toString().trim(), 'n8n');
    });
    
    // Handle process exit
    n8nProcess.on('exit', (code, signal) => {
      log(`N8N process exited with code ${code} and signal ${signal}`, 'n8n');
      n8nProcess = null;
      isHealthy = false;
      statusMessage = `N8N service exited unexpectedly (code: ${code})`;
      
      // Auto-restart on crash if not explicitly stopping
      if (!pendingRestart && restartAttempts < MAX_RESTART_ATTEMPTS) {
        const backoffDelay = calculateBackoff(restartAttempts);
        log(`Scheduling N8N restart in ${backoffDelay}ms (attempt ${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})`, 'n8n');
        statusMessage = `Restarting N8N service in ${backoffDelay/1000}s (attempt ${restartAttempts + 1}/${MAX_RESTART_ATTEMPTS})`;
        
        setTimeout(async () => {
          restartAttempts++;
          await startN8n();
        }, backoffDelay);
      } else if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
        statusMessage = `N8N service failed to start after ${MAX_RESTART_ATTEMPTS} attempts`;
        log(`Maximum restart attempts (${MAX_RESTART_ATTEMPTS}) reached. N8N will not be auto-restarted.`, 'n8n');
      }
    });
    
    // Handle process errors
    n8nProcess.on('error', (err) => {
      log(`N8N process error: ${err.message}`, 'n8n');
      lastError = err;
      statusMessage = `N8N service error: ${err.message}`;
    });

    // Set a timeout for startup
    if (startupTimer) {
      clearTimeout(startupTimer);
    }
    
    startupTimer = setTimeout(async () => {
      const healthy = await checkN8nHealth();
      if (healthy) {
        log('N8N server is ready!', 'n8n');
        statusMessage = 'N8N service running normally';
        restartAttempts = 0; // Reset restart counter on successful startup
      } else {
        log('N8N server failed to start properly', 'n8n');
        statusMessage = 'N8N service started but appears unhealthy';
      }
    }, 3000);

    // Start health check polling
    startHealthCheck();
    
    return Promise.resolve();
  } catch (error: any) {
    log(`Failed to start N8N: ${error.message}`, 'n8n');
    statusMessage = `Failed to start N8N: ${error.message}`;
    lastError = error;
    return Promise.reject(error);
  }
}

/**
 * Stop N8N server
 */
export function stopN8n(): Promise<void> {
  return new Promise((resolve) => {
    if (!n8nProcess) {
      log('No N8N process to stop', 'n8n');
      resolve();
      return;
    }

    pendingRestart = true;
    log('Shutting down N8N process', 'n8n');
    statusMessage = 'Stopping N8N service...';
    
    // Stop health check
    if (healthCheckTimer) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
    
    // Stop startup timer if running
    if (startupTimer) {
      clearTimeout(startupTimer);
      startupTimer = null;
    }

    // Kill the process
    const pid = n8nProcess.pid;
    if (pid) {
      try {
        process.kill(pid);
        log(`Sent SIGTERM to N8N process ${pid}`, 'n8n');

        // Set a timeout to forcefully kill if it doesn't exit cleanly
        setTimeout(() => {
          if (n8nProcess) {
            try {
              process.kill(pid, 'SIGKILL');
              log(`Forcefully killed N8N process ${pid}`, 'n8n');
            } catch (e) {
              // Process might already be gone
            }
            n8nProcess = null;
            resolve();
          }
        }, 5000);
      } catch (e) {
        log(`Failed to kill N8N process: ${e}`, 'n8n');
        n8nProcess = null;
        resolve();
      }
    } else {
      n8nProcess = null;
      resolve();
    }
  });
}

/**
 * Start health check polling
 */
function startHealthCheck(): void {
  // Clear any existing health check timer
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
  }
  
  // Set up regular health checks
  healthCheckTimer = setInterval(async () => {
    isHealthy = await checkN8nHealth();
    if (isHealthy) {
      statusMessage = 'N8N service running normally';
    } else if (isN8nRunning()) {
      statusMessage = 'N8N service running but responding abnormally';
    } else {
      statusMessage = 'N8N service not running';
    }
  }, 10000); // Check every 10 seconds
}

/**
 * Check if N8N server is running
 */
export function isN8nRunning(): boolean {
  return n8nProcess !== null && n8nProcess.exitCode === null;
}

/**
 * Get N8N API URL
 */
export function getN8nApiUrl(): string {
  return N8N_API_URL;
}

/**
 * Get N8N Editor URL
 */
export function getN8nEditorUrl(): string {
  return N8N_EDITOR_URL;
}

/**
 * Get current status message
 */
export function getStatusMessage(): string {
  return statusMessage;
}

/**
 * Check N8N health by making a request to its API
 */
export async function checkN8nHealth(): Promise<boolean> {
  if (!isN8nRunning()) {
    return false;
  }
  
  try {
    // Check if we can connect to the health endpoint
    const response = await axios.get(`${N8N_BASE_URL}/healthz`, {
      timeout: 2000,
    });
    
    // If we get a 200 response, the server is healthy
    return response.status === 200;
  } catch (error) {
    log(`N8N health check failed: ${error}`, 'n8n');
    return false;
  }
}

/**
 * Force restart N8N service
 * This can be used by the application to recover from a non-responsive state
 */
export async function forceRestartN8n(): Promise<boolean> {
  try {
    log('Force restarting N8N service', 'n8n');
    await stopN8n();
    
    // Small delay to make sure everything is cleaned up
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await startN8n();
    return true;
  } catch (error: any) {
    log(`Failed to restart N8N: ${error.message}`, 'n8n');
    return false;
  }
}

/**
 * Get complete service status
 */
export function getServiceStatus(): {
  isRunning: boolean;
  isHealthy: boolean;
  apiUrl: string;
  editorUrl: string;
  statusMessage: string;
} {
  return {
    isRunning: isN8nRunning(),
    isHealthy,
    apiUrl: N8N_API_URL,
    editorUrl: N8N_EDITOR_URL,
    statusMessage
  };
}

// Auto-start N8N on module load
(async function initializeN8n() {
  try {
    // Wait a bit before starting to let the server initialize first
    setTimeout(async () => {
      await startN8n();
    }, 1000);
  } catch (error) {
    log(`Failed to initialize N8N: ${error}`, 'n8n');
  }
})();