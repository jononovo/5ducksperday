# Home Page Modularization Guide

## Overview
This guide provides a safe, incremental approach to modularizing the home.tsx file in the 5Ducks application. The plan is organized from easiest to hardest, ensuring each phase can be completed independently without breaking existing functionality.

## Current State Analysis
- **File**: `/client/src/pages/home.tsx`
- **Estimated Size**: ~2000+ lines
- **Main Issues**: 
  - Mixed concerns (search, email composition, display logic)
  - Difficult for AI agents to work with
  - Hard to test individual features
  - Code duplication with other pages

## Goal Architecture

```
client/src/features/
├── search/                    # Search functionality
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── types.ts
└── email-composer/           # Email composition (shared)
    ├── components/
    ├── hooks/
    └── context/
```

---

## PHASE 1: Pure Component Extractions (Zero Risk)

### Step 1.1: Move Existing Display Components

These components are already separate and just need to be relocated:

```bash
# Create feature directory structure
mkdir -p client/src/features/search/components

# Move existing components (copy first, don't delete)
cp client/src/components/email-search-summary.tsx \
   client/src/features/search/components/EmailSearchSummary.tsx

cp client/src/components/contact-discovery-report.tsx \
   client/src/features/search/components/ContactDiscoveryReport.tsx

cp client/src/components/search-progress.tsx \
   client/src/features/search/components/SearchProgress.tsx
```

Create index file:
```typescript
// client/src/features/search/index.ts
export { EmailSearchSummary } from './components/EmailSearchSummary';
export { ContactDiscoveryReport } from './components/ContactDiscoveryReport';
export { SearchProgress } from './components/SearchProgress';
```

### Step 1.2: Extract TopProspectsCard Component

Create new file: `/client/src/features/search/components/TopProspectsCard.tsx`

```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, ThumbsUp, ThumbsDown, MessageSquare, MoreHorizontal } from "lucide-react";
import type { Contact, Company } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

interface TopProspectsCardProps {
  prospects: ContactWithCompanyInfo[];
  onContactClick: (contact: Contact, company: Company) => void;
  isVisible: boolean;
}

export function TopProspectsCard({ 
  prospects, 
  onContactClick,
  isVisible 
}: TopProspectsCardProps) {
  if (!isVisible || prospects.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Top Prospects</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            {/* Table implementation from home.tsx */}
            {/* Copy the exact JSX from the home page */}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## PHASE 2: Extract Pure Functions (Zero Risk)

### Step 2.1: Create Search Utilities

Create file: `/client/src/features/search/utils/searchHelpers.ts`

```typescript
import type { Company, Contact } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

// Get top N contacts from a company based on probability score
export function getTopContacts(company: any, count: number) {
  if (!company.contacts || company.contacts.length === 0) return [];
  
  const sorted = [...company.contacts].sort((a, b) => {
    return (b.probability || 0) - (a.probability || 0);
  });
  
  return sorted.slice(0, count);
}

// Get the best contact from a company
export function getBestContact(company: any) {
  return getTopContacts(company, 1)[0];
}

// Get companies that don't have email addresses
export function getCompaniesWithoutEmails(
  companies: CompanyWithContacts[]
) {
  return companies?.filter(company => 
    !getTopContacts(company, 3).some(contact => 
      contact.email && contact.email.length > 5
    )
  ) || [];
}

// Find a specific contact by ID across all companies
export function findContactById(
  contactId: number, 
  companies: CompanyWithContacts[]
): Contact | null {
  if (!companies) return null;
  
  for (const company of companies) {
    const contact = company.contacts?.find(c => c.id === contactId);
    if (contact) return contact;
  }
  return null;
}
```

---

## PHASE 3: Extract Type Definitions (Zero Risk)

### Step 3.1: Create Types File

Create file: `/client/src/features/search/types.ts`

```typescript
import type { Company } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

export interface CompanyWithContacts extends Company {
  contacts?: ContactWithCompanyInfo[];
}

