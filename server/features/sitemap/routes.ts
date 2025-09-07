/**
 * Sitemap Routes Module
 * 
 * Handles HTTP endpoints for sitemap generation
 */

import { Express, Request, Response } from "express";
import { generateSitemapXML } from "./generator";

/**
 * Register sitemap routes
 */
export function registerSitemapRoutes(app: Express): void {
  // Sitemap XML endpoint
  app.get('/sitemap.xml', handleSitemapRequest);
}

/**
 * Handle sitemap generation request
 */
function handleSitemapRequest(req: Request, res: Response): void {
  try {
    const xml = generateSitemapXML();
    
    // Set appropriate headers for XML response
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}