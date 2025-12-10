# Onboarding Flow Technical Overview

This document outlines the technical architecture of the user onboarding flows for both Authors and Advertisers. The flow is designed to minimize friction using a "scaffolded" input strategy that progressively reveals complexity.

## 1. Flow Architecture

The onboarding process follows a **progressive disclosure** pattern:
1.  **Micro-Commitment (Phase A)**: A single, low-friction input field.
2.  **Scaffolded Expansion (Phase B)**: The input container expands inline to reveal contact details.
3.  **Deep Dive (Phase C)**: A full-screen modal takes over for the detailed questionnaire.

### State Management
The flow is managed by a local state machine in the parent container (`OnboardingFlow.tsx` or `AdvertiserOnboardingFlow.tsx`):
- `phase`: Enum `"A" | "B" | "C"` controlling the view state.
- `data`: A single state object holding all form data.
- `step`: Integer tracking the current screen within the modal.

---

## 2. The Scaffolded Initial Inputs

This is the entry point on the landing page. It is designed to look like a simple input field but acts as a dynamic form.

### Structure
- **Container**: Relative positioning with `overflow-hidden` to mask animations.
- **Phase A (Hook)**:
    - **Authors**: Substack Subdomain input (`.substack.com` is a static suffix).
    - **Advertisers**: Email address input.
    - **Action**: User hits Enter or clicks the Arrow button.
- **Phase B (Expansion)**:
    - **Animation**: Uses `Framer Motion` to animate `height: "auto"` and `opacity: 1`.
    - **Inputs**: Reveals `FirstName`, `LastName`/`Email` fields.
    - **Visuals**: A "Sparkle Burst" effect triggers on transition to reward the user.
    - **Action**: "Next Step" button triggers the full modal.

### Technical Implementation
```tsx
// Simplified Logic
{phase === "A" && <SingleInput />}
<AnimatePresence>
  {phase === "B" && (
    <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}>
       <ContactInputs />
       <Button>Next Step</Button>
    </motion.div>
  )}
</AnimatePresence>
```

---

## 3. Full-Page Step-by-Step Modal

Once basic contact info is captured, the `OnboardingShell` component is triggered. This is a full-screen `Dialog` overlay.

### Core Features
- **Progress Tracking**: A progress bar at the top calculated by `(currentStep / totalSteps) * 100`.
- **Navigation**: "Back" button (top left), "Close" button (top right), and auto-advance logic.
- **Persistence**: Data is kept in the parent component's state, allowing for persistence if the modal is closed and reopened (in the same session).

### Flow Steps (Advertiser Example)
1.  **Intro**: Mascot greeting.
2.  **Business Type**: Branching logic (Agency vs. Brand).
3.  **Goals & Geography**: Complex selectors.
4.  **Targeting**: ICP (Ideal Customer Profile) and Sectors.
5.  **Budget & ROI**: Final qualifiers.

---

## 4. Component Types & Variations

The modal utilizes a library of specialized "Question" components located in `client/src/components/shared/onboarding/`.

### A. Selection Components
| Component | Type | Use Case |
| :--- | :--- | :--- |
| **`QuestionSingleSelect`** | Radio-style | Single choice (e.g., "What is your budget?"). Supports icons and descriptions. |
| **`QuestionMultiSelect`** | Checkbox-style | Multiple choices (e.g., "Ad formats you accept"). Features toggle logic. |
| **`NestedMultiSelect`** | 2-Level Tree | Selecting Industries (Category -> Subcategory). Accordion-style UI. |

### B. Complex Input Components
| Component | Type | Use Case |
| :--- | :--- | :--- |
| **`ConditionalInputGroup`** | Form Wrapper | Handles dynamic fields. Example: "Agency" selection reveals "Agency Name" and "Website" inputs. |
| **`GeographySelector`** | Tabbed Interface | Custom UI for selecting targeting by **Region** (Group of states) or **State** (Individual). Includes search and "Select All". |
| **`QuestionInput`** | Standard Form | General purpose inputs (Text, Number, Select) with validation. |

### C. Visual & Layout Components
| Component | Type | Use Case |
| :--- | :--- | :--- |
| **`OnboardingShell`** | Layout | The full-screen wrapper handling the progress bar and animation context. |
| **`Mascot` / `MascotChatBubble`** | Brand | Adds personality to the flow. "Chat Bubble" variant provides context for complex questions. |

## 5. Branching Logic Example
The flow supports conditional steps based on previous answers:
- *If `Advertising Goal` == "Sell a Product"*:
    - Show -> **"What are you selling?"** (Physical vs Digital)
    - Show -> **"Price Range"**
- *Else*:
    - Skip directly to Brand Details.

This logic is handled in the `nextStep` or `onChange` handlers within the parent flow component.
