import { useState, useEffect, useCallback } from 'react';
import type { Contact, Company } from '@shared/schema';
import type { DrawerMode, UseEmailDrawerOptions, UseEmailDrawerReturn } from './types';
import { getEmailComposerDrawerState } from '@/hooks/use-email-composer-persistence';

export function useEmailDrawer(options: UseEmailDrawerOptions = {}): UseEmailDrawerReturn {
  // Check for persisted drawer state on initialization
  const savedDrawerState = getEmailComposerDrawerState();
  const [isOpen, setIsOpen] = useState(savedDrawerState.isOpen || false);
  const [mode, setMode] = useState<DrawerMode>(savedDrawerState.drawerMode || 'compose');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedCompanyContacts, setSelectedCompanyContacts] = useState<Contact[]>([]);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isResizing, setIsResizing] = useState(false);

  // Handle resize logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const constrainedWidth = Math.max(320, Math.min(720, newWidth));
      setDrawerWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const openDrawer = useCallback((contact: Contact, company: Company, companyContacts: Contact[]) => {
    setSelectedContact(contact);
    setSelectedCompany(company);
    setSelectedCompanyContacts(companyContacts);
    setIsOpen(true);
    options.onOpen?.(contact, company);
  }, [options]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
    setMode('compose');
    setSelectedContact(null);
    setSelectedCompany(null);
    setSelectedCompanyContacts([]);
    options.onClose?.();
  }, [options]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  return {
    isOpen,
    mode,
    selectedContact,
    selectedCompany,
    selectedCompanyContacts,
    drawerWidth,
    isResizing,
    openDrawer,
    closeDrawer,
    setMode,
    setSelectedContact,
    setIsResizing,
    handleMouseDown,
  };
}
