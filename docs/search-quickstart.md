# 5 Ducks Search System Quick Reference

This document provides a quick reference for developers and AI agents to modify or add search capabilities to the platform.

## Key Files Map

### Core Module Files
- `server/lib/search-modules.ts` - Main search module definitions and implementations
- `server/lib/search-logic/shared/types.ts` - Core type definitions
- `server/lib/perplexity.ts` - Perplexity AI integration

### Contact Discovery
- `server/lib/results-analysis/contact-analysis.ts` - Contact parsing and analysis
- `server/lib/results-analysis/contact-name-validation.ts` - Name validation logic
- `server/lib/search-logic/contact-discovery/enhanced-contact-discovery.ts` - Enhanced validation

### Email Discovery
- `server/lib/search-logic/email-discovery/index.ts` - Email discovery module config
- `server/lib/search-logic/email-discovery/service.ts` - Email discovery orchestration
- `server/lib/search-logic/email-discovery/strategies/` - Email discovery implementations
- `server/lib/results-analysis/email-analysis.ts` - Email validation functions

### API Integration
- `server/lib/api/perplexity-client.ts` - Perplexity API client
- `server/lib/search-logic/email-discovery/aeroleads-search.ts` - AeroLeads API client

### Routes
- `server/routes.ts` - API endpoints for search operations

## Quick Guide: Adding a New Search Version

### 1. Create a New Strategy

```typescript
// server/lib/search-logic/email-discovery/strategies/new-strategy.ts
import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';

export const newStrategy: EmailSearchStrategy = {
  name: "New Strategy Name",
  description: "Description of what this strategy does",
  
  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyWebsite, companyDomain } = context;
    
    // Implementation logic here
    
    return {
      source: "new_strategy",
      emails: ["discovered@email.com"],
      metadata: {
        searchDate: new Date().toISOString(),
        // Additional metadata
      }
    };
  }
};
```

### 2. Register the Strategy

```typescript
// server/lib/search-logic/email-discovery/index.ts
import { newStrategy } from './strategies/new-strategy';

export const emailDiscoveryModule = {
  id: "email_discovery",
  label: "Email Discovery",
  description: "Multi-source email discovery and verification",
  searches: [
    // Existing strategies...
    {
      id: "new-strategy",
      label: "New Strategy Name",
      description: "Description of what this strategy does",
      implementation: newStrategy,
      defaultEnabled: false  // Set to true to enable by default
    }
  ]
};
```

### 3. Configure Validation Rules

For contact validation, customize thresholds in the validation functions:

```typescript
// server/lib/search-logic/contact-discovery/enhanced-contact-discovery.ts
export function filterContacts(
  contacts: Partial<Contact>[],
  companyName: string,
  options: DiscoveryOptions = {
    minimumNameScore: 70,  // Adjust threshold as needed
    companyNamePenalty: 30,
    filterGenericNames: true
  }
): Partial<Contact>[] {
  // Implementation...
}
```

For email validation, adjust scoring logic:

```typescript
// server/lib/search-logic/email-discovery/enhanced-validation.ts
export function validateEmailEnhanced(
  email: string,
  options: EnhancedEmailValidationOptions = {
    minimumPatternScore: 60,  // Adjust threshold as needed
    domainCheck: true,
    nameValidation: true
  }
): number {
  // Implementation...
}
```

## Quick Guide: Modifying Search Modules

### 1. Update Module Prompts

```typescript
// server/lib/search-modules.ts
export const DECISION_MAKER_MODULE = {
  type: 'decision_maker',
  defaultPrompt: "Updated prompt for decision maker search",
  technicalPrompt: `Updated technical prompt with 
  additional instructions or improved formatting`,
  responseStructure: {
    // Update response structure if needed
  },
  // Other configuration...
};
```

### 2. Customize Search Flow

Modify the module's execute method:

```typescript
// server/lib/search-modules.ts (in DecisionMakerModule class)
async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
  // Modify execution logic here
  
  // For example, add additional validation steps:
  for (const contact of extractedContacts) {
    // Additional validation logic
    if (someNewCondition) {
      contact.probability = Math.min(contact.probability * 0.8, 100);
    }
  }
  
  // Or add new data sources:
  try {
    const additionalData = await someNewDataSource(company.name);
    // Process and merge the data
  } catch (error) {
    console.error('Error with new data source:', error);
  }
  
  // Return results
}
```

## Quick Guide: Improving Validation

### 1. Enhance Contact Name Validation

```typescript
// server/lib/results-analysis/contact-name-validation.ts
// Add new validation steps to the validateName function

function validateName(
  name: string,
  context: string,
  companyName?: string | null,
  options: ValidationOptions = {}
): NameValidationResult {
  const steps: ValidationStepResult[] = [
    // Existing steps...
    
    // Add new validation step
    {
      name: "new_validation_rule",
      score: someNewValidationLogic(name),
      weight: 0.2,
      reason: "Description of new validation rule"
    }
  ];
  
  // Proceed with combining scores...
}
```

### 2. Enhance Email Validation

```typescript
// server/lib/results-analysis/email-analysis.ts
// Add or modify email validation rules

export function validateEmailPattern(email: string): number {
  // Existing validation logic
  
  // Add new validation checks
  if (someNewCondition) {
    score += 10; // Adjust scoring
  }
  
  return score;
}
```

## Quick Guide: Integration with External APIs

### 1. Add New External API Client

```typescript
// server/lib/api/new-api-client.ts
export async function queryNewApi(parameters: any): Promise<any> {
  const apiKey = process.env.NEW_API_KEY;
  if (!apiKey) {
    throw new Error("New API key is not configured");
  }

  try {
    const response = await fetch("https://api.newservice.com/endpoint", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(parameters)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('New API error:', error);
    throw error;
  }
}
```

### 2. Integrate with Search Flow

```typescript
// Add to relevant search module or strategy
import { queryNewApi } from '../../api/new-api-client';

// Then in your strategy or module execution logic:
try {
  const apiResults = await queryNewApi({
    query: companyName,
    // Other parameters...
  });
  
  // Process results
} catch (error) {
  console.error('Error with new API:', error);
}
```

## Testing Your Changes

1. **Manual Testing**:
   - Use the frontend to run searches with your new or modified module
   - Check the server logs for execution details
   - Verify results in the database

2. **Debugging Tips**:
   - Add console.log statements to track execution flow
   - Log intermediate results to verify data transformation
   - Check confidence scores to ensure validation is working properly

3. **Performance Monitoring**:
   - Track execution time for your modified components
   - Monitor external API usage
   - Check memory usage for large result sets