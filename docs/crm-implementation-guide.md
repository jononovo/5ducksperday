# CRM Communications History Implementation Guide

## Executive Summary
Implementation guide for adding a unified CRM communications tracking system to 5ducks.ai, replacing fragmented email tracking with a single source of truth for all customer communications.

## Threading Recommendation
**YES - Add threading support now!** Here's why:
- Gmail conversations naturally have threads via `threadId`
- Adding it now prevents painful migrations later
- Minimal extra effort (just 2 fields)
- Essential for replies feature
- Enables conversation view in UI

Add these fields to the schema:
- `threadId`: Groups related messages (use Gmail's threadId when available)
- `parentId`: Links to parent message for reply chains
- `inReplyTo`: Stores email Message-ID for proper email threading

## Database Schema

### Full Communication History Table

```typescript
export const communicationHistory = pgTable("communication_history", {
  // === CORE IDENTIFICATION ===
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  
  // === CHANNEL & TYPE ===
  channel: text("channel").notNull().default('email'), // 'email', 'sms', 'phone', 'linkedin'
  direction: text("direction").notNull().default('outbound'), // 'outbound', 'inbound'
  
  // === CONTENT ===
  subject: text("subject"), // Email subject line
  content: text("content").notNull(), // Full message content
  contentPreview: text("content_preview"), // First 200 chars for list views
  
  // === STATUS TRACKING ===
  status: text("status").notNull().default('pending'),
  // Email statuses: 'pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'replied'
  // SMS statuses: 'pending', 'sent', 'delivered', 'failed', 'replied'
  
  // === THREADING (ADD NOW FOR REPLIES FEATURE) ===
  threadId: text("thread_id"), // Gmail threadId or generated UUID for non-Gmail
  parentId: integer("parent_id").references(() => communicationHistory.id), // Parent message
  inReplyTo: text("in_reply_to"), // Email Message-ID for proper threading
  references: text("references"), // Email References header for thread chain
  
  // === TIMESTAMPS ===
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  
  // === ATTRIBUTION ===
  campaignId: integer("campaign_id"), // Future: link to campaigns
  batchId: integer("batch_id").references(() => dailyOutreachBatches.id),
  templateId: integer("template_id"), // Future: link to templates
  
  // === METADATA (Channel-specific data) ===
  metadata: jsonb("metadata").default({}),
  // Email metadata structure:
  // {
  //   from: string,
  //   to: string,
  //   cc: string[],
  //   bcc: string[],
  //   replyTo: string,
  //   messageId: string (Gmail/SMTP ID),
  //   headers: object,
  //   tone: string,
  //   offerStrategy: string,
  //   sourceTable: string ('manual_outreach' | 'daily_outreach'),
  //   gmailThreadId: string,
  //   gmailHistoryId: string
  // }
  
  // === ENGAGEMENT METRICS ===
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  clickedLinks: jsonb("clicked_links").$type<string[]>().default([]),
  
  // === ERROR HANDLING ===
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // === AUDIT ===
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_comm_contact_id').on(table.contactId),
  index('idx_comm_company_id').on(table.companyId),
  index('idx_comm_user_id').on(table.userId),
  index('idx_comm_channel').on(table.channel),
  index('idx_comm_status').on(table.status),
  index('idx_comm_thread_id').on(table.threadId),
  index('idx_comm_sent_at').on(table.sentAt),
  index('idx_comm_created_at').on(table.createdAt),
  // Composite index for contact communication history
  index('idx_comm_contact_sent').on(table.contactId, table.sentAt),
  // Partial index for pending items
  index('idx_comm_pending').on(table.status).where(sql`status = 'pending'`),
]);
```

### Contact Table Updates

```typescript
// Add to contacts table:
contactStatus: text("contact_status").default('uncontacted'), 
// Values: 'uncontacted', 'contacted', 'replied', 'qualified', 'unqualified'

lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
lastContactChannel: text("last_contact_channel"), // 'email', 'sms', 'phone'
totalCommunications: integer("total_communications").default(0),
totalReplies: integer("total_replies").default(0),

// For email threading
lastThreadId: text("last_thread_id"), // Most recent conversation thread
```

## Implementation Steps

### Phase 1: Core Implementation (Week 1)

#### Step 1.1: Create Database Migration
```sql
-- Create the communication_history table with all fields
-- Include threading fields from the start to avoid migration later
CREATE TABLE communication_history (
  -- Use schema definition above
);

-- Update contacts table
ALTER TABLE contacts ADD COLUMN contact_status TEXT DEFAULT 'uncontacted';
ALTER TABLE contacts ADD COLUMN last_contacted_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN last_contact_channel TEXT;
ALTER TABLE contacts ADD COLUMN total_communications INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN last_thread_id TEXT;
```

#### Step 1.2: Update Manual Outreach Endpoint
Location: `/api/send-gmail`

```typescript
// After successful Gmail API send:
const gmailResponse = await gmail.users.messages.send({
  userId: 'me',
  requestBody: { raw: encodedMessage }
});

// Extract thread ID from Gmail response
const threadId = gmailResponse.data.threadId;
const messageId = gmailResponse.data.id;

// Save to communication history
await db.insert(communicationHistory).values({
  userId: session.user.id,
  contactId: contact.id,
  companyId: company.id,
  channel: 'email',
  direction: 'outbound',
  subject: subject,
  content: body,
  contentPreview: body.substring(0, 200),
  status: 'sent',
  sentAt: new Date(),
  threadId: threadId, // Gmail thread ID
  metadata: {
    from: senderEmail,
    to: recipientEmail,
    messageId: messageId,
    gmailThreadId: threadId,
    tone: tone,
    offerStrategy: offerStrategy,
    sourceTable: 'manual_outreach'
  }
});

// Update contact status
await db.update(contacts)
  .set({
    contactStatus: 'contacted',
    lastContactedAt: new Date(),
    lastContactChannel: 'email',
    lastThreadId: threadId,
    totalCommunications: sql`${contacts.totalCommunications} + 1`
  })
  .where(eq(contacts.id, contact.id));
```

#### Step 1.3: Update Daily Outreach Endpoint
Location: `/api/daily-outreach/send`

```typescript
// Similar implementation to manual outreach
// If using Gmail API, capture threadId
// If using SMTP, generate a UUID for threadId
const threadId = gmailResponse?.data?.threadId || crypto.randomUUID();

await db.insert(communicationHistory).values({
  userId: user.id,
  contactId: item.contactId,
  companyId: item.companyId,
  channel: 'email',
  direction: 'outbound',
  subject: item.emailSubject,
  content: item.emailBody,
  contentPreview: item.emailBody.substring(0, 200),
  status: 'sent',
  sentAt: new Date(),
  threadId: threadId,
  batchId: item.batchId,
  metadata: {
    from: senderEmail,
    to: contact.email,
    messageId: messageId,
    dailyOutreachItemId: item.id,
    sourceTable: 'daily_outreach'
  }
});
```

### Phase 2: Data Migration (Week 1)

```sql
-- Migrate existing daily_outreach_items to communication_history
INSERT INTO communication_history (
  userId, contactId, companyId, channel, direction, 
  subject, content, status, sentAt, threadId, metadata, createdAt
)
SELECT 
  doi.userId,
  doi.contactId,
  doi.companyId,
  'email' as channel,
  'outbound' as direction,
  doi.emailSubject as subject,
  doi.emailBody as content,
  CASE 
    WHEN doi.status = 'sent' THEN 'sent'
    WHEN doi.status = 'skipped' THEN 'skipped'
    ELSE 'pending'
  END as status,
  doi.sentAt,
  md5(doi.id::text || doi.contactId::text)::uuid as threadId, -- Generate thread ID
  jsonb_build_object(
    'migrated_from', 'daily_outreach_items',
    'original_id', doi.id,
    'batch_id', doi.batchId
  ) as metadata,
  doi.createdAt
FROM daily_outreach_items doi
WHERE doi.status IN ('sent', 'skipped');

-- Update contact statuses based on communication history
UPDATE contacts c
SET 
  contact_status = 'contacted',
  last_contacted_at = ch.last_sent,
  last_contact_channel = 'email',
  total_communications = ch.comm_count
FROM (
  SELECT 
    contactId,
    MAX(sentAt) as last_sent,
    COUNT(*) as comm_count
  FROM communication_history
  WHERE status = 'sent'
  GROUP BY contactId
) ch
WHERE c.id = ch.contactId;
```

### Phase 3: Reply Handling (Week 2)

#### Gmail Webhook for Incoming Emails
```typescript
// When receiving Gmail push notification or polling for new messages
async function handleIncomingEmail(message: gmail_v1.Schema$Message) {
  const threadId = message.threadId;
  const inReplyTo = extractHeader(message, 'In-Reply-To');
  const references = extractHeader(message, 'References');
  
  // Find parent message
  const parentMessage = await db.select()
    .from(communicationHistory)
    .where(eq(communicationHistory.threadId, threadId))
    .orderBy(desc(communicationHistory.sentAt))
    .limit(1);
  
  // Save reply
  await db.insert(communicationHistory).values({
    userId: parentMessage[0]?.userId,
    contactId: parentMessage[0]?.contactId,
    companyId: parentMessage[0]?.companyId,
    channel: 'email',
    direction: 'inbound',
    subject: extractSubject(message),
    content: extractBody(message),
    status: 'received',
    threadId: threadId,
    parentId: parentMessage[0]?.id,
    inReplyTo: inReplyTo,
    references: references,
    sentAt: new Date(parseInt(message.internalDate)),
    metadata: {
      messageId: message.id,
      from: extractHeader(message, 'From'),
      to: extractHeader(message, 'To'),
      gmailThreadId: threadId,
      gmailHistoryId: message.historyId
    }
  });
  
  // Update contact to 'replied' status
  if (parentMessage[0]?.contactId) {
    await db.update(contacts)
      .set({
        contactStatus: 'replied',
        totalReplies: sql`${contacts.totalReplies} + 1`
      })
      .where(eq(contacts.id, parentMessage[0].contactId));
  }
}
```

### Phase 4: UI Components (Week 2)

#### Communication Timeline Component
```typescript
// Component to show all communications with a contact
export function CommunicationTimeline({ contactId }: { contactId: number }) {
  const communications = await db.select()
    .from(communicationHistory)
    .where(eq(communicationHistory.contactId, contactId))
    .orderBy(desc(communicationHistory.sentAt));
  
  // Group by threadId for conversation view
  const threads = groupBy(communications, 'threadId');
  
  return (
    <div>
      {Object.entries(threads).map(([threadId, messages]) => (
        <ConversationThread key={threadId} messages={messages} />
      ))}
    </div>
  );
}
```

## Testing Checklist

### Database Tests
- [ ] Communication history table created successfully
- [ ] All indexes created and performing well
- [ ] Contact fields updated correctly
- [ ] Thread IDs properly linked between messages

### Integration Tests
- [ ] Manual outreach saves to communication_history
- [ ] Daily outreach saves to communication_history
- [ ] Contact status updates after sending email
- [ ] Thread IDs captured from Gmail API
- [ ] Thread IDs generated for non-Gmail sends

### Data Migration Tests
- [ ] All sent daily_outreach_items migrated
- [ ] Contact statistics accurately calculated
- [ ] No data loss during migration

### Reply Handling Tests
- [ ] Incoming emails create inbound records
- [ ] Replies properly linked to parent messages
- [ ] Thread continuity maintained
- [ ] Contact status changes to 'replied'

## Monitoring & Analytics Queries

### Daily Email Volume
```sql
SELECT 
  DATE(sentAt) as date,
  COUNT(*) as total_sent,
  COUNT(DISTINCT contactId) as unique_contacts,
  COUNT(DISTINCT companyId) as unique_companies
FROM communication_history
WHERE channel = 'email' 
  AND direction = 'outbound'
  AND status = 'sent'
GROUP BY DATE(sentAt)
ORDER BY date DESC;
```

### Contact Engagement Funnel
```sql
SELECT 
  contact_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM contacts
GROUP BY contact_status
ORDER BY 
  CASE contact_status
    WHEN 'uncontacted' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'replied' THEN 3
    WHEN 'qualified' THEN 4
    ELSE 5
  END;
```

### Thread Analysis
```sql
SELECT 
  threadId,
  COUNT(*) as message_count,
  SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as sent_count,
  SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as received_count,
  MIN(sentAt) as thread_started,
  MAX(sentAt) as last_activity
FROM communication_history
GROUP BY threadId
HAVING COUNT(*) > 1
ORDER BY last_activity DESC;
```

## Future Enhancements

### Phase 5: Advanced Features (Month 2+)
1. **Email Open/Click Tracking**
   - Integrate with SendGrid/Mailgun for pixel tracking
   - Update openedAt, clickedAt timestamps
   - Track clickedLinks array

2. **SMS Integration**
   - Add Twilio integration
   - Store phone numbers in metadata
   - Track delivery receipts

3. **Campaign Management**
   - Create campaigns table
   - Link communications to campaigns
   - Track campaign performance metrics

4. **Smart Threading**
   - AI-powered subject line matching for thread grouping
   - Conversation summarization
   - Suggested reply timing

5. **Automation Rules**
   - Auto-follow-up if no reply in X days
   - Status-based workflow triggers
   - Engagement scoring

## Key Decisions & Rationale

### Why Include Threading Now?
1. **Gmail already provides threadId** - We get it for free, why not store it?
2. **Prevents painful migration** - Adding threading later requires complex data updates
3. **Enables conversation view** - Users can see full context of interactions
4. **Required for replies** - The replies feature needs this foundation
5. **Minimal extra effort** - Just 3-4 additional fields

### Why Single Table for All Channels?
1. **Unified reporting** - Single query for all communications
2. **Simpler codebase** - One model, one API
3. **Flexibility** - JSON metadata handles channel differences
4. **Standard practice** - Most CRMs use this approach

### Why Not Use Existing Tables?
1. **Never deployed** - No migration needed
2. **Wrong architecture** - Thread-centric vs activity-centric
3. **Missing 70% of requirements** - Would need major changes anyway
4. **Clean slate advantage** - Design it right from the start

## Success Metrics
- **Week 1**: Both email systems writing to new table
- **Week 2**: Reply tracking functional
- **Month 1**: 100% of emails tracked with threading
- **Month 2**: Analytics dashboard showing engagement metrics
- **Month 3**: Multi-channel support (if needed)

## Contact & Support
For questions about this implementation:
1. Review the codebase examples in `/api/send-gmail` and `/api/daily-outreach`
2. Check the schema definitions in `shared/schema.ts`
3. Test threading with actual Gmail API responses

---
*Document Version: 1.0*  
*Last Updated: Current*  
*Platform: 5ducks.ai*