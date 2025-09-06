/**
 * Search Module Main Export
 * Registers all search-related routes
 */

import { Express } from "express";
import { registerSessionRoutes } from "./sessions";
import { registerCompanyRoutes } from "./companies";
import { registerContactRoutes } from "./contacts";
import { registerOrchestratorRoutes } from "./orchestrator";

/**
 * Register all search-related routes
 */
export function registerSearchRoutes(app: Express, requireAuth: any) {
  // Register session management routes (no auth required)
  registerSessionRoutes(app);
  
  // Register company search routes
  registerCompanyRoutes(app, requireAuth);
  
  // Register contact and email provider routes  
  registerContactRoutes(app, requireAuth);
  
  // Register orchestrator routes
  registerOrchestratorRoutes(app, requireAuth);
}

// Re-export types for convenience
export * from "./types";
export { SessionManager } from "./sessions";