import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateEmailApi } from "./outreach-service";
import { 
  shouldAutoFillSubject, 
  shouldAutoFillEmail, 
  formatGeneratedContent,
  validateEmailGenerationRequest 
} from "./outreach-utils";
import type { EmailGenerationPayload, EmailGenerationResponse } from "./types";
import type { Contact, Company } from "@shared/schema";

/**
 * Email Generation Hook
 * Manages email generation state and logic
 */

interface UseEmailGenerationProps {
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  emailPrompt: string;
  emailSubject: string;
  emailContent: string;
  toEmail: string;
  tone?: string;
  
  // State setters
  setEmailSubject: (subject: string) => void;
  setOriginalEmailSubject: (subject: string) => void;
  setToEmail: (email: string) => void;
  setEmailContent: (content: string) => void;
  setOriginalEmailContent: (content: string) => void;
}

export const useEmailGeneration = (props: UseEmailGenerationProps) => {
  const { toast } = useToast();
  
  const {
    selectedContact,
    selectedCompany,
    emailPrompt,
    emailSubject,
    emailContent,
    toEmail,
    tone = 'default',
    setEmailSubject,
    setOriginalEmailSubject,
    setToEmail,
    setEmailContent,
    setOriginalEmailContent
  } = props;

  const generateEmailMutation = useMutation({
    mutationFn: async (): Promise<EmailGenerationResponse> => {
      const payload: EmailGenerationPayload = {
        emailPrompt,
        contact: selectedContact,
        company: selectedCompany!,
        tone,
        toEmail,
        emailSubject
      };
      return generateEmailApi(payload);
    },
    onSuccess: (data: EmailGenerationResponse) => {
      // Auto-fill subject if empty
      if (shouldAutoFillSubject(emailSubject)) {
        setEmailSubject(data.subject);
        setOriginalEmailSubject(data.subject);
      }
      
      // Auto-fill email if contact has email and field is empty
      if (shouldAutoFillEmail(selectedContact, toEmail)) {
        setToEmail(selectedContact!.email!);
      }
      
      // Format and set content
      const newContent = formatGeneratedContent(data.content, emailContent);
      setEmailContent(newContent);
      setOriginalEmailContent(newContent);
      
      toast({
        title: "Email Generated",
        description: "New content has been added above the existing email.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate email content",
        variant: "destructive",
      });
    },
  });

  const handleGenerateEmail = () => {
    const validation = validateEmailGenerationRequest(emailPrompt, selectedCompany);
    
    if (!validation.isValid) {
      toast({
        title: validation.error!,
        description: validation.error === "No Company Selected" 
          ? "Please select a company first"
          : "Please enter an email creation prompt",
        variant: "destructive",
      });
      return;
    }

    generateEmailMutation.mutate();
  };

  return {
    generateEmail: handleGenerateEmail,
    isGenerating: generateEmailMutation.isPending,
    generationError: generateEmailMutation.error
  };
};