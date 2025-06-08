import type { List } from "@shared/schema";

/**
 * Generate a descriptive list name in the format: ID1174-[Search prompt]+[custom-search-label]
 */
export function generateListDisplayName(list: List): string {
  const { listId, prompt, customSearchTargets } = list;
  
  // Truncate prompt if it's too long (max 50 characters)
  const truncatedPrompt = prompt.length > 50 
    ? `${prompt.substring(0, 47)}...` 
    : prompt;
  
  // Build the base format
  let displayName = `ID${listId}-${truncatedPrompt}`;
  
  // Add custom search targets if they exist
  if (customSearchTargets && customSearchTargets.length > 0) {
    const customLabels = customSearchTargets.join('+');
    displayName += `+${customLabels}`;
  }
  
  return displayName;
}

/**
 * Generate a shorter display name for dropdowns (max 80 characters total)
 */
export function generateShortListDisplayName(list: List): string {
  const { listId, prompt, customSearchTargets } = list;
  
  // Calculate available space for prompt after ID and custom targets
  let availableSpace = 60; // Base space
  
  let customLabel = '';
  if (customSearchTargets && customSearchTargets.length > 0) {
    customLabel = `+${customSearchTargets.join('+')}`;
    availableSpace -= customLabel.length;
  }
  
  // Ensure we have at least 15 characters for the prompt
  availableSpace = Math.max(availableSpace, 15);
  
  const truncatedPrompt = prompt.length > availableSpace 
    ? `${prompt.substring(0, availableSpace - 3)}...` 
    : prompt;
  
  return `ID${listId}-${truncatedPrompt}${customLabel}`;
}