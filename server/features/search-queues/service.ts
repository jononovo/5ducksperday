import { eq, and, sql, desc, asc } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { 
  searchQueues, 
  searchQueueItems,
  SearchQueue, 
  SearchQueueItem,
  InsertSearchQueue,
  InsertSearchQueueItem 
} from "@shared/schema";

export class SearchQueueService {
  constructor(private db: PostgresJsDatabase) {}

  // Get all queues for a user
  async getUserQueues(userId: number): Promise<SearchQueue[]> {
    return await this.db
      .select()
      .from(searchQueues)
      .where(eq(searchQueues.userId, userId))
      .orderBy(desc(searchQueues.updatedAt));
  }

  // Get a single queue
  async getQueue(queueId: number, userId: number): Promise<SearchQueue | null> {
    const [queue] = await this.db
      .select()
      .from(searchQueues)
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ))
      .limit(1);
    
    return queue || null;
  }

  // Get queue with all its items
  async getQueueWithItems(queueId: number, userId: number) {
    const queue = await this.getQueue(queueId, userId);
    
    if (!queue) return null;
    
    const items = await this.db
      .select()
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId))
      .orderBy(asc(searchQueueItems.order));
    
    return {
      ...queue,
      items
    };
  }

  // Create a new queue
  async createQueue(data: Omit<InsertSearchQueue, 'id' | 'createdAt' | 'updatedAt'>): Promise<SearchQueue> {
    const [queue] = await this.db
      .insert(searchQueues)
      .values({
        ...data,
        status: 'paused',
        metadata: {}
      })
      .returning();
    
    return queue;
  }

  // Update queue settings
  async updateQueue(
    queueId: number, 
    userId: number, 
    updates: Partial<Omit<SearchQueue, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<SearchQueue | null> {
    const [updated] = await this.db
      .update(searchQueues)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ))
      .returning();
    
    return updated || null;
  }

  // Delete a queue
  async deleteQueue(queueId: number, userId: number): Promise<boolean> {
    const result = await this.db
      .delete(searchQueues)
      .where(and(
        eq(searchQueues.id, queueId),
        eq(searchQueues.userId, userId)
      ));
    
    return true; // Drizzle doesn't return affected rows directly
  }

  // Add item to queue
  async addItemToQueue(queueId: number, prompt: string): Promise<SearchQueueItem> {
    // Get the current max order for this queue
    const [maxOrderResult] = await this.db
      .select({ maxOrder: sql<number>`COALESCE(MAX(${searchQueueItems.order}), 0)` })
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId));
    
    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;
    
    const [item] = await this.db
      .insert(searchQueueItems)
      .values({
        queueId,
        prompt,
        order: nextOrder,
        status: 'pending',
        metadata: {}
      })
      .returning();
    
    // Update queue's updatedAt timestamp
    await this.db
      .update(searchQueues)
      .set({ updatedAt: new Date() })
      .where(eq(searchQueues.id, queueId));
    
    return item;
  }

  // Delete item from queue
  async deleteItemFromQueue(itemId: number, queueId: number): Promise<boolean> {
    // Get the item's order first
    const [item] = await this.db
      .select({ order: searchQueueItems.order })
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.id, itemId),
        eq(searchQueueItems.queueId, queueId)
      ))
      .limit(1);
    
    if (!item) return false;
    
    // Delete the item
    await this.db
      .delete(searchQueueItems)
      .where(eq(searchQueueItems.id, itemId));
    
    // Reorder remaining items
    await this.db
      .update(searchQueueItems)
      .set({ 
        order: sql`${searchQueueItems.order} - 1` 
      })
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        sql`${searchQueueItems.order} > ${item.order}`
      ));
    
    // Update queue's updatedAt timestamp
    await this.db
      .update(searchQueues)
      .set({ updatedAt: new Date() })
      .where(eq(searchQueues.id, queueId));
    
    return true;
  }

  // Reorder items in queue
  async reorderItems(queueId: number, items: Array<{ id: number; order: number }>) {
    // Update each item's order in a transaction
    await this.db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(searchQueueItems)
          .set({ order: item.order })
          .where(and(
            eq(searchQueueItems.id, item.id),
            eq(searchQueueItems.queueId, queueId)
          ));
      }
      
      // Update queue's updatedAt timestamp
      await tx
        .update(searchQueues)
        .set({ updatedAt: new Date() })
        .where(eq(searchQueues.id, queueId));
    });
  }

  // Execute queue (start processing)
  async executeQueue(queueId: number, userId: number) {
    // Update queue status to active
    await this.updateQueue(queueId, userId, { status: 'active' });
    
    // Get the first pending item
    const [nextItem] = await this.db
      .select()
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'pending')
      ))
      .orderBy(asc(searchQueueItems.order))
      .limit(1);
    
    if (nextItem) {
      // Mark item as running
      await this.updateQueueItem(nextItem.id, { 
        status: 'running',
        startedAt: new Date()
      });
      
      // TODO: Trigger actual search job
      // This will be integrated with the existing search job system
      // For now, we'll just mark the queue as active
      
      console.log(`[SearchQueue] Starting execution of queue ${queueId}, first item: ${nextItem.prompt}`);
    } else {
      // No pending items, mark queue as completed
      await this.updateQueue(queueId, userId, { status: 'completed' });
    }
  }

  // Pause queue execution
  async pauseQueue(queueId: number) {
    await this.db
      .update(searchQueues)
      .set({ 
        status: 'paused',
        updatedAt: new Date()
      })
      .where(eq(searchQueues.id, queueId));
    
    // Mark any running items back to pending
    await this.db
      .update(searchQueueItems)
      .set({ status: 'pending' })
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'running')
      ));
  }

  // Update queue item
  async updateQueueItem(
    itemId: number, 
    updates: Partial<Omit<SearchQueueItem, 'id' | 'queueId' | 'createdAt'>>
  ): Promise<SearchQueueItem | null> {
    const [updated] = await this.db
      .update(searchQueueItems)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(searchQueueItems.id, itemId))
      .returning();
    
    return updated || null;
  }

  // Get queue status and metrics
  async getQueueStatus(queueId: number, userId: number) {
    const queue = await this.getQueue(queueId, userId);
    
    if (!queue) return null;
    
    // Get item counts by status
    const statusCounts = await this.db
      .select({
        status: searchQueueItems.status,
        count: sql<number>`COUNT(*)::int`
      })
      .from(searchQueueItems)
      .where(eq(searchQueueItems.queueId, queueId))
      .groupBy(searchQueueItems.status);
    
    // Get total results count
    const [totalResults] = await this.db
      .select({
        total: sql<number>`COALESCE(SUM(${searchQueueItems.resultCount}), 0)::int`
      })
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'completed')
      ));
    
    const counts = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0
    };
    
    statusCounts.forEach(sc => {
      counts[sc.status as keyof typeof counts] = sc.count;
    });
    
    return {
      queue,
      metrics: {
        ...counts,
        totalResults: totalResults?.total || 0,
        totalItems: counts.pending + counts.running + counts.completed + counts.failed
      }
    };
  }

  // Process next item in active queues (called by background job)
  async processNextQueueItem(queueId: number): Promise<SearchQueueItem | null> {
    // Get the next pending item
    const [nextItem] = await this.db
      .select()
      .from(searchQueueItems)
      .where(and(
        eq(searchQueueItems.queueId, queueId),
        eq(searchQueueItems.status, 'pending')
      ))
      .orderBy(asc(searchQueueItems.order))
      .limit(1);
    
    if (!nextItem) {
      // No more items, mark queue as completed
      await this.db
        .update(searchQueues)
        .set({ 
          status: 'completed',
          updatedAt: new Date()
        })
        .where(eq(searchQueues.id, queueId));
      
      return null;
    }
    
    // Mark item as running
    await this.updateQueueItem(nextItem.id, {
      status: 'running',
      startedAt: new Date()
    });
    
    return nextItem;
  }

  // Mark item as completed
  async markItemCompleted(
    itemId: number, 
    resultCount: number, 
    listId?: number
  ) {
    await this.updateQueueItem(itemId, {
      status: 'completed',
      completedAt: new Date(),
      resultCount,
      listId
    });
  }

  // Mark item as failed
  async markItemFailed(itemId: number, errorMessage: string) {
    await this.updateQueueItem(itemId, {
      status: 'failed',
      completedAt: new Date(),
      errorMessage
    });
  }
}