export interface SavedSearchState {
  currentQuery: string | null;
  currentResults: CompanyWithContacts[] | null;
  currentListId: number | null;
  lastExecutedQuery?: string | null;
  emailSearchCompleted?: boolean;
  emailSearchTimestamp?: number;
  navigationRefreshTimestamp?: number;
}

export interface SourceBreakdown {
  Perplexity: number;
  Apollo: number;
  Hunter: number;
}

export interface SearchProgress {
  phase: string;
  completed: number;
  total: number;
}
```

---

## PHASE 4: Extract Complex Components (Low Risk)

### Step 4.1: Move SavedSearchesDrawer

```bash
# Move the component
cp client/src/components/saved-searches-drawer.tsx \
   client/src/features/search/components/SavedSearchesDrawer.tsx
```

Update imports in the component and add to index:
```typescript
// client/src/features/search/index.ts
export { SavedSearchesDrawer } from './components/SavedSearchesDrawer';
```

### Step 4.2: Move CompanyCards

Since CompanyCards is already lazy-loaded, this is safe:

```bash
cp client/src/components/company-cards.tsx \
   client/src/features/search/components/CompanyCards.tsx
```

Update the lazy import in home.tsx:
```typescript
const CompanyCards = lazy(() => 
  import("@/features/search").then(m => ({ default: m.CompanyCards }))
);
```

---

## PHASE 5: Extract Email Drawer (Medium Risk)

### Step 5.1: Create Email Composer Feature Structure

```bash
mkdir -p client/src/features/email-composer/{components,hooks,context}
```

### Step 5.2: Extract EmailDrawer Component

Create file: `/client/src/features/email-composer/components/EmailDrawer.tsx`

```typescript
import { X, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { EmailComposer } from "./EmailComposer";
import type { Contact, Company } from "@shared/schema";

interface EmailDrawerProps {
  open: boolean;
  contact: Contact | null;
  company: Company | null;
  contacts: Contact[];
  width: number;
  isResizing: boolean;
  onClose: () => void;
  onContactChange: (contact: Contact) => void;
  onWidthChange: (width: number) => void;
}

export function EmailDrawer({
  open,
  contact,
  company,
  contacts,
  width,
  isResizing,
  onClose,
  onContactChange,
  onWidthChange
}: EmailDrawerProps) {
  if (!open) return null;

  return (
    <>
      {/* Drawer container for alignment */}
      <div 
        className={`duplicate-full-height-drawer-to-keep-column-aligned ${
          open ? 'hidden md:block md:relative md:h-full' : 'hidden md:block md:relative w-0'
        }`} 
        style={{ width: open ? `${width}px` : 0 }}
      />
      
      {/* Actual drawer */}
      <div 
        className={`${!isResizing ? 'email-drawer-transition' : ''} 
          fixed md:absolute top-[2.5rem] md:top-0 right-0 bottom-auto 
          max-h-[calc(100vh-2.5rem)] md:max-h-screen 
          w-[90%] sm:w-[400px] z-50 
          overflow-hidden border-l border-t border-b 
          rounded-tl-lg rounded-bl-lg bg-background shadow-xl`}
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-background px-4 py-1.5 z-10">
          {/* Header content */}
        </div>
        
        {/* Email composer */}
        <EmailComposer 
          contact={contact}
          company={company}
        />
      </div>
    </>
  );
}
```

---

## PHASE 6: Create Custom Hooks (Medium Risk)

### Step 6.1: Extract Search State Hook

Create file: `/client/src/features/search/hooks/useSearchState.ts`

```typescript
import { useState, useEffect } from 'react';
import { CompanyWithContacts, SavedSearchState } from '../types';

export function useSearchState() {
  const [currentQuery, setCurrentQuery] = useState<string>("");
  const [currentResults, setCurrentResults] = useState<CompanyWithContacts[] | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [currentListId, setCurrentListId] = useState<number | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastExecutedQuery, setLastExecutedQuery] = useState<string | null>(null);
  
  // Load saved state on mount
  useEffect(() => {
    const savedState = localStorage.getItem('searchState');
    if (savedState) {
      const parsed = JSON.parse(savedState) as SavedSearchState;
      setCurrentQuery(parsed.currentQuery || "");
      setCurrentResults(parsed.currentResults);
      setCurrentListId(parsed.currentListId);
      setLastExecutedQuery(parsed.lastExecutedQuery || null);
    }
  }, []);
  
  // Save state on changes
  useEffect(() => {
    const state: SavedSearchState = {
      currentQuery,
      currentResults,
      currentListId,
      lastExecutedQuery
    };
    localStorage.setItem('searchState', JSON.stringify(state));
  }, [currentQuery, currentResults, currentListId, lastExecutedQuery]);
  
  return {
    currentQuery,
    setCurrentQuery,
    currentResults,
    setCurrentResults,
    isSaved,
    setIsSaved,
    currentListId,
    setCurrentListId,
    isAnalyzing,
    setIsAnalyzing,
    lastExecutedQuery,
    setLastExecutedQuery
  };
}
```

### Step 6.2: Extract Email Drawer Hook

Create file: `/client/src/features/email-composer/hooks/useEmailDrawer.ts`

```typescript
import { useState, useEffect } from 'react';
import type { Contact, Company } from '@shared/schema';

