import type { Quest } from "../types";

export const QUESTS: Quest[] = [
  {
    id: "quest-1-finding-customers",
    name: "Finding Customers",
    description: "Learn how to discover and find potential customers using our powerful search tools.",
    emoji: "🔍",
    challenges: [
      {
        id: "challenge-1-basic-search",
        name: "Basic Search",
        description: "Perform your first company and contacts search",
        emoji: "🎯",
        steps: [
          {
            id: "step-1-search-input",
            selector: '[data-testid="search-input"]',
            action: "click",
            instruction: "Click on the search bar to start finding companies and contacts",
            tooltipPosition: "bottom",
          },
          {
            id: "step-2-type-query",
            selector: '[data-testid="search-input"]',
            action: "view",
            instruction: "Type a search query like 'marketing agencies in Austin' - describe the type of businesses you want to find",
            tooltipPosition: "bottom",
          },
          {
            id: "step-3-execute-search",
            selector: '[data-testid="search-button"]',
            action: "click",
            instruction: "Click the Search button to find companies matching your query!",
            tooltipPosition: "left",
          },
        ],
        completionMessage: "Awesome! You've completed your first search! 🎉",
      },
      {
        id: "challenge-2-view-results",
        name: "Explore Results",
        description: "Learn to navigate your search results",
        emoji: "📊",
        steps: [
          {
            id: "step-1-view-results",
            selector: '[data-testid="search-results-card"]',
            action: "view",
            instruction: "Here are your search results! Each row shows a company with their key contacts. Click on any company to see more details.",
            tooltipPosition: "top",
          },
        ],
        completionMessage: "Great! You can now explore company and contact details! 🎯",
      },
      {
        id: "challenge-3-find-email",
        name: "Find Contact Emails",
        description: "Use the email finder to discover contact emails",
        emoji: "📧",
        steps: [
          {
            id: "step-1-find-email-button",
            selector: '[data-testid="find-emails-button"]',
            action: "view",
            instruction: "The 'Find Key Emails' button searches for email addresses of the top contacts at each company. This helps you reach decision-makers directly!",
            tooltipPosition: "bottom",
          },
          {
            id: "step-2-click-email-button",
            selector: '[data-testid="find-emails-button"]',
            action: "click",
            instruction: "Click 'Find Key Emails' to discover email addresses for your contacts!",
            tooltipPosition: "bottom",
          },
        ],
        completionMessage: "Excellent! You've discovered how to find contact emails! 📬",
      },
      {
        id: "challenge-4-full-search",
        name: "Do Full Search",
        description: "Complete a full search with contacts and emails in one go",
        steps: [
          {
            id: "step-1-new-search",
            selector: '[data-testid="search-input"]',
            action: "click",
            instruction: "Let's do a complete search! Click on the search bar to start a new search.",
            tooltipPosition: "bottom",
          },
          {
            id: "step-2-enter-query",
            selector: '[data-testid="search-input"]',
            action: "view",
            instruction: "Type a search query describing your ideal customers - for example 'tech startups in San Francisco' or 'real estate agents in Miami'",
            tooltipPosition: "bottom",
          },
          {
            id: "step-3-run-search",
            selector: '[data-testid="search-button"]',
            action: "click",
            instruction: "Click Search to find companies and their key contacts!",
            tooltipPosition: "left",
          },
          {
            id: "step-4-view-contacts",
            selector: '[data-testid="search-results-card"]',
            action: "view",
            instruction: "Great! You now have a list of companies with their key contacts. Review the results to see decision-makers at each company.",
            tooltipPosition: "top",
          },
          {
            id: "step-5-find-all-emails",
            selector: '[data-testid="find-emails-button"]',
            action: "click",
            instruction: "Now click 'Find Key Emails' to discover email addresses for all these contacts at once!",
            tooltipPosition: "bottom",
          },
          {
            id: "step-6-complete",
            selector: '[data-testid="search-results-card"]',
            action: "view",
            instruction: "You've completed a full search! You now have companies, contacts, and their email addresses - everything you need to start reaching out!",
            tooltipPosition: "top",
          },
        ],
        completionMessage: "Congratulations! You've mastered the complete search workflow!",
      },
    ],
  },
];

export function getQuestById(questId: string): Quest | undefined {
  return QUESTS.find((q) => q.id === questId);
}

export function getNextQuest(currentQuestId: string): Quest | undefined {
  const currentIndex = QUESTS.findIndex((q) => q.id === currentQuestId);
  if (currentIndex >= 0 && currentIndex < QUESTS.length - 1) {
    return QUESTS[currentIndex + 1];
  }
  return undefined;
}

export function getFirstIncompleteQuest(completedQuests: string[]): Quest | undefined {
  return QUESTS.find((q) => !completedQuests.includes(q.id));
}
