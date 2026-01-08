# 5Ducks LinkedIn Integration - Technical Specification

**Version:** 1.0  
**Date:** January 2026  
**Status:** Ready for Implementation

---

## Executive Summary

Add LinkedIn engagement capabilities to 5Ducks, enabling users to warm up cold prospects through profile views, post likes, and comments before sending connection requests or emails. This creates a multi-channel outreach system that significantly improves response rates.

---

## 1. Overview

### 1.1 Goals

1. Allow users to connect their LinkedIn account to 5Ducks
2. Enable "warming" workflows that engage with prospects' public content before outreach
3. Provide a distraction-free UI for viewing and engaging with prospects' posts
4. Integrate LinkedIn actions into existing campaign/sequence infrastructure
5. Track all LinkedIn interactions in communication history

### 1.2 Key Insight

**You do NOT need to be connected to someone to:**
- View their profile (they get notified)
- Like their posts
- Comment on their posts
- React to their content

This enables a "warm before connect" strategy that dramatically increases connection acceptance rates.

---

## 2. Technical Architecture

### 2.1 LinkedIn API Approach

**Method:** Unofficial Voyager API via `linkedin-api` Python library

**Base URL:** `https://www.linkedin.com/voyager/api`

**Authentication:** Session cookies (`li_at`, `JSESSIONID`) obtained via username/password login

**Key Limitation:** This violates LinkedIn TOS. Implement conservative rate limits and clear user disclaimers.

### 2.2 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     5Ducks Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐     ┌──────────────────────────────┐ │
│  │  LinkedIn Auth   │     │     LinkedIn Action Queue    │ │
│  │     Service      │     │       (Rate Limited)         │ │
│  └────────┬─────────┘     └──────────────┬───────────────┘ │
│           │                              │                  │
│           ▼                              ▼                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LinkedIn Voyager Service                 │  │
│  │  • Profile fetching    • Post engagement              │  │
│  │  • Post fetching       • Connection requests          │  │
│  │  • Search              • Messaging                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                              │                              │
└──────────────────────────────┼──────────────────────────────┘
                               ▼
                    LinkedIn Voyager API
```

---

## 3. Database Schema

### 3.1 User LinkedIn Connection

```sql
-- Add to existing users table
ALTER TABLE users ADD COLUMN linkedin_cookies TEXT;  -- Encrypted JSON
ALTER TABLE users ADD COLUMN linkedin_public_id VARCHAR(255);
ALTER TABLE users ADD COLUMN linkedin_name VARCHAR(255);
ALTER TABLE users ADD COLUMN linkedin_photo_url TEXT;
ALTER TABLE users ADD COLUMN linkedin_connected_at TIMESTAMP;
ALTER TABLE users ADD COLUMN linkedin_cookie_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN linkedin_2fa_secret VARCHAR(64);  -- For auto-reconnect
```

### 3.2 Contact LinkedIn Fields

```sql
-- Add to existing contacts table
ALTER TABLE contacts ADD COLUMN linkedin_profile_url TEXT;
ALTER TABLE contacts ADD COLUMN linkedin_public_id VARCHAR(255);
ALTER TABLE contacts ADD COLUMN linkedin_urn VARCHAR(255);  -- urn:li:fs_miniProfile:XXX
ALTER TABLE contacts ADD COLUMN linkedin_headline TEXT;
ALTER TABLE contacts ADD COLUMN linkedin_photo_url TEXT;
ALTER TABLE contacts ADD COLUMN linkedin_connection_status VARCHAR(50) DEFAULT 'none';
  -- Values: 'none', 'pending', 'connected'
ALTER TABLE contacts ADD COLUMN linkedin_connection_sent_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN linkedin_connection_accepted_at TIMESTAMP;
ALTER TABLE contacts ADD COLUMN linkedin_last_engaged_at TIMESTAMP;

