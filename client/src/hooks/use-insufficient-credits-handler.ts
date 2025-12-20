import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useInsufficientCredits } from '@/contexts/insufficient-credits-context';

export function useInsufficientCreditsHandler() {
  const { toast } = useToast();
  const { openModal } = useInsufficientCredits();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerInsufficientCredits = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    toast({
      title: "You're out of credits",
      description: "Upgrade your plan to continue.",
      variant: "destructive",
    });

    timeoutRef.current = setTimeout(() => {
      openModal();
      timeoutRef.current = null;
    }, 1500);
  }, [toast, openModal]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { triggerInsufficientCredits, cleanup };
}

let globalTrigger: (() => void) | null = null;

export function setGlobalInsufficientCreditsTrigger(trigger: (() => void) | null) {
  globalTrigger = trigger;
}

export function triggerInsufficientCreditsGlobally() {
  if (globalTrigger) {
    globalTrigger();
  }
}
