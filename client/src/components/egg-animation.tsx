import { useEffect } from "react";
import { useEmojiDance, type EmojiState } from "./emoji-dance";

export function EggAnimation() {
  // Use our custom hook for the first egg's animations
  const [firstEggState, setFirstEggState, firstEggAnimation] = useEmojiDance('egg');

  useEffect(() => {
    // Starting act (warmup) sequence
    const hatchingTimeout = setTimeout(() => {
      setFirstEggState('hatching');
    }, 3000);

    const chickTimeout = setTimeout(() => {
      setFirstEggState('chick');
    }, 6000);

    const settleTimeout = setTimeout(() => {
      setFirstEggState('settled');
    }, 12000);

    return () => {
      clearTimeout(hatchingTimeout);
      clearTimeout(chickTimeout);
      clearTimeout(settleTimeout);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 ml-4">
      <span 
        className={`text-4xl transform transition-transform duration-300 ${firstEggAnimation}`}
      >
        {firstEggState === 'egg' ? '🥚' : 
         firstEggState === 'hatching' ? '🐣' : 
         '🐥'}
      </span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
      <span className="text-4xl">🥚</span>
    </div>
  );
}