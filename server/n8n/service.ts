import { exec } from 'child_process';
import { promisify } from 'util';
import { start } from '@n8n/core';
import { n8nConfig, N8N_PORT, N8N_HOST } from './config';

const execAsync = promisify(exec);

export class N8NService {
  private static instance: N8NService;
  private isRunning: boolean = false;

  private constructor() {}

  public static getInstance(): N8NService {
    if (!N8NService.instance) {
      N8NService.instance = new N8NService();
    }
    return N8NService.instance;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Start n8n in the background
      await execAsync(`n8n start --port ${N8N_PORT} &`);
      this.isRunning = true;
      console.log(`n8n started on port ${N8N_PORT}`);
      console.log(`Access n8n editor at ${N8N_HOST}`);
    } catch (error) {
      console.error('Failed to start n8n:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await execAsync('pkill -f "n8n"');
      this.isRunning = false;
      console.log('n8n service stopped');
    } catch (error) {
      console.error('Failed to stop n8n:', error);
      throw error;
    }
  }

  public async triggerWorkflow(workflowId: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${N8N_HOST}/webhook/${workflowId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      throw error;
    }
  }
}

export const n8nService = N8NService.getInstance();