export function useEmailDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);
  
  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(320, Math.min(720, newWidth));
      setDrawerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);
  
  const openDrawer = (contact: Contact, company: Company) => {
    setSelectedContact(contact);
    setSelectedCompany(company);
    setIsOpen(true);
  };
  
  const closeDrawer = () => {
    setIsOpen(false);
    setSelectedContact(null);
    setSelectedCompany(null);
  };
  
  return {
    isOpen,
    selectedContact,
    selectedCompany,
    drawerWidth,
    isResizing,
    setIsResizing,
    openDrawer,
    closeDrawer,
    setSelectedContact
  };
}
```

---

## PHASE 7: Final Home Page Structure

After all phases, your home.tsx becomes much simpler:

```typescript
import { lazy, Suspense } from "react";
import { useSearchState } from '@/features/search/hooks/useSearchState';
import { useEmailDrawer } from '@/features/email-composer/hooks/useEmailDrawer';
import { 
  TopProspectsCard, 
  SavedSearchesDrawer,
  SearchProgress,
  EmailSearchSummary
} from '@/features/search';
import { EmailDrawer } from '@/features/email-composer';
import { TableSkeleton } from "@/components/ui/table-skeleton";

// Lazy load heavy components
const CompanyCards = lazy(() => 
  import("@/features/search").then(m => ({ default: m.CompanyCards }))
);
const PromptEditor = lazy(() => import("@/components/prompt-editor"));

