import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

interface EggProgressBarProps {
  totalEmails: number;
  sentEmails: number;
  onEggClick?: (index: number) => void;
}

// Define egg states
type EggState = 'egg' | 'cracked' | 'hatched';

interface EggData {
  state: EggState;
  isNew?: boolean;
}

export function EggProgressBar({ totalEmails, sentEmails, onEggClick }: EggProgressBarProps) {
  const [eggs, setEggs] = useState<EggData[]>([]);

  // Initialize eggs based on sent count
  useEffect(() => {
    const initialEggs: EggData[] = Array.from({ length: totalEmails }, (_, i) => {
      if (i < sentEmails) {
        return { state: 'hatched', isNew: false };
      } else if (i === sentEmails) {
        return { state: 'cracked', isNew: true };
      } else {
        return { state: 'egg', isNew: false };
      }
    });
    setEggs(initialEggs);
    
    // Clear the "new" flag after animation plays
    if (sentEmails > 0 && sentEmails < totalEmails) {
      const timer = setTimeout(() => {
        setEggs(prev => prev.map((egg, i) => 
          i === sentEmails ? { ...egg, isNew: false } : egg
        ));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [totalEmails, sentEmails]);

  // Simple confetti when all emails are sent
  useEffect(() => {
    if (sentEmails === totalEmails && totalEmails > 0) {
      // Single burst of confetti from center
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { x: 0.5, y: 0.1 }
      });
    }
  }, [sentEmails, totalEmails]);

  const getEggEmoji = (egg: EggData) => {
    if (egg.state === 'hatched') {
      return '🐥';
    } else if (egg.state === 'cracked') {
      return '🐣';
    } else {
      return '🥚';
    }
  };

  const getEggAnimation = (egg: EggData, index: number) => {
    // Apply subtle animation to the current egg (cracked state)
    if (egg.state === 'cracked' && egg.isNew) {
      // Use one of the subtle animations from the search page
      return 'animate-disco-bounce';
    }
    return '';
  };

  return (
    <div className="relative">
      {/* Eggs container - with subtle animations */}
      <div className="flex items-center justify-center gap-2 md:gap-3 py-3">
        {eggs.map((egg, index) => (
          <div
            key={index}
            className="relative"
          >
            <button
              onClick={() => onEggClick?.(index)}
              disabled={egg.state === 'egg' && index > sentEmails}
              className={cn(
                "text-xl md:text-2xl transition-transform duration-200",
                egg.state === 'hatched' && 'hover:scale-110',
                getEggAnimation(egg, index)
              )}
            >
              {getEggEmoji(egg)}
            </button>
          </div>
        ))}
      </div>

      {/* Progress text */}
      <div className="text-center text-xs text-muted-foreground">
        {sentEmails === 0 && (
          <span>Ready to send your first email! 🚀</span>
        )}
        {sentEmails > 0 && sentEmails < totalEmails && (
          <span>{sentEmails} of {totalEmails} emails sent - Keep going! 💪</span>
        )}
        {sentEmails === totalEmails && totalEmails > 0 && (
          <span className="text-green-600 font-semibold">All done! Great job! 🎉</span>
        )}
      </div>
    </div>
  );
}