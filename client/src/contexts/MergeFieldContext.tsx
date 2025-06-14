import React, { createContext, useContext, ReactNode } from 'react';
import { MergeFieldContext as MergeFieldContextType } from '@/lib/merge-field-resolver';

interface MergeFieldProviderProps {
  children: ReactNode;
  mergeFieldContext: MergeFieldContextType;
  isEditMode: boolean;
}

interface MergeFieldContextValue {
  mergeFieldContext: MergeFieldContextType;
  isEditMode: boolean;
  enableHighlighting: boolean;
}

const MergeFieldContext = createContext<MergeFieldContextValue | null>(null);

export const MergeFieldProvider: React.FC<MergeFieldProviderProps> = ({
  children,
  mergeFieldContext,
  isEditMode
}) => {
  const value: MergeFieldContextValue = {
    mergeFieldContext,
    isEditMode,
    enableHighlighting: true
  };

  return (
    <MergeFieldContext.Provider value={value}>
      {children}
    </MergeFieldContext.Provider>
  );
};

export const useMergeFieldContext = (): MergeFieldContextValue | null => {
  return useContext(MergeFieldContext);
};