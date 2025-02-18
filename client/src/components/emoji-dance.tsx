import { useEffect, useState } from "react";

// Animation states
export type EmojiState = 'egg' | 'hatching' | 'chick' | 'settled' | 'dancing1' | 'dancing2' | 'dancing3';

// Dance definitions
export const DANCE_ANIMATIONS = {
  dancing1: "animate-disco-bounce",
  dancing2: "animate-salsa-spin",
  dancing3: "animate-breakdance"
};

// Duration settings
const DANCE_DURATION = 5000; // 5 seconds
const DANCE_INTERVAL = 180000; // 3 minutes

export function useEmojiDance(initialState: EmojiState = 'egg'): [EmojiState, (state: EmojiState) => void, string] {
  const [state, setState] = useState<EmojiState>(initialState);
  const [currentDance, setCurrentDance] = useState<number>(1);

  useEffect(() => {
    if (state === 'settled') {
      // Start the dance rotation
      const danceRotation = setInterval(() => {
        // Trigger dance
        setState(`dancing${currentDance}` as EmojiState);

        // Schedule end of dance
        setTimeout(() => {
          setState('settled');
          // Move to next dance routine
          setCurrentDance(current => (current % 3) + 1);
        }, DANCE_DURATION);
      }, DANCE_INTERVAL);

      return () => clearInterval(danceRotation);
    }
  }, [state, currentDance]);

  // Get the appropriate animation class based on state
  const animationClass = state === 'egg' ? 'animate-egg-shake' :
    state === 'hatching' ? 'animate-hatching-wobble' :
    state === 'chick' ? 'animate-chick-bounce' :
    state.startsWith('dancing') ? DANCE_ANIMATIONS[state as keyof typeof DANCE_ANIMATIONS] :
    '';

  return [state, setState, animationClass];
}