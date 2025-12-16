import type { Quest } from "../../types";
import { quest1FindingCustomers } from "./quest-1-finding-customers";

export const QUESTS: Quest[] = [
  quest1FindingCustomers,
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
