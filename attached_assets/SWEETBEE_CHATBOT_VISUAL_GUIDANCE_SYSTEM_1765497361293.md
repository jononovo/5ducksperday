# SweetBee Chatbot Visual Guidance System

Technical documentation for the SweetBee chatbot's visual guidance system, covering styling, interaction handling, and workflow execution.

---

## 1. Styling & Visual Design

### 1.1 Color System

The SweetBee theme uses a bee-inspired color palette defined in `sweetbee-theme.js`:

| Token Name | CSS Variable | Hex Value | Usage |
|------------|--------------|-----------|-------|
| Honey Gold | `--sweetbee-primary-honey` | `#F4A261` | Primary accent, borders, highlights |
| Bee Yellow | `--sweetbee-primary-yellow` | `#E9C46A` | Secondary accent, gradients |
| Deep Amber | `--sweetbee-accent-amber` | `#E76F51` | Antennae tips, emphasis |
| Warm White | `--sweetbee-neutral-white` | `#FEFBF6` | Wings, light backgrounds |
| Charcoal | `--sweetbee-neutral-charcoal` | `#2D3748` | Text, stripes, outlines |

**Primary Gradient:**
```css
--sweetbee-gradient-primary: linear-gradient(135deg, #F4A261 0%, #E9C46A 100%);
```

### 1.2 Bee Mascot (Avatar)

The bee mascot is rendered as an inline SVG in `sweetbee-avatar.js` and `BeeLogo.tsx`.

**Structure:**
- **Body:** Yellow ellipse (`#FFD93D`) with charcoal stripes
- **Head:** Yellow circle with eyes (charcoal dots) and rosy cheeks (`#FF7B7B`, 80% opacity)
- **Wings:** Light blue ellipses (`#A8DAEF`) with subtle pulsing animation
- **Antennae:** Two charcoal lines with circular tips
- **Stinger:** Small charcoal triangle at bottom

**Sizing:**
- Default size: 24-50px depending on context
- Guide avatar: 50x50px circular container with gradient background
- Chat avatar: 32x32px circular

**Avatar Container Styling:**
```css
.sweetbee-guide-bee {
    width: 50px;
    height: 50px;
    background: linear-gradient(135deg, #F4A261 0%, #E9C46A 100%);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(244, 162, 97, 0.4);
    animation: bee-float 2s ease-in-out infinite;
}
```

### 1.3 Element Highlight Border

When guiding users to click an element, a highlight overlay is positioned around the target element.

**Highlight Styling (`sweetbee-highlight.js`):**
```css
.sweetpea-highlight {
    position: absolute;
    border: 3px solid var(--sweetbee-primary-honey, #F4A261);
    border-radius: 8px;
    pointer-events: none;
    z-index: 999996;
    background: rgba(244, 162, 97, 0.1);  /* 10% honey gold fill */
    animation: sweetpea-glow 2s infinite;
    transition: opacity 0.3s ease;
}
```

**Alternative Highlight (WorkflowExecutor):**
```css
/* Amber/yellow variant */
border: 3px solid #fbbf24;
background: rgba(251, 191, 36, 0.1);
box-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
animation: pulse 2s infinite;
```

**Positioning Logic:**
- Highlight is positioned 5px outside the element's bounding box on all sides
- Uses `getBoundingClientRect()` for precise positioning
- Accounts for scroll offset (`window.scrollY`, `window.scrollX`)

### 1.4 Tooltip Styling

Tooltips display instructions near the highlighted element.

**Standalone Tooltip (`sweetbee-highlight.js`):**
```css
.sweetpea-standalone-tooltip {
    position: absolute;
    background: rgba(33, 47, 61, 0.98);  /* Dark semi-transparent */
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 500;
    line-height: 1.5;
    z-index: 999997;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    max-width: 280px;
    border: 1px solid rgba(244, 162, 97, 0.3);  /* Honey gold accent */
}
```

**Tooltip Arrow:**
```css
.sweetpea-standalone-tooltip::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(33, 47, 61, 0.98);
}
```

