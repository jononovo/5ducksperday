/**
 * Example cron job for programmatic search execution
 * This demonstrates how to trigger searches from backend processes
 * 
 * To use this:
 * 1. Import and call this function from your cron scheduler
 * 2. Or use a library like node-cron to schedule it
 * 3. Or integrate with external schedulers like Railway, Render, etc.
 */

import { SearchJobService } from "../services/search-job-service";
import { db } from "../../db";
import { users } from "../../../shared/schema";
import { eq } from "drizzle-orm";
import type { ContactSearchConfig } from "../types";

/**
 * Example: Daily search for trending tech companies
 * This would typically run at 9 AM every day
 */
export async function executeDailyTrendingCompaniesSearch() {
  console.log("[CronJob] Starting daily trending companies search");
  
  try {
    // Get all non-guest users for daily searches
    const activeUsers = await db
      .select()
      .from(users)
      .where(eq(users.isGuest, false));
    
    // Create search jobs for each user
    const jobIds = await Promise.all(
      activeUsers.map(async (user) => {
        // Create a search job for trending AI companies
        const jobId = await SearchJobService.createJob({
          userId: user.id,
          query: "Latest trending AI startups and technology companies raising funding this week",
          searchType: "companies",
          contactSearchConfig: {
            enableCoreLeadership: true,
            enableDepartmentHeads: true,
            enableCustomSearch: true,
            customSearchTarget: "CEO, CTO, Founder, VP Engineering"
          },
          source: "cron",
          metadata: {
            cronJob: "daily-trending",
            scheduledTime: new Date().toISOString(),
            userPreferences: {
              industries: ["AI", "SaaS", "Fintech"],
              fundingStage: ["Series A", "Series B"]
            }
          },
          priority: 5 // Higher priority for scheduled jobs
        });
        
        console.log(`[CronJob] Created job ${jobId} for user ${user.id}`);
        return jobId;
      })
    );
    
    console.log(`[CronJob] Successfully created ${jobIds.length} search jobs`);
    return jobIds;
    
  } catch (error) {
    console.error("[CronJob] Error in daily search:", error);
    throw error;
  }
}

/**
 * Example: Weekly competitive intelligence search
 * Searches for companies similar to a target company
 */
export async function executeWeeklyCompetitorSearch(userId: number, targetCompany: string) {
  console.log(`[CronJob] Starting weekly competitor search for ${targetCompany}`);
  
  try {
    const jobId = await SearchJobService.createJob({
      userId,
      query: `Find companies similar to ${targetCompany} or competing with ${targetCompany} in the same market`,
      searchType: "companies",
      contactSearchConfig: {
        enableCoreLeadership: true,
        enableCustomSearch: true,
        customSearchTarget: "CEO, Head of Sales, VP Marketing"
      },
      source: "cron",
      metadata: {
        cronJob: "weekly-competitors",
        targetCompany,
        scheduledTime: new Date().toISOString()
      },
      priority: 3
    });
    
    console.log(`[CronJob] Created competitor search job ${jobId}`);
    return jobId;
    
  } catch (error) {
    console.error("[CronJob] Error in competitor search:", error);
    throw error;
  }
}

/**
 * Example: Event-triggered search
 * Triggered when specific events occur (e.g., user signs up, payment received)
 */
export async function executeEventTriggeredSearch(
  userId: number,
  eventType: string,
  eventData: any
) {
  console.log(`[CronJob] Starting event-triggered search for event: ${eventType}`);
  
  try {
    let query: string;
    let config: ContactSearchConfig = {};
    
    // Customize search based on event type
    switch (eventType) {
      case "user_signup":
        query = `Find companies in ${eventData.industry || "technology"} that are potential customers`;
        config.enableCoreLeadership = true;
        config.enableCustomSearch = true;
        config.customSearchTarget = "Decision Maker, Buyer";
        break;
        
      case "payment_received":
        query = `Find high-growth companies with recent funding in ${eventData.customerIndustry || "SaaS"}`;
        config.enableCoreLeadership = true;
        config.enableDepartmentHeads = true;
        break;
        
      case "campaign_completed":
        query = `Find similar companies to successful campaign targets: ${eventData.successfulCompanies?.join(", ") || "tech startups"}`;
        break;
        
      default:
        query = "Find trending technology companies";
    }
    
    const jobId = await SearchJobService.createJob({
      userId,
      query,
      searchType: "companies",
      contactSearchConfig: config,
      source: "api", // Using 'api' for event-triggered searches
      metadata: {
        eventType,
        eventData,
        triggeredAt: new Date().toISOString()
      },
      priority: eventType === "payment_received" ? 10 : 1 // High priority for paid users
    });
    
    console.log(`[CronJob] Created event-triggered job ${jobId} for event ${eventType}`);
    return jobId;
    
  } catch (error) {
    console.error("[CronJob] Error in event-triggered search:", error);
    throw error;
  }
}

/**
 * Example: Batch processing for multiple searches
 */
export async function executeBatchSearches(searches: Array<{
  userId: number;
  query: string;
  priority?: number;
}>) {
  console.log(`[CronJob] Starting batch processing for ${searches.length} searches`);
  
  const jobIds = [];
  
  for (const search of searches) {
    try {
      const jobId = await SearchJobService.createJob({
        userId: search.userId,
        query: search.query,
        searchType: "companies",
        contactSearchConfig: {
          enableCoreLeadership: true
        },
        source: "api", // Using 'api' for batch searches
        metadata: {
          batchId: Date.now().toString(),
          batchSize: searches.length
        },
        priority: search.priority || 1
      });
      
      jobIds.push(jobId);
      console.log(`[CronJob] Created batch job ${jobId}`);
      
    } catch (error) {
      console.error(`[CronJob] Failed to create job for user ${search.userId}:`, error);
    }
  }
  
  console.log(`[CronJob] Successfully created ${jobIds.length}/${searches.length} batch jobs`);
  return jobIds;
}

/**
 * Example: Monitor and retry failed jobs
 */
export async function retryFailedJobs() {
  console.log("[CronJob] Checking for failed jobs to retry");
  
  try {
    const failedJobs = await SearchJobService.getFailedJobsForRetry();
    
    for (const job of failedJobs) {
      const retryCount = job.retryCount || 0;
      const maxRetries = job.maxRetries || 3;
      
      if (retryCount < maxRetries) {
        console.log(`[CronJob] Retrying job ${job.jobId} (attempt ${retryCount + 1}/${maxRetries})`);
        
        await SearchJobService.retryJob(job.jobId);
      } else {
        console.log(`[CronJob] Job ${job.jobId} exceeded max retries, marking as permanently failed`);
        
        await SearchJobService.updateJobStatus(
          job.jobId,
          "failed",
          null,
          "Maximum retry attempts exceeded"
        );
      }
    }
    
    console.log(`[CronJob] Processed ${failedJobs.length} failed jobs`);
    
  } catch (error) {
    console.error("[CronJob] Error retrying failed jobs:", error);
  }
}

/**
 * Example: Clean up old completed jobs
 */
export async function cleanupOldJobs(daysToKeep: number = 30) {
  console.log(`[CronJob] Cleaning up jobs older than ${daysToKeep} days`);
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const deletedCount = await SearchJobService.deleteOldJobs(cutoffDate);
    
    console.log(`[CronJob] Deleted ${deletedCount} old jobs`);
    return deletedCount;
    
  } catch (error) {
    console.error("[CronJob] Error cleaning up old jobs:", error);
    throw error;
  }
}