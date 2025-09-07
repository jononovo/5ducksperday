import express from 'express';
import { registerCreditRoutes } from '../../routes/credits';
import { registerStripeRoutes } from '../../routes/stripe';

/**
 * Register all billing-related routes
 */
export function registerBillingRoutes(app: express.Express): void {
  // Register credit routes
  registerCreditRoutes(app);
  
  // Register Stripe routes
  registerStripeRoutes(app);
}