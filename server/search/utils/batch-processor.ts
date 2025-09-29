/**
 * Simple batch processor utility
 * Processes items in parallel batches using Promise.allSettled
 */

/**
 * Process items in parallel batches
 * @param items Array of items to process
 * @param processor Async function to process each item
 * @param batchSize Number of items to process in parallel
 * @param onBatchComplete Optional callback after each batch completes
 * @returns Array of results from Promise.allSettled
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number,
  onBatchComplete?: (batchResults: Array<PromiseSettledResult<R>>, batchIndex: number) => Promise<void> | void
): Promise<Array<PromiseSettledResult<R>>> {
  const allResults: Array<PromiseSettledResult<R>> = [];
  
  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchIndex = Math.floor(i / batchSize);
    
    // Process all items in this batch in parallel
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    );
    
    allResults.push(...batchResults);
    
    // Call the optional callback after batch completes
    if (onBatchComplete) {
      await onBatchComplete(batchResults, batchIndex);
    }
  }
  
  return allResults;
}