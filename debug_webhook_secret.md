# Webhook Secret Update Required

## Issue
Current webhook secret is truncated (38 chars instead of ~70 chars)

## Steps to Fix
1. Go to Stripe Dashboard → Webhooks
2. Find webhook: `we_1RdBGkGfTiCdmxysJj5JGVC4`
3. Click "Reveal" next to signing secret
4. Copy complete secret (~70 characters)
5. Update `STRIPE_WEBHOOK_SECRET` in Replit environment

## Current Status
- Subscription manually activated for user 388
- Credits: 2,680 (180 + 2,500 subscription bonus)
- Future payments will process automatically once secret is updated