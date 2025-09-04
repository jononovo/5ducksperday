import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateEmailApi } from "./outreach-service";
import { 
  shouldAutoFillSubject, 
  shouldAutoFillEmail, 
  formatGeneratedContent,
  validateEmailGenerationRequest 
} from "./outreach-utils";
import { applySmartReplacements } from "./smart-replacements";
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
  offerStrategy?: string;
  
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
    offerStrategy = 'none',
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
        offerStrategy,
        toEmail,
        emailSubject
      };
      return generateEmailApi(payload);
    },
    onSuccess: (data: EmailGenerationResponse) => {
      // Apply smart replacements to convert exact name matches to merge fields
      const processed = applySmartReplacements(
        data.content,
        data.subject,
        selectedContact,
        selectedCompany
      );
      
      // Set the processed subject with merge fields
      setEmailSubject(processed.subject);
      setOriginalEmailSubject(processed.subject);
      
      // Always set email field to match selected contact (prevents accidental sends)
      if (selectedContact?.email) {
        setToEmail(selectedContact.email);
      } else {
        setToEmail(''); // Clear field if contact has no email
      }
      
      // Format and set the processed content with merge fields
      const newContent = formatGeneratedContent(processed.content, emailContent);
      setEmailContent(newContent);
      setOriginalEmailContent(newContent);
      
      toast({
        title: "Email Generated",
        description: "AI generated content has replaced all email fields.",
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