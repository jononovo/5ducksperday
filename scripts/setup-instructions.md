# 5Ducks Clone Setup Instructions

## Overview
This application uses a **hybrid storage architecture**:
- **PostgreSQL**: Search data (users, lists, companies, contacts, email templates)  
- **Replit Key-Value DB**: Credits, Gmail tokens, Stripe subscriptions, notifications

## Setup for New Clones

### Method 1: Direct Drizzle Command (Recommended)
```bash
# Create all PostgreSQL tables with proper schema
npx drizzle-kit push --url "$DATABASE_URL" --schema "./shared/schema.ts" --dialect postgresql

# Run demo data setup (optional)
npx tsx scripts/setup-demo-data.ts
```

### Method 2: Manual SQL Setup (Fallback)
If the above fails, run the comprehensive SQL setup:
```bash
npx tsx scripts/setup-demo-data.ts
```

## Architecture Notes

### What Goes Where:
- **PostgreSQL**: Core search functionality
  - `users` (includes `is_guest` column)
  - `lists`, `companies`, `contacts` 
  - `email_templates`, `strategic_profiles`

- **Replit Key-Value DB**: User services (via direct imports)
  - Credits: `CreditService` → `user_credits:{userId}`
  - Gmail tokens: `TokenService` → `user_tokens:{userId}`
  - Subscriptions, notifications, badges

### Key Files:
- `shared/schema.ts`: PostgreSQL table definitions
- `server/lib/credits/index.ts`: Credit management (key-value)
- `server/lib/tokens/index.ts`: Gmail token management (key-value)
- `storage-switching/1--storage-switcher.ts`: Storage abstraction

## Troubleshooting

### Schema Issues
The schema is aligned with database reality. If you get column errors:
1. Verify `is_guest` column exists in PostgreSQL users table
2. Check that legacy columns (stripe_*, gmail_*) exist but are unused (all NULL)

### Drizzle Config Issues  
Current `drizzle.config.json` uses `"url": "DATABASE_URL"` format. If it fails:
1. Use direct CLI command: `npx drizzle-kit push --url "$DATABASE_URL" --schema "./shared/schema.ts" --dialect postgresql`
2. Environment variable access works in app but may fail in CLI tools

### Hybrid Architecture Verification
```bash
# Verify PostgreSQL tables
psql $DATABASE_URL -c "\dt"

# Verify key-value services work
# Credits and tokens are managed by service classes, not direct DB queries
```

This hybrid approach provides the best of both worlds: structured relational data for search functionality and simple key-value storage for user services.