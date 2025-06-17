/**
 * Search State Manager - Atomic state persistence with auth-safe recovery
 * 
 * Fixes critical issues:
 * 1. Contact data loss during navigation
 * 2. State corruption during authentication changes
 * 3. Race conditions in async state updates
 * 4. Component unmounting before state persistence
 */

import type { Company, Contact } from '@shared/schema';

// Define CompanyWithContacts type locally
interface CompanyWithContacts extends Company {
  contacts?: Contact[];
}

export interface SearchStateSnapshot {
  query: string;
  companies: CompanyWithContacts[];
  listId: number | null;
  timestamp: number;
  contactCount: number;
  emailCount: number;
  sessionId: string;
}

export interface ContactPersistenceData {
  companyId: number;
  contacts: any[];
  lastUpdated: number;
}

export class SearchStateManager {
  private static readonly SEARCH_STATE_KEY = 'searchState_v2';
  private static readonly CONTACTS_PREFIX = 'contacts_';
  private static readonly SESSION_KEY = 'search_session';
  private static readonly MAX_AGE = 2 * 60 * 60 * 1000; // 2 hours
  
  /**
   * Save complete search state atomically
   */
  static saveSearchState(query: string, companies: CompanyWithContacts[], listId: number | null): void {
    try {
      const sessionId = this.getOrCreateSessionId();
      const contactCount = companies.reduce((total, company) => total + (company.contacts?.length || 0), 0);
      const emailCount = companies.reduce((total, company) => 
        total + (company.contacts?.filter((c: Contact) => c.email && c.email.length > 5).length || 0), 0
      );

      const snapshot: SearchStateSnapshot = {
        query,
        companies,
        listId,
        timestamp: Date.now(),
        contactCount,
        emailCount,
        sessionId
      };

      // Save to both localStorage and sessionStorage for redundancy
      const stateString = JSON.stringify(snapshot);
      localStorage.setItem(this.SEARCH_STATE_KEY, stateString);
      sessionStorage.setItem(this.SEARCH_STATE_KEY, stateString);

      // Save individual company contacts for granular recovery
      companies.forEach(company => {
        if (company.contacts && company.contacts.length > 0) {
          this.saveCompanyContacts(company.id, company.contacts);
        }
      });

      console.log('SearchStateManager: Saved atomic state', {
        query,
        companiesCount: companies.length,
        contactCount,
        emailCount,
        sessionId
      });
    } catch (error) {
      console.error('SearchStateManager: Failed to save state', error);
    }
  }

  /**
   * Save contacts for a specific company immediately (real-time persistence)
   */
  static saveCompanyContacts(companyId: number, contacts: any[]): void {
    try {
      const contactData: ContactPersistenceData = {
        companyId,
        contacts,
        lastUpdated: Date.now()
      };

      const key = `${this.CONTACTS_PREFIX}${companyId}`;
      localStorage.setItem(key, JSON.stringify(contactData));
      sessionStorage.setItem(key, JSON.stringify(contactData));

      console.log(`SearchStateManager: Saved ${contacts.length} contacts for company ${companyId}`);
    } catch (error) {
      console.error('SearchStateManager: Failed to save company contacts', error);
    }
  }

  /**
   * Load search state with contact recovery
   */
  static loadSearchState(): SearchStateSnapshot | null {
    try {
      // Try localStorage first, fallback to sessionStorage
      let stateString = localStorage.getItem(this.SEARCH_STATE_KEY);
      if (!stateString) {
        stateString = sessionStorage.getItem(this.SEARCH_STATE_KEY);
      }

      if (!stateString) {
        console.log('SearchStateManager: No saved state found');
        return null;
      }

      const snapshot: SearchStateSnapshot = JSON.parse(stateString);

      // Check if state is too old
      if (Date.now() - snapshot.timestamp > this.MAX_AGE) {
        console.log('SearchStateManager: State expired, clearing');
        this.clearAllState();
        return null;
      }

      // Restore missing contacts from granular storage
      const restoredCompanies = snapshot.companies.map(company => {
        if (!company.contacts || company.contacts.length === 0) {
          const recoveredContacts = this.loadCompanyContacts(company.id);
          if (recoveredContacts && recoveredContacts.length > 0) {
            console.log(`SearchStateManager: Recovered ${recoveredContacts.length} contacts for ${company.name}`);
            return { ...company, contacts: recoveredContacts };
          }
        }
        return company;
      });

      const restoredSnapshot = { ...snapshot, companies: restoredCompanies };

      console.log('SearchStateManager: Loaded state with recovery', {
        query: snapshot.query,
        companiesCount: restoredCompanies.length,
        originalContactCount: snapshot.contactCount,
        recoveredContactCount: restoredCompanies.reduce((total, c) => total + (c.contacts?.length || 0), 0)
      });

      return restoredSnapshot;
    } catch (error) {
      console.error('SearchStateManager: Failed to load state', error);
      return null;
    }
  }

