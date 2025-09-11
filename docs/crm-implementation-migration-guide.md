# CRM Communications Implementation - Migration Guide for AI Agents

## Summary
A comprehensive CRM communications history tracking system has been implemented to track ALL outreach (manual + automated). This fixes critical gaps where manual outreach was completely untracked and statistics were incomplete.

## Database Changes Required

### 1. Create the `communication_history` table

```sql
CREATE TABLE IF NOT EXISTS communication_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  
  -- Channel & type
  channel TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL DEFAULT 'outbound',
  
  -- Content
  subject TEXT,
  content TEXT NOT NULL,
  content_preview TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Threading
  thread_id TEXT,
  parent_id INTEGER REFERENCES communication_history(id),
  in_reply_to TEXT,
  "references" TEXT,
  
  -- Timestamps
  scheduled_for TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  
  -- Attribution
  campaign_id INTEGER,
  batch_id INTEGER REFERENCES daily_outreach_batches(id),
  template_id INTEGER REFERENCES email_templates(id),
  
  -- Enhanced metadata
  metadata JSONB DEFAULT '{}',
  
  -- Engagement metrics
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  clicked_links JSONB DEFAULT '[]',
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_comm_contact_id ON communication_history(contact_id);
CREATE INDEX IF NOT EXISTS idx_comm_company_id ON communication_history(company_id);
CREATE INDEX IF NOT EXISTS idx_comm_user_id ON communication_history(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_channel ON communication_history(channel);
CREATE INDEX IF NOT EXISTS idx_comm_status ON communication_history(status);
CREATE INDEX IF NOT EXISTS idx_comm_thread_id ON communication_history(thread_id);
CREATE INDEX IF NOT EXISTS idx_comm_sent_at ON communication_history(sent_at);
CREATE INDEX IF NOT EXISTS idx_comm_created_at ON communication_history(created_at);
CREATE INDEX IF NOT EXISTS idx_comm_contact_sent ON communication_history(contact_id, sent_at);
```

### 2. Add columns to `contacts` table

```sql
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'uncontacted',
ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_contact_channel TEXT,
ADD COLUMN IF NOT EXISTS total_communications INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_replies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_thread_id TEXT;
```

### 3. Add column to `daily_outreach_items` table

```sql
ALTER TABLE daily_outreach_items 
ADD COLUMN IF NOT EXISTS communication_id INTEGER REFERENCES communication_history(id);

CREATE INDEX IF NOT EXISTS idx_outreach_item_communication_id ON daily_outreach_items(communication_id);
```

## Data Migration for Existing Databases

If your database has existing sent daily outreach items, run this migration to backfill the communication history:

```sql
-- Step 1: Migrate historical daily outreach data
INSERT INTO communication_history (
  user_id, contact_id, company_id, channel, direction,
  subject, content, content_preview, status, sent_at, 
  metadata, created_at
)
SELECT 
  b.user_id, 
  i.contact_id, 
  i.company_id, 
  'email', 
  'outbound',
  i.email_subject, 
  i.email_body, 
  LEFT(i.email_body, 200),
  'sent', 
  i.sent_at,
  jsonb_build_object(
    'source', 'daily_outreach',
    'batchId', i.batch_id,
    'itemId', i.id,
    'tone', i.email_tone,
    'sourceTable', 'daily_outreach_backfill'
  ),
  i.sent_at
FROM daily_outreach_items i
JOIN daily_outreach_batches b ON i.batch_id = b.id
WHERE i.sent_at IS NOT NULL
  AND i.status = 'sent';

-- Step 2: Update contact statuses based on communication history
UPDATE contacts 
SET 
  contact_status = 'contacted',
  last_contacted_at = subq.max_sent_at,
  last_contact_channel = 'email',
  total_communications = subq.comm_count
FROM (
  SELECT 
    contact_id,
    MAX(sent_at) as max_sent_at,
    COUNT(*) as comm_count
  FROM communication_history 
  WHERE sent_at IS NOT NULL
  GROUP BY contact_id
) subq
WHERE contacts.id = subq.contact_id;
```

## NPM Packages
**No new NPM packages were installed.** The implementation uses existing packages already in the project.

## Code Changes (Already Merged)

The following files have been updated with CRM tracking logic:

1. **`shared/schema.ts`** - Added `communicationHistory` table schema and contact status fields
2. **`server/gmail-api-service/routes.ts`** - Manual emails now create communication records
3. **`server/features/daily-outreach/routes.ts`** - Daily outreach items create communication records when sent
4. **`server/features/daily-outreach/routes-streak.ts`** - Statistics now pull from `communicationHistory`

## Verification Steps

After applying database changes, verify the implementation:

```sql
-- Check if tables and columns exist
SELECT COUNT(*) FROM communication_history;
SELECT contact_status, total_communications FROM contacts LIMIT 1;
SELECT communication_id FROM daily_outreach_items LIMIT 1;

-- Verify data integrity
SELECT 
  COUNT(*) as total_communications,
  COUNT(DISTINCT contact_id) as unique_contacts,
  COUNT(DISTINCT company_id) as unique_companies
FROM communication_history;
```

## Expected Behavior

After implementation:
- All manual emails sent via `/api/send-gmail` are tracked
- All daily outreach emails are tracked with full history
- Contact statuses automatically update when contacted
- Streak statistics include both manual and automated outreach
- The `communicationHistory` table serves as the single source of truth for all outreach

## Troubleshooting

If you encounter issues:

1. **Schema sync issues**: Use `npm run db:push --force` to force schema sync
2. **Missing columns**: Run the ALTER TABLE statements manually
3. **Empty communication history**: Run the data migration script
4. **Statistics showing zero**: Check that `communicationHistory` table has data

## Important Notes

- The schema is already defined in `shared/schema.ts` (merged into main)
- The tracking logic is already in the code (merged into main)
- You only need to apply the database changes listed above
- No environment variables or secrets need to be added
- The implementation is backward compatible with existing data