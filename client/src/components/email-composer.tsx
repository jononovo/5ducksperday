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
import { Mail, Type, Wand2, Loader2, Box, Palette, Gift, Check, Info, Lock, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import QuickTemplates from "./quick-templates";
import { EmailSendButton } from "./email-fallback/EmailSendButton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types
interface Contact {
  id: number;
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
}

interface Company {
  id?: number;
  name?: string;
  website?: string;
  description?: string;
  alternativeProfileUrl?: string;
}

interface StrategicProfile {
  id: number;
  title?: string;
  productService?: string;
  uniqueBenefit?: string;
}

interface EmailTemplate {
  id?: number;
  name: string;
  subject?: string;
  content: string;
  description?: string;
}

interface EmailComposerProps {
  selectedContact: Contact | null;
  selectedCompany: Company | null;
  onContactChange?: (contact: Contact | null) => void;
  onCompanyChange?: (company: Company | null) => void;
}

// Constants
const TONE_OPTIONS = [
  { id: 'casual', name: 'Casual', description: 'Friendly and approachable' },
  { id: 'professional', name: 'Professional', description: 'Formal business tone' },
  { id: 'conversational', name: 'Conversational', description: 'Natural and flowing' },
  { id: 'confident', name: 'Confident', description: 'Assertive and direct' },
  { id: 'enthusiastic', name: 'Enthusiastic', description: 'Energetic and passionate' },
  { id: 'consultative', name: 'Consultative', description: 'Advisory and helpful' },
  { id: 'curious', name: 'Curious', description: 'Inquisitive and engaging' }
];

const OFFER_OPTIONS = [
  { id: 'none', name: 'None', description: 'No offer strategy' },
  { id: 'hormozi', name: 'Hormozi', description: 'Value stack method' },
  { id: 'formula', name: 'Formula', description: 'Problem-solution approach' },
  { id: '1on1', name: '1-on-1', description: 'Personal consultation' },
  { id: 'guarantee', name: 'Guarantee', description: 'Risk reversal offer' },
  { id: 'shiny', name: 'Shiny', description: 'Exciting opportunity' },
  { id: 'study', name: 'Study', description: 'Research-based approach' }
];

export function EmailComposer({
  selectedContact,
  selectedCompany,
  onContactChange,
  onCompanyChange
}: EmailComposerProps) {
  const { toast } = useToast();

  // State
  const [emailPrompt, setEmailPrompt] = useState("");
  const [originalEmailPrompt, setOriginalEmailPrompt] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [originalEmailSubject, setOriginalEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [originalEmailContent, setOriginalEmailContent] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedProductData, setSelectedProductData] = useState<StrategicProfile | null>(null);
  const [selectedTone, setSelectedTone] = useState('casual');
  const [selectedOfferStrategy, setSelectedOfferStrategy] = useState('none');
  const [isGenerating, setIsGenerating] = useState(false);
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
  const [isMergeViewMode, setIsMergeViewMode] = useState(false);
  const [isGmailButtonHovered, setIsGmailButtonHovered] = useState(false);
  const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);

  // Refs
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const toEmailRef = useRef<HTMLInputElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: products = [] } = useQuery<StrategicProfile[]>({
    queryKey: ['/api/strategic-profiles']
  });

  const { data: gmailStatus } = useQuery({
    queryKey: ['/api/gmail/status'],
    refetchInterval: 5000
  });

  const { data: gmailUserInfo } = useQuery({
    queryKey: ['/api/gmail/user-info'],
    enabled: !!gmailStatus?.authorized
  });

  // Mutations
  const sendEmailMutation = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const res = await apiRequest('POST', '/api/gmail/send', data);
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
      const res = await apiRequest('PUT', `/api/email-templates/${template.id}`, template);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({ title: "Template updated successfully!" });
    }
  });

  // Effects
  useEffect(() => {
    if (selectedContact?.email) {
      setToEmail(selectedContact.email);
    }
  }, [selectedContact]);

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
    if (isMergeViewMode && originalValue) {
      return originalValue;
    }
    return currentValue;
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
    if (emailContent || emailSubject) {
      setGenerateConfirmDialogOpen(true);
    } else {
      generateEmail();
    }
  };

  const handleConfirmGenerate = () => {
    setGenerateConfirmDialogOpen(false);
    generateEmail();
  };

  const generateEmail = async () => {
    setIsGenerating(true);
    try {
      const res = await apiRequest('POST', '/api/generate-email', {
        prompt: emailPrompt,
        contactName: selectedContact?.name,
        contactTitle: selectedContact?.title,
        companyName: selectedCompany?.name,
        companyDescription: selectedCompany?.description,
        product: selectedProductData,
        tone: selectedTone,
        offerStrategy: selectedOfferStrategy
      });
      const response = await res.json();

      setEmailSubject(response.subject);
      setEmailContent(response.body);
      setOriginalEmailSubject(response.subject);
      setOriginalEmailContent(response.body);
      
      toast({
        title: "Email generated successfully!",
        description: "Your personalized email is ready to send."
      });
    } catch (error: any) {
      console.error('Generate email error:', error);
      toast({
        title: "Failed to generate email",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
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
    const mailtoLink = `mailto:${toEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailContent)}`;
    window.location.href = mailtoLink;
  };

  const handleGmailConnect = () => {
    window.open('/api/gmail/auth', '_blank');
  };

  const handleSaveEmail = async (templateName: string) => {
    try {
      await apiRequest('POST', '/api/email-templates', {
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
    if (!editingTemplateId) return;
    
    updateMutation.mutate({
      id: editingTemplateId,
      name: '',
      subject: originalEmailSubject || emailSubject,
      content: originalEmailContent || emailContent,
      description: originalEmailPrompt || emailPrompt
    });
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

  const enterEditMode = (templateId: number) => {
    setIsEditMode(true);
    setEditingTemplateId(templateId);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
  };

  const toggleMergeView = () => {
    setIsMergeViewMode(!isMergeViewMode);
  };

  return (
    <div className="space-y-0 md:space-y-6">
      {/* Email Prompt Field */}
      <div className="relative border-t border-b md:border-t-0 md:border-b-0 md:mb-6 mb-4">
        <Textarea
          ref={promptTextareaRef}
          placeholder="Sell dog-grooming services"
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
          variant="yellow"
          disabled={isGenerating}
          className="h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          {isGenerating ? "Generating..." : "Generate Email"}
        </Button>
      </div>
    </div>

    {/* To Email Field */}
    <div className="relative border-b md:border-b-0 md:mb-6">
      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
      <Input
        ref={toEmailRef}
        placeholder="Recipient Email"
        value={getDisplayValue(toEmail)}
        onChange={(e) => setToEmail(e.target.value)}
        type="email"
        className="mobile-input mobile-input-text-fix pl-10 border-0 rounded-none md:border md:rounded-md focus-visible:ring-0 focus-visible:ring-offset-0"
      />
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
        {/* Gmail Status Badge */}
        {(gmailStatus as any)?.authorized ? (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
            <Mail className="w-3 h-3 mr-1" />
            {(gmailUserInfo as any)?.email 
              ? (gmailUserInfo as any).email.length > 20 
                ? `${(gmailUserInfo as any).email.substring(0, 20)}...`
                : (gmailUserInfo as any).email
              : 'Gmail Connected'
            }
          </Badge>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Connect via Gmail API so that your emails send automatically when you click send here.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Send Email Button with Fallback */}
        <EmailSendButton
          to={toEmail}
          subject={emailSubject}
          body={emailContent}
          contact={selectedContact}
          company={selectedCompany}
          isGmailAuthenticated={(gmailStatus as any)?.authorized}
          onSendViaGmail={handleSendEmail}
          onManualSend={handleManualSend}
          isPending={sendEmailMutation.isPending}
          isSuccess={isSent}
          className="h-8 px-3 text-xs"
        />
      </div>
    </div>

    {/* Quick Templates Section - Collapsible */}
    <div className="mt-8 pt-6 border-t">
      {/* View Templates Toggle Button */}
      <button
        onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
        className="w-full flex items-center justify-between px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="font-medium">View Templates</span>
        {isTemplatesExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>
      
      {/* Collapsible Templates Container */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isTemplatesExpanded ? "max-h-[500px] opacity-100 mt-4" : "max-h-0 opacity-0"
      )}>
        <QuickTemplates
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