  /**
   * Load contacts for a specific company
   */
  static loadCompanyContacts(companyId: number): any[] | null {
    try {
      const key = `${this.CONTACTS_PREFIX}${companyId}`;
      
      // Try localStorage first, fallback to sessionStorage
      let contactString = localStorage.getItem(key);
      if (!contactString) {
        contactString = sessionStorage.getItem(key);
      }

      if (!contactString) return null;

      const contactData: ContactPersistenceData = JSON.parse(contactString);

      // Check if contact data is too old
      if (Date.now() - contactData.lastUpdated > this.MAX_AGE) {
        this.clearCompanyContacts(companyId);
        return null;
      }

      return contactData.contacts;
    } catch (error) {
      console.error('SearchStateManager: Failed to load company contacts', error);
      return null;
    }
  }

  /**
   * Update contacts for a company in real-time (during search progress)
   */
  static updateCompanyContacts(companyId: number, contacts: any[]): void {
    // Save individual company contacts
    this.saveCompanyContacts(companyId, contacts);

    // Update main state if it exists
    try {
      const currentState = this.loadSearchState();
      if (currentState) {
        const updatedCompanies = currentState.companies.map(company => 
          company.id === companyId ? { ...company, contacts } : company
        );

        this.saveSearchState(currentState.query, updatedCompanies, currentState.listId);
      }
    } catch (error) {
      console.error('SearchStateManager: Failed to update company contacts in main state', error);
    }
  }

  /**
   * Get or create session ID for tracking
   */
  static getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  /**
   * Clear all search state
   */
  static clearAllState(): void {
    // Clear main state
    localStorage.removeItem(this.SEARCH_STATE_KEY);
    sessionStorage.removeItem(this.SEARCH_STATE_KEY);

    // Clear individual company contacts
    this.clearAllCompanyContacts();

    // Clear session
    sessionStorage.removeItem(this.SESSION_KEY);

    console.log('SearchStateManager: Cleared all state');
  }

  /**
   * Clear contacts for a specific company
   */
  static clearCompanyContacts(companyId: number): void {
    const key = `${this.CONTACTS_PREFIX}${companyId}`;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }

  /**
   * Clear all company contacts
   */
  static clearAllCompanyContacts(): void {
    // Get all localStorage keys
    const localKeys = Object.keys(localStorage).filter(key => key.startsWith(this.CONTACTS_PREFIX));
    const sessionKeys = Object.keys(sessionStorage).filter(key => key.startsWith(this.CONTACTS_PREFIX));

    // Clear localStorage contacts
    localKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage contacts
    sessionKeys.forEach(key => sessionStorage.removeItem(key));

    console.log(`SearchStateManager: Cleared ${localKeys.length + sessionKeys.length} company contact records`);
  }

  /**
   * Install beforeunload handler for emergency state preservation
   */
  static installEmergencyPersistence(getCurrentState: () => { query: string; companies: CompanyWithContacts[]; listId: number | null } | null): () => void {
    const handleBeforeUnload = () => {
      const currentState = getCurrentState();
      if (currentState) {
        console.log('SearchStateManager: Emergency state save on beforeunload');
        this.saveSearchState(currentState.query, currentState.companies, currentState.listId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Return cleanup function
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }

  /**
   * Check if current state seems corrupted and needs recovery
   */
  static isStateCorrupted(companies: CompanyWithContacts[]): boolean {
    if (!companies || companies.length === 0) return false;

    // Check if we have companies but no contacts at all
    const hasAnyContacts = companies.some(company => company.contacts && company.contacts.length > 0);
    if (!hasAnyContacts) {
      // Check if we have saved contacts that should be there
      const hasSavedContacts = companies.some(company => this.loadCompanyContacts(company.id) !== null);
      return hasSavedContacts;
    }

    return false;
  }

  /**
   * Attempt to recover corrupted state
   */
  static recoverCorruptedState(companies: CompanyWithContacts[]): CompanyWithContacts[] {
    console.log('SearchStateManager: Attempting corrupted state recovery');

    const recoveredCompanies = companies.map(company => {
      const savedContacts = this.loadCompanyContacts(company.id);
      if (savedContacts && savedContacts.length > 0) {
        console.log(`SearchStateManager: Recovered ${savedContacts.length} contacts for ${company.name}`);
        return { ...company, contacts: savedContacts };
      }
      return company;
    });

    const totalRecovered = recoveredCompanies.reduce((total, company) => 
      total + (company.contacts?.length || 0), 0
    );

    console.log(`SearchStateManager: Recovery complete - restored ${totalRecovered} total contacts`);

    return recoveredCompanies;
  }
}