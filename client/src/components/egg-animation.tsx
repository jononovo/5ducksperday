import { useEffect, useState } from "react";

export function EggAnimation() {
  const [firstEggState, setFirstEggState] = useState<'egg' | 'hatching' | 'chick'>('egg');

  useEffect(() => {
    // Start the animation sequence
    const hatchingTimeout = setTimeout(() => {
      setFirstEggState('hatching');
    }, 2000);

    const chickTimeout = setTimeout(() => {
      setFirstEggState('chick');
    }, 4000);

    return () => {
      clearTimeout(hatchingTimeout);
      clearTimeout(chickTimeout);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 ml-4">
      <span 
        className={`text-2xl transform transition-transform duration-200 ${
          firstEggState === 'egg' ? 'animate-egg-shake' : ''
        }`}
      >
        {firstEggState === 'egg' ? '🥚' : firstEggState === 'hatching' ? '🐣' : '🐥'}
      </span>
      <span className="text-2xl">🥚</span>
      <span className="text-2xl">🥚</span>
      <span className="text-2xl">🥚</span>
      <span className="text-2xl">🥚</span>
    </div>
  );
}