CREATE INDEX idx_contacts_linkedin_status ON contacts(linkedin_connection_status);
CREATE INDEX idx_contacts_linkedin_public_id ON contacts(linkedin_public_id);
```

### 3.3 LinkedIn Action Queue

```sql
CREATE TABLE linkedin_action_queue (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  contact_id INTEGER REFERENCES contacts(id),
  
  action_type VARCHAR(50) NOT NULL,
    -- 'view_profile', 'like_post', 'comment_post', 'react_post',
    -- 'send_connection', 'send_message'
  
  payload JSONB NOT NULL,
    -- { profileId, postUrn, message, reactionType, etc. }
  
  status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
  
  scheduled_at TIMESTAMP NOT NULL,
  executed_at TIMESTAMP,
  
  result JSONB,
  error TEXT,
  
  sequence_id INTEGER REFERENCES outreach_sequences(id),
  sequence_step INTEGER,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_linkedin_queue_status ON linkedin_action_queue(status, scheduled_at);
CREATE INDEX idx_linkedin_queue_user ON linkedin_action_queue(user_id, status);
```

### 3.4 LinkedIn Engagement History

```sql
CREATE TABLE linkedin_engagements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  contact_id INTEGER REFERENCES contacts(id),
  
  engagement_type VARCHAR(50) NOT NULL,
    -- 'profile_view', 'post_like', 'post_comment', 'post_reaction',
    -- 'connection_sent', 'connection_accepted', 'message_sent', 'message_received'
  
  linkedin_post_urn VARCHAR(255),
  linkedin_post_content TEXT,
  comment_text TEXT,
  reaction_type VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_linkedin_engagements_contact ON linkedin_engagements(contact_id);
```

### 3.5 Outreach Sequences (Extend Existing)

```sql
-- New table or extend existing campaign system
CREATE TABLE outreach_sequences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  
  channel VARCHAR(20) NOT NULL,  -- 'email', 'linkedin', 'multi_channel'
  
  steps JSONB NOT NULL,  -- Array of step definitions
  
  daily_limit INTEGER DEFAULT 20,
  status VARCHAR(20) DEFAULT 'draft',  -- 'draft', 'active', 'paused', 'completed'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 4. API Endpoints

### 4.1 LinkedIn Authentication

```
POST /api/linkedin/connect
  Body: { email, password }
  Response: { success, needsVerification?, challengeType?, profile? }

POST /api/linkedin/verify
  Body: { pin }
  Response: { success, profile }

POST /api/linkedin/setup-2fa
  Body: { secretKey }
  Response: { success }

DELETE /api/linkedin/disconnect
  Response: { success }

GET /api/linkedin/status
  Response: { connected, profile?, expiresAt? }
```

### 4.2 Contact LinkedIn Data

```
POST /api/contacts/:id/linkedin/find
  -- Search LinkedIn for this contact, update their record
  Response: { found, linkedinProfile? }

GET /api/contacts/:id/linkedin/posts
  Query: { limit: 5 }
  Response: { posts: LinkedInPost[] }

GET /api/contacts/:id/linkedin/profile
  Response: { profile: LinkedInProfile }
```

### 4.3 LinkedIn Actions

```
POST /api/linkedin/actions/view-profile
  Body: { contactId }
  Response: { queued: true, scheduledAt }

POST /api/linkedin/actions/like-post
  Body: { contactId, postUrn }
  Response: { queued: true, scheduledAt }

POST /api/linkedin/actions/comment-post
  Body: { contactId, postUrn, comment }
  Response: { queued: true, scheduledAt }

POST /api/linkedin/actions/send-connection
  Body: { contactId, message? }
  Response: { queued: true, scheduledAt }

POST /api/linkedin/actions/send-message
  Body: { contactId, message }
  Response: { queued: true, scheduledAt }
```

### 4.4 AI Comment Generation

```
POST /api/linkedin/generate-comment
  Body: { postContent, contactName, contactCompany, tone? }
  Response: { suggestion: string }
```

### 4.5 Engagement Tasks

```
GET /api/linkedin/engagement-tasks
  -- Get prospects with recent posts for manual engagement
  Query: { limit: 10 }
  Response: { tasks: EngagementTask[] }

POST /api/linkedin/engagement-tasks/:id/complete
  Body: { action: 'liked' | 'commented' | 'skipped', comment? }
  Response: { success }
```

---

## 5. Core Services

### 5.1 LinkedInAuthService

```typescript
class LinkedInAuthService {
  // Authenticate with username/password
  async connect(email: string, password: string): Promise<AuthResult>;
  
  // Handle 2FA/verification challenges
  async submitVerification(pin: string): Promise<AuthResult>;
  
  // Store 2FA secret for auto-reconnect
  async setup2FA(userId: number, secretKey: string): Promise<void>;
  
  // Check if user's session is still valid
  async checkSession(userId: number): Promise<boolean>;
  
  // Get authenticated API instance for a user
  async getApiForUser(userId: number): Promise<LinkedInApi | null>;
  
  // Disconnect and clear stored credentials
  async disconnect(userId: number): Promise<void>;
}
```

### 5.2 LinkedInProfileService

```typescript
class LinkedInProfileService {
  // Search for a contact on LinkedIn
  async findProfile(contact: Contact): Promise<LinkedInProfile | null>;
  
  // Get full profile data
  async getProfile(publicId: string): Promise<LinkedInProfile>;
  
  // Get recent posts from a profile
  async getProfilePosts(publicId: string, limit: number): Promise<LinkedInPost[]>;
  
  // View a profile (triggers notification to them)
  async viewProfile(publicId: string): Promise<void>;
}
```

### 5.3 LinkedInEngagementService

```typescript
class LinkedInEngagementService {
  // Like a post
  async likePost(postUrn: string): Promise<void>;
  
  // React to a post (LIKE, CELEBRATE, SUPPORT, LOVE, INSIGHTFUL, FUNNY)
  async reactToPost(postUrn: string, reactionType: string): Promise<void>;
  
  // Comment on a post
  async commentOnPost(postUrn: string, comment: string): Promise<void>;
  
  // Send connection request
  async sendConnection(publicId: string, message?: string): Promise<void>;
  
  // Send message (requires 1st degree connection)
  async sendMessage(conversationUrn: string, message: string): Promise<void>;
}
```

### 5.4 LinkedInActionQueue

```typescript
class LinkedInActionQueue {
  // Add action to queue with rate limiting
  async queueAction(
    userId: number,
    actionType: string,
    payload: object,
    scheduledAt?: Date
  ): Promise<QueuedAction>;
  
  // Process pending actions (called by cron job)
  async processQueue(): Promise<void>;
  
  // Get today's action count by type
  async getTodayCount(userId: number, actionType: string): Promise<number>;
  
  // Check if user has hit daily limit
  async canPerformAction(userId: number, actionType: string): Promise<boolean>;
}

// Rate Limits (conservative defaults)
const DAILY_LIMITS = {
  view_profile: 80,
  like_post: 50,
  comment_post: 20,
  react_post: 50,
  send_connection: 20,
  send_message: 50
};

// Minimum delay between actions (seconds)
const MIN_DELAY = 30;
const MAX_DELAY = 90;
```

---

## 6. Data Models

### 6.1 LinkedInPost

```typescript
interface LinkedInPost {
  urn: string;                    // urn:li:activity:123456
  authorName: string;
  authorHeadline: string;
  authorProfileUrl: string;
  authorProfilePicture: string;
  
  content: {
    text: string;
    images?: string[];
    video?: {
      thumbnailUrl: string;
      videoUrl: string;
    };
    article?: {
      title: string;
      description: string;
      imageUrl: string;
      url: string;
    };
  };
  
  postedAt: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}
```

### 6.2 LinkedInProfile

```typescript
interface LinkedInProfile {
  publicId: string;
  urn: string;
  firstName: string;
  lastName: string;
  headline: string;
  summary?: string;
  profilePictureUrl?: string;
  location?: string;
  industry?: string;
  connectionDegree: number;  // 1, 2, 3, or 0 (out of network)
  
  currentPosition?: {
    title: string;
    company: string;
    companyId?: string;
  };
}
```

### 6.3 EngagementTask

```typescript
interface EngagementTask {
  id: string;
  contact: Contact;
  post: LinkedInPost;
  suggestedAction: 'like' | 'comment' | 'both';
  aiCommentSuggestion?: string;
  sequenceContext?: {
    sequenceName: string;
    currentStep: number;
    nextStep: string;
  };
}
```

### 6.4 OutreachSequenceStep

```typescript
type OutreachSequenceStep =
  | { type: 'wait'; days: number }
  | { type: 'linkedin_view_profile' }
  | { type: 'linkedin_like_post' }
  | { type: 'linkedin_comment_post'; comment?: string; aiGenerate?: boolean }
  | { type: 'linkedin_connect'; message?: string }
  | { type: 'linkedin_message'; message: string }
  | { type: 'email'; subject: string; body: string }
  | { type: 'manual_task'; description: string }
  | { 
      type: 'condition';
      if: 'connected' | 'replied' | 'no_response' | 'has_recent_post';
      then: OutreachSequenceStep[];
      else?: OutreachSequenceStep[];
    };
```

---

## 7. First Workflow: Warm-Up Sequence

### 7.1 Workflow Definition

**Name:** "Warm Before Connect"

**Goal:** Engage with a cold prospect's content before requesting a connection, making you familiar before the ask.

**Steps:**

```
Day 1: View their profile
       → They see "Someone viewed your profile"

Day 2: Find and like their most recent post
       → They see you in their notifications again

Day 3: (Optional) Comment on their post
       → Higher visibility, they see your name + photo + comment
       → Can be AI-assisted or manual

Day 4: Send connection request with personalized note
       → Reference their post: "Loved your take on [topic]..."

Day 7: If connected → Send intro message
       If not connected → Send email as fallback
```

### 7.2 Sequence JSON

```json
{
  "name": "Warm Before Connect",
  "channel": "multi_channel",
  "steps": [
    {
      "type": "linkedin_view_profile"
    },
    {
      "type": "wait",
      "days": 1
    },
    {
      "type": "linkedin_like_post"
    },
    {
      "type": "wait",
      "days": 1
    },
    {
      "type": "manual_task",
      "description": "Review and comment on their post (optional)"
    },
    {
      "type": "wait",
      "days": 1
    },
    {
      "type": "linkedin_connect",
      "message": "Hi {{firstName}}, been enjoying your recent posts about {{industry}}. Would love to connect!"
    },
    {
      "type": "wait",
      "days": 3
    },
    {
      "type": "condition",
      "if": "connected",
      "then": [
        {
          "type": "linkedin_message",
          "message": "Thanks for connecting, {{firstName}}! I noticed {{company}} is {{recentNews}}. We help companies like yours with {{valueProposition}}. Worth a quick chat?"
        }
      ],
      "else": [
        {
          "type": "email",
          "subject": "Saw your LinkedIn post about {{postTopic}}",
          "body": "Hi {{firstName}},\n\nI came across your recent post about {{postTopic}} and thought it was spot on.\n\nI tried to connect on LinkedIn but wanted to reach out directly..."
        }
      ]
    }
  ]
}
```

### 7.3 Implementation Notes

1. **Post Selection:** When `linkedin_like_post` executes, automatically find the most recent post. If no posts exist, skip to next step.

2. **Manual Engagement Task:** The `manual_task` step creates an entry in the user's daily engagement task list. User sees the post in 5Ducks UI and can comment (with AI suggestion) without leaving the app.

3. **Variable Substitution:** Support these variables:
   - `{{firstName}}`, `{{lastName}}`, `{{company}}`, `{{title}}`
   - `{{industry}}`, `{{location}}`
   - `{{postTopic}}` - AI-extracted topic from their recent post
   - `{{recentNews}}` - From company enrichment
   - `{{valueProposition}}` - From user's product profile

4. **Connection Status Check:** Before executing `linkedin_message`, verify connection status. If `pending`, fall through to `else` branch.

---

## 8. UI Components

### 8.1 LinkedIn Connect Modal

Path: `client/src/components/linkedin/LinkedInConnectModal.tsx`

Screens:
1. **Consent** - Explain risks, get user agreement
2. **Credentials** - Email + password input
3. **Verification** - PIN entry (email/SMS/authenticator)
4. **2FA Setup** - Optional: paste secret key for auto-reconnect
5. **Success** - Show connected profile

### 8.2 Post Engagement Card

Path: `client/src/components/linkedin/PostCard.tsx`

Features:
- Display post content (text, images, video thumbnails, articles)
- Show author info and engagement stats
- Like button (instant action via API)
- Comment button → opens comment input
- AI suggestion button → generates comment
- "View on LinkedIn" link

### 8.3 Engagement Tasks Page

Path: `client/src/pages/EngagementTasks.tsx`

Features:
- Daily list of prospects with recent posts
- Each card shows: contact context, post content, suggested action
- Complete task: like, comment, or skip
- Shows sequence context ("Step 2 of Warm-Up Sequence")
- Progress indicator (X of Y completed today)

### 8.4 Sequence Builder

Path: `client/src/components/sequences/SequenceBuilder.tsx`

Features:
- Channel selector: Email / LinkedIn / Multi-Channel
- Drag-and-drop step ordering
- Step configuration panels
- Variable picker for message templates
- Preview mode
- Safety limits display

---

## 9. Background Jobs

### 9.1 Action Queue Processor

**Schedule:** Every 1 minute

**Logic:**
```
1. Get pending actions where scheduled_at <= now
2. For each action (limit 5 per run):
   a. Check user's LinkedIn session is valid
   b. Execute action via Voyager API
   c. Record result/error
   d. Update contact record if applicable
   e. Wait random 30-90 seconds
3. If session expired, mark user for reconnection
```

### 9.2 Daily Engagement Task Generator

**Schedule:** Daily at 6 AM (user's timezone)

**Logic:**
```
1. For each user with active LinkedIn + warming sequences:
   a. Get contacts in warming phase
   b. Fetch recent posts for each contact
   c. Create engagement tasks for posts found
   d. Prioritize contacts with:
      - Recent posts (< 7 days)
      - Higher engagement posts
      - Contacts further along in sequence
```

### 9.3 Connection Status Sync

**Schedule:** Every 4 hours

**Logic:**
```
1. For each user with pending connection requests:
   a. Fetch current connection list from LinkedIn
   b. Update contacts where status changed to 'connected'
   c. Trigger next sequence step for newly connected
```

---

## 10. Safety & Compliance

### 10.1 Rate Limits

| Action | Daily Limit | Min Delay Between |
|--------|-------------|-------------------|
| Profile views | 80 | 30s |
| Post likes | 50 | 30s |
| Post comments | 20 | 60s |
| Connection requests | 20 | 60s |
| Messages | 50 | 30s |

### 10.2 User Warnings

Display prominently in UI:
- "This feature uses unofficial LinkedIn automation"
- "LinkedIn may restrict accounts that automate excessively"
- "You use this feature at your own risk"
- "We enforce conservative limits to protect your account"

### 10.3 Error Handling

When LinkedIn returns challenge/restriction:
1. Pause all queued actions for user
2. Notify user immediately (in-app + email)
3. Provide reconnection instructions
4. Do not auto-retry failed actions

### 10.4 Data Security

- Never store passwords (only session cookies)
- Encrypt stored cookies at rest
- 2FA secret keys encrypted separately
- Clear all LinkedIn data on disconnect

---

## 11. Implementation Order

### Phase 1: Foundation (Week 1)

1. Database schema migrations
2. LinkedInAuthService (connect/verify/disconnect)
3. Basic Voyager API wrapper
4. LinkedIn Connect Modal UI
5. User settings page integration

### Phase 2: Profile & Posts (Week 2)

1. LinkedInProfileService
2. Contact LinkedIn enrichment
3. Post fetching and caching
4. PostCard component
5. Contact detail page - LinkedIn section

### Phase 3: Engagement (Week 3)

1. LinkedInEngagementService
2. Action queue with rate limiting
3. Queue processor background job
4. Individual action endpoints
5. Quick action buttons in UI

### Phase 4: Workflows (Week 4)

1. Sequence data model
2. Sequence builder UI
3. "Warm Before Connect" template
4. Engagement tasks page
5. Sequence execution engine

### Phase 5: Polish (Week 5)

1. AI comment generation
2. Connection status sync
3. Communication history integration
4. Analytics/reporting
5. Error handling & edge cases

---

## 12. Testing Checklist

- [ ] LinkedIn authentication with 2FA
- [ ] Session expiration and reconnection
- [ ] Profile fetching and caching
- [ ] Post fetching with all content types (text, image, video, article)
- [ ] Like action via queue
- [ ] Comment action via queue
- [ ] Connection request via queue
- [ ] Rate limiting enforcement
- [ ] Sequence step execution
- [ ] Condition branching (connected vs not)
- [ ] Manual engagement task flow
- [ ] AI comment generation quality
- [ ] Error handling for LinkedIn challenges
- [ ] Data cleanup on disconnect

---

## 13. Dependencies

### Backend
- `linkedin-api` (Python) - Voyager API wrapper
- `otplib` - TOTP code generation for 2FA
- `node-cron` - Background job scheduling

### Frontend
- Existing: React, TanStack Query, shadcn/ui
- No new dependencies required

---

## 14. Open Questions

1. **Python vs Node:** The most mature Voyager library is Python. Options:
   - Run Python service alongside Node backend
   - Port to Node (significant effort)
   - Use third-party API service (Unipile, etc.)

2. **Cookie Refresh:** Session cookies last ~60 days. Strategy for refresh:
   - Prompt user to reconnect
   - Auto-refresh if 2FA secret stored
   - Both?

3. **Multi-Account:** Support multiple LinkedIn accounts per user?
   - Useful for agencies
   - Adds complexity

---

## Appendix A: Sample Voyager API Calls

```python
from linkedin_api import Linkedin

# Initialize with credentials
api = Linkedin('email@example.com', 'password')

# Or with existing cookies
api = Linkedin('', '', cookies={'li_at': 'AQE...'})

# Get profile
profile = api.get_profile('bill-gates')

# Get recent posts
posts = api.get_profile_posts('bill-gates', post_count=5)

# View profile (triggers notification)
api.view_profile('bill-gates')

# Like a post
api.react_to_post('urn:li:activity:123456', 'LIKE')

# Comment on post (check library for exact method)
# May need to use raw API call

# Send connection request
api.add_connection('bill-gates', message='Would love to connect!')

# Send message (1st degree only)
api.send_message(
    message_body='Thanks for connecting!',
    recipients=['urn:li:fs_miniProfile:ABC123']
)
```

---

## Appendix B: Environment Variables

```bash
# LinkedIn (no API keys needed - uses user credentials)
LINKEDIN_COOKIE_ENCRYPTION_KEY=your-32-char-key

# Optional: Third-party API service
UNIPILE_API_KEY=xxx  # If using Unipile instead of direct Voyager
```

---

*End of Specification*
