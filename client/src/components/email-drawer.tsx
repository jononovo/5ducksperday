import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Building2,
  Mail,
  Type,
  Wand2,
  Send,
  Save,
  Copy,
  Check,
  Lock,
  Info,
  Palette,
  Gift,
  Box,
  User,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import type { Contact, Company, EmailTemplate, StrategicProfile } from "@shared/schema";
import { ContactActionColumn } from "@/components/contact-action-column";
import { ComprehensiveSearchButton } from "@/components/comprehensive-email-search";
import QuickTemplates from "@/components/quick-templates";
import { EmailSendButton } from "@/components/email-fallback/EmailSendButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useEmailGeneration } from "@/email-content-generation/useOutreachGeneration";
import { resolveFrontendSenderNames } from "@/email-content-generation/outreach-utils";
import { resolveMergeField, resolveAllMergeFields, hasMergeFields, type MergeFieldContext } from '@/lib/merge-field-resolver';
import { TONE_OPTIONS, DEFAULT_TONE } from "@/lib/tone-options";
import { OFFER_OPTIONS, DEFAULT_OFFER } from "@/lib/offer-options";
import { cn } from "@/lib/utils";

interface EmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  company: Company | null;
  // Additional contacts from the same company
  companyContacts?: Contact[];
  // Function to handle contact selection change
  onContactChange?: (contact: Contact) => void;
}

interface GmailStatus {
  authorized: boolean;
  hasValidToken: boolean;
}

interface GmailUserInfo {
  email: string;
  name?: string;
}

