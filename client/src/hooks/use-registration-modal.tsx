import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";

type RegistrationModalContextType = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  shouldShowForFirstTimeUsers: boolean;
  setShouldShowForFirstTimeUsers: (value: boolean) => void;
};

const RegistrationModalContext = createContext<RegistrationModalContextType>({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
  shouldShowForFirstTimeUsers: true,
  setShouldShowForFirstTimeUsers: () => {},
});

export const useRegistrationModal = () => useContext(RegistrationModalContext);

interface RegistrationModalProviderProps {
  children: ReactNode;
}

export const RegistrationModalProvider = ({ children }: RegistrationModalProviderProps) => {
  // Modal should be closed by default
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShowForFirstTimeUsers, setShouldShowForFirstTimeUsers] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const { user } = useAuth();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  // Check if user is a first-time visitor
  useEffect(() => {
    if (hasChecked) return;

    // We'll use localStorage to track if this is first visit
    const hasVisitedBefore = localStorage.getItem("hasVisitedBefore");
    
    if (!hasVisitedBefore && shouldShowForFirstTimeUsers && !user) {
      // First time visitor, show the modal
      openModal();
      localStorage.setItem("hasVisitedBefore", "true");
    }
    
    setHasChecked(true);
  }, [hasChecked, shouldShowForFirstTimeUsers, user]);

  return (
    <RegistrationModalContext.Provider 
      value={{ 
        isOpen, 
        openModal, 
        closeModal,
        shouldShowForFirstTimeUsers,
        setShouldShowForFirstTimeUsers
      }}
    >
      {children}
    </RegistrationModalContext.Provider>
  );
};