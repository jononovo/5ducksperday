import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface EggProgressBarProps {
  totalEmails: number;
  sentEmails: number;
  onEggClick?: (index: number) => void;
}

// Define egg states
type EggState = 'egg' | 'cracked' | 'hatching' | 'hatched';

interface EggData {
  state: EggState;
  isAnimating: boolean;
}

export function EggProgressBar({ totalEmails, sentEmails, onEggClick }: EggProgressBarProps) {
  const [eggs, setEggs] = useState<EggData[]>([]);
  const [celebratingIndex, setCelebratingIndex] = useState<number | null>(null);

  // Initialize eggs
  useEffect(() => {
    const initialEggs: EggData[] = Array.from({ length: totalEmails }, (_, i) => {
      if (i < sentEmails) {
        return { state: 'hatched', isAnimating: false };
      } else if (i === sentEmails) {
        return { state: 'cracked', isAnimating: false };
      } else {
        return { state: 'egg', isAnimating: false };
      }
    });
    setEggs(initialEggs);
  }, [totalEmails]);

  // Handle when an email is sent
  useEffect(() => {
    if (sentEmails > 0 && sentEmails <= totalEmails) {
      const eggIndex = sentEmails - 1;
      
      // Start hatching animation
      setEggs(prev => {
        const newEggs = [...prev];
        if (newEggs[eggIndex]) {
          newEggs[eggIndex] = { state: 'hatching', isAnimating: true };
        }
        return newEggs;
      });

      // Set celebrating index for the main celebration
      setCelebratingIndex(eggIndex);

      // After animation, set to hatched state
      setTimeout(() => {
        setEggs(prev => {
          const newEggs = [...prev];
          if (newEggs[eggIndex]) {
            newEggs[eggIndex] = { state: 'hatched', isAnimating: false };
          }
          // Crack the next egg if available
          if (newEggs[eggIndex + 1]) {
            newEggs[eggIndex + 1] = { state: 'cracked', isAnimating: false };
          }
          return newEggs;
        });

        // Trigger confetti celebration
        triggerCelebration(eggIndex, sentEmails === totalEmails);

        // Clear celebrating index after animation
        setTimeout(() => {
          setCelebratingIndex(null);
        }, 2000);
      }, 1500);
    }
  }, [sentEmails, totalEmails]);

  const triggerCelebration = (index: number, isComplete: boolean) => {
    const count = isComplete ? 5 : 1;
    const defaults = {
      origin: { 
        x: (index + 1) / (totalEmails + 1), 
        y: 0.1 
      },
      spread: isComplete ? 60 : 30,
      ticks: isComplete ? 100 : 60,
      gravity: 1,
      decay: 0.94,
      startVelocity: isComplete ? 30 : 20,
    };

    function fire(particleRatio: number, opts: any) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(isComplete ? 100 * particleRatio : 30 * particleRatio),
        scalar: isComplete ? 1.2 : 1,
      });
    }

    if (isComplete) {
      // Big celebration for completing all emails
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      fire(0.2, {
        spread: 60,
        colors: ['#FFD700', '#FFA500']
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ['#FFD700', '#FFA500', '#FF6347']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
        colors: ['#FFD700']
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
        colors: ['#FFA500']
      });
    } else {
      // Small celebration for each egg
      fire(1, {
        colors: ['#FFD700', '#FFA500', '#FFEB3B']
      });
    }
  };

  const getEggEmoji = (egg: EggData, index: number) => {
    if (egg.state === 'hatched') {
      return '🐥';
    } else if (egg.state === 'hatching') {
      return '🐣';
    } else if (egg.state === 'cracked') {
      return '🐣'; // Show cracked egg emoji for current email
    } else {
      return '🥚';
    }
  };

  const getEggAnimation = (egg: EggData, index: number) => {
    if (celebratingIndex === index) {
      return 'animate-celebrate-hatch';
    }
    if (egg.state === 'hatching') {
      return 'animate-chick-bounce'; // Use bounce animation when hatching
    }
    if (egg.state === 'cracked') {
      return 'animate-hatching-wobble'; // Use wobble for current email
    }
    if (egg.state === 'hatched') {
      return ''; // No animation for settled chicks
    }
    return 'animate-egg-shake'; // Gentle shake for pending eggs
  };

  return (
    <div className="relative">
      {/* Eggs container */}
      <div className="flex items-center justify-center gap-2 md:gap-3 py-3">
        {eggs.map((egg, index) => (
          <div
            key={index}
            className="relative"
          >
            {/* Celebration overlay for individual egg */}
            {celebratingIndex === index && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></div>
              </div>
            )}
            
            {/* The egg/chick */}
            <button
              onClick={() => onEggClick?.(index)}
              disabled={egg.state === 'egg' && index > sentEmails}
              className={cn(
                "text-3xl md:text-4xl transition-all duration-300 transform",
                getEggAnimation(egg, index),
                egg.state === 'cracked' && 'opacity-90',
                egg.state === 'hatched' && 'hover:scale-110',
                celebratingIndex === index && 'z-30 scale-150'
              )}
            >
              {getEggEmoji(egg, index)}
            </button>

            {/* Progress indicator removed - green dots were confusing */}
          </div>
        ))}
      </div>

      {/* Progress text */}
      <div className="text-center text-sm text-muted-foreground">
        {sentEmails === 0 && (
          <span>Ready to send your first email! 🚀</span>
        )}
        {sentEmails > 0 && sentEmails < totalEmails && (
          <span>{sentEmails} of {totalEmails} emails sent - Keep going! 💪</span>
        )}
        {sentEmails === totalEmails && (
          <span className="text-green-600 font-semibold">All done! Great job! 🎉</span>
        )}
      </div>
    </div>
  );
}