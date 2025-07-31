# Deployment Configuration

## Required Environment Variables

### Core Application
- `DATABASE_URL` - Automatically provided by Replit PostgreSQL
- `OPENAI_API_KEY` - Required for AI features
- `APOLLO_API_KEY` - Required for contact search

### Stripe Payment Integration (Optional)
The application will run without Stripe keys but payment features will be disabled:

- `STRIPE_SECRET_KEY` - Stripe secret key (starts with `sk_`)
- `VITE_STRIPE_PUBLIC_KEY` - Stripe publishable key (starts with `pk_`)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (optional, for webhook verification)

### Firebase Authentication
- Firebase keys are automatically configured for the environment

## Port Configuration

The application automatically binds to:
- Development: Port 5000 on localhost
- Production: PORT environment variable (Cloud Run compatible) on 0.0.0.0

## Database Setup (Required for New Clones)

If cloning this application or if the database was deleted, you must set up the PostgreSQL schema:

```bash
# Step 1: Create PostgreSQL schema (15 tables)
npx drizzle-kit push --url "$DATABASE_URL" --schema "./shared/schema.ts" --dialect postgresql

# Step 2: Add demo data (required for email templates)
npx tsx scripts/setup-demo-data.ts
```

**Note**: The demo data creates essential email templates and a demo user required for the application to function properly.

## Deployment Steps

1. **Set up Database**: Complete the database setup above if this is a new clone
2. **Add Required Secrets**: Go to Replit Secrets tab and add the environment variables listed above
3. **Deploy**: Click the Deploy button in Replit
4. **Verify**: Check deployment logs for any missing configuration warnings

## Troubleshooting

### Payment Features Disabled
If you see "Payment service unavailable" errors, add the Stripe environment variables to your Replit Secrets.

### Connection Refused Errors
Ensure the application is binding to the correct port. The app automatically uses the PORT environment variable in production.

### Webhook Verification Warnings
Add STRIPE_WEBHOOK_SECRET to enable webhook signature verification in production. The app will process webhooks without verification as a fallback.