export function EmailDrawer({
  isOpen,
  onClose,
  contact,
  company,
  companyContacts = [],
  onContactChange,
}: EmailDrawerProps) {
  // State for email fields
  const [emailPrompt, setEmailPrompt] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  
  // State for options
  const [selectedTone, setSelectedTone] = useState<string>(DEFAULT_TONE);
  const [selectedOfferStrategy, setSelectedOfferStrategy] = useState<string>(DEFAULT_OFFER);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  
  // State for popover controls
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [generateConfirmDialogOpen, setGenerateConfirmDialogOpen] = useState(false);
  const [productChangeDialogOpen, setProductChangeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<StrategicProfile | null>(null);
  
  // State for merge fields
  const [originalEmailPrompt, setOriginalEmailPrompt] = useState("");
  const [originalEmailContent, setOriginalEmailContent] = useState("");
  const [originalEmailSubject, setOriginalEmailSubject] = useState("");
  const [isMergeViewMode, setIsMergeViewMode] = useState(false);
  
  // State for template editing
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // State for UI feedback
  const [isSent, setIsSent] = useState(false);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  
  // Refs for textareas
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const toEmailRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const { user } = useAuth();

  // Update contact index when contact changes
  useEffect(() => {
    if (contact && companyContacts.length > 0) {
      const index = companyContacts.findIndex(c => c.id === contact.id);
      if (index !== -1) {
        setCurrentContactIndex(index);
      }
    }
  }, [contact, companyContacts]);

  // Update email field when contact changes
  useEffect(() => {
    if (contact?.email) {
      setToEmail(contact.email);
    } else {
      setToEmail("");
    }
  }, [contact]);

  // Gmail authentication status query
  const { data: gmailStatus, refetch: refetchGmailStatus } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/auth-status"],
    enabled: !!user && isOpen,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Query to get Gmail user info
  const { data: gmailUserInfo } = useQuery<GmailUserInfo>({
    queryKey: ['/api/gmail/user'],
    enabled: !!user && !!gmailStatus?.authorized && isOpen,
  });

  // Query to get user's strategic profiles (products)
  const { data: products = [] } = useQuery<StrategicProfile[]>({
    queryKey: ['/api/products'],
    enabled: !!user && isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Get selected product data
  const selectedProductData = useMemo(() => 
    products.find(p => p.id === selectedProduct)
  , [products, selectedProduct]);

  // Email generation hook
  const { generateEmail, isGenerating } = useEmailGeneration({
    selectedContact: contact,
    selectedCompany: company,
    emailPrompt,
    emailSubject,
    emailContent,
    toEmail,
    tone: selectedTone,
    offerStrategy: selectedOfferStrategy,
    setEmailSubject,
    setOriginalEmailSubject,
    setToEmail,
    setEmailContent,
    setOriginalEmailContent,
  });

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: { to: string; subject: string; body: string }) => {
      return apiRequest('/api/gmail/send', 'POST', emailData);
    },
    onSuccess: () => {
      setIsSent(true);
      toast({
        title: "Email sent successfully",
        description: "Your email has been sent via Gmail.",
      });
      setTimeout(() => setIsSent(false), 3000);
    },
    onError: (error: any) => {
      console.error('Failed to send email:', error);
      toast({
        title: "Failed to send email",
        description: error.response?.data?.message || error.message || "An error occurred while sending the email",
        variant: "destructive",
      });
    },
  });

  // Save template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EmailTemplate> }) => {
      return apiRequest(`/api/email-templates/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      toast({
        title: "Template updated",
        description: "Your template has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.response?.data?.message || "Failed to update template",
        variant: "destructive",
      });
    },
  });

  // Text area auto-resize functions
  const handleTextareaResize = () => {
    const textarea = emailContentRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 400);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handlePromptTextareaResize = () => {
    const textarea = promptTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  // Auto-resize on content changes
  useEffect(() => {
    handleTextareaResize();
  }, [emailContent]);

  useEffect(() => {
    handlePromptTextareaResize();
  }, [emailPrompt]);

  // Handler functions
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

  const handleSendEmail = () => {
    if (!toEmail || !emailSubject || !emailContent) {
      toast({
        title: "Missing information",
        description: "Please fill in all email fields before sending.",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate({ to: toEmail, subject: emailSubject, body: emailContent });
  };

  const handleManualSend = () => {
    toast({
      title: "Manual send",
      description: "Email copied to clipboard. Please paste in your email client.",
    });
  };

  const handleGmailConnect = () => {
    window.location.href = '/api/gmail/authorize';
  };

  const handleSelectProduct = (product: StrategicProfile) => {
    if (emailPrompt && selectedProduct !== product.id) {
      setPendingProduct(product);
      setProductChangeDialogOpen(true);
    } else {
      setSelectedProduct(product.id);
      // Convert product to prompt text
      const productPrompt = product.productService || product.title || '';
      setEmailPrompt(productPrompt);
      setOriginalEmailPrompt(productPrompt);
      setProductPopoverOpen(false);
    }
  };

  const handleSelectNone = () => {
    if (emailPrompt && selectedProduct !== null) {
      setPendingProduct(null);
      setProductChangeDialogOpen(true);
    } else {
      setSelectedProduct(null);
      setEmailPrompt("");
      setOriginalEmailPrompt("");
      setProductPopoverOpen(false);
    }
  };

  const handleConfirmProductChange = () => {
    if (pendingProduct) {
      setSelectedProduct(pendingProduct.id);
      const productPrompt = pendingProduct.productService || pendingProduct.title || '';
      setEmailPrompt(productPrompt);
      setOriginalEmailPrompt(productPrompt);
    } else {
      setSelectedProduct(null);
      setEmailPrompt("");
      setOriginalEmailPrompt("");
    }
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
    setProductPopoverOpen(false);
  };

  const handleCancelProductChange = () => {
    setProductChangeDialogOpen(false);
    setPendingProduct(null);
    setProductPopoverOpen(false);
  };

  const handleSaveEmail = async (name: string, description?: string, category?: string) => {
    try {
      await apiRequest('/api/email-templates', 'POST', {
        name,
        subject: emailSubject,
        content: emailContent,
        description: description || emailPrompt,
        category: category || 'general',
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/email-templates'] });
      
      toast({
        title: "Template saved",
        description: `"${name}" has been saved to your templates.`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to save template",
        description: error.response?.data?.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const saveCurrentTemplate = async (updatedData: Partial<EmailTemplate>) => {
    if (!editingTemplateId) return;
    
    await updateMutation.mutateAsync({ id: editingTemplateId, data: updatedData });
  };

  const enterEditMode = (template: EmailTemplate) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setEditingTemplate(template);
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
    setEditingTemplate(null);
  };

  const toggleMergeView = () => {
    setIsMergeViewMode(!isMergeViewMode);
  };

  const handleMergeFieldInsert = (field: string, targetField?: string) => {
    if (targetField === 'prompt' && promptTextareaRef.current) {
      const textarea = promptTextareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = emailPrompt.slice(0, start) + field + emailPrompt.slice(end);
      setEmailPrompt(newValue);
      setOriginalEmailPrompt(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    } else if (targetField === 'subject' && emailSubjectRef.current) {
      const input = emailSubjectRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = emailSubject.slice(0, start) + field + emailSubject.slice(end);
      setEmailSubject(newValue);
      setOriginalEmailSubject(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    } else if (targetField === 'to' && toEmailRef.current) {
      const input = toEmailRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = toEmail.slice(0, start) + field + toEmail.slice(end);
      setToEmail(newValue);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    } else if (emailContentRef.current) {
      const textarea = emailContentRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = emailContent.slice(0, start) + field + emailContent.slice(end);
      setEmailContent(newValue);
      setOriginalEmailContent(newValue);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + field.length, start + field.length);
      }, 0);
    }
  };

  const getDisplayValue = (currentValue: string, originalValue?: string) => {
    if (!isMergeViewMode || !originalValue) return currentValue;
    
    const mergeContext: MergeFieldContext = {
      contact: contact ? {
        name: contact.name,
        role: contact.role || undefined,
        email: contact.email || undefined
      } : undefined,
      company: company || undefined,
      sender: gmailUserInfo || undefined
    };
    
    return hasMergeFields(originalValue)
      ? resolveAllMergeFields(originalValue, mergeContext)
      : currentValue;
  };

  // Navigation between contacts
  const handlePreviousContact = () => {
    if (currentContactIndex > 0 && companyContacts.length > 0) {
      const newContact = companyContacts[currentContactIndex - 1];
      onContactChange?.(newContact);
    }
  };

  const handleNextContact = () => {
    if (currentContactIndex < companyContacts.length - 1 && companyContacts.length > 0) {
      const newContact = companyContacts[currentContactIndex + 1];
      onContactChange?.(newContact);
    }
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full md:w-[600px] lg:w-[700px] xl:w-[800px] overflow-y-auto p-0 border-t rounded-tl-xl">
          {/* Header */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <SheetTitle className="text-xl font-semibold">Email Outreach</SheetTitle>
                <SheetDescription className="mt-1">
                  {company?.name && (
                    <div className="flex items-center gap-2 mt-2">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{company.name}</span>
                    </div>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col h-full">
            {/* Contact Selection */}
            {contact && companyContacts.length > 0 && (
              <div className="px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePreviousContact}
                    disabled={currentContactIndex === 0}
                    data-testid="button-prev-contact"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="text-center flex-1">
                    <div className="flex items-center justify-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium" data-testid="text-contact-name">{contact.name}</span>
                    </div>
                    {contact.role && (
                      <p className="text-sm text-muted-foreground mt-1" data-testid="text-contact-role">{contact.role}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-contact-index">
                      Contact {currentContactIndex + 1} of {companyContacts.length}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleNextContact}
                    disabled={currentContactIndex === companyContacts.length - 1}
                    data-testid="button-next-contact"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Email Form */}
            <div className="flex-1 px-6 py-6 space-y-6">
              {/* Email Prompt Field */}
              <div className="relative">
                <Textarea
                  ref={promptTextareaRef}
                  placeholder="Describe your email purpose (e.g., 'Sell dog-grooming services')"
                  value={getDisplayValue(emailPrompt, originalEmailPrompt)}
                  onChange={(e) => {
                    setEmailPrompt(e.target.value);
                    setOriginalEmailPrompt(e.target.value);
                    handlePromptTextareaResize();
                  }}
                  className="resize-none pb-10 pr-32"
                  style={{ minHeight: '80px', maxHeight: '120px' }}
                  data-testid="input-email-prompt"
                />
                
                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                  {/* Product Selection */}
                  <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
                        title="Select product context"
                        data-testid="button-select-product"
                      >
                        <Box className="w-3 h-3" />
                        {selectedProductData && (
                          <span className="max-w-20 truncate">{selectedProductData.title || 'Product'}</span>
                        )}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0" align="start">
                      <div className="p-4 border-b bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-primary" />
                          <h4 className="font-semibold text-sm">Product Context</h4>
                        </div>
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
                        <button
                          className={cn(
                            "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                            selectedProduct === null && "bg-accent"
                          )}
                          onClick={handleSelectNone}
                          data-testid="button-product-none"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-xs">
                              <span className="font-medium">None</span>
                            </div>
                            {selectedProduct === null && (
                              <Check className="w-3 h-3 text-primary" />
                            )}
                          </div>
                        </button>
                        
                        {products.map((product) => (
                          <button
                            key={product.id}
                            className={cn(
                              "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                              selectedProduct === product.id && "bg-accent"
                            )}
                            onClick={() => handleSelectProduct(product)}
                            data-testid={`button-product-${product.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs flex-1 min-w-0">
                                <div className="font-medium truncate">
                                  {product.title || 'Untitled Product'}
                                </div>
                              </div>
                              {selectedProduct === product.id && (
                                <Check className="w-3 h-3 text-primary" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Tone Selection */}
                  <Popover open={tonePopoverOpen} onOpenChange={setTonePopoverOpen}>
                    <PopoverTrigger asChild>
                      <button 
                        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
                        title="Select email tone"
                        data-testid="button-select-tone"
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
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
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
                            data-testid={`button-tone-${tone.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs">
                                <span className="font-medium">{tone.name}</span>
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
                        data-testid="button-select-offer"
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
                      </div>
                      <div className="p-2 max-h-64 overflow-y-auto">
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
                            data-testid={`button-offer-${offer.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs">
                                <span className="font-medium">{offer.name}</span>
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

                <div className="absolute bottom-2 right-2">
                  <Button 
                    onClick={handleGenerateEmail} 
                    variant="default"
                    disabled={isGenerating}
                    size="sm"
                    data-testid="button-generate-email"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-3 h-3 mr-1" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* To Email Field */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  ref={toEmailRef}
                  placeholder="Recipient Email"
                  value={getDisplayValue(toEmail)}
                  onChange={(e) => setToEmail(e.target.value)}
                  type="email"
                  className="pl-10"
                  data-testid="input-email-to"
                />
              </div>

              {/* Email Subject Field */}
              <div className="relative">
                <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  ref={emailSubjectRef}
                  placeholder="Email Subject"
                  value={getDisplayValue(emailSubject, originalEmailSubject)}
                  onChange={(e) => {
                    setEmailSubject(e.target.value);
                    setOriginalEmailSubject(e.target.value);
                  }}
                  className="pl-10"
                  data-testid="input-email-subject"
                />
              </div>

              {/* Email Content Field */}
              <div className="relative">
                <Textarea
                  ref={emailContentRef}
                  placeholder="Enter or edit the generated email content..."
                  value={getDisplayValue(emailContent, originalEmailContent)}
                  onChange={(e) => {
                    setEmailContent(e.target.value);
                    setOriginalEmailContent(e.target.value);
                    handleTextareaResize();
                  }}
                  className="resize-none pb-12"
                  style={{ minHeight: '200px', maxHeight: '400px' }}
                  data-testid="input-email-content"
                />
                
                <div className="absolute bottom-2 right-2 flex items-center gap-2">
                  {/* Gmail Status Badge */}
                  {gmailStatus?.authorized ? (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300" data-testid="badge-gmail-connected">
                      <Mail className="w-3 h-3 mr-1" />
                      {gmailUserInfo?.email || 'Gmail Connected'}
                    </Badge>
                  ) : (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleGmailConnect}
                            variant="outline"
                            size="sm"
                            data-testid="button-connect-gmail"
                          >
                            <Lock className="w-3 h-3 mr-1" />
                            Connect Gmail
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Connect Gmail to send emails directly</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* Send Email Button */}
                  <EmailSendButton
                    to={toEmail}
                    subject={emailSubject}
                    body={emailContent}
                    contact={contact || undefined}
                    company={company || undefined}
                    isGmailAuthenticated={gmailStatus?.authorized}
                    onSendViaGmail={handleSendEmail}
                    onManualSend={handleManualSend}
                    isPending={sendEmailMutation.isPending}
                    isSuccess={isSent}
                    className="h-8 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Quick Templates Section */}
              <div className="pt-6 border-t">
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
                  onUpdateTemplate={() => saveCurrentTemplate({})}
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
          </div>
        </SheetContent>
      </Sheet>

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
    </>
  );
}