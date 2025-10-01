import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { outreachScheduler } from "./features/daily-outreach";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();

// Configure webhook-specific raw body parsing
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

// Configure JSON parsing for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS headers for development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Capture the domain from incoming requests for webhook callbacks
app.use((req, res, next) => {
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const host = req.get('host');
  if (host) {
    process.env.CURRENT_DOMAIN = `${protocol}://${host}`;
    console.log(`Current domain captured: ${process.env.CURRENT_DOMAIN}`);
  }
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

// Add health check endpoint with database connectivity check
app.get('/api/health', async (_req, res) => {
  try {
    // Check database connectivity for production health checks
    if (process.env.NODE_ENV === 'production') {
      const { db } = await import('./db.js');
      await db.execute(sql`SELECT 1`);
    }
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'error', 
      message: 'Service unavailable',
      timestamp: new Date().toISOString() 
    });
  }
});

(async () => {
  try {
    console.log('Starting server initialization...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Port:', process.env.PORT || '5000');
    
    // Verify database connection early
    try {
      const { db } = await import('./db.js');
      await db.execute(sql`SELECT 1`);
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      throw new Error(`Database initialization failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }
    
    // Setup authentication before registering routes
    setupAuth(app);
    console.log('Authentication configured');
    
    // Initialize daily outreach scheduler with error handling
    try {
      await outreachScheduler.initialize();
      console.log('Daily outreach scheduler initialized');
    } catch (schedulerError) {
      console.warn('Outreach scheduler initialization failed (non-critical):', schedulerError);
    }

    const server = registerRoutes(app);
    console.log('Routes registered');

    if (app.get("env") === "development") {
      await setupVite(app, server);
      console.log('Vite development server configured');
    } else {
      serveStatic(app);
      console.log('Static file serving configured');
    }

    // Global error handler - place after Vite setup
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

    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server successfully started on 0.0.0.0:${PORT}`);
      console.log(`Health check available at http://0.0.0.0:${PORT}/api/health`);
      log(`Express server serving on port ${PORT}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received, starting graceful shutdown...`);
      server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('FATAL: Failed to start server:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
})();