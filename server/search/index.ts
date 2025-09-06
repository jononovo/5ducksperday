/**
 * Search Module Main Export
 * Registers all search-related routes
 */

import { Express } from "express";
import { registerSessionRoutes } from "./sessions";
import { registerCompanyRoutes } from "./companies";

/**
 * Register all search-related routes
 */
export function registerSearchRoutes(app: Express, requireAuth: any) {
  // Register session management routes (no auth required)
  registerSessionRoutes(app);
  
  // Register company search routes
  registerCompanyRoutes(app, requireAuth);
  
  // Additional modules to be added:
  // - registerContactRoutes(app, requireAuth);
  // - registerEmailRoutes(app, requireAuth);
  // - registerOrchestratorRoutes(app, requireAuth);
}

// Re-export types for convenience
export * from "./types";
export { SessionManager } from "./sessions";