/**
 * Test file to demonstrate programmatic search execution
 * Run this file to create a test search job and see it processed
 */

import { SearchJobService } from "./services/search-job-service";

async function testProgrammaticSearch() {
  console.log("\n=== Testing Programmatic Search Execution ===\n");
  
  try {
    // 1. Create a search job programmatically
    console.log("1. Creating a search job programmatically...");
    
    const jobId = await SearchJobService.createJob({
      userId: 1, // Using user ID 1 for testing
      query: "Find innovative AI startups in healthcare sector with recent funding",
      searchType: "companies",
      contactSearchConfig: {
        enableCoreLeadership: true,
        enableDepartmentHeads: false,
        enableCustomSearch: true,
        customSearchTarget: "CEO, CTO, VP Product"
      },
      source: "api",
      metadata: {
        testRun: true,
        timestamp: new Date().toISOString(),
        purpose: "Testing programmatic search activation"
      },
      priority: 10 // High priority for test
    });
    
    console.log(`✅ Job created successfully with ID: ${jobId}`);
    
    // 2. Check job status
    console.log("\n2. Checking job status...");
    const job = await SearchJobService.getJob(jobId, 1);
    
    if (job) {
      console.log(`Job Status: ${job.status}`);
      console.log(`Job Query: ${job.query}`);
      console.log(`Job Priority: ${job.priority}`);
      console.log(`Created At: ${job.createdAt}`);
    }
    
    // 3. Wait for job processor to pick it up
    console.log("\n3. Job will be processed by the background job processor...");
    console.log("   The job processor runs every 5 seconds and will pick up this job automatically.");
    console.log("   Check the server logs to see the job being processed.");
    
    // 4. Monitor job progress (optional - in production you'd poll this)
    console.log("\n4. To monitor job progress, you can:");
    console.log(`   - Call SearchJobService.getJob("${jobId}", 1) periodically`);
    console.log(`   - Check the job status: pending -> processing -> completed`);
    console.log(`   - View results once status is 'completed'`);
    
    // 5. Demonstrate resilience
    console.log("\n5. Demonstrating resilience:");
    console.log("   - This job is stored in the database");
    console.log("   - It will survive page refreshes and server restarts");
    console.log("   - If processing fails, it will be automatically retried (max 3 times)");
    console.log("   - Jobs can be triggered from cron jobs, webhooks, or any backend process");
    
    console.log("\n=== Test Complete ===\n");
    console.log("The search job has been created and will be processed in the background.");
    console.log("Check the server logs to see it being executed by the job processor.\n");
    
  } catch (error) {
    console.error("Error in test:", error);
    process.exit(1);
  }
}

// Run the test
testProgrammaticSearch()
  .then(() => {
    console.log("Test completed. The job will continue processing in the background.");
    process.exit(0);
  })
  .catch(error => {
    console.error("Test failed:", error);
    process.exit(1);
  });