**Positioning Logic:**
- Default: Positioned above the element with 20px spacing
- If near viewport top: Flips below the element (adds `.arrow-top` class)
- Horizontally centered on the element

### 1.5 Animations

**Glow Animation (Highlight):**
```css
@keyframes sweetpea-glow {
    0%, 100% { 
        box-shadow: 0 0 20px rgba(244, 162, 97, 0.6);
    }
    50% { 
        box-shadow: 0 0 30px rgba(244, 162, 97, 0.8);
    }
}
```

**Float Animation (Bee Avatar):**
```css
@keyframes bee-float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}
```

**Bounce Animation:**
```css
@keyframes sweetbee-bounce {
    0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    60% { transform: translateY(-5px); }
}
```

**Wing Flutter Animation:**
```css
@keyframes sweetbee-wing-flutter {
    0%, 100% { transform: rotate(0deg) scaleY(1); }
    25% { transform: rotate(5deg) scaleY(0.8); }
    75% { transform: rotate(-5deg) scaleY(0.8); }
}
```

**Pulse Animation (Workflow Executor):**
```css
@keyframes pulse {
    0% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
    50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.8); }
    100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
}
```

### 1.6 Overlay/Spotlight Effect

The `ChatHighlight.tsx` component creates a spotlight effect by darkening everything except the target element:

```tsx
<div 
  className="fixed inset-0 bg-black/30 z-[9998] pointer-events-none"
  style={{
    clipPath: `polygon(
      0 0, 100% 0, 100% 100%, 0 100%, 0 0,
      ${rect.left}px ${rect.top}px,
      ${rect.right}px ${rect.top}px,
      ${rect.right}px ${rect.bottom}px,
      ${rect.left}px ${rect.bottom}px,
      ${rect.left}px ${rect.top}px
    )`
  }}
/>
```

This uses CSS `clip-path` with a polygon that creates a "cutout" around the target element.

---

## 2. Click Detection & Step Progression

### 2.1 Architecture Overview

The step progression system uses a multi-layered event handling approach:

```
User clicks element
       ↓
┌──────────────────────────────────────────────┐
│  1. Element-level click listener             │
│  2. Capture-phase listener (backup)          │
│  3. Document-level listener (fallback)       │
└──────────────────────────────────────────────┘
       ↓
handleClick() triggered
       ↓
advanceStep() → executeNextStep()
```

### 2.2 Interactive Element Detection

Before attaching listeners, the system determines if an element is interactive:

```javascript
function isInteractiveElement(element) {
    if (!element) return false;
    
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL'];
    const hasClickHandler = element.onclick !== null || 
                          element.hasAttribute('onclick') ||
                          element.hasAttribute('data-clickable');
    const hasPointerCursor = window.getComputedStyle(element).cursor === 'pointer';
    const hasRole = element.getAttribute('role') === 'button' || 
                   element.getAttribute('role') === 'link';
    
    return interactiveTags.includes(element.tagName) || 
           hasClickHandler || 
           hasPointerCursor ||
           hasRole;
}
```

### 2.3 Click Event Handling

For interactive elements, multiple event listeners are attached for robustness:

```javascript
// Primary listener on element
element.addEventListener('click', handleClick);

// Capture phase (catches events before they bubble)
element.addEventListener('click', handleClick, true);

// Document-level fallback (for third-party sites)
document.addEventListener('click', (e) => {
    if (element.contains(e.target)) {
        handleClick(e);
    }
});
```

**Click Handler Logic:**
```javascript
const handleClick = (e) => {
    if (clickHandled) return;  // Prevent double-processing
    clickHandled = true;
    
    // Remove all event listeners
    element.removeEventListener('click', handleClick);
    element.removeEventListener('click', handleClick, true);
    document.removeEventListener('click', documentClickHandler);
    document.removeEventListener('keydown', escHandler);
    
    // Clear visual highlight
    if (window.SweetPeaHighlight) {
        window.SweetPeaHighlight.hideHighlight();
    }
    
    // Proceed to next step
    advanceStep();
};
```

### 2.4 Fallback Mechanisms

1. **ESC Key Abort:** Pressing Escape aborts the workflow
   ```javascript
   document.addEventListener('keydown', (e) => {
       if (e.key === 'Escape') {
           abortWorkflow();
       }
   });
   ```

