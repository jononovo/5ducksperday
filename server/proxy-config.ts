import { createProxyMiddleware } from 'http-proxy-middleware';
import { Request, Response, NextFunction } from 'express';
import { isN8nRunning, getN8nApiUrl } from './lib/n8n-manager';

// Authentication middleware to check if user is logged in before accessing N8N
export function n8nProxyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get the authorization header from the original request
  const authHeader = req.headers.authorization;
  
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized access to N8N proxy' });
  }
  
  // Continue if authenticated
  next();
}

// Create proxy middleware options for N8N
export function createN8nProxyMiddleware() {
  const targetUrl = getN8nApiUrl(); // This should be a function that returns the correct N8N URL

  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: {
      '^/api/n8n-proxy': '', // Remove the /api/n8n-proxy path prefix when forwarding
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add headers for iframe compatibility
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
      
      // Pass any necessary auth credentials to N8N
      // If N8N requires authentication, add the appropriate headers here
      
      // Log proxy requests for debugging
      console.log(`[n8n-proxy] ${req.method} ${req.url} -> ${targetUrl}`);
    },
    onError: (err, req, res) => {
      console.error(`[n8n-proxy] Error: ${err.message}`);
      res.writeHead(502, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify({ error: 'N8N service unavailable', message: 'Failed to connect to N8N instance' }));
    },
    // Only proxy requests if N8N is running
    router: () => {
      if (!isN8nRunning()) {
        throw new Error('N8N service is not running');
      }
      return targetUrl;
    },
  });
}