import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Send,
  Save,
  Wand2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  PartyPopper,
  ExternalLink,
  Mail,
  Lock,
  Type,
  FileText,
  Users,
  User,
  Menu,
  Info,
  X,
  Palette,
  TrendingUp,
  Gift,
  Box
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input component
import { cn } from "@/lib/utils";
import type { List, Company, Contact, StrategicProfile } from "@shared/schema";
import { generateShortListDisplayName } from "@/lib/list-utils";
import { useState, useEffect, useMemo, useRef } from "react";
import QuickTemplates from "@/components/quick-templates";
import type { EmailTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import {Loader2} from "lucide-react";
import { queryClient } from "@/lib/queryClient"; // Import queryClient
import type { InsertEmailTemplate } from "@shared/schema"; // Import the type
import { ContactActionColumn } from "@/components/contact-action-column";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from "framer-motion";
import { resolveMergeField, resolveAllMergeFields, hasMergeFields, type MergeFieldContext } from '@/lib/merge-field-resolver';
import { useEmailGeneration } from "@/email-content-generation/useOutreachGeneration";
import { resolveFrontendSenderNames } from "@/email-content-generation/outreach-utils";
import { TONE_OPTIONS, DEFAULT_TONE, type ToneOption } from "@/lib/tone-options";
import { OFFER_OPTIONS, DEFAULT_OFFER, type OfferOption } from "@/lib/offer-options";
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
import { EmailSendButton } from "@/components/email-fallback/EmailSendButton";
import { useEmailFallback } from "@/hooks/useEmailFallback";


// Define interfaces
interface GmailStatus {
  authorized: boolean;
  hasValidToken: boolean;
}

interface GmailUserInfo {
  email: string;
  name?: string;
}

interface SavedOutreachState {
  selectedListId?: string;
  selectedContactId: number | null;
  emailPrompt: string;
  emailContent: string;
  toEmail: string;
  emailSubject: string;
  selectedCompanyIndex: number;
  selectedTone: string;
  selectedOfferStrategy: string;
  selectedProduct: number | null;
  // Original content for merge field conversion
  originalEmailPrompt?: string;
  originalEmailContent?: string;
  originalEmailSubject?: string;
}

export default function Outreach() {
  const [selectedListId, setSelectedListId] = useState<string>();
  const [emailPrompt, setEmailPrompt] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedCompanyIndex, setCurrentCompanyIndex] = useState(0);
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showExpandedView, setShowExpandedView] = useState(false);
  const [selectedTone, setSelectedTone] = useState<string>(DEFAULT_TONE);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [selectedOfferStrategy, setSelectedOfferStrategy] = useState<string>(DEFAULT_OFFER);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [generateConfirmDialogOpen, setGenerateConfirmDialogOpen] = useState(false);
  const [productChangeDialogOpen, setProductChangeDialogOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<StrategicProfile | null>(null);

  // Refs for form inputs to handle merge field insertion
  const emailPromptRef = useRef<HTMLTextAreaElement>(null);
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailContentRef = useRef<HTMLTextAreaElement>(null);
  const toEmailRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Email enrichment state tracking
  const [pendingContactIds, setPendingContactIds] = useState<Set<number>>(new Set());
  const [pendingHunterIds, setPendingHunterIds] = useState<Set<number>>(new Set());
  const [pendingAeroLeadsIds, setPendingAeroLeadsIds] = useState<Set<number>>(new Set());
  const [pendingApolloIds, setPendingApolloIds] = useState<Set<number>>(new Set());
  
  // Copy feedback state tracking
  const [copiedContactIds, setCopiedContactIds] = useState<Set<number>>(new Set());
  
  // Tooltip state for mobile support
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Template edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  
  // Merge view toggle state (independent from edit mode)
  const [isMergeViewMode, setIsMergeViewMode] = useState(false);
  
  // Original template versions for merge field conversion
  const [originalEmailPrompt, setOriginalEmailPrompt] = useState("");
  const [originalEmailContent, setOriginalEmailContent] = useState("");
  const [originalEmailSubject, setOriginalEmailSubject] = useState("");
  
  // Scroll compression state
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Gmail button hover state for expand/collapse
  const [isGmailButtonHovered, setIsGmailButtonHovered] = useState(false);
  
  // Textarea refs for auto-resizing
  const promptTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize functions
  const handleTextareaResize = () => {
    const textarea = emailContentRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 400); // 400px max
      textarea.style.height = `${newHeight}px`;
    }
  };

  const handlePromptTextareaResize = () => {
    const textarea = promptTextareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      // Allow more expansion while maintaining proper button clearance
      const newHeight = Math.min(textarea.scrollHeight, 120); // 120px max (content + button space)
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

  // Load state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('outreachState');
    if (savedState) {
      const parsed = JSON.parse(savedState) as SavedOutreachState;
      setSelectedListId(parsed.selectedListId);
      setSelectedContactId(parsed.selectedContactId);
      setEmailPrompt(parsed.emailPrompt);
      setEmailContent(parsed.emailContent);
      setToEmail(parsed.toEmail || "");
      setEmailSubject(parsed.emailSubject || "");
      setCurrentCompanyIndex(parsed.selectedCompanyIndex || 0);
      // Load original content for merge field conversion
      setOriginalEmailPrompt(parsed.originalEmailPrompt || parsed.emailPrompt);
      setOriginalEmailContent(parsed.originalEmailContent || parsed.emailContent);
      setOriginalEmailSubject(parsed.originalEmailSubject || parsed.emailSubject || "");
      setSelectedTone(parsed.selectedTone || DEFAULT_TONE);
      setSelectedOfferStrategy(parsed.selectedOfferStrategy || DEFAULT_OFFER);
      setSelectedProduct(parsed.selectedProduct || null);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const stateToSave: SavedOutreachState = {
      selectedListId,
      selectedContactId,
      emailPrompt,
      emailContent,
      toEmail,
      emailSubject,
      selectedCompanyIndex,
      selectedTone,
      selectedOfferStrategy,
      selectedProduct,
      originalEmailPrompt,
      originalEmailContent,
      originalEmailSubject
    };
    localStorage.setItem('outreachState', JSON.stringify(stateToSave));
  }, [selectedListId, selectedContactId, emailPrompt, emailContent, toEmail, emailSubject, selectedCompanyIndex, selectedTone, selectedOfferStrategy, selectedProduct, originalEmailPrompt, originalEmailContent, originalEmailSubject]);

  // Scroll compression effect
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0;
      setIsScrolled(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: [`/api/lists/${selectedListId}/companies`],
    enabled: !!selectedListId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get the current company based on the index
  const selectedCompany = companies[selectedCompanyIndex];

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: [`/api/companies/${selectedCompany?.id}/contacts`],
    enabled: !!selectedCompany?.id,
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Gmail authentication status query
  const { data: gmailStatus, refetch: refetchGmailStatus } = useQuery<GmailStatus>({
    queryKey: ["/api/gmail/auth-status"],
    enabled: !!user, // Only check when user is authenticated
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Query to get Gmail user info (email and name)
  const { data: gmailUserInfo } = useQuery<GmailUserInfo>({
    queryKey: ['/api/gmail/user'],
    enabled: !!user && !!gmailStatus?.authorized,
  });

  // Query to get user's strategic profiles (products)
  const { data: products = [] } = useQuery<StrategicProfile[]>({
    queryKey: ['/api/products'],
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Memoized top 3 leadership contacts computation
  const topContacts = useMemo(() => 
    contacts
      ?.filter(contact => contact.probability && contact.probability >= 70) // Filter high probability contacts
      .sort((a, b) => (b.probability || 0) - (a.probability || 0)) // Sort by probability
      .slice(0, 3) || []
  , [contacts]);

  // Get selected contact for mobile compact view
  const selectedContact = useMemo(() => 
    selectedContactId ? topContacts.find(contact => contact.id === selectedContactId) || topContacts[0] : topContacts[0]
  , [topContacts, selectedContactId]);

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
    setEmailSubject,
    setOriginalEmailSubject,
    setToEmail,
    setEmailContent,
    setOriginalEmailContent
  });

  const handleGenerateEmail = () => {
    // Check if there's existing content
    if (emailSubject.trim() || emailContent.trim() || toEmail.trim()) {
      setGenerateConfirmDialogOpen(true);
    } else {
      performGeneration();
    }
  };

  const handleConfirmGenerate = () => {
    performGeneration();
    setGenerateConfirmDialogOpen(false);
  };

  // Adjacent company prefetching for instant navigation
  useEffect(() => {
    if (!companies.length) return;

    const prefetchAdjacentCompanies = () => {
      // Calculate range: current ±3 companies
      const start = Math.max(0, selectedCompanyIndex - 3);
      const end = Math.min(companies.length - 1, selectedCompanyIndex + 3);
      
      console.log(`Prefetching contacts for companies ${start} to ${end} (current: ${selectedCompanyIndex})`);
      
      for (let i = start; i <= end; i++) {
        // Skip current company (already loaded)
        if (i === selectedCompanyIndex) continue;
        
        const company = companies[i];
        if (company?.id) {
          queryClient.prefetchQuery({
            queryKey: [`/api/companies/${company.id}/contacts`],
            queryFn: async () => {
              const response = await apiRequest("GET", `/api/companies/${company.id}/contacts`);
              return response.json();
            },
            staleTime: 3 * 60 * 1000, // 3 minutes
            gcTime: 5 * 60 * 1000, // 5 minutes
          });
        }
      }
    };

    // Small delay to avoid blocking current company load
    const timeoutId = setTimeout(prefetchAdjacentCompanies, 100);
    return () => clearTimeout(timeoutId);
  }, [companies, selectedCompanyIndex]);

  // Page focus invalidation for fresh data after search page updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page focused - invalidating contact caches for fresh data');
        queryClient.invalidateQueries({ 
          queryKey: ['/api/companies'],
          predicate: (query) => query.queryKey[0] === '/api/companies'
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const handleMergeFieldInsert = (mergeField: string) => {
    const activeElement = document.activeElement;
    
    if (activeElement === emailPromptRef.current && emailPromptRef.current) {
      const pos = emailPromptRef.current.selectionStart || emailPrompt.length;
      const newValue = emailPrompt.slice(0, pos) + mergeField + emailPrompt.slice(emailPromptRef.current.selectionEnd || pos);
      setEmailPrompt(newValue);
      // Restore focus and cursor position
      setTimeout(() => {
        emailPromptRef.current?.focus();
        emailPromptRef.current?.setSelectionRange(pos + mergeField.length, pos + mergeField.length);
      }, 0);
    } else if (activeElement === emailSubjectRef.current && emailSubjectRef.current) {
      const pos = emailSubjectRef.current.selectionStart || emailSubject.length;
      const newValue = emailSubject.slice(0, pos) + mergeField + emailSubject.slice(emailSubjectRef.current.selectionEnd || pos);
      setEmailSubject(newValue);
      setTimeout(() => {
        emailSubjectRef.current?.focus();
        emailSubjectRef.current?.setSelectionRange(pos + mergeField.length, pos + mergeField.length);
      }, 0);
    } else if (activeElement === emailContentRef.current && emailContentRef.current) {
      const pos = emailContentRef.current.selectionStart || emailContent.length;
      const newValue = emailContent.slice(0, pos) + mergeField + emailContent.slice(emailContentRef.current.selectionEnd || pos);
      setEmailContent(newValue);
      setTimeout(() => {
        emailContentRef.current?.focus();
        emailContentRef.current?.setSelectionRange(pos + mergeField.length, pos + mergeField.length);
      }, 0);
    } else if (activeElement === toEmailRef.current && toEmailRef.current) {
      const pos = toEmailRef.current.selectionStart || toEmail.length;
      const newValue = toEmail.slice(0, pos) + mergeField + toEmail.slice(toEmailRef.current.selectionEnd || pos);
      setToEmail(newValue);
      setTimeout(() => {
        toEmailRef.current?.focus();
        toEmailRef.current?.setSelectionRange(pos + mergeField.length, pos + mergeField.length);
      }, 0);
    }
  };

  // Template edit mode functions
  const enterEditMode = (template: EmailTemplate) => {
    setIsEditMode(true);
    setEditingTemplateId(template.id);
    setEditingTemplate(template);
    // Load template data into form fields
    setEmailPrompt(template.description || "");
    setEmailSubject(template.subject || "");
    setEmailContent(template.content || "");
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setEditingTemplateId(null);
    setEditingTemplate(null);
  };

  // Merge view toggle function
  const toggleMergeView = () => {
    setIsMergeViewMode(!isMergeViewMode);
  };

  const saveCurrentTemplate = () => {
    if (editingTemplateId && editingTemplate && emailPrompt && emailContent) {
      const templateData: InsertEmailTemplate = {
        name: editingTemplate.name, // Preserve original template name
        subject: emailSubject || editingTemplate.subject || "Email Template",
        content: emailContent,
        description: emailPrompt,
        category: editingTemplate.category || "saved",
        userId: user?.id || 1
      };
      
      updateMutation.mutate({
        id: editingTemplateId,
        template: templateData
      });
    }
  };

  // Handle product selection and insert context into email prompt
  const handleSelectProduct = (product: StrategicProfile) => {
    // Check if there's existing content in the prompt
    if (emailPrompt.trim() && selectedProduct !== product.id) {
      // Store the pending product and show confirmation dialog
      setPendingProduct(product);
      setProductChangeDialogOpen(true);
      setProductPopoverOpen(false);
      return;
    }
    
    // No existing content or same product, proceed directly
    applyProductSelection(product);
  };

  // Apply the product selection (used after confirmation or direct selection)
  const applyProductSelection = (product: StrategicProfile) => {
    setSelectedProduct(product.id);
    setProductPopoverOpen(false);
    
    // Create product context lines
    const productContext = [];
    if (product.productService) {
      productContext.push(`Product: ${product.productService}`);
    }
    if (product.customerFeedback) {
      productContext.push(`What customers like: ${product.customerFeedback}`);
    }
    if (product.website) {
      productContext.push(`Website: ${product.website}`);
    }
    
    // REPLACE the email prompt completely (not append)
    const newPrompt = productContext.join('\n');
    
    setEmailPrompt(newPrompt);
    setOriginalEmailPrompt(newPrompt);
    
    // Auto-resize prompt field
    setTimeout(() => {
      handlePromptTextareaResize();
    }, 0);
  };

  // Handle product change confirmation
  const handleConfirmProductChange = () => {
    if (pendingProduct) {
      applyProductSelection(pendingProduct);
    } else {
      // Handle "None" selection - clear the prompt
      setEmailPrompt('');
      setOriginalEmailPrompt('');
      setSelectedProduct(null);
      setTimeout(() => handlePromptTextareaResize(), 0);
    }
    setPendingProduct(null);
    setProductChangeDialogOpen(false);
  };

  // Handle product change cancellation
  const handleCancelProductChange = () => {
    setPendingProduct(null);
    setProductChangeDialogOpen(false);
  };

  // Handle "None" selection (clear product)
  const handleSelectNone = () => {
    // Check if there's existing content in the prompt
    if (emailPrompt.trim() && selectedProduct !== null) {
      // Store null as pending and show confirmation dialog
      setPendingProduct(null);
      setProductChangeDialogOpen(true);
      setProductPopoverOpen(false);
      return;
    }
    
    // No existing content, proceed directly
    if (selectedProduct !== null) {
      setEmailPrompt('');
      setOriginalEmailPrompt('');
      setTimeout(() => handlePromptTextareaResize(), 0);
    }
    
    setSelectedProduct(null);
    setProductPopoverOpen(false);
  };

  // Find selected product for display
  const selectedProductData = products.find(p => p.id === selectedProduct);

  // Resolve sender names for current user
  const senderNames = resolveFrontendSenderNames(user);

  // Content resolution utility functions (DEPRECATED - using merge field system instead)
  const resolveContent = (content: string, contact: Contact | null) => {
    if (!contact || isEditMode) return content; // Show raw in edit mode
    
    const firstName = contact.name?.split(' ')[0] || '';
    const lastName = contact.name?.split(' ').slice(1).join(' ') || '';
    
    return content
      .replace(/\{\{company_name\}\}/g, selectedCompany?.name || '{{company_name}}')
      .replace(/\{\{contact_name\}\}/g, contact.name || '{{contact_name}}')
      .replace(/\{\{first_name\}\}/g, firstName || '{{first_name}}')
      .replace(/\{\{last_name\}\}/g, lastName || '{{last_name}}')
      .replace(/\{\{contact_role\}\}/g, contact.role || '{{contact_role}}')
      .replace(/\{\{sender_name\}\}/g, senderNames.fullName || '{{sender_name}}')
      .replace(/\{\{sender_first_name\}\}/g, senderNames.firstName || '{{sender_first_name}}');
  };

  const highlightMergeFields = (content: string) => {
    if (isEditMode) return content; // No highlighting in edit mode
    
    return content.replace(
      /(\{\{[^}]+\}\})/g,
      '<span style="background-color: rgba(156, 163, 175, 0.2); padding: 1px 2px; border-radius: 2px;">$1</span>'
    );
  };

  // Get the currently selected contact for merge field resolution
  const currentSelectedContact = selectedContactId ? contacts?.find(c => c.id === selectedContactId) : null;

  // Create merge field context using resolved sender names
  const mergeFieldContext: MergeFieldContext = {
    contact: currentSelectedContact ? {
      name: currentSelectedContact.name,
      role: currentSelectedContact.role || undefined,
      email: currentSelectedContact.email || undefined,
    } : null,
    company: selectedCompany ? {
      name: selectedCompany.name,
    } : null,
    sender: {
      name: senderNames.fullName,
      firstName: senderNames.firstName
    }
  };

  // Custom merge field resolver for the highlighted components
  const resolveMergeFieldForHighlighting = (field: string) => {
    return resolveMergeField(field, mergeFieldContext);
  };

  // Functions to get display values for form fields with dual storage support
  const getDisplayValue = (content: string, originalContent?: string) => {
    if (isEditMode) return content;
    if (isMergeViewMode) return originalContent || content;
    return resolveAllMergeFields(originalContent || content, mergeFieldContext);
  };

  const handleSaveEmail = (templateName: string) => {
    if (!emailPrompt || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please provide both a prompt and email content to save the template",
        variant: "destructive",
      });
      return;
    }

    const templateData: InsertEmailTemplate = {
      name: templateName,
      subject: emailSubject || "New Email Template",
      content: emailContent,
      description: emailPrompt,
      category: "saved",
      userId: user?.id || 1 // Use authenticated user ID or fallback to demo user
    };

    createMutation.mutate(templateData);
  };

  const createMutation = useMutation({
    mutationFn: async (data: InsertEmailTemplate) => {
      console.log('Saving email template:', {
        name: data.name,
        subject: data.subject
      });
      const res = await apiRequest("POST", "/api/email-templates", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      toast({
        title: "Success",
        description: "Email template saved successfully",
      });
    },
    onError: (error) => {
      console.error('Template save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save email template",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: number; template: InsertEmailTemplate }) => {
      console.log('Updating email template:', {
        id: data.id,
        name: data.template.name,
        subject: data.template.subject
      });
      const res = await apiRequest("PUT", `/api/email-templates/${data.id}`, data.template);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update template");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email-templates"] });
      exitEditMode();
      toast({
        title: "Success",
        description: "Template updated successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update template",
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      // First check Gmail authorization
      const authResponse = await apiRequest("GET", "/api/gmail/auth-status");
      if (!authResponse.ok) {
        throw new Error("Failed to check Gmail authorization");
      }

      const authStatus = await authResponse.json();
      if (!authStatus.authorized) {
        throw new Error("Gmail authorization required. Please sign in with Google to grant email permissions.");
      }

      // Proceed with sending email
      const payload = {
        to: toEmail,
        subject: emailSubject,
        content: emailContent
      };
      const response = await apiRequest("POST", "/api/send-gmail", payload);
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to send email");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: "Your email has been sent successfully via Gmail!",
      });
      // Refresh Gmail status after successful email sending
      refetchGmailStatus();
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Email",
        description: error instanceof Error ? error.message : "Failed to send email via Gmail",
        variant: "destructive",
      });
    },
  });

  const handleSendEmail = () => {
    if (!toEmail || !emailSubject || !emailContent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all email fields before sending",
        variant: "destructive",
      });
      return;
    }
    sendEmailMutation.mutate();
  }

  const handleGmailConnect = () => {
    // Debug user object
    console.log('Gmail Connect - User object:', {
      hasUser: !!user,
      userId: user?.id,
      userIdType: typeof user?.id,
      userEmail: user?.email,
      fullUser: user
    });
    
    // Ensure user is authenticated before starting OAuth flow
    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect Gmail.",
        variant: "destructive",
      });
      return;
    }
    
    // Open Gmail OAuth flow in a new window with user ID parameter
    const authUrl = `/api/gmail/auth?userId=${user.id}`;
    console.log('Opening Gmail OAuth with URL:', authUrl);
    const authWindow = window.open(authUrl, 'gmailAuth', 'width=600,height=600');
    
    // Listen for message from pop-up window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
        // Clean up event listener
        window.removeEventListener('message', handleMessage);
        
        // Refresh Gmail status
        refetchGmailStatus();
        
        // Show success toast
        toast({
          title: "Gmail Connected",
          description: "You can now send emails via Gmail!",
        });
      }
    };
    
    // Add event listener for pop-up messages
    window.addEventListener('message', handleMessage);
    
    // Fallback: check if window is closed (in case postMessage doesn't work)
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        // Refresh Gmail status after auth window closes
        refetchGmailStatus();
      }
    }, 1000);
  };

  // Email generation logic is now handled by the useEmailGeneration hook

  const handleCopyContact = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent button click
    const textToCopy = `${contact.name}${contact.email ? ` <${contact.email}>` : ''}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      // Add to copied contacts set
      setCopiedContactIds(prev => new Set(prev).add(contact.id));
      
      // Remove from copied set after 2 seconds
      setTimeout(() => {
        setCopiedContactIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(contact.id);
          return newSet;
        });
      }, 2000);
    });
  };

  const handleCopyEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    toast({
      title: "Email copied",
      description: "Email address copied to clipboard",
    });
  };

  const handleEmailContact = (contact: Contact, e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.email) {
      setToEmail(contact.email);
      setSelectedContactId(contact.id);
      
      // Update company index if contact is from different company
      const contactCompanyIndex = companies.findIndex(c => c.id === contact.companyId);
      if (contactCompanyIndex !== -1 && contactCompanyIndex !== selectedCompanyIndex) {
        setCurrentCompanyIndex(contactCompanyIndex);
      }
      
      // Update contact index in the list
      const contactIndex = topContacts.findIndex(c => c.id === contact.id);
      if (contactIndex !== -1) {
        setCurrentContactIndex(contactIndex);
      }
      
      toast({
        title: "Email populated",
        description: `${contact.name}'s email added to recipient field`,
      });
    }
  };

  // Smart contact pre-selection - auto-select highest probability contact
  useEffect(() => {
    if (topContacts.length > 0 && !selectedContactId) {
      const highestProbabilityContact = topContacts[0];
      setSelectedContactId(highestProbabilityContact.id);
      setCurrentContactIndex(0); // Reset to first contact
      
      // Auto-populate email if available
      if (highestProbabilityContact.email && !toEmail) {
        setToEmail(highestProbabilityContact.email);
      }
      
      // Update company index if contact is from different company
      const contactCompanyIndex = companies.findIndex(c => c.id === highestProbabilityContact.companyId);
      if (contactCompanyIndex !== -1 && contactCompanyIndex !== selectedCompanyIndex) {
        setCurrentCompanyIndex(contactCompanyIndex);
      }
    }
  }, [topContacts, selectedContactId, toEmail]);

  // Reset contact index when company changes
  useEffect(() => {
    setCurrentContactIndex(0);
  }, [selectedCompanyIndex]);

  // Helper functions to check if navigation is possible
  const hasPrevCompanyWithContacts = () => {
    // If no companies or at first index, no prev available
    if (selectedCompanyIndex === 0) return false;
    
    for (let i = selectedCompanyIndex - 1; i >= 0; i--) {
      const company = companies[i];
      const contacts = queryClient.getQueryData([`/api/companies/${company.id}/contacts`]) as Contact[] || [];
      if (contacts.length > 0) return true;
    }
    return false;
  };

  const hasNextCompanyWithContacts = () => {
    // If no companies or at last index, no next available
    if (selectedCompanyIndex >= companies.length - 1) return false;
    
    for (let i = selectedCompanyIndex + 1; i < companies.length; i++) {
      const company = companies[i];
      const contacts = queryClient.getQueryData([`/api/companies/${company.id}/contacts`]) as Contact[] || [];
      if (contacts.length > 0) return true;
    }
    return false;
  };

  const handlePrevCompany = () => {
    // Find previous company with contacts
    for (let i = selectedCompanyIndex - 1; i >= 0; i--) {
      const company = companies[i];
      const contacts = queryClient.getQueryData([`/api/companies/${company.id}/contacts`]) as Contact[] || [];
      if (contacts.length > 0) {
        setCurrentCompanyIndex(i);
        return;
      }
    }
  };

  const handleNextCompany = () => {
    // Find next company with contacts, wrapping around to beginning
    const totalCompanies = companies.length;
    for (let offset = 1; offset < totalCompanies; offset++) {
      const nextIndex = (selectedCompanyIndex + offset) % totalCompanies;
      const company = companies[nextIndex];
      const contacts = queryClient.getQueryData([`/api/companies/${company.id}/contacts`]) as Contact[] || [];
      if (contacts.length > 0) {
        setCurrentCompanyIndex(nextIndex);
        return;
      }
    }
  };

  const handleNextContact = () => {
    if (topContacts.length === 0) return;
    
    const nextIndex = (currentContactIndex + 1) % topContacts.length;
    const nextContact = topContacts[nextIndex];
    
    setCurrentContactIndex(nextIndex);
    setSelectedContactId(nextContact.id);
    
    // Auto-populate email if available
    if (nextContact.email) {
      setToEmail(nextContact.email);
    }
  };

  const handleShowExpanded = () => {
    console.log('Chevron clicked - showing expanded view');
    setShowExpandedView(true);
    setSelectedContactId(null);
  };

  const handleCloseDuckHeader = () => {
    console.log('X clicked - closing duck header and restoring expanded view');
    setSelectedContactId(null);  // This will hide the header due to existing logic
    setShowExpandedView(true);   // Show expanded view as fallback
    setIsMobileExpanded(true);   // CRITICAL: Also restore the mobile expanded state for column visibility
  };

  // Email enrichment handlers
  const handleEnrichContact = async (contactId: number) => {
    setPendingContactIds(prev => new Set(prev).add(contactId));
    
    try {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/enrich`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to enrich contact");
      }
      
      // Refresh contacts for current company
      queryClient.invalidateQueries({ 
        queryKey: [`/api/companies/${selectedCompany?.id}/contacts`] 
      });
      
      toast({
        title: "Contact Enriched",
        description: "Email search completed successfully",
      });
    } catch (error) {
      toast({
        title: "Enrichment Failed",
        description: error instanceof Error ? error.message : "Failed to enrich contact",
        variant: "destructive",
      });
    } finally {
      setPendingContactIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const handleHunterSearch = async (contactId: number) => {
    setPendingHunterIds(prev => new Set(prev).add(contactId));
    
    try {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/hunter-search`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search Hunter");
      }
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/companies/${selectedCompany?.id}/contacts`] 
      });
      
      toast({
        title: "Hunter Search Complete",
        description: "Hunter.io email search completed",
      });
    } catch (error) {
      toast({
        title: "Hunter Search Failed",
        description: error instanceof Error ? error.message : "Failed to search Hunter.io",
        variant: "destructive",
      });
    } finally {
      setPendingHunterIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const handleAeroLeadsSearch = async (contactId: number) => {
    setPendingAeroLeadsIds(prev => new Set(prev).add(contactId));
    
    try {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/aeroleads-search`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search AeroLeads");
      }
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/companies/${selectedCompany?.id}/contacts`] 
      });
      
      toast({
        title: "AeroLeads Search Complete",
        description: "AeroLeads email search completed",
      });
    } catch (error) {
      toast({
        title: "AeroLeads Search Failed",
        description: error instanceof Error ? error.message : "Failed to search AeroLeads",
        variant: "destructive",
      });
    } finally {
      setPendingAeroLeadsIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  const handleApolloSearch = async (contactId: number) => {
    setPendingApolloIds(prev => new Set(prev).add(contactId));
    
    try {
      const response = await apiRequest("POST", `/api/contacts/${contactId}/apollo-search`, {});
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to search Apollo");
      }
      
      queryClient.invalidateQueries({ 
        queryKey: [`/api/companies/${selectedCompany?.id}/contacts`] 
      });
      
      toast({
        title: "Apollo Search Complete",
        description: "Apollo.io email search completed",
      });
    } catch (error) {
      toast({
        title: "Apollo Search Failed",
        description: error instanceof Error ? error.message : "Failed to search Apollo.io",
        variant: "destructive",
      });
    } finally {
      setPendingApolloIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(contactId);
        return newSet;
      });
    }
  };

  return (
    <div className="w-full md:container md:mx-auto md:py-8">
      {/* Mobile Duck Header - Only visible on mobile when in compressed view with selected contact */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-all duration-300 ${showExpandedView || !selectedContact ? 'hidden' : 'block'}`}>
        <div className={`flex items-center justify-center relative transition-all duration-300 ${isScrolled ? 'pt-1 pb-0.5' : 'pt-2 pb-1'}`}>

          <span className={`transition-all duration-300 ${isScrolled ? 'text-lg' : 'text-2xl'}`}>🐥</span>
          <span className={`ml-1 transition-all duration-300 ${isScrolled ? 'text-sm' : 'text-lg'}`}>🥚🥚🥚🥚</span>
          
          {/* X Close Button */}
          <button
            onClick={handleCloseDuckHeader}
            className={`absolute right-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-300 ${isScrolled ? 'p-0.5' : 'p-1'}`}
          >
            <X className={`transition-all duration-300 ${isScrolled ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
        </div>
      </div>

      {/* Mobile Contact Card - Only visible on mobile */}
      <div className="md:hidden pt-0">
        {/* Mobile Company Navigation Bar - Above contact card */}
        {!isMobileExpanded && selectedCompany && selectedContact && (
          <div className={`md:hidden px-2.5 bg-white flex items-center justify-between z-[60] ${!showExpandedView && selectedContact ? '-mt-1' : '-mt-4'}`}>
            <div className="flex-1 text-left">
              <span className="font-medium text-sm text-muted-foreground">{selectedCompany.name}</span>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextCompany}
                className="px-2 h-8 flex items-center justify-center gap-0 text-muted-foreground/50 hover:text-muted-foreground/60 bg-gray-50/30 hover:bg-gray-100/40"
              >
                <Building2 className="w-2.5 h-2.5 mr-0.5" />
                <span className="text-[9px] text-muted-foreground/50">
                  {selectedCompanyIndex + 1}/{companies.length}
                </span>
                <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/50" />
              </Button>
              
              {topContacts.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextContact}
                  className="px-2 h-8 flex items-center justify-center gap-0 text-muted-foreground hover:text-muted-foreground/80 bg-gray-50/30 hover:bg-gray-100/40"
                >
                  <User className="w-2.5 h-2.5" />
                  <span className="text-[9px] text-muted-foreground">
                    {currentContactIndex + 1}/{topContacts.length}
                  </span>
                  <ChevronRight className="w-2.5 h-2.5" />
                </Button>
              )}
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {!isMobileExpanded && (
            <motion.div
              initial={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ 
                duration: 0.8,
                ease: "easeInOut",
                opacity: { duration: 0.6 },
                height: { duration: 0.8, delay: 0.2 }
              }}
              className="overflow-hidden"
            >
              {selectedContact && selectedCompany ? (
                <div 
                  className="mb-2 -mt-1 cursor-pointer"
                  onClick={handleCloseDuckHeader}
                >
                  <div className={cn(
                    "w-full text-left px-2.5 pt-1.5 pb-2.5 relative rounded-lg shadow-md border-t-0"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedContact.name}</span>
                      <div className="flex items-center gap-2 pr-6">
                        <Badge 
                          variant={
                            (selectedContact.probability || 0) >= 90 ? "default" :
                            (selectedContact.probability || 0) >= 70 ? "secondary" : "outline"
                          }
                          className="text-muted-foreground/60 text-xs"
                        >
                          {selectedContact.probability || 0}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0 whitespace-nowrap overflow-hidden text-ellipsis pr-8">
                      {selectedContact.role}
                    </div>
                    {selectedContact.email && (
                      <div className="text-sm text-muted-foreground mt-2">
                        {selectedContact.email}
                      </div>
                    )}
                    
                    {/* Copy button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute bottom-1 right-2 p-1 h-8 w-6",
                        "hover:bg-background/80 transition-colors",
                        copiedContactIds.has(selectedContact.id) 
                          ? "text-green-600 hover:text-green-700" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyContact(selectedContact, e);
                      }}
                    >
                      {copiedContactIds.has(selectedContact.id) ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {/* Mobile Actions Menu */}
                    <div 
                      className="absolute top-2 right-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ContactActionColumn
                        contact={selectedContact as any}
                        standalone={true}
                        displayMode="mobile"
                        className="p-0"
                        handleEnrichContact={handleEnrichContact}
                        handleHunterSearch={handleHunterSearch}
                        handleAeroLeadsSearch={handleAeroLeadsSearch}
                        handleApolloSearch={handleApolloSearch}
                        pendingContactIds={pendingContactIds}
                        pendingHunterIds={pendingHunterIds}
                        pendingAeroLeadsIds={pendingAeroLeadsIds}
                        pendingApolloIds={pendingApolloIds}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="mb-4 cursor-pointer"
                  onClick={handleCloseDuckHeader}
                >
                  <div className={cn(
                    "w-full text-left p-3 relative rounded-lg border border-dashed",
                    "border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
                  )}>
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Tap to select a company and contact</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-6">
        {/* Left Column - Hidden on mobile when collapsed */}
        <div 
          className={`md:block ${!isMobileExpanded ? 'hidden' : 'block'}`}
        >
          <div className="md:border md:rounded-lg md:shadow-sm">
            <div className="p-6 md:pb-6">
              <div className="space-y-3">
                {/* List Selection Row - Enhanced visibility */}
                <div className="space-y-3">
                  <Select
                    value={selectedListId}
                    onValueChange={(value) => {
                      setSelectedListId(value);
                      setCurrentCompanyIndex(0); // Reset company index when changing list
                    }}
                  >
                    <SelectTrigger className={cn(
                      "w-full h-12 transition-all duration-200 font-medium",
                      !selectedListId 
                        ? "px-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100"
                        : "px-3 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50",
                      // Hide the company count in the trigger display
                      selectedListId && "[&_span.company-count]:hidden"
                    )}>
                      <SelectValue placeholder="Select a list to start" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.map((list: List) => (
                        <SelectItem 
                          key={list.listId} 
                          value={list.listId.toString()}
                        >
                          <div className="flex items-center justify-between w-full pr-2">
                            <span className="font-medium">{generateShortListDisplayName(list)}</span>
                            <span className="company-count text-sm text-muted-foreground ml-4">
                              {list.resultCount} companies
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Enhanced Navigation Row */}
                  {companies.length > 0 && (
                    <div className={cn(
                      "flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200",
                      selectedListId && !selectedContactId 
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200"
                        : "bg-white border-gray-200"
                    )}>
                      <Button
                        variant="outline"
                        size="default"
                        className={cn(
                          "h-10 w-10 p-0 bg-white border-2 transition-all duration-200 shadow-sm hover:shadow-md",
                          selectedListId && !selectedContactId
                            ? "border-blue-300 hover:border-blue-500 hover:bg-blue-100"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                        )}
                        onClick={handlePrevCompany}
                        disabled={selectedCompanyIndex === 0}
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </Button>
                      
                      <div className="flex items-center gap-2 px-4">
                        <Building2 className={cn(
                          "w-5 h-5",
                          selectedListId && !selectedContactId ? "text-blue-600" : "text-gray-600"
                        )} />
                        <div className="text-center">
                          <span className={cn(
                            "text-base font-semibold",
                            selectedListId && !selectedContactId ? "text-blue-800" : "text-gray-800"
                          )}>
                            {selectedCompanyIndex + 1} of {companies.length}
                          </span>
                          <p className={cn(
                            "text-xs",
                            selectedListId && !selectedContactId ? "text-blue-600" : "text-gray-500"
                          )}>Companies</p>
                        </div>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="default"
                        className={cn(
                          "h-10 w-10 p-0 bg-white border-2 transition-all duration-200 shadow-sm hover:shadow-md",
                          selectedListId && !selectedContactId
                            ? "border-blue-300 hover:border-blue-500 hover:bg-blue-100"
                            : "border-gray-300 hover:border-gray-400 hover:bg-gray-100"
                        )}
                        onClick={handleNextCompany}
                        disabled={selectedCompanyIndex === companies.length - 1}
                      >
                        <ChevronRight className="w-6 h-6" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 md:px-6 md:pb-6">
              
              {/* Company Name Header */}
              {selectedCompany && (
                <div className="flex justify-between items-center mb-4 pb-3 border-b">
                  <h2 className="text-xl font-semibold">{selectedCompany.name}</h2>
                  <TooltipProvider delayDuration={500}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('Company view button clicked:', { id: selectedCompany.id, name: selectedCompany.name });
                            setLocation(`/companies/${selectedCompany.id}`);
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Open company page</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

              {/* Key Members Section */}
              {topContacts && topContacts.length > 0 && (
                <div className="space-y-2">
                  {topContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className={cn(
                          "w-full text-left p-3 relative cursor-pointer rounded-lg",
                          selectedContactId === contact.id 
                            ? "border-l-4 border-dashed border-gray-600 border-4 border-blue-200/60 border-dashed shadow-md transition-all duration-200" 
                            : "bg-card border-l-2 border-transparent hover:border-l-4 hover:border-dashed hover:border-gray-400 hover:border-4 hover:border-gray-300/60 hover:border-dashed hover:shadow-sm transition-all duration-50"
                        )}
                        onClick={() => {
                          setSelectedContactId(contact.id);
                          
                          // Update email field
                          if (contact.email) {
                            setToEmail(contact.email);
                          }
                          
                          // Update company index if contact is from different company
                          const contactCompanyIndex = companies.findIndex(c => c.id === contact.companyId);
                          if (contactCompanyIndex !== -1 && contactCompanyIndex !== selectedCompanyIndex) {
                            setCurrentCompanyIndex(contactCompanyIndex);
                          }
                          
                          // Update contact index in the list
                          const contactIndex = topContacts.findIndex(c => c.id === contact.id);
                          if (contactIndex !== -1) {
                            setCurrentContactIndex(contactIndex);
                          }
                          
                          // On mobile, immediately collapse after contact selection
                          if (typeof window !== 'undefined' && window.innerWidth < 768) { // md breakpoint
                            setIsMobileExpanded(false);
                            setShowExpandedView(false); // CRITICAL: Reset this so duck header can appear
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{contact.name}</span>
                          <div className="flex items-center gap-3">
                            <Badge variant={
                              (contact.probability || 0) >= 90 ? "default" :
                              (contact.probability || 0) >= 70 ? "secondary" : "outline"
                            }>
                              {contact.probability || 0}
                            </Badge>
                            {/* Mobile Actions Menu */}
                            <ContactActionColumn
                              contact={contact as any}
                              standalone={true}
                              displayMode="mobile"
                              className="p-0"
                              handleEnrichContact={handleEnrichContact}
                              handleHunterSearch={handleHunterSearch}
                              handleAeroLeadsSearch={handleAeroLeadsSearch}
                              handleApolloSearch={handleApolloSearch}
                              pendingContactIds={pendingContactIds}
                              pendingHunterIds={pendingHunterIds}
                              pendingAeroLeadsIds={pendingAeroLeadsIds}
                              pendingApolloIds={pendingApolloIds}
                            />
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {contact.role && (
                            <span className="block">{contact.role}</span>
                          )}
                          {contact.email && (
                            <span className="block">{contact.email}</span>
                          )}
                        </div>
                        {/* Copy button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "absolute bottom-2 right-2 p-1.5",
                            "hover:bg-background/80 transition-colors",
                            copiedContactIds.has(contact.id) 
                              ? "text-green-600 hover:text-green-700" 
                              : "text-muted-foreground hover:text-foreground",
                            selectedContactId === contact.id && "hover:bg-primary-foreground/20"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyContact(contact, e);
                          }}
                        >
                          {copiedContactIds.has(contact.id) ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                  ))}
                </div>
              )}

              <div className="mt-6">
                <div>
                  <div className="pt-6">
                    {selectedCompany ? (
                      <div className="border rounded-lg p-4 space-y-2">
                        {/* Company Description */}
                        <div>
                          {selectedCompany.description ? (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {selectedCompany.description}
                            </p>
                          ) : (
                            <p className="text-muted-foreground italic">No description available</p>
                          )}
                        </div>

                        {/* Company Website */}
                        {selectedCompany.website && (
                          <div>
                            <p className="text-muted-foreground">
                              <a 
                                href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {selectedCompany.website}
                              </a>
                            </p>
                          </div>
                        )}

                        {/* Alternative Profile URL */}
                        {selectedCompany.alternativeProfileUrl && (
                          <div>
                            <p className="text-muted-foreground">
                              <span className="font-medium">Profile: </span>
                              <a 
                                href={selectedCompany.alternativeProfileUrl.startsWith('http') ? selectedCompany.alternativeProfileUrl : `https://${selectedCompany.alternativeProfileUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {selectedCompany.alternativeProfileUrl}
                              </a>
                            </p>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50">
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                          <Building2 className="w-12 h-12 text-gray-400" />
                          <p className="text-muted-foreground font-medium">
                            {selectedListId
                              ? "No companies found in this list"
                              : "Select a list to view company details"}
                          </p>
                          {!selectedListId && (
                            <p className="text-sm text-muted-foreground">
                              Choose a list from the dropdown above to start prospecting
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Email Creation */}
        <div className={`md:block ${isMobileExpanded ? 'mt-4' : ''}`}>
          <div className="md:border md:rounded-lg md:shadow-sm">
            <div className="px-0 py-3 md:p-6 space-y-0 md:space-y-6">
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
                  {gmailStatus?.authorized ? (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-300">
                      <Mail className="w-3 h-3 mr-1" />
                      {gmailUserInfo?.email 
                        ? gmailUserInfo.email.length > 20 
                          ? `${gmailUserInfo.email.substring(0, 20)}...`
                          : gmailUserInfo.email
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
                    isGmailAuthenticated={gmailStatus?.authorized}
                    onSendViaGmail={handleSendEmail}
                    isPending={sendEmailMutation.isPending}
                    isSuccess={sendEmailMutation.isSuccess}
                    className="h-8 px-3 text-xs"
                  />
                </div>
              </div>

              {/* Quick Templates Section - Moved below email content and buttons */}
              <div className="mt-8 pt-6 border-t">
                <QuickTemplates
                  onSelectTemplate={(template: EmailTemplate) => {
                    setEmailPrompt(template.description || "");
                    setEmailContent(template.content);
                    setEmailSubject(template.subject || "");
                    // Store original versions for merge field conversion
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
                />
              </div>
            </div>
          </div>
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