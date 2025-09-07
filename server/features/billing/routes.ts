import express from 'express';
import { registerCreditRoutes } from '../../routes/credits';
import { registerStripeRoutes } from '../../routes/stripe';
import { registerGamificationRoutes } from './gamification/routes';
import { registerBillingCreditRoutes } from './credits/routes';

/**
 * Register all billing-related routes
 */
export function registerBillingRoutes(app: express.Express): void {
  // Register original credit routes (from routes/credits.ts)
  registerCreditRoutes(app);
  
  // Register Stripe payment routes (from routes/stripe.ts)
  registerStripeRoutes(app);
  
  // Register gamification routes (notifications, badges, easter eggs)
  registerGamificationRoutes(app);
  
  // Register additional credit routes (individual email deduction)
  registerBillingCreditRoutes(app);
}