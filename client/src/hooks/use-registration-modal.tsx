import { createContext, useState, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "./use-auth";

type RegistrationModalContextType = {
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  openForProtectedRoute: () => void;
  isOpenedFromProtectedRoute: boolean;
};

const RegistrationModalContext = createContext<RegistrationModalContextType>({
  isOpen: false,
  openModal: () => {},
  closeModal: () => {},
  openForProtectedRoute: () => {},
  isOpenedFromProtectedRoute: false,
});

export const useRegistrationModal = () => useContext(RegistrationModalContext);

interface RegistrationModalProviderProps {
  children: ReactNode;
}

export const RegistrationModalProvider = ({ children }: RegistrationModalProviderProps) => {
  // Modal should be closed by default
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenedFromProtectedRoute, setIsOpenedFromProtectedRoute] = useState(false);
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

  const closeModal = () => {
    setIsOpen(false);
    setIsOpenedFromProtectedRoute(false);
  };



  return (
    <RegistrationModalContext.Provider 
      value={{ 
        isOpen, 
        openModal, 
        closeModal,
        openForProtectedRoute,
        isOpenedFromProtectedRoute
      }}
    >
      {children}
    </RegistrationModalContext.Provider>
  );
};