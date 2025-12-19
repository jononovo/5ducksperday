import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  checkCredits, 
  deductCreditsForEmailSearch, 
  CREDIT_COST_EMAIL_SEARCH 
} from '../services/api';
import type { BillingResult, EmailSearchBillingOptions } from '../types';

export function useEmailSearchBilling(options: EmailSearchBillingOptions = {}) {
  const { toast } = useToast();
  const { onBillingComplete, onInsufficientCredits } = options;

  const checkSufficientCredits = useCallback(async (): Promise<boolean> => {
    const { balance, isBlocked } = await checkCredits();
    
    if (isBlocked || balance < CREDIT_COST_EMAIL_SEARCH) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${CREDIT_COST_EMAIL_SEARCH} credits for email search. Current balance: ${balance}`,
        variant: "destructive"
      });
      onInsufficientCredits?.(balance);
      return false;
    }
    
    return true;
  }, [toast, onInsufficientCredits]);

  const billForEmailSearch = useCallback(async (
    contactId: number,
    emailFound: boolean
  ): Promise<BillingResult> => {
    const result = await deductCreditsForEmailSearch(contactId, emailFound);
    
    if (result.charged) {
      console.log(`[search-email billing] Charged ${CREDIT_COST_EMAIL_SEARCH} credits for contact ${contactId}. New balance: ${result.newBalance}`);
    } else if (emailFound && !result.success) {
      console.warn('[search-email billing] Failed to charge for successful email search:', result.message);
    }
    
    onBillingComplete?.(result);
    return result;
  }, [onBillingComplete]);

  return {
    checkSufficientCredits,
    billForEmailSearch,
    CREDIT_COST: CREDIT_COST_EMAIL_SEARCH
  };
}
