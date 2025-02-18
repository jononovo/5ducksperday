import { useEffect, useState } from "react";

export function EggAnimation() {
  const [firstEggState, setFirstEggState] = useState<'egg' | 'hatching' | 'chick' | 'settled'>('egg');

  useEffect(() => {
    // Start the animation sequence with longer delays
    const hatchingTimeout = setTimeout(() => {
      setFirstEggState('hatching');
    }, 3000); // Increased from 2000 to 3000

    const chickTimeout = setTimeout(() => {
      setFirstEggState('chick');
    }, 6000); // Increased from 4000 to 6000

    // Add timeout for settling the chick after a few bounces
    const settleTimeout = setTimeout(() => {
      setFirstEggState('settled');
    }, 12000); // Give it 6 seconds of bouncing before settling

    return () => {
      clearTimeout(hatchingTimeout);
      clearTimeout(chickTimeout);
      clearTimeout(settleTimeout);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 ml-4">
      <span 
        className={`text-4xl transform transition-transform duration-300 ${
          firstEggState === 'egg' ? 'animate-egg-shake' : 
          firstEggState === 'chick' ? 'animate-chick-bounce' : 
          firstEggState === 'hatching' ? 'animate-hatching-wobble' :
          '' // No animation class for 'settled' state
        }`}
      >
        {firstEggState === 'egg' ? '🥚' : firstEggState === 'hatching' ? '🐣' : '🐥'}
      </span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
    </div>
  );
}