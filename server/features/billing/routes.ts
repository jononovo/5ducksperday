import express from 'express';
import { registerCreditRoutes } from './credits/routes';
import { registerStripeRoutes } from './stripe/routes';
import { registerGamificationRoutes } from './gamification/routes';

/**
 * Register all billing-related routes
 */
export function registerBillingRoutes(app: express.Express): void {
  // Register credit management routes
  registerCreditRoutes(app);
  
  // Register Stripe payment routes
  registerStripeRoutes(app);
  
  // Register gamification routes (notifications, badges, easter eggs)
  registerGamificationRoutes(app);
}