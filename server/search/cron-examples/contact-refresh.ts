/**
 * Example: Refresh contacts for existing companies
 * 
 * This cron job demonstrates how to programmatically refresh contacts
 * for companies that already exist in the database but may have outdated
 * or missing contact information.
 */

import fetch from 'node-fetch';

/**
 * Refresh contacts for companies that haven't been updated recently
 */
async function refreshCompanyContacts() {
  try {
    console.log('[ContactRefresh] Starting contact refresh job');
    
    // Get companies that need contact refresh
    // In production, you'd query your database for companies without contacts
    // or with contacts older than a certain date
    const companyIds: number[] = [/* Get from database */];
    
    // Configuration for contact search
    const contactSearchConfig = {
      enableCoreLeadership: true,
      enableDepartmentHeads: true,
      enableMiddleManagement: false,
      enableCustomSearch: true,
      customSearchTarget: "Sales Director",
      enableCustomSearch2: false
    };
    
    // Create contact-only search job
    const response = await fetch('http://localhost:5000/api/search-jobs/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers as needed
      },
      body: JSON.stringify({
        companyIds: companyIds,  // Specific companies to refresh
        contactSearchConfig: contactSearchConfig,
        metadata: {
          source: 'contact_refresh_cron',
          reason: 'scheduled_update',
          timestamp: new Date().toISOString()
        },
        priority: 5,  // Higher priority for refresh jobs
        executeImmediately: false  // Let processor handle it
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create contact refresh job: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log(`[ContactRefresh] Created job ${result.jobId}`);
    
    // Poll for results
    await pollForResults(result.jobId);
    
  } catch (error) {
    console.error('[ContactRefresh] Error:', error);
  }
}

/**
 * Refresh contacts for all companies in a specific list
 */
async function refreshListContacts(listId: number) {
  try {
    console.log(`[ContactRefresh] Refreshing contacts for list ${listId}`);
    
    // First, get all company IDs in the list
    // In production, query your database
    const companyIds: number[] = [/* Get company IDs from list */];
    
    // Create job for all companies in list
    const response = await fetch('http://localhost:5000/api/search-jobs/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        companyIds: companyIds,
        contactSearchConfig: {
          enableCoreLeadership: true,
          enableDepartmentHeads: true,
          enableMiddleManagement: true,
        },
        metadata: {
          source: 'list_refresh',
          listId: listId,
          timestamp: new Date().toISOString()
        },
        priority: 3,
        executeImmediately: true  // Execute immediately for list refresh
      })
    });
    
    const result = await response.json();
    console.log(`[ContactRefresh] Job ${result.jobId} created for list ${listId}`);
    
    return result.jobId;
    
  } catch (error) {
    console.error(`[ContactRefresh] Error refreshing list ${listId}:`, error);
  }
}

/**
 * Enrich companies without any contacts
 */
async function enrichCompaniesWithoutContacts(userId: number) {
  try {
    console.log('[ContactRefresh] Finding companies without contacts');
    
    // Create a job to search contacts for ALL companies
    // The service will automatically detect which ones need contacts
    const response = await fetch('http://localhost:5000/api/search-jobs/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers
      },
      body: JSON.stringify({
        // No companyIds means search all user's companies
        contactSearchConfig: {
          enableCoreLeadership: true,
          enableDepartmentHeads: false,
          enableMiddleManagement: false,
        },
        metadata: {
          source: 'contact_enrichment',
          reason: 'missing_contacts',
          userId: userId,
          timestamp: new Date().toISOString()
        },
        priority: 2,
        executeImmediately: false
      })
    });
    
    const result = await response.json();
    console.log(`[ContactRefresh] Enrichment job ${result.jobId} created`);
    
    return result.jobId;
    
  } catch (error) {
    console.error('[ContactRefresh] Error enriching companies:', error);
  }
}

/**
 * Poll for job results
 */
async function pollForResults(jobId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:5000/api/search-jobs/${jobId}`, {
        headers: {
          // Add auth headers
        }
      });
      
      const job = await response.json();
      
      console.log(`[ContactRefresh] Job ${jobId} status: ${job.status}`);
      
      if (job.status === 'completed') {
        console.log(`[ContactRefresh] Job completed with ${job.resultCount} contacts found`);
        return job.results;
      }
      
      if (job.status === 'failed') {
        console.error(`[ContactRefresh] Job failed: ${job.error}`);
        return null;
      }
      
      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, 5000));
      
    } catch (error) {
      console.error(`[ContactRefresh] Error polling job ${jobId}:`, error);
    }
  }
  
  console.log(`[ContactRefresh] Timeout waiting for job ${jobId}`);
  return null;
}

/**
 * Schedule configurations for different refresh strategies
 */
export const contactRefreshSchedules = {
  // Refresh contacts for companies without any contacts (daily)
  enrichMissingContacts: {
    schedule: '0 8 * * *',  // Every day at 8 AM
    handler: () => enrichCompaniesWithoutContacts(1)
  },
  
  // Refresh outdated contacts (weekly)
  refreshOldContacts: {
    schedule: '0 2 * * 1',  // Every Monday at 2 AM
    handler: refreshCompanyContacts
  },
  
  // Refresh specific high-priority lists (configurable)
  refreshHighPriorityLists: {
    schedule: '0 10 * * 1-5',  // Weekdays at 10 AM
    handler: () => {
      const highPriorityLists = [1, 5, 12];  // Configure your list IDs
      highPriorityLists.forEach(listId => refreshListContacts(listId));
    }
  }
};

// Example usage
if (require.main === module) {
  // Test the contact refresh
  refreshCompanyContacts()
    .then(() => console.log('[ContactRefresh] Test completed'))
    .catch(error => console.error('[ContactRefresh] Test failed:', error));
}