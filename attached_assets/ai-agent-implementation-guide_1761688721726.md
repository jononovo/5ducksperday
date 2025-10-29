# AI Agent Implementation Guide
## New User Onboarding Chat Workflow for 5Ducks.ai

### Executive Summary
This guide provides step-by-step instructions for an AI agent to implement a post-search onboarding chatbot that confirms search results, triggers existing modal forms, auto-generates ICPs, and orchestrates the complete user setup flow.

---

## Technology Stack & Architecture

### Core Technologies
- **Frontend Framework**: React 18 with TypeScript
- **Chat UI**: Custom React component with TanStack Query for state management
- **AI Services**: 
  - **OpenAI GPT-4** via OpenAI Node.js SDK v4 (primary conversation engine)
  - **Perplexity API** (market research & company analysis)
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth with session management
- **Real-time Updates**: React Query mutations with optimistic updates

### Recommended AI Agent Framework
```typescript
// Use OpenAI's Assistant API with function calling
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Assistant configuration
const assistant = await openai.beta.assistants.create({
  name: "5Ducks Onboarding Assistant",
  instructions: "You are a B2B sales strategist helping users set up their outreach campaigns...",
  tools: [
    { type: "function", function: searchConfirmationSchema },
    { type: "function", function: icpGeneratorSchema },
    { type: "function", function: modalTriggerSchema }
  ],
  model: "gpt-4-turbo-preview"
});
```

---

## Implementation Architecture

### 1. Create New Module Structure
```
server/features/onboarding-chat/
├── index.ts              # Module exports
├── routes.ts             # Express routes
├── handlers/
│   ├── search-confirmation.ts
│   ├── icp-generation.ts
│   └── workflow-orchestration.ts
├── services/
│   ├── chat-manager.ts
│   ├── icp-generator.ts
│   └── profile-validator.ts
└── types.ts              # TypeScript interfaces

client/src/features/onboarding-chat/
├── index.ts
├── components/
│   ├── ChatInterface.tsx
│   ├── SearchConfirmation.tsx
│   └── ICPPreview.tsx
├── hooks/
│   ├── useOnboardingChat.ts
│   └── useWorkflowState.ts
├── services/
│   └── chat.service.ts
└── types.ts
```

### 2. Database Schema Updates

```typescript
// Add to server/db/schema.ts
export const onboardingChats = pgTable("onboarding_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  sessionId: text("session_id").notNull().unique(),
  phase: text("phase").notNull(), // 'search_confirm' | 'product_setup' | 'icp_generation' | 'sender_setup' | 'complete'
  searchQuery: text("search_query"),
  searchResultsConfirmed: boolean("search_results_confirmed").default(false),
  icpData: json("icp_data").$type<ICPData>(),
  productId: integer("product_id").references(() => strategicProfiles.id),
  senderProfileId: integer("sender_profile_id").references(() => senderProfiles.id),
  customerProfileId: integer("customer_profile_id").references(() => customerProfiles.id),
  conversationHistory: json("conversation_history").$type<Message[]>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
```

---

## Detailed Implementation Steps

### Step 1: Backend API Endpoints

#### `/api/onboarding-chat/initialize` (POST)
```typescript
// server/features/onboarding-chat/routes.ts
export function registerOnboardingChatRoutes(app: Express, requireAuth: any) {
  
  app.post("/api/onboarding-chat/initialize", requireAuth, async (req, res) => {
    const userId = getUserId(req);
    const { searchQuery, searchResults } = req.body;
    
    // Create new chat session
    const sessionId = generateSessionId();
    const chat = await storage.createOnboardingChat({
      userId,
      sessionId,
      phase: 'search_confirm',
      searchQuery,
      conversationHistory: []
    });
    
    // Analyze search results using Perplexity
    const analysis = await analyzeSearchResults(searchResults);
    
    res.json({
      sessionId,
      initialMessage: formatSearchConfirmation(searchResults, analysis),
      quickReplies: ['Perfect match', 'Need refinement', 'Wrong results']
    });
  });
}
```

