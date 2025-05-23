import { RegistrationModal } from "./registration-modal";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

export function RegistrationModalContainer() {
  const { isOpen } = useRegistrationModal();
  
  if (!isOpen) {
    return null;
  }
  
  return <RegistrationModal />;
}