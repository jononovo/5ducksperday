import { Response } from 'express';

/**
 * SSE Manager for real-time job updates
 */
export class SSEManager {
  private connections = new Map<string, Response[]>();

  /**
   * Add a new SSE connection for a job
   */
  addConnection(jobId: string, res: Response): void {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({ status: 'connected', jobId })}\n\n`);

    // Add to connections map
    if (!this.connections.has(jobId)) {
      this.connections.set(jobId, []);
    }
    this.connections.get(jobId)!.push(res);

    // Clean up on client disconnect
    res.on('close', () => {
      this.removeConnection(jobId, res);
    });
  }

  /**
   * Remove a connection
   */
  private removeConnection(jobId: string, res: Response): void {
    const connections = this.connections.get(jobId);
    if (connections) {
      const index = connections.indexOf(res);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.connections.delete(jobId);
      }
    }
  }

  /**
   * Send an update to all connections for a job
   */
  sendUpdate(jobId: string, eventType: string, data: any): void {
    const connections = this.connections.get(jobId);
    if (connections) {
      const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
      connections.forEach(res => {
        try {
          res.write(message);
        } catch (error) {
          console.error(`[SSEManager] Failed to send update to connection:`, error);
          this.removeConnection(jobId, res);
        }
      });
    }
  }

  /**
   * Send company discovery update
   */
  sendCompanyUpdate(jobId: string, companies: any[]): void {
    this.sendUpdate(jobId, 'companies_discovered', {
      type: 'companies',
      count: companies.length,
      companies
    });
  }

  /**
   * Send contact update
   */
  sendContactUpdate(jobId: string, company: any, contacts: any[]): void {
    this.sendUpdate(jobId, 'contacts_found', {
      type: 'contacts',
      companyId: company.id,
      companyName: company.name,
      count: contacts.length,
      contacts
    });
  }

  /**
   * Send job completion update
   */
  sendCompletionUpdate(jobId: string, results: any): void {
    this.sendUpdate(jobId, 'job_completed', {
      type: 'completed',
      results
    });
  }

  /**
   * Send error update
   */
  sendErrorUpdate(jobId: string, error: string): void {
    this.sendUpdate(jobId, 'error', {
      type: 'error',
      message: error
    });
  }

  /**
   * Check if job has active connections
   */
  hasConnections(jobId: string): boolean {
    return this.connections.has(jobId) && this.connections.get(jobId)!.length > 0;
  }
}

// Create singleton instance
export const sseManager = new SSEManager();