import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { generateEmailApi } from "./outreach-service";
import { 
  shouldAutoFillSubject, 
  shouldAutoFillEmail, 
  formatGeneratedContent,
  validateEmailGenerationRequest,
  buildDynamicPromptInstructions
} from "./outreach-utils";
import { applySmartReplacements } from "./smart-replacements";
import type { EmailGenerationPayload, EmailGenerationResponse } from "./types";
import type { Contact, Company } from "@shared/schema";
import type { MergeFieldContext } from "@/lib/merge-field-resolver";

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
  generateTemplate?: boolean; // For campaign template generation
  mergeFieldContext?: MergeFieldContext; // For building dynamic prompts
  
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
    generateTemplate = false,
    mergeFieldContext,
    setEmailSubject,
    setOriginalEmailSubject,
    setToEmail,
    setEmailContent,
    setOriginalEmailContent
  } = props;

  const generateEmailMutation = useMutation({
    mutationFn: async (): Promise<EmailGenerationResponse> => {
      // Build dynamic prompt with only available merge fields
      let enhancedPrompt = emailPrompt;
      if (generateTemplate && mergeFieldContext) {
        const dynamicInstructions = buildDynamicPromptInstructions(mergeFieldContext);
        enhancedPrompt = emailPrompt + dynamicInstructions;
      }
      
      const payload: EmailGenerationPayload = {
        emailPrompt: enhancedPrompt,
        contact: selectedContact,
        company: selectedCompany!,
        tone,
        offerStrategy,
        toEmail,
        emailSubject,
        generateTemplate
      };
      return generateEmailApi(payload);
    },
    onSuccess: (data: EmailGenerationResponse) => {
      let finalSubject = data.subject;
      let finalContent = data.content;
      
      // Only apply smart replacements if NOT generating a template
      if (!generateTemplate) {
        // Apply smart replacements to convert exact name matches to merge fields
        const processed = applySmartReplacements(
          data.content,
          data.subject,
          selectedContact,
          selectedCompany
        );
        finalSubject = processed.subject;
        finalContent = processed.content;
        
        // Always set email field to match selected contact (prevents accidental sends)
        if (selectedContact?.email) {
          setToEmail(selectedContact.email);
        } else {
          setToEmail(''); // Clear field if contact has no email
        }
      } else {
        // For templates, clear the email field since it's for campaigns
        setToEmail('');
      }
      
      // Set the subject
      setEmailSubject(finalSubject);
      setOriginalEmailSubject(finalSubject);
      
      // Format and set the content
      const newContent = formatGeneratedContent(finalContent, emailContent);
      setEmailContent(newContent);
      setOriginalEmailContent(newContent);
      
      toast({
        title: generateTemplate ? "Template Generated" : "Email Generated",
        description: generateTemplate 
          ? "Template with merge fields has been created for your campaign." 
          : "AI generated content has replaced all email fields.",
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