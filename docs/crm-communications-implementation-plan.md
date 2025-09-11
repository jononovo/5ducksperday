# CRM Communications History Implementation Plan

## Overview
This document outlines the technical implementation plan for adding comprehensive CRM communications tracking to the 5Ducks application. The implementation addresses critical tracking gaps where manual outreach is completely untracked and statistics are incomplete.

## Current State Issues
- **Manual outreach emails sent via the Outreach page are not tracked in the database**
- **Streak statistics only count daily batch emails, missing all manual sends**
- **No contact pipeline status tracking (uncontacted → contacted → replied)**
- **Reply feature infrastructure is missing (no communication history to link to)**

## Implementation Phases

### Phase 1: Core Database Schema (Foundation)

#### 1.1 Add `communicationHistory` table
```typescript
// In shared/schema.ts
export const communicationHistory = pgTable("communication_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  
  // Core fields
  channel: text("channel").notNull().default('email'),
  direction: text("direction").notNull().default('outbound'),
  subject: text("subject"),
  content: text("content").notNull(),
  
  // Status and timing
  status: text("status").notNull().default('sent'),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  
  // Source tracking
  source: text("source").notNull(), // 'daily_outreach', 'manual', 'gmail'
  dailyOutreachItemId: integer("daily_outreach_item_id"),
  
  // Threading support (for future)
  threadId: text("thread_id"),
  messageId: text("message_id"),
  
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_comm_history_user_contact').on(table.userId, table.contactId),
  index('idx_comm_history_sent_at').on(table.sentAt),
  index('idx_comm_history_thread').on(table.threadId)
]);
```

#### 1.2 Add contact status fields
```typescript
// Update contacts table in shared/schema.ts
export const contacts = pgTable("contacts", {
  // ... existing fields ...
  
  // Add these new fields:
  contactStatus: text("contact_status").default('uncontacted'),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  totalCommunications: integer("total_communications").default(0),
  lastRepliedAt: timestamp("last_replied_at", { withTimezone: true })
});
```

#### 1.3 Link daily outreach to communications
```typescript
// Update dailyOutreachItems table
export const dailyOutreachItems = pgTable("daily_outreach_items", {
  // ... existing fields ...
  
  // Add this field:
  communicationId: integer("communication_id").references(() => communicationHistory.id)
});
```

### Phase 2: Wire Into Existing Send Points

#### 2.1 Manual Outreach (Outreach Page)
**File:** `server/gmail-api-service/routes.ts`
```typescript
// In /api/send-gmail endpoint (line ~196)
app.post('/api/send-gmail', requireAuth, async (req: Request, res: Response) => {
  const { to, subject, content, contactId, companyId, tone, offerStrategy } = req.body;
  
  // After successful Gmail send:
  if (contactId && companyId) {
    // Create communication record
    const [commRecord] = await db.insert(communicationHistory).values({
      userId,
      contactId,
      companyId,
      channel: 'email',
      direction: 'outbound',
      subject,
      content,
      status: 'sent',
      sentAt: new Date(),
      source: 'manual',
      threadId: gmailResponse.threadId,
      messageId: gmailResponse.id,
      metadata: { tone, offerStrategy }
    }).returning();
    
    // Update contact status
    await db.update(contacts)
      .set({ 
        contactStatus: 'contacted',
        lastContactedAt: new Date(),
        totalCommunications: sql`${contacts.totalCommunications} + 1`
      })
      .where(eq(contacts.id, contactId));
  }
});
```

#### 2.2 Daily Outreach
**File:** `server/features/daily-outreach/routes.ts`
```typescript
// In mark-as-sent endpoint (line ~366)
router.post('/batch/:token/item/:itemId/sent', async (req, res) => {
  // Start transaction
  await db.transaction(async (tx) => {
    // Get the item details
    const [item] = await tx.select().from(dailyOutreachItems)...;
    
    // Create communication record
    const [commRecord] = await tx.insert(communicationHistory).values({
      userId: batch.userId,
      contactId: item.contactId,
      companyId: item.companyId,
      channel: 'email',
      direction: 'outbound',
      subject: item.emailSubject,
      content: item.emailBody,
      status: 'sent',
      sentAt: new Date(),
      source: 'daily_outreach',
      dailyOutreachItemId: item.id,
      metadata: { tone: item.emailTone, batchId: batch.id }
    }).returning();
    
    // Update the outreach item
    await tx.update(dailyOutreachItems)
      .set({
        status: 'sent',
        sentAt: new Date(),
        communicationId: commRecord.id
      })
      .where(eq(dailyOutreachItems.id, itemId));
    
    // Update contact status
    await tx.update(contacts)
      .set({
        contactStatus: 'contacted',
        lastContactedAt: new Date(),
        totalCommunications: sql`${contacts.totalCommunications} + 1`
      })
      .where(eq(contacts.id, item.contactId));
  });
});
```

