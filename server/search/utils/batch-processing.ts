/**
 * Batch Processing Utilities
 * 
 * Centralized utilities for batch processing with error isolation
 * and configurable batch sizes for improved performance
 */

/**
 * Process items in batches with error isolation
 * Each batch runs concurrently, but batches are processed sequentially
 * Failed items don't fail the whole batch (uses Promise.allSettled)
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param batchSize - Number of items to process concurrently (default 5)
 * @returns Array of successful results
 */
export async function processBatch<T, R>(
  items: T[], 
  processor: (item: T) => Promise<R>, 
  batchSize: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Use Promise.allSettled for error isolation
    const batchResults = await Promise.allSettled(
      batch.map(processor)
    );
    
    // Extract successful results and log errors
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error(`[Batch Processing] Item ${i + index} failed:`, result.reason);
      }
    });
  }
  
  return results;
}

/**
 * Process items in batches without error isolation (fail-fast)
 * Each batch runs concurrently, batches are processed sequentially
 * If any item fails, the whole batch fails
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param batchSize - Number of items to process concurrently (default 5)
 * @returns Array of results
 */
export async function processBatchStrict<T, R>(
  items: T[], 
  processor: (item: T) => Promise<R>, 
  batchSize: number = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  
  return results;
}

/**
 * Process items with configurable concurrency and progress reporting
 * 
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Configuration options
 * @returns Array of results with metadata
 */
export async function processBatchWithProgress<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    failFast?: boolean;
  } = {}
): Promise<{ results: R[]; errors: Error[]; successCount: number }> {
  const { 
    batchSize = 5, 
    onProgress, 
    failFast = false 
  } = options;
  
  const results: R[] = [];
  const errors: Error[] = [];
  let successCount = 0;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    if (failFast) {
      // Use Promise.all for fail-fast behavior
      try {
        const batchResults = await Promise.all(
          batch.map((item, idx) => processor(item, i + idx))
        );
        results.push(...batchResults);
        successCount += batchResults.length;
      } catch (error) {
        throw error;
      }
    } else {
      // Use Promise.allSettled for error isolation
      const batchResults = await Promise.allSettled(
        batch.map((item, idx) => processor(item, i + idx))
      );
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          successCount++;
        } else {
          errors.push(result.reason);
        }
      });
    }
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
  }
  
  return { results, errors, successCount };
}