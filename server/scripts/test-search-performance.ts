/**
 * Performance test for parallel email search
 * Query: "fintech in miami"
 */

import { SearchJobService } from '../search/services/search-job-service';
import { storage } from '../storage';

async function testSearchPerformance() {
  const query = "fintech in miami";
  const userId = 1; // demo@5ducks.ai
  const listId = 1; // Default list
  
  console.log('========================================');
  console.log('PARALLEL EMAIL SEARCH PERFORMANCE TEST');
  console.log('========================================');
  console.log(`Query: "${query}"`);
  console.log(`User: demo@5ducks.ai (ID: ${userId})`);
  console.log(`Starting at: ${new Date().toLocaleTimeString()}`);
  console.log('----------------------------------------\n');
  
  const startTime = Date.now();
  
  try {
    // Create a new search job (companies + contacts + emails)
    console.log('📋 Creating comprehensive search job...');
    const jobId = await SearchJobService.createJob({
      userId,
      query,
      searchType: 'emails', // This will trigger companies + contacts + emails
      source: 'api',
      metadata: {
        listId,
        source: 'performance_test',
        parallelSearch: true
      },
      priority: 1
    });
    
    console.log(`✅ Job created: ${jobId}`);
    console.log('🔄 Processing search (companies → contacts → emails)...\n');
    
    // Execute the job in background
    SearchJobService.executeJob(jobId).catch(err => {
      console.error('Background execution error:', err);
    });
    
    // Poll for job completion
    let completed = false;
    let finalJob: any = null;
    let lastPhase = '';
    
    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2 seconds
      
      const currentJob = await storage.getSearchJobByJobId(jobId);
      
      if (!currentJob) {
        console.log('Job not found, waiting...');
        continue;
      }
      
      // Show progress updates
      const progress = (currentJob.progress as any) || {};
      if (progress.phase && progress.phase !== lastPhase) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${elapsed}s] ${progress.phase}`);
        if (progress.message) {
          console.log(`       → ${progress.message}`);
        }
        lastPhase = progress.phase;
      }
      
      if (currentJob.status === 'completed' || currentJob.status === 'failed') {
        completed = true;
        finalJob = currentJob;
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (!finalJob || finalJob.status === 'failed') {
      console.log(`\n❌ Search failed: ${finalJob?.error || 'Unknown error'}`);
      return;
    }
    
    console.log('\n========================================');
    console.log('SEARCH COMPLETED SUCCESSFULLY');
    console.log('========================================');
    
    // Get final statistics
    const companies = await storage.listCompanies(userId);
    const recentCompanies = companies
      .filter((c: any) => c.listId === listId)
      .sort((a: any, b: any) => {
        const dateA = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const dateB = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        return dateA - dateB;
      })
      .slice(0, 20); // Get most recent companies
    
    let totalContacts = 0;
    let totalEmails = 0;
    const emailsByCompany: any[] = [];
    
    for (const company of recentCompanies) {
      const contacts = await storage.listContacts(company.id);
      totalContacts += contacts.length;
      
      const emailCount = contacts.filter((c: any) => c.email).length;
      totalEmails += emailCount;
      
      if (contacts.length > 0) {
        emailsByCompany.push({
          company: company.name,
          contacts: contacts.length,
          emails: emailCount
        });
      }
    }
    
    // Display results
    console.log('\n📊 PERFORMANCE METRICS:');
    console.log('----------------------------------------');
    console.log(`⏱️  Total Time: ${totalTime} seconds`);
    console.log(`🏢 Companies Found: ${recentCompanies.length}`);
    console.log(`👤 Contacts Discovered: ${totalContacts}`);
    console.log(`📧 Emails Enriched: ${totalEmails}`);
    console.log(`⚡ Average Time per Company: ${recentCompanies.length > 0 ? (parseFloat(totalTime) / recentCompanies.length).toFixed(2) : 'N/A'}s`);
    console.log(`⚡ Average Time per Email: ${totalEmails > 0 ? (parseFloat(totalTime) / totalEmails).toFixed(2) : 'N/A'}s`);
    
    console.log('\n📈 ENRICHMENT RATE:');
    console.log('----------------------------------------');
    const enrichmentRate = totalContacts > 0 ? ((totalEmails / totalContacts) * 100).toFixed(1) : '0';
    console.log(`Success Rate: ${enrichmentRate}% (${totalEmails}/${totalContacts} contacts)`);
    
    console.log('\n🏆 TOP RESULTS (Sample):');
    console.log('----------------------------------------');
    emailsByCompany.slice(0, 5).forEach(result => {
      const rate = result.contacts > 0 ? ((result.emails / result.contacts) * 100).toFixed(0) : '0';
      console.log(`• ${result.company}`);
      console.log(`  → ${result.emails}/${result.contacts} emails (${rate}% success)`);
    });
    
    console.log('\n========================================');
    console.log(`Completed at: ${new Date().toLocaleTimeString()}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testSearchPerformance().catch(console.error);