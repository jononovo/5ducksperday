export interface EasterEgg {
  id: number;
  trigger: string;
  reward: number;
  description: string;
  emoji?: string;
}

export interface NotificationConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'feature_unlock' | 'milestone';
  trigger: string;
  title: string;
  description: string;
  badge?: string;
  emoji?: string;
  buttonText?: string;
}

export interface BadgeConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'milestone' | 'special';
  trigger: string;
  title: string;
  description: string;
  badge: string;
  emoji?: string;
  buttonText?: string;
}

export interface EasterEggResult {
  success: boolean;
  message: string;
  newBalance?: number;
  easterEgg?: EasterEgg;
}

export interface NotificationResult {
  shouldShow: boolean;
  notification?: NotificationConfig;
  badge?: BadgeConfig;
}

export interface BadgeResult {
  shouldShow: boolean;
  badge?: BadgeConfig;
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
  // Future eggs easily added here
];

// Badges configuration
export const BADGES: BadgeConfig[] = [
  {
    id: 0,
    type: 'welcome',
    trigger: 'registration_complete',
    title: 'Congrats Hatchling Level Unlocked!',
    description: 'You have unlocked **Email Search**.\n\nRun a NEW search now to see complete results including emails of ~2 Key Contacts per company.',
    badge: 'Hatchling',
    emoji: '🦆',
    buttonText: 'Chirp'
  }
];

// Notifications configuration
export const NOTIFICATIONS: NotificationConfig[] = [
  {
    id: 1,
    type: 'milestone',
    trigger: 'waitlist_joined',
    title: 'Added to Waitlist',
    description: 'You\'ll be notified when Duckin\' Awesome becomes available!',
    badge: 'Waitlist Member',
    emoji: '📋',
    buttonText: 'Got It'
  },
  {
    id: 2,
    type: 'feature_unlock',
    trigger: 'search_tooltip_shown',
    title: 'Search Tooltip',
    description: 'Search button tooltip has been shown',
    badge: 'Onboarding',
    emoji: '🔍',
    buttonText: 'Continue'
  },
  {
    id: 3,
    type: 'feature_unlock',
    trigger: 'email_tooltip_shown',
    title: 'Email Discovery Tooltip',
    description: 'Email discovery tooltip has been shown',
    badge: 'Onboarding',
    emoji: '📧',
    buttonText: 'Continue'
  },
  {
    id: 4,
    type: 'feature_unlock',
    trigger: 'start_selling_tooltip_shown',
    title: 'Start Selling Tooltip',
    description: 'Start selling tooltip has been shown',
    badge: 'Onboarding',
    emoji: '🚀',
    buttonText: 'Continue'
  }
];