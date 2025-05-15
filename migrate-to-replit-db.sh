#!/bin/bash
# migrate-to-replit-db.sh - One-step migration from PostgreSQL to Replit DB

echo "===== PostgreSQL to Replit Database Migration ====="
echo ""
echo "This script will migrate all data from PostgreSQL to Replit Database."
echo "The application will continue to work with both storage systems,"
echo "but all new data will be stored in Replit Database after the migration."
echo ""
echo "Press ENTER to continue or CTRL+C to cancel..."
read

# 1. Verify dependencies
echo "Checking dependencies..."
if ! npm list @replit/database | grep -q "@replit/database"; then
  echo "Installing @replit/database..."
  npm install @replit/database
fi

# 2. Run migration
echo "Starting data migration..."
npx tsx migrate.ts

# If migration failed, exit
if [ $? -ne 0 ]; then
  echo "Migration failed! See error messages above."
  exit 1
fi

# 3. Run verification
echo "Verifying migration..."
npx tsx verify.ts

# If verification failed, exit
if [ $? -ne 0 ]; then
  echo "Verification failed! See error messages above."
  exit 1
fi

# 4. Switch to Replit DB storage
echo "Migrating complete! Creating switcher module..."

# Create a switcher module
cat > ./server/storage-switcher.ts << 'EOF'
/**
 * Storage switcher - allows easy transition between PostgreSQL and Replit DB
 */
import { storage as pgStorage } from './storage/database';
import { storage as replitStorage } from './storage-replit';
import { IStorage } from './storage/index';

// Set to true to use Replit DB, false to use PostgreSQL
const USE_REPLIT_DB = true;

// Export the selected storage implementation
export const storage: IStorage = USE_REPLIT_DB ? replitStorage : pgStorage;
EOF

# Update server/index.ts to use the storage switcher
sed -i 's/import { storage } from ".\/storage\/database";/import { storage } from ".\/storage-switcher";/g' server/index.ts
sed -i 's/import { storage } from ".\/storage";/import { storage } from ".\/storage-switcher";/g' server/index.ts

echo ""
echo "Migration completed successfully!"
echo "The application is now using Replit Database for storage."
echo "If you need to switch back to PostgreSQL, edit server/storage-switcher.ts"
echo "and set USE_REPLIT_DB to false."
echo ""
echo "Restarting the application..."
echo ""