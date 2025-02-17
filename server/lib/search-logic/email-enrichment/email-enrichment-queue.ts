type QueueProcessor = (contactId: number) => Promise<any>;

export class EmailEnrichmentQueue {
  private queue: number[] = [];
  private processing: boolean = false;
  private concurrentLimit: number = 2;
  private activeProcesses: number = 0;
  private retryLimit: number = 3;
  private retryDelayMs: number = 1000;

  async enqueue(contactId: number): Promise<void> {
    this.queue.push(contactId);
  }

  async processQueue(processor: QueueProcessor): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0 && this.activeProcesses < this.concurrentLimit) {
        const contactId = this.queue.shift();
        if (!contactId) break;

        this.activeProcesses++;
        this.processContact(contactId, processor, 0)
          .finally(() => {
            this.activeProcesses--;
            if (this.queue.length === 0 && this.activeProcesses === 0) {
              this.processing = false;
            }
          });
      }
    } catch (error) {
      console.error('Error processing enrichment queue:', error);
      this.processing = false;
    }
  }

  private async processContact(
    contactId: number,
    processor: QueueProcessor,
    retryCount: number
  ): Promise<void> {
    try {
      await processor(contactId);
    } catch (error) {
      console.error(`Error processing contact ${contactId}:`, error);
      
      if (retryCount < this.retryLimit) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelayMs));
        await this.processContact(contactId, processor, retryCount + 1);
      } else {
        console.error(`Failed to process contact ${contactId} after ${this.retryLimit} retries`);
      }
    }
  }

  public isProcessing(): boolean {
    return this.processing;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }
}