#### `/api/onboarding-chat/message` (POST)
```typescript
app.post("/api/onboarding-chat/message", requireAuth, async (req, res) => {
  const { sessionId, message, quickReply } = req.body;
  const chat = await storage.getOnboardingChat(sessionId);
  
  // Process message based on current phase
  const response = await processMessage(chat, message, quickReply);
  
  // Update chat state
  await storage.updateOnboardingChat(sessionId, {
    phase: response.nextPhase,
    conversationHistory: [...chat.conversationHistory, 
      { role: 'user', content: message },
      { role: 'assistant', content: response.message }
    ]
  });
  
  res.json({
    message: response.message,
    action: response.action, // 'show_modal' | 'generate_icp' | 'continue'
    actionData: response.actionData,
    quickReplies: response.quickReplies
  });
});
```

#### `/api/onboarding-chat/generate-icp` (POST)
```typescript
app.post("/api/onboarding-chat/generate-icp", requireAuth, async (req, res) => {
  const { sessionId } = req.body;
  const chat = await storage.getOnboardingChat(sessionId);
  
  // Get user's product data
  const product = await storage.getStrategicProfile(chat.productId);
  
  // Generate ICP using OpenAI
  const icpPrompt = buildICPPrompt(chat.searchQuery, product);
  const icp = await generateICPWithOpenAI(icpPrompt);
  
  // Save ICP as CustomerProfile
  const customerProfile = await storage.createCustomerProfile({
    userId: chat.userId,
    ...icp
  });
  
  await storage.updateOnboardingChat(sessionId, {
    customerProfileId: customerProfile.id,
    icpData: icp
  });
  
  res.json({ icp, profileId: customerProfile.id });
});
```

### Step 2: Frontend React Components

#### Main Chat Interface
```tsx
// client/src/features/onboarding-chat/components/ChatInterface.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ProductOnboardingForm } from '@/components/product-onboarding-form';
import { SenderProfileForm } from '@/components/sender-profile-form';

export function OnboardingChatInterface({ searchQuery, searchResults }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSenderModal, setShowSenderModal] = useState(false);
  
  // Initialize chat session
  const initializeChat = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/onboarding-chat/initialize', {
        method: 'POST',
        body: JSON.stringify({ searchQuery, searchResults })
      });
    },
    onSuccess: (data) => {
      setSessionId(data.sessionId);
      setMessages([{
        id: Date.now().toString(),
        content: data.initialMessage,
        sender: 'assistant',
        quickReplies: data.quickReplies
      }]);
    }
  });
  
  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('/api/onboarding-chat/message', {
        method: 'POST',
        body: JSON.stringify({ sessionId, message })
      });
    },
    onSuccess: (data) => {
      // Handle response actions
      if (data.action === 'show_modal') {
        if (data.actionData.type === 'product') {
          setShowProductModal(true);
        } else if (data.actionData.type === 'sender') {
          setShowSenderModal(true);
        }
      } else if (data.action === 'generate_icp') {
        generateICP.mutate();
      }
      
      // Add response to messages
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: data.message,
        sender: 'assistant',
        quickReplies: data.quickReplies
      }]);
    }
  });
  
  // Generate ICP mutation
  const generateICP = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/onboarding-chat/generate-icp', {
        method: 'POST',
        body: JSON.stringify({ sessionId })
      });
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: <ICPPreview icp={data.icp} />,
        sender: 'assistant',
        isComponent: true
      }]);
    }
  });
  
  useEffect(() => {
    initializeChat.mutate();
  }, []);
  
  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} onQuickReply={sendMessage.mutate} />
        ))}
      </div>
      
      <ChatInput onSend={sendMessage.mutate} disabled={sendMessage.isPending} />
      
      {/* Modal Integrations */}
      <ProductOnboardingForm 
        open={showProductModal}
        onClose={() => setShowProductModal(false)}
        onComplete={(profileId) => {
          setShowProductModal(false);
          sendMessage.mutate('Product setup complete');
        }}
      />
      
      <SenderProfileForm
        open={showSenderModal}
        onClose={() => setShowSenderModal(false)}
        onComplete={() => {
          setShowSenderModal(false);
          sendMessage.mutate('Sender profile complete');
        }}
      />
    </div>
  );
}
```

### Step 3: AI Service Integration