2. **Timeout Fallback:** If no click after 30 seconds, auto-advances
   ```javascript
   state.cleanupTimeout = setTimeout(() => {
       if (!clickHandled) {
           handleClick(new Event('timeout'));
       }
   }, 30000);
   ```

3. **Element Not Found:** If selector doesn't match, displays warning and shows instruction without highlight

### 2.5 Step Advancement Flow

```javascript
function advanceStep() {
    // Clear timeout
    if (state.cleanupTimeout) {
        clearTimeout(state.cleanupTimeout);
    }
    
    // Hide previous highlight
    window.SweetPeaHighlight.hideHighlight();
    
    // Hide tooltip
    const tooltip = state.guideAvatar.querySelector('.sweetbee-tooltip');
    tooltip.classList.remove('visible');
    
    // Increment step counter
    state.currentStep++;
    
    // Execute next step (or complete if done)
    executeNextStep();
}
```

### 2.6 Step Indicator

A floating progress indicator shows current position:

```css
.sweetbee-workflow-step-indicator {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #F4A261 0%, #E9C46A 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 14px;
    font-weight: 600;
    z-index: 999997;
}
```

Updated each step: `Step ${current} of ${total}`

---

## 3. Workflow Storage & Execution

### 3.1 Workflow Data Structure

**Workflow Object:**
```typescript
interface Workflow {
    id: string;
    name: string;
    description?: string;
    category?: string;
    steps: WorkflowStep[];
    startUrl?: string;
}

interface WorkflowStep {
    selector?: string;       // CSS selector for target element
    action: string;          // 'click', 'type', 'view', etc.
    description: string;     // Human-readable instruction
    value?: string;          // For 'type' actions, the text to enter
    waitForUser?: boolean;   // Whether to wait for user interaction
}
```

### 3.2 Storage Mechanisms

**Database Storage (Server-side):**
Workflows are persisted in the `generated_workflows` PostgreSQL table:

```typescript
export const generatedWorkflows = pgTable('generated_workflows', {
    id: text('id').primaryKey(),
    scanId: text('scan_id'),
    agentRunId: text('agent_run_id'),
    workflowName: text('workflow_name').notNull(),
    workflowType: text('workflow_type'),
    steps: jsonb('steps'),
    confidence_score: real('confidence_score'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at').defaultNow()
});
```

**Client-side Registry:**
Workflows are stored in a global registry (`window.SweetBeeWorkflows`):

```javascript
window.SweetBeeWorkflows = {
    byId: {},           // Quick lookup by ID
    byCategory: {},     // Grouped by category
    all: [],            // Flat list
    
    getAll() { return this.all; },
    findByName(name) { /* ... */ },
    validateWorkflow(workflow) { /* ... */ }
};
```

### 3.3 Workflow Discovery & Loading

Workflows are discovered through:
1. **Scanner agents** that analyze page structure
2. **DOM exploration** that finds interactive elements
3. **Pre-defined workflows** loaded from the database

### 3.4 Execution Flow

**1. User Initiates Workflow (Chat):**
```javascript
// In sweetbee-chat.js
function handleUserInput(message) {
    // Check for workflow match
    const matchedWorkflow = window.SweetBeeWorkflows.findByName(message);
    
    if (matchedWorkflow) {
        addMessage('bot', `Executing workflow: "${matchedWorkflow.name}"`);
        executeWorkflowFromChat(matchedWorkflow);
        return;
    }
    // ... handle as regular message
}
```

**2. Workflow Handoff to Guide Module:**
```javascript
function executeWorkflowFromChat(workflow) {
    // Minimize chat panel
    hide();
    
    // Execute via Guide module
    if (window.SweetBeeGuide && window.SweetBeeGuide.executeWorkflow) {
        window.SweetBeeGuide.executeWorkflow(workflow);
    }
}
```

