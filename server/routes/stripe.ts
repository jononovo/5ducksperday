import express, { Request, Response } from "express";
import Stripe from "stripe";
import { CreditService } from "../lib/credits";
import { STRIPE_CONFIG } from "../lib/credits/types";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

export function registerStripeRoutes(app: express.Express) {
  // Create checkout session for subscription
  app.post("/api/stripe/create-checkout-session", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { planId } = req.body;

      if (planId !== 'ugly-duckling') {
        return res.status(400).json({ message: "Invalid plan ID" });
      }

      const user = req.user as any;
      if (!user.email) {
        return res.status(400).json({ message: "User email required" });
      }

      // Get or create Stripe customer
      let customer;
      const credits = await CreditService.getUserCredits(userId);
      
      if (credits.stripeCustomerId) {
        customer = await stripe.customers.retrieve(credits.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId.toString(),
            plan: planId
          }
        });

        // Update user credits with customer ID
        await CreditService.updateStripeCustomerId(userId, customer.id);
      }

      // Use the specific price ID for The Ugly Duckling plan ($18.95/month)
      const priceId = 'price_1RcgF4K7jbIybp9HaHIZlv2W';

      const successUrl = `${req.get('origin')}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${req.get('origin')}`;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: 'price_1RcgF4K7jbIybp9HaHIZlv2W',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId.toString(),
          planId: planId
        },
        subscription_data: {
          metadata: {
            userId: userId.toString(),
            planId: planId
          }
        }
      });

      console.log(`Created checkout session for user ${userId}, plan ${planId}: ${session.id}`);

      res.json({ 
        checkoutUrl: session.url,
        sessionId: session.id 
      });

    } catch (error: any) {
      console.error('Stripe checkout session creation error:', error);
      res.status(500).json({ 
        message: "Failed to create checkout session",
        error: error.message 
      });
    }
  });

  // Get subscription status
  app.get("/api/stripe/subscription-status", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const credits = await CreditService.getUserCredits(userId);

      if (!credits.stripeSubscriptionId) {
        return res.json({ 
          hasSubscription: false,
          status: null,
          currentPlan: null 
        });
      }

      const subscription = await stripe.subscriptions.retrieve(credits.stripeSubscriptionId);

      res.json({
        hasSubscription: true,
        status: subscription.status,
        currentPlan: credits.currentPlan,
        subscriptionId: subscription.id,
        currentPeriodEnd: subscription.current_period_end * 1000, // Convert to milliseconds
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      });

    } catch (error: any) {
      console.error('Stripe subscription status error:', error);
      res.status(500).json({ 
        message: "Failed to get subscription status",
        error: error.message 
      });
    }
  });

  // Stripe webhook endpoint - replace the placeholder route
  app.post("/api/stripe/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    
    let event;

    try {
      // Parse and verify the webhook payload
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (webhookSecret && sig) {
        // Production: Verify webhook signature
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        console.log(`✅ Verified Stripe webhook: ${event.type}`);
      } else {
        // Development: Parse without verification but warn
        const body = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
        event = JSON.parse(body);
        console.log(`⚠️ Unverified Stripe webhook: ${event.type} - Add webhook secret for production`);
      }

    } catch (err: any) {
      console.error('Webhook parsing failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          const userId = parseInt(subscription.metadata.userId);
          const planId = subscription.metadata.planId;

          if (userId && planId === 'ugly-duckling') {
            console.log(`Processing subscription ${event.type} for user ${userId}`);
            
            await CreditService.updateSubscription(userId, {
              stripeSubscriptionId: subscription.id,
              subscriptionStatus: subscription.status,
              currentPlan: planId,
              subscriptionStartDate: subscription.created * 1000,
              subscriptionEndDate: subscription.current_period_end * 1000
            });

            // Award subscription credits if active
            if (subscription.status === 'active') {
              await CreditService.awardSubscriptionCredits(userId, planId as 'ugly-duckling');
              console.log(`Awarded subscription credits to user ${userId} for plan ${planId}`);
            }
          }
          break;

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object;
          const deletedUserId = parseInt(deletedSub.metadata.userId);

          if (deletedUserId) {
            console.log(`Processing subscription cancellation for user ${deletedUserId}`);
            
            await CreditService.updateSubscription(deletedUserId, {
              subscriptionStatus: 'canceled',
              currentPlan: undefined,
              subscriptionEndDate: Date.now()
            });
          }
          break;

        case 'invoice.payment_failed':
          const failedInvoice = event.data.object;
          if (failedInvoice.subscription) {
            const failedSub = await stripe.subscriptions.retrieve(failedInvoice.subscription);
            const failedUserId = parseInt(failedSub.metadata.userId);
            
            if (failedUserId) {
              console.log(`Payment failed for user ${failedUserId}`);
              
              await CreditService.updateSubscription(failedUserId, {
                subscriptionStatus: 'past_due'
              });
            }
          }
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });

    } catch (error: any) {
      console.error('Webhook processing error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}