#### ICP Generation Service
```typescript
// server/features/onboarding-chat/services/icp-generator.ts
import { queryOpenAI } from '../../../ai-services';

export async function generateICPWithOpenAI(context: {
  searchQuery: string;
  searchResults: any[];
  product: any;
}): Promise<ICPData> {
  
  const prompt = `Based on the following context, generate an Ideal Customer Profile:
  
  Search Query: ${context.searchQuery}
  Number of Results: ${context.searchResults.length}
  Sample Companies: ${context.searchResults.slice(0, 5).map(c => c.name).join(', ')}
  
  Product: ${context.product.productService}
  Customer Feedback: ${context.product.customerFeedback}
  
  Generate a comprehensive ICP with:
  1. Target company characteristics (industry, size, location)
  2. Decision maker titles (primary and secondary)
  3. Key pain points this product solves
  4. Value proposition statement
  5. Optimized search query for finding similar companies
  
  Return as JSON.`;
  
  const response = await queryOpenAI([
    { role: 'system', content: 'You are a B2B sales strategist creating detailed ICPs.' },
    { role: 'user', content: prompt }
  ]);
  
  return JSON.parse(response);
}
```

#### Search Refinement Service
```typescript
// server/features/onboarding-chat/services/search-refinement.ts
import { queryPerplexity } from '../../../search/perplexity/perplexity-client';

export async function refineSearchCriteria(
  currentQuery: string,
  userFeedback: string
): Promise<SearchCriteria> {
  
  const messages = [
    {
      role: 'system',
      content: 'You are a search refinement expert. Analyze user feedback and suggest improved search parameters.'
    },
    {
      role: 'user',
      content: `Current search: "${currentQuery}"
      User feedback: "${userFeedback}"
      
      Suggest refined search criteria including:
      - Industries
      - Company size
      - Location
      - Keywords
      
      Return as JSON.`
    }
  ];
  
  const response = await queryPerplexity(messages);
  return JSON.parse(response);
}
```

### Step 4: Workflow Orchestration

#### State Machine Implementation
```typescript
// server/features/onboarding-chat/services/workflow-orchestration.ts

type WorkflowPhase = 
  | 'search_confirm'
  | 'search_refine'
  | 'product_setup'
  | 'icp_generation'
  | 'icp_confirmation'
  | 'sender_setup'
  | 'complete';

interface WorkflowTransition {
  from: WorkflowPhase;
  to: WorkflowPhase;
  condition: (context: ChatContext) => boolean;
  action?: (context: ChatContext) => Promise<void>;
}

const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  {
    from: 'search_confirm',
    to: 'product_setup',
    condition: (ctx) => ctx.searchConfirmed && !ctx.hasProduct,
    action: async (ctx) => {
      // Trigger product modal
      return { action: 'show_modal', actionData: { type: 'product' } };
    }
  },
  {
    from: 'search_confirm',
    to: 'icp_generation',
    condition: (ctx) => ctx.searchConfirmed && ctx.hasProduct
  },
  {
    from: 'product_setup',
    to: 'icp_generation',
    condition: (ctx) => ctx.productId !== null
  },
  {
    from: 'icp_generation',
    to: 'icp_confirmation',
    condition: (ctx) => ctx.icpGenerated
  },
  {
    from: 'icp_confirmation',
    to: 'sender_setup',
    condition: (ctx) => ctx.icpConfirmed && !ctx.hasSenderProfile
  },
  {
    from: 'icp_confirmation',
    to: 'complete',
    condition: (ctx) => ctx.icpConfirmed && ctx.hasSenderProfile
  }
];

export function getNextPhase(
  currentPhase: WorkflowPhase,
  context: ChatContext
): WorkflowPhase {
  const transition = WORKFLOW_TRANSITIONS.find(
    t => t.from === currentPhase && t.condition(context)
  );
  return transition?.to || currentPhase;
}
```

### Step 5: Integration Points

#### Trigger from Search Page
```tsx
// client/src/pages/search.tsx (modification)
import { OnboardingChatInterface } from '@/features/onboarding-chat';

export function SearchPage() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: userProfile } = useQuery(['/api/user/profile']);
  
  // Check if first search
  useEffect(() => {
    if (searchResults && !userProfile?.hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [searchResults, userProfile]);
  
  return (
    <>
      {/* Existing search UI */}
      
      {showOnboarding && (
        <OnboardingChatInterface
          searchQuery={searchQuery}
          searchResults={searchResults}
          onComplete={() => {
            setShowOnboarding(false);
            // Navigate to dashboard
          }}
        />
      )}
    </>
  );
}
```