### Phase 3: Fix Analytics (Streak Page)

#### 3.1 Update streak calculations
**File:** `server/features/daily-outreach/routes-streak.ts`
```typescript
// Replace all queries to use communicationHistory instead of dailyOutreachItems

// Example: Emails sent today
const emailsSentToday = await db
  .select({ count: sql<number>`count(*)` })
  .from(communicationHistory)
  .where(
    and(
      eq(communicationHistory.userId, userId),
      eq(communicationHistory.direction, 'outbound'),
      gte(communicationHistory.sentAt, todayStart)
    )
  );

// Companies contacted (using DISTINCT)
const companiesContactedThisWeek = await db
  .select({ count: sql<number>`count(distinct ${communicationHistory.companyId})` })
  .from(communicationHistory)
  .where(
    and(
      eq(communicationHistory.userId, userId),
      eq(communicationHistory.direction, 'outbound'),
      gte(communicationHistory.sentAt, weekStart)
    )
  );

// Calculate streaks from communication history
const allCommunications = await db
  .select({
    sentAt: communicationHistory.sentAt
  })
  .from(communicationHistory)
  .where(
    and(
      eq(communicationHistory.userId, userId),
      eq(communicationHistory.direction, 'outbound')
    )
  )
  .orderBy(desc(communicationHistory.sentAt));
```

### Phase 4: Data Migration

#### 4.1 Backfill existing daily outreach data
```sql
-- Run this after schema is updated
INSERT INTO communication_history (
  user_id, contact_id, company_id, channel, direction,
  subject, content, status, sent_at, source, 
  daily_outreach_item_id, created_at
)
SELECT 
  b.user_id, i.contact_id, i.company_id, 'email', 'outbound',
  i.email_subject, i.email_body, 'sent', i.sent_at, 'daily_outreach',
  i.id, i.sent_at
FROM daily_outreach_items i
JOIN daily_outreach_batches b ON i.batch_id = b.id
WHERE i.sent_at IS NOT NULL;

-- Update contact statuses based on history
UPDATE contacts 
SET contact_status = 'contacted',
    last_contacted_at = (
      SELECT MAX(sent_at) 
      FROM communication_history 
      WHERE contact_id = contacts.id
    ),
    total_communications = (
      SELECT COUNT(*) 
      FROM communication_history 
      WHERE contact_id = contacts.id
    )
WHERE id IN (
  SELECT DISTINCT contact_id 
  FROM communication_history
);
```

## Implementation Timeline

### Day 1: Schema Changes
- Add `communicationHistory` table
- Add contact status fields
- Add `communicationId` to `dailyOutreachItems`
- Run `npm run db:push --force`
- Test schema changes

### Day 2: Wire Send Points
- Update `/api/send-gmail` endpoint to track manual sends
- Update daily outreach mark-as-sent endpoint
- Add transaction support for data consistency
- Test both send paths thoroughly

### Day 3: Analytics Switch
- Update streak calculations to use `communicationHistory`
- Update all statistics queries (today/week/month/all-time)
- Verify counts match expected values
- Remove dependency on `dailyOutreachItems` for stats

### Day 4: Backfill & Cleanup
- Run migration script to backfill historical data
- Update all existing contact statuses
- Verify data integrity
- Remove old calculation logic

## Key Simplifications

1. **No UI changes initially** - Pure backend tracking
2. **No reply tracking yet** - Just foundation with threading fields
3. **No complex status transitions** - Simple contacted/uncontacted
4. **Keep existing daily outreach flow intact** - Minimal disruption
5. **Minimal fields** - No denormalization like `unreadCount`

## Testing Checklist

- [ ] Manual email send creates communication record
- [ ] Daily outreach send creates communication record
- [ ] Contact status updates to 'contacted' on first email
- [ ] Streak statistics show correct counts
- [ ] Companies contacted count is accurate
- [ ] Historical data backfilled correctly
- [ ] No duplicate communication records
- [ ] Transaction rollback works on failure

## Future Enhancements

1. **Reply Tracking** - Use threadId/messageId for Gmail sync
2. **Pipeline UI** - Visual contact progression
3. **Communication Timeline** - Show all interactions per contact
4. **Advanced Status** - Qualified/unqualified states
5. **Bounce Handling** - Track failed deliveries

## Notes

- Since the streak page is not yet released, no backward compatibility is needed
- The `contactStatus` field doesn't currently exist in the schema (confirmed)
- All statistics will be significantly more accurate after implementation
- This fixes the critical gap where manual outreach is completely invisible