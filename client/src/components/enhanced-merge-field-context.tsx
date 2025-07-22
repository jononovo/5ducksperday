import React, { createContext, useContext } from 'react';
import { MergeFieldContext } from '@/lib/merge-field-resolver';
import { useGmailProfile } from '@/hooks/use-gmail-profile';
import { useAuth } from '@/hooks/use-auth';

interface EnhancedMergeFieldContextType extends MergeFieldContext {
  isGmailConnected: boolean;
  gmailProfile: {
    email: string | null;
    name: string | null;
    givenName: string | null;
    familyName: string | null;
    profilePicture: string | null;
    verifiedEmail: boolean | null;
  } | null;
}

const EnhancedMergeFieldContext = createContext<EnhancedMergeFieldContextType | null>(null);

interface EnhancedMergeFieldProviderProps {
  children: React.ReactNode;
  contact?: {
    name?: string;
    role?: string;
    email?: string;
  } | null;
  company?: {
    name?: string;
  } | null;
}

export function EnhancedMergeFieldProvider({ 
  children, 
  contact, 
  company 
}: EnhancedMergeFieldProviderProps) {
  const { user } = useAuth();
  const { profile: gmailProfile, hasProfile } = useGmailProfile();

  // Enhanced sender info using Gmail profile when available
  const sender = hasProfile && gmailProfile ? {
    name: gmailProfile.name || undefined,
    email: gmailProfile.email || undefined,
    givenName: gmailProfile.givenName || undefined,
    familyName: gmailProfile.familyName || undefined,
  } : {
    name: user?.username || 'Your Name',
    email: user?.email || undefined,
    givenName: undefined,
    familyName: undefined,
  };

  const contextValue: EnhancedMergeFieldContextType = {
    contact,
    company,
    sender,
    isGmailConnected: hasProfile,
    gmailProfile: gmailProfile || null,
  };

  return (
    <EnhancedMergeFieldContext.Provider value={contextValue}>
      {children}
    </EnhancedMergeFieldContext.Provider>
  );
}

export function useEnhancedMergeFieldContext() {
  const context = useContext(EnhancedMergeFieldContext);
  if (!context) {
    throw new Error('useEnhancedMergeFieldContext must be used within EnhancedMergeFieldProvider');
  }
  return context;
}

// Utility function to create merge field context from enhanced context
export function createMergeFieldContext(
  enhancedContext: EnhancedMergeFieldContextType
): MergeFieldContext {
  return {
    contact: enhancedContext.contact,
    company: enhancedContext.company,
    sender: enhancedContext.sender,
  };
}