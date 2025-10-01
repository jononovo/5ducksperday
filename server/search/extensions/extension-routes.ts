import { Request, Response } from 'express';
import { ExtensionSearchService } from './extension-service';

export function setupExtensionRoutes(app: any, getUserId: (req: Request) => number) {
  /**
   * Extension search endpoint - finds 5 more companies with full enrichment
   */
  app.post("/api/search/extend", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { query, excludeCompanyIds = [], contactSearchConfig } = req.body;
      
      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: "Invalid request: query must be a non-empty string"
        });
        return;
      }
      
      console.log(`[ExtensionRoute] User ${userId} extending search: "${query}"`);
      console.log(`[ExtensionRoute] Excluding ${excludeCompanyIds.length} existing companies`);
      
      // Extract company names from the exclusion list
      const excludeCompanyNames: string[] = excludeCompanyIds.map((item: any) => {
        if (typeof item === 'object' && item.name) {
          return item.name;
        } else if (typeof item === 'string') {
          return item;
        }
        return '';
      }).filter((name: string) => name !== '');
      
      console.log(`[ExtensionRoute] Company names to exclude:`, excludeCompanyNames);
      
      // Call the extension service
      const result = await ExtensionSearchService.extendSearch({
        userId,
        originalQuery: query,
        excludeCompanyNames,
        contactSearchConfig
      });
      
      console.log(`[ExtensionRoute] Extension result: jobId=${result.jobId}, companies=${result.companies.length}`);
      
      if (result.companies.length === 0) {
        res.json({
          companies: [],
          message: "No additional companies found"
        });
        return;
      }
      
      res.json({
        jobId: result.jobId,
        companies: result.companies
      });
    } catch (error) {
      console.error("[ExtensionRoute] Error extending search:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to extend search"
      });
    }
  });
}