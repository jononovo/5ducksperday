# Storage Switching Utility

This folder contains utilities to migrate from PostgreSQL to Replit Database.

## Files

- `simplified-storage-replit.ts` - Implementation of Replit DB storage adapter
- `storage-switcher.ts` - Switch between PostgreSQL and Replit DB
- `migrate.ts` - Data migration script
- `verify.ts` - Migration verification script
- `migrate-to-replit-db.sh` - One-step migration utility
- `toggle-storage.sh` - Toggle between storage backends
- `cleanup.sh` - Remove all storage switching files

## How to Use

1. **Migrate data**:
   ```
   bash storage-switching/migrate-to-replit-db.sh
   ```

2. **Switch storage backend**:
   ```
   bash storage-switching/toggle-storage.sh
   ```

3. **Remove utilities**:
   ```
   bash storage-switching/cleanup.sh
   ```

## Data Migration Process

1. Data is transferred from PostgreSQL to Replit DB
2. The verification process ensures all entities were migrated
3. The application continues to use PostgreSQL by default
4. You can toggle to Replit DB once migration is verified

## Key Structure in Replit DB

- Primary records: `{entityType}:{id}` (e.g., `user:42`)
- Indexes: `index:{indexType}:{value}` (e.g., `index:user:email:user@example.com`)
- Relationships: `{entityType}:{id}:{relatedType}` (e.g., `companies:list:5`)
- Counters: `counter:{entityType}` (e.g., `counter:user`)