export default function Home() {
  // Use extracted hooks
  const search = useSearchState();
  const emailDrawer = useEmailDrawer();
  
  // Handler functions (keep business logic here for now)
  const handleSearch = async (query: string) => {
    // Search logic
  };
  
  const handleContactClick = (contact: Contact, company: Company) => {
    emailDrawer.openDrawer(contact, company);
  };
  
  return (
    <div className="home-page flex">
      <div className="flex-1">
        {/* Search Section */}
        <Suspense fallback={<div>Loading...</div>}>
          <PromptEditor 
            query={search.currentQuery}
            onQueryChange={search.setCurrentQuery}
            onSearch={handleSearch}
          />
        </Suspense>
        
        {/* Search Progress */}
        {search.isAnalyzing && (
          <SearchProgress 
            phase={search.searchProgress.phase}
            completed={search.searchProgress.completed}
            total={search.searchProgress.total}
          />
        )}
        
        {/* Results Section */}
        {search.currentResults && (
          <>
            <EmailSearchSummary 
              data={search.emailSummary}
              isVisible={search.showSummary}
            />
            
            <TopProspectsCard
              prospects={search.topProspects}
              onContactClick={handleContactClick}
              isVisible={search.currentResults.length > 0}
            />
            
            <Suspense fallback={<TableSkeleton />}>
              <CompanyCards
                companies={search.currentResults}
                onContactClick={handleContactClick}
              />
            </Suspense>
          </>
        )}
        
        {/* Saved Searches */}
        <SavedSearchesDrawer 
          open={search.drawerOpen}
          onOpenChange={search.setDrawerOpen}
          onLoadSearch={search.loadSavedSearch}
        />
      </div>
      
      {/* Email Drawer */}
      <EmailDrawer {...emailDrawer} />
    </div>
  );
}
```

---

## Implementation Checklist

### Safe Order of Operations

- [ ] **Phase 1**: Extract pure display components (30 mins, zero risk)
  - [ ] Move existing components
  - [ ] Create TopProspectsCard
  - [ ] Test: Ensure all imports work

- [ ] **Phase 2**: Extract utility functions (15 mins, zero risk)
  - [ ] Create searchHelpers.ts
  - [ ] Update imports in home.tsx
  - [ ] Test: All functions work correctly

- [ ] **Phase 3**: Extract types (15 mins, zero risk)
  - [ ] Create types.ts
  - [ ] Update imports
  - [ ] Test: No TypeScript errors

- [ ] **Phase 4**: Move complex components (30 mins, low risk)
  - [ ] Move SavedSearchesDrawer
  - [ ] Move CompanyCards
  - [ ] Test: Components render correctly

- [ ] **Phase 5**: Extract email drawer (1 hour, medium risk)
  - [ ] Create email-composer feature
  - [ ] Extract EmailDrawer component
  - [ ] Test: Email drawer functionality intact

- [ ] **Phase 6**: Create hooks (1 hour, medium risk)
  - [ ] Create useSearchState
  - [ ] Create useEmailDrawer
  - [ ] Test: State management works

- [ ] **Phase 7**: Final refactor (30 mins)
  - [ ] Update home.tsx to use all extracted pieces
  - [ ] Clean up unused imports
  - [ ] Delete old files

### Testing After Each Phase

**Functional Tests:**
- [ ] Search executes correctly
- [ ] Results display properly
- [ ] Email drawer opens/closes
- [ ] Contact selection works
- [ ] Saved searches load
- [ ] Company cards expand/collapse

**Technical Tests:**
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] No broken imports
- [ ] Bundle size hasn't increased significantly
- [ ] Page load time is acceptable

### Rollback Plan

If any phase causes issues:

1. **Git stash or commit current work**
   ```bash
   git stash
   # or
   git commit -am "WIP: Phase X modularization"
   ```

2. **Revert to last working state**
   ```bash
   git checkout .
   # or
   git reset --hard HEAD~1
   ```

3. **Analyze what went wrong**
   - Check for circular dependencies
   - Verify all imports are correct
   - Ensure state is being passed correctly

4. **Try a smaller extraction**
   - Break the problematic phase into smaller steps
   - Test after each micro-step

---

## Benefits After Completion

1. **Code Reduction**: home.tsx from ~2000 lines → ~200 lines
2. **Better Organization**: Clear feature boundaries
3. **Improved Testing**: Can test features in isolation
4. **AI-Friendly**: Smaller files are easier for AI to work with
5. **Reusability**: Email composer can be used in other pages
6. **Maintainability**: Easier to find and fix bugs
7. **Performance**: Better code splitting and lazy loading

## Next Steps After Modularization

1. **Add unit tests** for extracted utilities
2. **Add integration tests** for hooks
3. **Document** the new structure in README
4. **Consider extracting** more shared features
5. **Apply same pattern** to other large pages (outreach, strategy-overlay)

---

## Notes

- Each phase is designed to be completed independently
- You can stop at any phase and still have a working application
- The order is specifically designed to minimize risk
- Always test thoroughly after each phase
- Keep the old files until you're confident everything works
