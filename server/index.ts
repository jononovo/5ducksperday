import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { isN8nRunning, getServiceStatus } from "./lib/n8n-manager";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Add health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Add N8N status endpoint before auth setup to ensure it's public
app.get('/api/n8n/public/status', (_req, res) => {
  try {
    console.log("[n8n-manager] Getting N8N service status (public endpoint)");
    const status = getServiceStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting N8N status:", error);
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to get N8N service status"
    });
  }
});

(async () => {
  try {
    // Setup authentication before registering routes
    setupAuth(app);
    
    // Initialize database tables and migrations
    await import('./db').then(async ({ db }) => {
      try {
        // Ensure the N8N workflow tables exist
        log('Initializing N8N workflow tables...');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS n8n_workflows (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            active BOOLEAN DEFAULT true,
            "workflowData" JSONB,
            "userId" INTEGER NOT NULL,
            "strategyId" INTEGER,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        
        await db.execute(`
          CREATE TABLE IF NOT EXISTS n8n_workflow_executions (
            id SERIAL PRIMARY KEY,
            "workflowId" INTEGER NOT NULL REFERENCES n8n_workflows(id) ON DELETE CASCADE,
            "userId" INTEGER NOT NULL,
            status VARCHAR(50) NOT NULL,
            "executionId" VARCHAR(255),
            "inputData" JSONB,
            "outputData" JSONB,
            error TEXT,
            "startedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            "completedAt" TIMESTAMP WITH TIME ZONE,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `);
        
        log('N8N workflow tables initialized');
      } catch (dbError) {
        console.error('Error initializing database tables:', dbError);
      }
    });

    const server = registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Server error:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      // Return a properly formatted error response
      res.status(status).json({ 
        error: message,
        status: status,
        timestamp: new Date().toISOString()
      });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, () => {
      log(`Express server serving on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();