---

## Testing Strategy

### Unit Tests
```typescript
// server/features/onboarding-chat/__tests__/icp-generator.test.ts
describe('ICP Generator', () => {
  it('should generate ICP from search and product data', async () => {
    const mockContext = {
      searchQuery: 'SaaS companies in California',
      searchResults: [/* mock data */],
      product: {
        productService: 'Email automation tool',
        customerFeedback: 'Saves time on outreach'
      }
    };
    
    const icp = await generateICPWithOpenAI(mockContext);
    
    expect(icp).toHaveProperty('targetCompanies');
    expect(icp).toHaveProperty('decisionMakers');
    expect(icp).toHaveProperty('painPoints');
    expect(icp).toHaveProperty('valueProposition');
  });
});
```

### Integration Tests
```typescript
// e2e/onboarding-flow.test.ts
describe('Onboarding Chat Flow', () => {
  it('should complete full onboarding flow', async () => {
    // 1. Initialize chat
    const { sessionId } = await api.post('/api/onboarding-chat/initialize', {
      searchQuery: 'hotels in NYC',
      searchResults: mockSearchResults
    });
    
    // 2. Confirm search
    await api.post('/api/onboarding-chat/message', {
      sessionId,
      quickReply: 'Perfect match'
    });
    
    // 3. Complete product setup
    await api.post('/api/strategic-profiles/quick-setup', {
      businessType: 'product',
      productService: 'Hotel management software'
    });
    
    // 4. Generate ICP
    const { icp } = await api.post('/api/onboarding-chat/generate-icp', {
      sessionId
    });
    
    expect(icp.targetCompanies.industry).toContain('hospitality');
  });
});
```

---

## Deployment Checklist

### Environment Variables
```bash
# Required in .env
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
DATABASE_URL=postgresql://...
FIREBASE_CONFIG={"apiKey":"..."}
```

### Database Migrations
```bash
# Create migration
npm run db:generate

# Apply migration
npm run db:push
```

### Feature Flags
```typescript
// server/config/features.ts
export const FEATURES = {
  ONBOARDING_CHAT: process.env.ENABLE_ONBOARDING_CHAT === 'true'
};
```

### Monitoring & Analytics
```typescript
// Track key metrics
analytics.track('onboarding_chat_started', { userId, searchQuery });
analytics.track('onboarding_chat_completed', { userId, duration, stepsCompleted });
analytics.track('icp_generated', { userId, industry, companySize });
```

---

## Common Pitfalls & Solutions

### Issue 1: Modal State Management
**Problem**: Modals closing unexpectedly during chat flow
**Solution**: Use portal rendering and maintain modal state in parent component

### Issue 2: Session Persistence
**Problem**: Chat session lost on page refresh
**Solution**: Store sessionId in localStorage and resume on mount

### Issue 3: ICP Generation Timeout
**Problem**: OpenAI calls timing out for complex ICPs
**Solution**: Implement streaming responses and show progressive updates

### Issue 4: Search Refinement Loop
**Problem**: Users stuck in refinement cycle
**Solution**: Add "Skip refinement" option after 2 attempts

---

## Additional Resources

- **OpenAI Assistant API Docs**: https://platform.openai.com/docs/assistants
- **Perplexity API Reference**: Internal docs at `/docs/perplexity-api`
- **Existing Modal Components**: `/client/src/components/*-form.tsx`
- **Database Schema**: `/shared/schema.ts`
- **AI Services**: `/server/ai-services/`

---

## Support & Troubleshooting

For implementation questions:
1. Check existing implementations in `/server/user-chatbox/react/`
2. Review similar flows in Strategy Chat feature
3. Reference the modular architecture pattern in `/replit.md`

---

*This guide is optimized for AI agents using GPT-4 or Claude 3+ for implementation*
*Last updated: November 2024*
*Platform: 5Ducks.ai*