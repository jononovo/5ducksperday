/**
 * N8N Workflow Service
 * Handles integration with N8N workflows and execution
 */

import axios from 'axios';
import { N8nWorkflow, InsertN8nWorkflow, N8nWorkflowExecution, InsertN8nWorkflowExecution } from '../../shared/schema';
import { db } from '../db';
import { n8nWorkflows, n8nWorkflowExecutions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { startN8n, getN8nApiUrl, isN8nRunning } from './n8n-manager';
import { log } from '../vite';

// N8N API Base URL (typically would be environment variable)
const N8N_API_BASE_URL = process.env.N8N_API_URL || 'http://localhost:5678/api/v1';
const N8N_API_KEY = process.env.N8N_API_KEY || '';

interface N8nApiOptions {
  apiKey?: string;
  baseUrl?: string;
}

class N8nService {
  private apiKey: string;
  private baseUrl: string;
  private initialized: boolean = false;

  constructor(options: N8nApiOptions = {}) {
    this.apiKey = options.apiKey || N8N_API_KEY;
    this.baseUrl = options.baseUrl || N8N_API_BASE_URL;
    
    // Initialize the N8N server when constructed
    this.initialize();
  }
  
  /**
   * Initialize the N8N service and server
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      if (!isN8nRunning()) {
        log('Starting N8N server...', 'n8n-service');
        await startN8n();
      }
      
      // Update the base URL to the managed N8N instance
      this.baseUrl = getN8nApiUrl();
      this.initialized = true;
      log('N8N service initialized with base URL: ' + this.baseUrl, 'n8n-service');
    } catch (error) {
      log('Failed to initialize N8N service: ' + error, 'n8n-service');
      console.error('Error initializing N8N service:', error);
    }
  }

  /**
   * Create a new workflow in N8N
   */
  async createWorkflow(workflowData: any): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/workflows`,
        workflowData,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating N8N workflow:', error);
      throw new Error('Failed to create N8N workflow');
    }
  }

  /**
   * Get a workflow from N8N by ID
   */
  async getWorkflow(workflowId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/workflows/${workflowId}`,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error getting N8N workflow ${workflowId}:`, error);
      throw new Error(`Failed to get N8N workflow ${workflowId}`);
    }
  }

  /**
   * Update an existing workflow in N8N
   */
  async updateWorkflow(workflowId: string, workflowData: any): Promise<any> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/workflows/${workflowId}`,
        workflowData,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error updating N8N workflow ${workflowId}:`, error);
      throw new Error(`Failed to update N8N workflow ${workflowId}`);
    }
  }

  /**
   * Execute a workflow in N8N
   */
  async executeWorkflow(workflowId: string, executionData: any = {}): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/workflows/${workflowId}/execute`,
        executionData,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error executing N8N workflow ${workflowId}:`, error);
      throw new Error(`Failed to execute N8N workflow ${workflowId}`);
    }
  }

  /**
   * Get execution result from N8N
   */
  async getExecutionResult(executionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/executions/${executionId}`,
        {
          headers: {
            'X-N8N-API-KEY': this.apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error(`Error getting N8N execution ${executionId}:`, error);
      throw new Error(`Failed to get N8N execution ${executionId}`);
    }
  }

  /**
   * Save a workflow to our database
   */
  async saveWorkflow(workflow: InsertN8nWorkflow): Promise<N8nWorkflow> {
    try {
      const [result] = await db.insert(n8nWorkflows).values(workflow).returning();
      return result;
    } catch (error) {
      console.error('Error saving workflow to database:', error);
      throw new Error('Failed to save workflow to database');
    }
  }

  /**
   * Get a workflow from our database
   */
  async getWorkflowFromDb(id: number): Promise<N8nWorkflow | undefined> {
    try {
      const result = await db.select().from(n8nWorkflows).where(eq(n8nWorkflows.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`Error getting workflow ${id} from database:`, error);
      throw new Error(`Failed to get workflow ${id} from database`);
    }
  }

  /**
   * Get all workflows for a user from our database
   */
  async getUserWorkflows(userId: number): Promise<N8nWorkflow[]> {
    try {
      const result = await db.select().from(n8nWorkflows).where(eq(n8nWorkflows.userId, userId));
      return result;
    } catch (error) {
      console.error(`Error getting workflows for user ${userId}:`, error);
      throw new Error(`Failed to get workflows for user ${userId}`);
    }
  }

  /**
   * Update a workflow in our database
   */
  async updateWorkflowInDb(id: number, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    try {
      const [result] = await db
        .update(n8nWorkflows)
        .set({ ...workflow, updatedAt: new Date() })
        .where(eq(n8nWorkflows.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating workflow ${id} in database:`, error);
      throw new Error(`Failed to update workflow ${id} in database`);
    }
  }

  /**
   * Save a workflow execution to our database
   */
  async saveExecution(execution: InsertN8nWorkflowExecution): Promise<N8nWorkflowExecution> {
    try {
      const [result] = await db.insert(n8nWorkflowExecutions).values(execution).returning();
      return result;
    } catch (error) {
      console.error('Error saving execution to database:', error);
      throw new Error('Failed to save execution to database');
    }
  }

  /**
   * Update a workflow execution in our database
   */
  async updateExecution(id: number, data: Partial<N8nWorkflowExecution>): Promise<N8nWorkflowExecution> {
    try {
      const [result] = await db
        .update(n8nWorkflowExecutions)
        .set(data)
        .where(eq(n8nWorkflowExecutions.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error(`Error updating execution ${id} in database:`, error);
      throw new Error(`Failed to update execution ${id} in database`);
    }
  }

  /**
   * Get all executions for a workflow from our database
   */
  async getWorkflowExecutions(workflowId: number): Promise<N8nWorkflowExecution[]> {
    try {
      const result = await db
        .select()
        .from(n8nWorkflowExecutions)
        .where(eq(n8nWorkflowExecutions.workflowId, workflowId))
        .orderBy(n8nWorkflowExecutions.startedAt);
      return result;
    } catch (error) {
      console.error(`Error getting executions for workflow ${workflowId}:`, error);
      throw new Error(`Failed to get executions for workflow ${workflowId}`);
    }
  }

  /**
   * Execute a workflow and handle tracking in our database
   */
  async executeAndTrack(
    workflowId: number,
    userId: number,
    inputData: any = {}
  ): Promise<{ executionId: number; n8nExecutionId: string | null }> {
    try {
      // First get the workflow from our DB
      const workflow = await this.getWorkflowFromDb(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      
      // Check for strategy-specific workflows
      let executionData = { ...inputData };
      
      // If this is an Advanced Key Contact Discovery workflow (strategyId === 17)
      // add template-specific execution data
      if (workflow.strategyId === 17) {
        console.log('Executing Advanced Key Contact Discovery workflow with strategyId 17');
        
        // Add company information to the execution data if it's missing
        if (!executionData.company) {
          // If no specific company is provided, use a test company or get from inputData
          let testCompany = inputData.company || {
            id: inputData.companyId,
            name: inputData.companyName || "Target Company",
            website: inputData.companyWebsite || "example.com"
          };
          
          executionData = {
            ...executionData,
            company: testCompany,
            searchStrategy: {
              id: 17,
              name: "Advanced Key Contact Discovery",
              version: "1.0"
            }
          };
        }
        
        console.log('Prepared execution data for Advanced Key Contact workflow:', {
          hasCompany: !!executionData.company,
          hasStrategy: !!executionData.searchStrategy
        });
      }

      // Create an execution record
      const execution = await this.saveExecution({
        workflowId,
        userId,
        status: 'running',
        inputData: executionData // Use the enhanced execution data
      });

      try {
        // Get the N8N workflow ID - it could be in different places depending on workflow creation method
        const n8nWorkflowId = workflow.workflowData?.n8nWorkflowId || 
                            workflow.workflowData?.id || 
                            workflow.id.toString();
                            
        console.log(`Executing N8N workflow with ID: ${n8nWorkflowId}`);
        
        // Execute the workflow in N8N
        const n8nExecutionResult = await this.executeWorkflow(
          n8nWorkflowId,
          executionData // Use the enhanced execution data
        );

        // Update the execution with the result
        await this.updateExecution(execution.id, {
          status: 'completed',
          outputData: n8nExecutionResult,
          completedAt: new Date()
        });

        return {
          executionId: execution.id,
          n8nExecutionId: n8nExecutionResult.id || null
        };
      } catch (error) {
        console.error('N8N workflow execution error:', error);
        
        // Update the execution with the error
        await this.updateExecution(execution.id, {
          status: 'failed',
          error: error.message || 'Unknown error',
          completedAt: new Date()
        });

        throw error;
      }
    } catch (error) {
      console.error(`Error executing workflow ${workflowId}:`, error);
      throw new Error(`Failed to execute workflow ${workflowId}: ${error.message}`);
    }
  }
}

// Create and export an instance of the service
export const n8nService = new N8nService();