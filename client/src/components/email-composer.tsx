import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Mail, Type, Wand2, Loader2, Box, Palette, Gift, Check, Info, Lock, ChevronDown, ChevronUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickTemplates from "./quick-templates";
import { EmailSendButton } from "./email-fallback/EmailSendButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Contact, Company, StrategicProfile, EmailTemplate } from "@shared/schema";
import { useEmailGeneration } from "@/email-content-generation/useOutreachGeneration";
import { resolveFrontendSenderNames, createMergeFieldContext } from "@/email-content-generation/outreach-utils";
import { resolveAllMergeFields } from "@/lib/merge-field-resolver";
import { useAuth } from "@/hooks/use-auth";
import { TONE_OPTIONS, DEFAULT_TONE } from "@/lib/tone-options";
import { OFFER_OPTIONS, DEFAULT_OFFER } from "@/lib/offer-options";
import { RecipientSelectionModal, type RecipientSelection } from "@/components/recipient-selection-modal";
import { CampaignSettings, type CampaignSettingsData } from "@/components/campaign-settings";
import { CampaignSendButton } from "@/components/campaign-send-button/CampaignSendButton";
import { EmailGenerationTabs, getGenerationModeConfig } from "@/components/email-generation-tabs";

// Component prop types
interface EmailComposerProps {
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  onContactChange?: (contact: Contact | null) => void;
  onCompanyChange?: (company: Company | null) => void;
  drawerMode?: 'compose' | 'campaign';
  currentListId?: number | null;
  currentQuery?: string | null;
  // Email state props from parent
  emailPrompt?: string;
  setEmailPrompt?: (value: string) => void;
  emailSubject?: string;
  setEmailSubject?: (value: string) => void;
  emailContent?: string;
  setEmailContent?: (value: string) => void;
  toEmail?: string;
  setToEmail?: (value: string) => void;
  selectedTone?: string;
  setSelectedTone?: (value: string) => void;
  selectedOfferStrategy?: string;
  setSelectedOfferStrategy?: (value: string) => void;
  selectedProduct?: number | null;
  setSelectedProduct?: (value: number | null) => void;
  originalEmailPrompt?: string;
  setOriginalEmailPrompt?: (value: string) => void;
  originalEmailSubject?: string;
  setOriginalEmailSubject?: (value: string) => void;
  originalEmailContent?: string;
  setOriginalEmailContent?: (value: string) => void;
}


