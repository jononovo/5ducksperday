export interface EasterEgg {
  id: number;
  trigger: string;
  reward: number;
  description: string;
  emoji?: string;
}

export interface EasterEggResult {
  success: boolean;
  message: string;
  newBalance?: number;
  easterEgg?: EasterEgg;
}

// Easter eggs configuration
export const EASTER_EGGS: EasterEgg[] = [
  { 
    id: 0, 
    trigger: "5ducks", 
    reward: 1000, 
    description: "Company mascot discovery", 
    emoji: "🦆" 
  },
  {
    id: 1,
    trigger: "free palestine",
    reward: 3000,
    description: "Solidarity bonus",
    emoji: "🇵🇸"
  },
  {
    id: 2,
    trigger: "he is risen",
    reward: 3000,
    description: "Easter blessing",
    emoji: "🐑"
  }
];
