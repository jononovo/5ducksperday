/**
 * Generic batch processor utility for parallel operations
 * Provides configurable batch processing with error isolation and progress tracking
 */

export interface BatchProcessorOptions<T, R> {
  items: T[];
  processor: (item: T) => Promise<R>;
  batchSize: number;
  onBatchComplete?: (results: Array<PromiseSettledResult<R>>, batchIndex: number) => void;
  onItemComplete?: (result: R, item: T, index: number) => void;
  onItemError?: (error: Error, item: T, index: number) => void;
  onProgress?: (completed: number, total: number) => void;
}

export interface BatchProcessorResult<R> {
  results: R[];
  errors: Array<{ index: number; error: Error }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  duration: number;
}

/**
 * Process items in parallel batches with error isolation
 * @template T Input item type
 * @template R Result type
 */
export async function processBatch<T, R>(
  options: BatchProcessorOptions<T, R>
): Promise<BatchProcessorResult<R>> {
  const {
    items,
    processor,
    batchSize,
    onBatchComplete,
    onItemComplete,
    onItemError,
    onProgress
  } = options;

  const startTime = Date.now();
  const results: R[] = [];
  const errors: Array<{ index: number; error: Error }> = [];
  let processedCount = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchIndex = Math.floor(i / batchSize);
    
    // Create promises for this batch with proper error handling
    const batchPromises = batch.map((item, localIndex) => {
      const globalIndex = batchStartIndex + localIndex;
      
      return processor(item)
        .then(result => {
          onItemComplete?.(result, item, globalIndex);
          return { status: 'fulfilled' as const, value: result, index: globalIndex };
        })
        .catch(error => {
          const err = error instanceof Error ? error : new Error(String(error));
          onItemError?.(err, item, globalIndex);
          return { status: 'rejected' as const, reason: err, index: globalIndex };
        });
    });
    
    // Execute batch in parallel
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Process results maintaining original order
    batchResults.forEach((result: any) => {
      processedCount++;
      
      if (result.status === 'fulfilled' && result.value.status === 'fulfilled') {
        results[result.value.index] = result.value.value;
      } else if (result.status === 'fulfilled' && result.value.status === 'rejected') {
        errors.push({ 
          index: result.value.index, 
          error: result.value.reason 
        });
      }
    });
    
    // Report batch completion
    onBatchComplete?.(batchResults as Array<PromiseSettledResult<R>>, batchIndex);
    
    // Report overall progress
    onProgress?.(processedCount, items.length);
    
    console.log(
      `[BatchProcessor] Batch ${batchIndex + 1}/${Math.ceil(items.length / batchSize)} complete: ` +
      `${batch.length} items processed`
    );
  }

  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r !== undefined).length;
  
  return {
    results: results.filter(r => r !== undefined),
    errors,
    totalProcessed: items.length,
    successCount,
    errorCount: errors.length,
    duration
  };
}

/**
 * Process items in parallel batches with automatic retry on failure
 */
export async function processBatchWithRetry<T, R>(
  options: BatchProcessorOptions<T, R> & { maxRetries?: number; retryDelay?: number }
): Promise<BatchProcessorResult<R>> {
  const { maxRetries = 2, retryDelay = 1000, ...baseOptions } = options;
  
  let lastResult = await processBatch(baseOptions);
  
  // Retry failed items
  if (lastResult.errors.length > 0 && maxRetries > 0) {
    console.log(`[BatchProcessor] Retrying ${lastResult.errors.length} failed items...`);
    
    for (let retry = 0; retry < maxRetries && lastResult.errors.length > 0; retry++) {
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      const failedItems = lastResult.errors.map(e => baseOptions.items[e.index]);
      const retryResult = await processBatch({
        ...baseOptions,
        items: failedItems
      });
      
      // Merge retry results
      retryResult.results.forEach((result, i) => {
        const originalIndex = lastResult.errors[i].index;
        lastResult.results[originalIndex] = result;
      });
      
      // Update error list
      lastResult.errors = retryResult.errors.map(e => ({
        index: lastResult.errors[e.index].index,
        error: e.error
      }));
      
      lastResult.successCount += retryResult.successCount;
      lastResult.errorCount = lastResult.errors.length;
    }
  }
  
  return lastResult;
}

/**
 * Get recommended batch size based on operation type and environment
 */
export function getRecommendedBatchSize(
  operation: 'email' | 'contact' | 'company',
  conservative: boolean = false
): number {
  // Environment-based configuration
  const envKey = `${operation.toUpperCase()}_BATCH_SIZE`;
  const envValue = process.env[envKey];
  
  if (envValue && !isNaN(parseInt(envValue))) {
    return parseInt(envValue);
  }
  
  // Default batch sizes
  const defaults = {
    email: conservative ? 3 : 15,
    contact: conservative ? 5 : 10,
    company: conservative ? 2 : 5
  };
  
  return defaults[operation] || 5;
}

/**
 * Create a batch processor with pre-configured settings
 */
export function createBatchProcessor<T, R>(
  defaultOptions: Partial<BatchProcessorOptions<T, R>>
) {
  return (items: T[], processor: (item: T) => Promise<R>, overrides?: Partial<BatchProcessorOptions<T, R>>) => {
    return processBatch({
      ...defaultOptions,
      ...overrides,
      items,
      processor
    } as BatchProcessorOptions<T, R>);
  };
}