export function EmailComposer({
  selectedContact,
  selectedCompany,
  onContactChange,
  onCompanyChange,
  drawerMode = 'compose',
  currentListId = null,
  currentQuery = null,
  // Email state props with fallback to internal state for backwards compatibility
  emailPrompt: emailPromptProp,
  setEmailPrompt: setEmailPromptProp,
  emailSubject: emailSubjectProp,
  setEmailSubject: setEmailSubjectProp,
  emailContent: emailContentProp,
  setEmailContent: setEmailContentProp,
  toEmail: toEmailProp,
  setToEmail: setToEmailProp,
  selectedTone: selectedToneProp,
  setSelectedTone: setSelectedToneProp,
  selectedOfferStrategy: selectedOfferStrategyProp,
  setSelectedOfferStrategy: setSelectedOfferStrategyProp,
  selectedProduct: selectedProductProp,
  setSelectedProduct: setSelectedProductProp,
  originalEmailPrompt: originalEmailPromptProp,
  setOriginalEmailPrompt: setOriginalEmailPromptProp,
  originalEmailSubject: originalEmailSubjectProp,
  setOriginalEmailSubject: setOriginalEmailSubjectProp,
  originalEmailContent: originalEmailContentProp,
  setOriginalEmailContent: setOriginalEmailContentProp
}: EmailComposerProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Use props if provided, otherwise use local state for backwards compatibility
  const [localEmailPrompt, setLocalEmailPrompt] = useState("");
  const [localOriginalEmailPrompt, setLocalOriginalEmailPrompt] = useState("");
  const [localToEmail, setLocalToEmail] = useState("");
  const [localEmailSubject, setLocalEmailSubject] = useState("");
  const [localOriginalEmailSubject, setLocalOriginalEmailSubject] = useState("");
  const [localEmailContent, setLocalEmailContent] = useState("");
  const [localOriginalEmailContent, setLocalOriginalEmailContent] = useState("");
  const [localSelectedProduct, setLocalSelectedProduct] = useState<number | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<StrategicProfile | null>(null);
  const [localSelectedTone, setLocalSelectedTone] = useState<string>(DEFAULT_TONE);
  const [localSelectedOfferStrategy, setLocalSelectedOfferStrategy] = useState<string>(DEFAULT_OFFER);

  // Use props if provided, otherwise use local state
  const emailPrompt = emailPromptProp ?? localEmailPrompt;
  const setEmailPrompt = setEmailPromptProp ?? setLocalEmailPrompt;
  const originalEmailPrompt = originalEmailPromptProp ?? localOriginalEmailPrompt;
  const setOriginalEmailPrompt = setOriginalEmailPromptProp ?? setLocalOriginalEmailPrompt;
  const toEmail = toEmailProp ?? localToEmail;
  const setToEmail = setToEmailProp ?? setLocalToEmail;
  const emailSubject = emailSubjectProp ?? localEmailSubject;
  const setEmailSubject = setEmailSubjectProp ?? setLocalEmailSubject;
  const originalEmailSubject = originalEmailSubjectProp ?? localOriginalEmailSubject;
  const setOriginalEmailSubject = setOriginalEmailSubjectProp ?? setLocalOriginalEmailSubject;
  const emailContent = emailContentProp ?? localEmailContent;
  const setEmailContent = setEmailContentProp ?? setLocalEmailContent;
  const originalEmailContent = originalEmailContentProp ?? localOriginalEmailContent;
  const setOriginalEmailContent = setOriginalEmailContentProp ?? setLocalOriginalEmailContent;
  const selectedProduct = selectedProductProp ?? localSelectedProduct;
  const setSelectedProduct = setSelectedProductProp ?? setLocalSelectedProduct;
  const selectedTone = selectedToneProp ?? localSelectedTone;
  const setSelectedTone = setSelectedToneProp ?? setLocalSelectedTone;
  const selectedOfferStrategy = selectedOfferStrategyProp ?? localSelectedOfferStrategy;
  const setSelectedOfferStrategy = setSelectedOfferStrategyProp ?? setLocalSelectedOfferStrategy;
  // Removed isGenerating state - will come from the hook
  const [isSent, setIsSent] = useState(false);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [generateConfirmDialogOpen, setGenerateConfirmDialogOpen] = useState(false);
  const [productChangeDialogOpen, setProductChangeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<StrategicProfile | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isMergeViewMode, setIsMergeViewMode] = useState(false);
  const [isGmailButtonHovered, setIsGmailButtonHovered] = useState(false);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);
  const [recipientModalOpen, setRecipientModalOpen] = useState(false);
  const [campaignRecipients, setCampaignRecipients] = useState<RecipientSelection | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [campaignSettings, setCampaignSettings] = useState<CampaignSettingsData>({
    scheduleSend: false,
    autopilot: false,
    requiresHumanReview: true, // Default to human review enabled for backward compatibility
    trackEmails: true, // Default to on like in the screenshot
    unsubscribeLink: false,
  });
  // Generation mode state for campaign mode
  const [generationMode, setGenerationMode] = useState<'ai_unique' | 'merge_field'>('merge_field');

  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const toEmailRef = useRef<HTMLInputElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);

  // Create merge field context for resolving merge fields
  const senderNames = resolveFrontendSenderNames(user);
  const mergeFieldContext = createMergeFieldContext(
    selectedContact,
    selectedCompany,
    senderNames.fullName,
    senderNames.firstName
  );

  // Email generation hook
  const { generateEmail: performGeneration, isGenerating } = useEmailGeneration({
    selectedContact,
    selectedCompany,
    emailPrompt,
    emailSubject,
    emailContent,
    toEmail,
    tone: selectedTone,
    offerStrategy: selectedOfferStrategy,
    generateTemplate: drawerMode === 'campaign' && generationMode === 'merge_field', // Only generate template in campaign mode with merge_field
    setEmailSubject,
    setOriginalEmailSubject,
    setToEmail,
    setEmailContent,
    setOriginalEmailContent
  });

  // Queries
  const { data: products = [] } = useQuery<StrategicProfile[]>({
    queryKey: ['/api/strategic-profiles']
  });
  
  // Fetch templates at the EmailComposer level to avoid multiple fetches
  const { data: templates = [], isLoading: templatesLoading } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/email-templates'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 1, // Retry once on failure
    refetchOnMount: false, // Use cached data when available
  });

  const { data: gmailStatus } = useQuery<{authorized: boolean}>({
    queryKey: ['/api/gmail/auth-status'],
    refetchInterval: 5000
  });

  const { data: gmailUserInfo } = useQuery<{email: string}>({
    queryKey: ['/api/gmail/user'],
    enabled: !!(gmailStatus as any)?.authorized
  });

  // Mutations
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const res = await apiRequest("POST", '/api/gmail/send', data);
      return await res.json();
    },
    onSuccess: () => {
      setIsSent(true);
      toast({
        title: "Email sent successfully!",
        description: "Your email has been sent via Gmail."
      });
      setTimeout(() => setIsSent(false), 3000);
    },
    onError: (error: any) => {
      console.error('Send email error:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again or send manually.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const res = await apiRequest("PUT", `/api/email-templates/${template.id}`, template);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template updated successfully!" });
    }
  });

  // Campaign creation mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (type: 'scheduled' | 'immediate' | 'draft') => {
      // Use campaignRecipients if set, otherwise auto-create from current search
      let recipientsToUse = campaignRecipients;
      
      if (!recipientsToUse && currentListId && currentQuery) {
        recipientsToUse = {
          type: 'current' as const,
          listId: currentListId,
          query: currentQuery
        };
      }
      
      if (!recipientsToUse) {
        console.error('No recipients available:', {
          campaignRecipients,
          currentListId,
          currentQuery,
          drawerMode
        });
        throw new Error('No recipients available. Please run a search first or select recipients for your campaign');
      }

      let contactListId: number;
      
      // Create or use existing contact list based on recipient selection
      if (recipientsToUse.type === 'existing') {
        // Use the existing contact list
        contactListId = recipientsToUse.contactListId;
      } else {
        // Create new contact list from search results
        const listData: any = {};
        
        if (recipientsToUse.type === 'current') {
          listData.currentListId = recipientsToUse.listId;
          listData.currentQuery = recipientsToUse.query;
        } else if (recipientsToUse.type === 'multiple') {
          listData.searchListIds = recipientsToUse.searchListIds;
        }
        
        const contactListRes = await apiRequest("POST", '/api/contact-lists/from-search', listData);
        const contactList = await contactListRes.json();
        contactListId = contactList.id;
      }
      
      // Determine the campaign status based on type
      const status = type === 'scheduled' ? 'scheduled' : (type === 'immediate' ? 'active' : 'draft');
      
      // Create the campaign with all settings
      const campaignData: any = {
        // Basic campaign details
        name: emailSubject || 'Untitled Campaign',
        subject: emailSubject,
        body: emailContent,
        prompt: emailPrompt,
        contactListId: contactListId,
        status: status,
        
        // Email generation settings
        tone: selectedTone,
        offerType: selectedOfferStrategy,
        generationType: generationMode, // Track which generation mode was used
        
        // Scheduling settings
        sendTimePreference: type,
        scheduleDate: campaignSettings.scheduleSend && campaignSettings.scheduleDate ? campaignSettings.scheduleDate : undefined,
        scheduleTime: campaignSettings.scheduleSend && campaignSettings.scheduleTime ? campaignSettings.scheduleTime : undefined,
        timezone: 'America/New_York', // Default timezone, could be made configurable
        
        // Autopilot settings
        autopilotEnabled: campaignSettings.autopilot,
        autopilotSettings: campaignSettings.autopilotSettings,
        maxEmailsPerDay: campaignSettings.autopilotSettings?.maxEmailsPerDay || 20,
        delayBetweenEmails: campaignSettings.autopilotSettings?.delayBetweenEmails || 30,
        
        // Tracking settings
        trackEmails: campaignSettings.trackEmails,
        unsubscribeLink: campaignSettings.unsubscribeLink
      };
      
      // Only include productId and strategicProfileId if they have valid values
      if (selectedProduct) {
        campaignData.productId = selectedProduct;
        campaignData.strategicProfileId = selectedProduct; // Use the same product ID for strategic profile
      }
      
      const campaignRes = await apiRequest("POST", '/api/campaigns', campaignData);
      
      return await campaignRes.json();
    },
    onSuccess: (campaign, variables) => {
      const campaignType = variables;
      
      let title = "Campaign Created!";
      let description = `Your campaign "${campaign.name}" has been created successfully.`;
      
      if (campaignType === 'immediate') {
        title = "Campaign Started!";
        description = `Your campaign "${campaign.name}" has started and emails are being sent.`;
      } else if (campaignType === 'draft') {
        title = "Campaign Saved as Draft!";
        description = `Your campaign "${campaign.name}" has been saved as a draft for later.`;
      } else if (campaignType === 'scheduled') {
        title = "Campaign Scheduled!";
        description = `Your campaign "${campaign.name}" has been scheduled and will start at the configured time.`;
      }
      
      toast({ title, description });
      
      // Clear the form
      setEmailPrompt('');
      setEmailSubject('');
      setEmailContent('');
      setCampaignRecipients(null);
      
      // Invalidate campaign list query
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
    },
    onError: (error) => {
      toast({
        title: "Campaign Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create campaign',
        variant: "destructive"
      });
    }
  });

  // Effects
  useEffect(() => {
    console.log('EmailComposer useEffect - campaign recipients check:', {
      drawerMode,
      currentListId,
      currentQuery,
      hasCampaignRecipients: !!campaignRecipients,
      selectedContactEmail: selectedContact?.email
    });
    
    if (drawerMode === 'compose' && selectedContact?.email) {
      setToEmail(selectedContact.email);
    } else if (drawerMode === 'campaign' && currentListId && currentQuery && !campaignRecipients) {
      // Auto-set current list as default recipients in campaign mode
      console.log('Auto-setting campaign recipients with current search:', {
        type: 'current',
        listId: currentListId,
        query: currentQuery
      });
      setCampaignRecipients({ 
        type: 'current', 
        listId: currentListId, 
        query: currentQuery 
      });
    } else if (drawerMode === 'campaign' && (!currentListId || !currentQuery)) {
      console.warn('Cannot auto-set recipients - missing search data:', {
        currentListId,
        currentQuery
      });
    }
  }, [selectedContact, drawerMode, currentListId, currentQuery]);

  useEffect(() => {
    handleTextareaResize();
    handlePromptTextareaResize();
  }, [emailContent, emailPrompt]);

  // Handlers
  const handleTextareaResize = () => {
    if (emailContentRef.current) {
      emailContentRef.current.style.height = 'auto';
      const scrollHeight = emailContentRef.current.scrollHeight;
      const maxHeight = 400;
      const minHeight = 160;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      emailContentRef.current.style.height = `${newHeight}px`;
    }
  };

  const handlePromptTextareaResize = () => {
    if (promptTextareaRef.current) {
      promptTextareaRef.current.style.height = 'auto';
      const scrollHeight = promptTextareaRef.current.scrollHeight;
      const maxHeight = 120;
      const minHeight = 32;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      promptTextareaRef.current.style.height = `${newHeight}px`;
    }
  };

  const getDisplayValue = (currentValue: string, originalValue?: string) => {
    // In edit mode, show the current value being edited
    if (isEditMode) return currentValue;
    
    // In merge view mode, show the raw template with merge fields
    if (isMergeViewMode) return originalValue || currentValue;
    
    // Default: resolve merge fields to show actual values
    return resolveAllMergeFields(originalValue || currentValue, mergeFieldContext);
  };

  const handleSelectProduct = (product: StrategicProfile) => {
    if (emailPrompt && emailPrompt !== (selectedProductData?.productService || '')) {
      setPendingProduct(product);
      setProductChangeDialogOpen(true);
    } else {
      applyProductChange(product);
    }
  };

  const handleSelectNone = () => {
    if (emailPrompt && emailPrompt !== (selectedProductData?.productService || '')) {
      setPendingProduct(null);
      setProductChangeDialogOpen(true);
    } else {
      setSelectedProduct(null);
      setSelectedProductData(null);
      setEmailPrompt("");
      setOriginalEmailPrompt("");
      setProductPopoverOpen(false);
    }
  };

  const applyProductChange = (product: StrategicProfile | null) => {
    if (product) {
      setSelectedProduct(product.id);
      setSelectedProductData(product);
      setEmailPrompt(product.productService || "");
      setOriginalEmailPrompt(product.productService || "");
    } else {
      setSelectedProduct(null);
      setSelectedProductData(null);
      setEmailPrompt("");
      setOriginalEmailPrompt("");
    }
    setProductPopoverOpen(false);
  };

  const handleConfirmProductChange = () => {
    applyProductChange(pendingProduct);
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
  };

  const handleCancelProductChange = () => {
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
  };

  const handleGenerateEmail = () => {
    // Validation checks
    if (!selectedCompany) {
      toast({
        title: "No Company Selected",
        description: "Please select a company to generate an email.",
        variant: "destructive",
      });
      return;
    }

    if (!emailPrompt || emailPrompt.trim() === '') {
      toast({
        title: "No Prompt Provided",
        description: "Please provide details about your product or service.",
        variant: "destructive",
      });
      return;
    }

    if (emailContent || emailSubject) {
      setGenerateConfirmDialogOpen(true);
    } else {
      performGeneration();
    }
  };

  const handleConfirmGenerate = () => {
    setGenerateConfirmDialogOpen(false);
    performGeneration();
  };

  const handleSendEmail = () => {
    if (!toEmail || !emailSubject || !emailContent) {
      toast({
        title: "Missing fields",
        description: "Please fill in all email fields.",
        variant: "destructive"
      });
      return;
    }
    sendEmailMutation.mutate({
      to: toEmail,
      subject: emailSubject,
      body: emailContent
    });
  };

  const handleManualSend = () => {
    // The EmailSendButton already handles opening the email client with the proper formatting.
    // This callback is now only used for tracking/confirmation purposes.
    // The duplicate mailto link creation has been removed to fix the double email window issue.
    console.log('Email opened in default client');
  };

  const handleGmailConnect = () => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please log in to connect Gmail.",
        variant: "destructive"
      });
      return;
    }
    window.open(`/api/gmail/auth?userId=${user.id}`, '_blank');
  };

  const handleSaveEmail = async (templateName: string) => {
    try {
      await apiRequest("POST", '/api/email-templates', {
        name: templateName,
        subject: originalEmailSubject || emailSubject,
        content: originalEmailContent || emailContent,
        description: originalEmailPrompt || emailPrompt
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template saved successfully!" });
    } catch (error) {
      console.error('Save template error:', error);
      toast({
        title: "Failed to save template",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const saveCurrentTemplate = async () => {
    if (!editingTemplateId || !editingTemplate) return;
    
    updateMutation.mutate({
      ...editingTemplate,
      subject: originalEmailSubject || emailSubject,
      content: originalEmailContent || emailContent,
      description: originalEmailPrompt || emailPrompt
    } as EmailTemplate);
  };

  const handleMergeFieldInsert = (field: string) => {
    if (emailContentRef.current) {
      const start = emailContentRef.current.selectionStart;
      const end = emailContentRef.current.selectionEnd;
      const text = emailContent;
      const newText = text.substring(0, start) + field + text.substring(end);
      setEmailContent(newText);
      setOriginalEmailContent(newText);
      
      setTimeout(() => {
        if (emailContentRef.current) {
          emailContentRef.current.focus();
          emailContentRef.current.setSelectionRange(start + field.length, start + field.length);
        }
      }, 0);
    }
  };

  const enterEditMode = (template: any) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setEditingTemplate(template);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
  };

  const toggleMergeView = () => {
    setIsMergeViewMode(!isMergeViewMode);
  };

  const handleRecipientSelect = (selection: RecipientSelection) => {
    setCampaignRecipients(selection);
    setRecipientModalOpen(false);
  };

  const getRecipientDisplayText = () => {
    if (!campaignRecipients) {
      return currentQuery ? currentQuery : "Select recipients";
    }
    
    if (campaignRecipients.type === 'current') {
      return campaignRecipients.query;
    } else if (campaignRecipients.type === 'multiple') {
      return `${campaignRecipients.searchListIds.length} search lists selected`;
    } else if (campaignRecipients.type === 'existing') {
      return campaignRecipients.contactListName;
    }
    
    return "Select recipients";
  };

  const handleCreateCampaign = (type: 'scheduled' | 'immediate' | 'draft' = 'scheduled') => {
    // Validate requirements first
    if (!currentListId && !campaignRecipients) {
      toast({
        title: "No Recipients Available",
        description: "Please run a search first or select recipients for your campaign",
        variant: "destructive"
      });
      return;
    }

    if (!emailContent) {
      toast({
        title: "No Email Content",
        description: "Please add email content for your campaign",
        variant: "destructive"
      });
      return;
    }

    // Auto-set recipients if not already set
    if (!campaignRecipients && currentListId && currentQuery) {
      const autoRecipients: RecipientSelection = {
        type: 'current',
        listId: currentListId,
        query: currentQuery
      };
      setCampaignRecipients(autoRecipients);
    }

    // Update settings based on type
    setCampaignSettings(prev => ({
      ...prev,
      scheduleSend: type === 'scheduled'
    }));

    // Launch the campaign
    createCampaignMutation.mutate(type);
  };

  return (
    <div className="space-y-0 md:space-y-6">
      {/* Generation Mode Tabs - Only shown in campaign mode */}
      {drawerMode === 'campaign' && (
        <div className="mb-4">
          <EmailGenerationTabs
            selectedMode={generationMode}
            onModeChange={setGenerationMode}
            className=""
          />
        </div>
      )}
      
      {/* Email Prompt Field */}
      <div className="relative border-t border-b md:border-t-0 md:border-b-0 md:mb-6 mb-4">
        <Textarea
          ref={promptTextareaRef}
          placeholder="Add product, e.g.: Stationary products & printers"
          value={getDisplayValue(emailPrompt, originalEmailPrompt)}
          onChange={(e) => {
            setEmailPrompt(e.target.value);
            setOriginalEmailPrompt(e.target.value);
            handlePromptTextareaResize();
          }}
          className="mobile-input mobile-input-text-fix resize-none transition-all duration-200 pb-8 border-0 rounded-none md:border md:rounded-md px-3 md:px-3 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ minHeight: '32px', maxHeight: '120px' }}
        />
        <div className="absolute bottom-1 left-2 flex items-center gap-2">
          {/* Product Selection */}
          <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
                title="Select product context"
              >
                <Box className="w-3 h-3" />
                {selectedProductData && (
                  <span className="max-w-20 truncate">{selectedProductData.title || selectedProductData.productService || 'Product'}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Product Context</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Insert from your existing product list</p>
              </div>
              <div className="p-2">
                {/* None Option */}
                <button
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                    selectedProduct === null && "bg-accent"
                  )}
                  onClick={handleSelectNone}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">None</span>
                      <span className="text-muted-foreground"> - No specific product context</span>
                    </div>
                    {selectedProduct === null && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
                
                {/* Product Options */}
                {products.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    <p>No products created yet.</p>
                    <p className="text-xs mt-1">Create one in Strategy Dashboard</p>
                  </div>
                ) : (
                  products.map((product) => (
                    <button
                      key={product.id}
                      className={cn(
                        "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                        selectedProduct === product.id && "bg-accent"
                      )}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {product.title || product.productService || 'Untitled Product'}
                          </div>
                          {product.productService && product.title !== product.productService && (
                            <div className="text-muted-foreground truncate mt-0.5">
                              {product.productService}
                            </div>
                          )}
                        </div>
                        {selectedProduct === product.id && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Tone Selection */}
          <Popover open={tonePopoverOpen} onOpenChange={setTonePopoverOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
                title="Select email tone"
              >
                <Palette className="w-3 h-3" />
                <span>{TONE_OPTIONS.find(t => t.id === selectedTone)?.name || 'Casual'}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Email Tone</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Choose the personality for your email</p>
              </div>
              <div className="p-2">
                {TONE_OPTIONS.map((tone) => (
                  <button
                    key={tone.id}
                    className={cn(
                      "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                      selectedTone === tone.id && "bg-accent"
                    )}
                    onClick={() => {
                      setSelectedTone(tone.id);
                      setTonePopoverOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-medium">{tone.name}</span>
                        <span className="text-muted-foreground"> - {tone.description}</span>
                      </div>
                      {selectedTone === tone.id && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Offer Strategy Selection */}
          <Popover open={offerPopoverOpen} onOpenChange={setOfferPopoverOpen}>
            <PopoverTrigger asChild>
              <button 
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
                title="Select offer strategy"
              >
                <Gift className="w-3 h-3" />
                {selectedOfferStrategy !== 'none' && (
                  <span>{OFFER_OPTIONS.find(o => o.id === selectedOfferStrategy)?.name}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <div className="p-4 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-primary" />
                  <h4 className="font-semibold text-sm">Offer Strategy</h4>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Optional: Structure your offer for maximum impact</p>
              </div>
              <div className="p-2">
                {OFFER_OPTIONS.map((offer) => (
                  <button
                    key={offer.id}
                    className={cn(
                      "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                      selectedOfferStrategy === offer.id && "bg-accent"
                    )}
                    onClick={() => {
                      setSelectedOfferStrategy(offer.id);
                      setOfferPopoverOpen(false);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="font-medium">{offer.name}</span>
                        <span className="text-muted-foreground"> - {offer.description}</span>
                      </div>
                      {selectedOfferStrategy === offer.id && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-2">
          <TooltipProvider>
            <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
              <TooltipTrigger asChild>
              <button 
                className="p-1 rounded hover:bg-accent transition-colors"
                onClick={() => setTooltipOpen(!tooltipOpen)}
                onBlur={() => setTooltipOpen(false)}
              >
                <Info className="w-3 h-3 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-sm max-w-xs">
              <p>Give us a sentence about your offer and we'll generate the email for you. It'll be awesome.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button 
          onClick={handleGenerateEmail} 
          variant={drawerMode === 'campaign' ? "pink" : "yellow"}
          disabled={isGenerating}
          className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          {isGenerating 
            ? "Generating..." 
            : drawerMode === 'campaign' 
              ? getGenerationModeConfig(generationMode).buttonText
              : "Generate Email"
          }
        </Button>
      </div>
    </div>

    {/* To Email Field / Campaign Recipients */}
    <div className="relative border-b md:border-b-0 md:mb-6">
      {drawerMode === 'compose' ? (
        <>
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={toEmailRef}
            placeholder="Recipient Email"
            value={getDisplayValue(toEmail)}
            onChange={(e) => setToEmail(e.target.value)}
            type="email"
            className="mobile-input mobile-input-text-fix pl-10 border-0 rounded-none md:border md:rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </>
      ) : (
        <>
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <div
            onClick={() => setRecipientModalOpen(true)}
            className="mobile-input mobile-input-text-fix pl-10 pr-3 py-2 border-0 rounded-none md:border md:rounded-md cursor-pointer transition-colors hover:bg-muted/50 flex items-center justify-between"
          >
            {(campaignRecipients || currentQuery) ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded bg-primary/10 text-primary text-sm font-medium truncate max-w-full">
                {getRecipientDisplayText()}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">
                {getRecipientDisplayText()}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
          
          <RecipientSelectionModal
            open={recipientModalOpen}
            onOpenChange={setRecipientModalOpen}
            currentListId={currentListId}
            currentQuery={currentQuery}
            onSelect={handleRecipientSelect}
          />
        </>
      )}
    </div>

    {/* Email Subject Field */}
    <div className="relative border-b md:border-b-0 md:mb-6">
      <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        ref={emailSubjectRef}
        placeholder="Email Subject"
        value={getDisplayValue(emailSubject, originalEmailSubject)}
        onChange={(e) => {
          setEmailSubject(e.target.value);
          setOriginalEmailSubject(e.target.value);
        }}
        className="mobile-input mobile-input-text-fix pl-10 border-0 rounded-none md:border md:rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>

    {/* Email Content Field */}
    <div className="relative md:mb-6">
      <Textarea
        ref={emailContentRef}
        placeholder="Enter or edit the generated email content..."
        value={getDisplayValue(emailContent, originalEmailContent)}
        onChange={(e) => {
          setEmailContent(e.target.value);
          setOriginalEmailContent(e.target.value);
          handleTextareaResize();
        }}
        className="mobile-input mobile-input-text-fix resize-none transition-all duration-200 border-0 rounded-none md:border md:rounded-md px-3 md:px-3 pb-12 focus-visible:ring-0 focus-visible:ring-offset-0"
        style={{ minHeight: '160px', maxHeight: '400px' }}
      />
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        {/* Gmail Connection Button/Status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {gmailStatus?.authorized ? (
                <Button
                  onClick={handleGmailConnect}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 transition-all duration-300 group overflow-hidden"
                  style={{ 
                    width: 'auto',
                    minWidth: '32px',
                    maxWidth: '32px',
                    padding: '0 8px',
                    transition: 'max-width 0.3s ease-out, padding 0.3s ease-out'
                  }}
                  onMouseEnter={(e) => {
                    const button = e.currentTarget;
                    button.style.maxWidth = '200px';
                    button.style.padding = '0 12px';
                  }}
                  onMouseLeave={(e) => {
                    const button = e.currentTarget;
                    button.style.maxWidth = '32px';
                    button.style.padding = '0 8px';
                  }}
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span 
                    className="ml-1.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ transitionDelay: '0.1s' }}
                  >
                    {gmailUserInfo?.email 
                      ? (gmailUserInfo as any).email.length > 20 
                        ? `${(gmailUserInfo as any).email.substring(0, 20)}...`
                        : (gmailUserInfo as any).email
                      : 'Gmail Connected'
                    }
                  </span>
                </Button>
              ) : (
                <Button
                  onClick={handleGmailConnect}
                  onMouseEnter={() => setIsGmailButtonHovered(true)}
                  onMouseLeave={() => setIsGmailButtonHovered(false)}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs transition-all duration-300 ease-out overflow-hidden",
                    isGmailButtonHovered 
                      ? "px-3 bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100" 
                      : "px-2 w-8 bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <Lock className="w-3 h-3 shrink-0" />
                  {isGmailButtonHovered && (
                    <span className="ml-1 whitespace-nowrap">Gmail API BETA</span>
                  )}
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {gmailStatus?.authorized 
                ? <p>Gmail connected. Click to reconnect or change account.</p>
                : <p>Connect via Gmail API so that your emails send automatically when you click send here.</p>
              }
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Send Email Button / Schedule Campaign Button */}
        {drawerMode === 'compose' ? (
          <EmailSendButton
            to={toEmail}
            subject={emailSubject}
            body={emailContent}
            contact={selectedContact ?? undefined}
            company={selectedCompany ?? undefined}
            isGmailAuthenticated={(gmailStatus as any)?.authorized}
            onSendViaGmail={handleSendEmail}
            onManualSend={handleManualSend}
            isPending={sendEmailMutation.isPending}
            isSuccess={isSent}
            className="h-8 px-3 text-xs"
          />
        ) : (
          <CampaignSendButton
            recipients={campaignRecipients}
            listId={currentListId}
            currentQuery={currentQuery}
            subject={emailSubject}
            body={emailContent}
            onSchedule={() => handleCreateCampaign('scheduled')}
            onStartNow={() => handleCreateCampaign('immediate')}
            onSaveDraft={() => handleCreateCampaign('draft')}
            isPending={createCampaignMutation.isPending}
            isSuccess={false}
            className="h-8 px-3 text-xs"
          />
        )}
      </div>
    </div>

    {/* Settings and Templates Buttons Row */}
    <div className="mt-4">
      <div className="flex justify-end gap-2">
        {/* Campaign Settings Button - Only shown in campaign mode */}
        {drawerMode === 'campaign' && (
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
          >
            <span>Campaign Settings</span>
            {settingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        )}
        
        {/* Templates Button - Always visible */}
        <button
          onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-md"
        >
          <span>Templates</span>
          {isTemplatesExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
      
      {/* Campaign Settings Collapsible Container - Only shown when open and in campaign mode */}
      {drawerMode === 'campaign' && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          settingsOpen ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
        )}>
          <CampaignSettings
            open={true} // Always true since we control visibility with the container
            onOpenChange={() => {}} // No-op since we handle it above
            settings={campaignSettings}
            onSettingsChange={setCampaignSettings}
            totalRecipients={campaignRecipients ? 100 : 50}
            className=""
          />
        </div>
      )}
      
      {/* Templates Collapsible Container */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isTemplatesExpanded ? "max-h-[500px] opacity-100 mt-2" : "max-h-0 opacity-0"
      )}>
        <QuickTemplates
          templates={templates}
          templatesLoading={templatesLoading}
          onSelectTemplate={(template: EmailTemplate) => {
            setEmailPrompt(template.description || "");
            setEmailContent(template.content);
            setEmailSubject(template.subject || "");
            setOriginalEmailPrompt(template.description || "");
            setOriginalEmailContent(template.content);
            setOriginalEmailSubject(template.subject || "");
          }}
          onSaveTemplate={handleSaveEmail}
          onUpdateTemplate={saveCurrentTemplate}
          onMergeFieldInsert={handleMergeFieldInsert}
          onEditTemplate={enterEditMode}
          isEditMode={isEditMode}
          editingTemplateId={editingTemplateId}
          onExitEditMode={exitEditMode}
          isMergeViewMode={isMergeViewMode}
          onToggleMergeView={toggleMergeView}
          isSavingTemplate={updateMutation.isPending}
        />
      </div>
    </div>

    {/* Generate Email Confirmation Dialog */}
    <AlertDialog open={generateConfirmDialogOpen} onOpenChange={setGenerateConfirmDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate AI Email</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace all content in email subject and body fields.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setGenerateConfirmDialogOpen(false)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmGenerate}>
            Generate Email
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Product Change Confirmation Dialog */}
    <AlertDialog open={productChangeDialogOpen} onOpenChange={setProductChangeDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change Product</AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the current email prompt with the new product details. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelProductChange}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmProductChange}>
            OK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
  );
}