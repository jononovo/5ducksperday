import { Router, Request, Response, Application } from 'express';
import { HealthChecks } from './health-checks';
import { HealthMonitoringTestRunner } from './test-runner';

export function registerHealthMonitoringRoutes(app: Application) {
  const router = Router();

  router.post('/auth', async (req: Request, res: Response) => {
    console.log('Auth test endpoint hit - sending JSON response');
    res.setHeader('Content-Type', 'application/json');
    try {
      const tests = await HealthChecks.checkAuth(req.headers.authorization);
      const allPassed = HealthChecks.isAllPassed(tests);
      
      res.json({
        message: allPassed ? "All auth tests passed" : "Some auth tests failed",
        status: allPassed ? "healthy" : "warning",
        tests
      });
    } catch (error) {
      res.status(500).json({
        error: "Auth test failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  router.post('/database', async (req: Request, res: Response) => {
    try {
      const tests = await HealthChecks.checkDatabase();
      const allPassed = HealthChecks.isAllPassed(tests);
      
      res.json({
        message: allPassed ? "All database tests passed" : "Some database tests failed",
        status: allPassed ? "healthy" : "warning",
        tests
      });
    } catch (error) {
      res.status(500).json({
        error: "Database test failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  router.post('/search', async (req: Request, res: Response) => {
    try {
      const tests = await HealthChecks.checkSearch();
      const allPassed = HealthChecks.isAllPassed(tests);
      
      res.json({
        message: allPassed ? "All search tests passed" : "Some search tests had issues",
        status: allPassed ? "healthy" : "warning",
        tests
      });
    } catch (error) {
      res.status(500).json({
        error: "Search test failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  router.post('/health', async (req: Request, res: Response) => {
    try {
      const tests = await HealthChecks.checkAPIs();
      const allPassed = HealthChecks.isAllPassed(tests);
      
      res.json({
        message: allPassed ? "All API services healthy" : "Some API services have issues",
        status: allPassed ? "healthy" : "warning",
        tests
      });
    } catch (error) {
      res.status(500).json({
        error: "Health check failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  router.post('/run-all', async (req: Request, res: Response) => {
    try {
      const results = await HealthMonitoringTestRunner.runAllTests();
      res.json(results);
    } catch (error) {
      console.error('Test runner error:', error);
      res.status(500).json({
        error: "Test runner failed",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.use('/api/test', router);
}