**3. Guide Module Execution:**
```javascript
function executeWorkflow(workflow) {
    // Validate workflow
    if (!workflow || !workflow.steps || workflow.steps.length === 0) {
        console.error('Invalid workflow');
        return;
    }
    
    // Clean workflow (remove circular references)
    state.currentWorkflow = cleanWorkflow(workflow);
    state.currentStep = 0;
    state.isGuiding = true;
    
    // Show step indicator
    showStepIndicator();
    
    // Notify user
    callbacks.onMessage('bot', 
        `Starting workflow: ${workflow.name}. ` +
        `I'll guide you through ${workflow.steps.length} steps.`
    );
    
    // Begin step execution
    executeNextStep();
}
```

**4. Step Execution:**
```javascript
function executeNextStep() {
    if (state.currentStep >= state.currentWorkflow.steps.length) {
        completeWorkflow();
        return;
    }
    
    const step = state.currentWorkflow.steps[state.currentStep];
    
    // Find target element
    let element = document.querySelector(step.selector);
    
    // Show visual guidance
    if (element) {
        showGuideAt(element, step.description);
        window.SweetPeaHighlight.highlightElementVisual(element, 0);
    }
    
    // Attach click listener for interactive elements
    if (element && isInteractiveElement(element)) {
        element.addEventListener('click', handleClick);
        // ... additional listeners
    }
}
```

**5. Workflow Completion:**
```javascript
function completeWorkflow() {
    callbacks.onMessage('bot', 
        `Congratulations! You've completed "${state.currentWorkflow.name}" successfully!`
    );
    
    callbacks.onTrack('workflow_completed', {
        workflowId: state.currentWorkflow.id,
        workflowName: state.currentWorkflow.name,
        steps: state.currentWorkflow.steps.length
    });
    
    // Cleanup
    hideGuide();
    hideStepIndicator();
    state.currentWorkflow = null;
    state.currentStep = 0;
    state.isGuiding = false;
}
```

### 3.5 Workflow Matching Algorithm

```javascript
function findByName(userMessage) {
    const normalizedMessage = userMessage.toLowerCase().trim();
    
    // 1. Exact match
    for (const workflow of this.all) {
        const workflowName = workflow.name.toLowerCase();
        if (normalizedMessage.includes(workflowName) || 
            workflowName.includes(normalizedMessage)) {
            return workflow;
        }
    }
    
    // 2. Keyword matching
    const keywords = normalizedMessage.split(' ').filter(w => w.length > 2);
    let bestMatch = null;
    let bestScore = 0;
    
    for (const workflow of this.all) {
        const workflowWords = workflow.name.toLowerCase().split(' ');
        let score = 0;
        
        for (const keyword of keywords) {
            for (const word of workflowWords) {
                if (word.includes(keyword) || keyword.includes(word)) {
                    score++;
                }
            }
        }
        
        if (score > bestScore) {
            bestScore = score;
            bestMatch = workflow;
        }
    }
    
    return bestScore >= Math.min(2, keywords.length) ? bestMatch : null;
}
```

---

## Z-Index Layering

| Layer | Z-Index | Element |
|-------|---------|---------|
| Highlight | 999996 | Element border/overlay |
| Tooltip | 999997 | Instruction tooltip |
| Step Indicator | 999997 | "Step X of Y" pill |
| Guide Avatar | 999998 | Bee mascot |
| Spotlight Overlay | 9998 | Darkened background |
| Controls Panel | 9999 | WorkflowExecutor card |

---

## File Reference

| File | Purpose |
|------|---------|
| `client/public/sweetbee-theme.js` | Color system and CSS variables |
| `client/public/sweetbee-avatar.js` | Bee mascot SVG generation |
| `client/public/sweetbee-highlight.js` | Element highlighting and tooltips |
| `client/public/sweetbee-guide.js` | Workflow execution and step progression |
| `client/public/sweetbee-chat.js` | Chat interface and workflow matching |
| `client/src/components/BeeLogo.tsx` | React bee mascot component |
| `client/src/features/chat/ChatHighlight.tsx` | React spotlight highlight component |
| `client/src/features/workflow-executor/workflow-executor.tsx` | React workflow execution UI |
| `shared/schema.ts` | Database schema for workflow storage |
| `server/storage.ts` | Server-side workflow persistence |
