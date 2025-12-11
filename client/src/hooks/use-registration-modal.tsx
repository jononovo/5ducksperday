import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";

type RegistrationModalContextType = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  openForProtectedRoute: () => void;
  openForLandingPage: () => void;
  isOpenedFromProtectedRoute: boolean;
  isOpenedFromLandingPage: boolean;
  setRegistrationSuccessCallback: (callback: () => void) => void;
};

const RegistrationModalContext = createContext<RegistrationModalContextType>({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
  openForProtectedRoute: () => {},
  openForLandingPage: () => {},
  isOpenedFromProtectedRoute: false,
  isOpenedFromLandingPage: false,
  setRegistrationSuccessCallback: () => {},
});

export const useRegistrationModal = () => useContext(RegistrationModalContext);

interface RegistrationModalProviderProps {
  children: ReactNode;
}

export const RegistrationModalProvider = ({ children }: RegistrationModalProviderProps) => {
  // Modal should be closed by default
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenedFromProtectedRoute, setIsOpenedFromProtectedRoute] = useState(false);
  const [isOpenedFromLandingPage, setIsOpenedFromLandingPage] = useState(false);
  const [onSuccessCallback, setOnSuccessCallback] = useState<(() => void) | null>(null);
  const { user } = useAuth();

  // Clean up obsolete localStorage key from previous first-time visitor logic
  useEffect(() => {
    localStorage.removeItem("hasVisitedBefore");
  }, []);

  const openModal = () => {
    setIsOpenedFromProtectedRoute(false);
    setIsOpen(true);
  };

  const openForProtectedRoute = () => {
    setIsOpenedFromProtectedRoute(true);
    setIsOpen(true);
  };

  const openForLandingPage = () => {
    setIsOpenedFromLandingPage(true);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setIsOpenedFromProtectedRoute(false);
    setIsOpenedFromLandingPage(false);
  };

  const setRegistrationSuccessCallback = (callback: () => void) => {
    setOnSuccessCallback(() => callback);
  };

  // Trigger callback when user becomes authenticated after registration
  useEffect(() => {
    if (user && onSuccessCallback) {
      // Small delay to ensure registration flow is complete
      setTimeout(() => {
        onSuccessCallback();
        setOnSuccessCallback(null); // Clear after use
      }, 100);
    }
  }, [user, onSuccessCallback]);



  return (
    <RegistrationModalContext.Provider 
      value={{ 
        isOpen, 
        openModal, 
        closeModal,
        openForProtectedRoute,
        openForLandingPage,
        isOpenedFromProtectedRoute,
        isOpenedFromLandingPage,
        setRegistrationSuccessCallback
      }}
    >
      {children}
    </RegistrationModalContext.Provider>
  );
};