import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ExternalLink, 
  Gem,
  Target,
  Rocket,
  Star,
  ThumbsUp,
  ThumbsDown,
  Menu,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Globe,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
  ScrollText,
  Layers
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Company, Contact } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";
import { ContactActionColumn } from "@/components/contact-action-column";
import { ComprehensiveSearchButton } from "@/components/comprehensive-email-search";
import { cn } from "@/lib/utils";

interface CompanyCardsProps {
  companies: Array<Company & { contacts?: ContactWithCompanyInfo[] }>;
  handleCompanyView: (companyId: number) => void;
  handleHunterSearch?: (contactId: number) => void;
  handleApolloSearch?: (contactId: number) => void;
  handleEnrichContact?: (contactId: number) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
  pendingHunterIds?: Set<number>;
  pendingApolloIds?: Set<number>;
  pendingContactIds?: Set<number>;
  pendingComprehensiveSearchIds?: Set<number>;
  onContactClick?: (contact: ContactWithCompanyInfo, company: Company) => void;
  onViewModeChange?: (viewMode: 'scroll' | 'slides') => void;
  selectedEmailContact?: Contact | null;
}

// Unified CompanyCard component
interface CompanyCardProps {
  company: Company & { contacts?: ContactWithCompanyInfo[] };
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected: boolean;
  onToggleSelection: (e: React.MouseEvent, companyId: number) => void;
  selectedContacts: Set<number>;
  onToggleContactSelection: (e: React.MouseEvent, contactId: number) => void;
  handleCompanyView: (companyId: number) => void;
  handleHunterSearch?: (contactId: number) => void;
  handleApolloSearch?: (contactId: number) => void;
  handleEnrichContact?: (contactId: number) => void;
  handleComprehensiveEmailSearch?: (contactId: number) => void;
  pendingHunterIds?: Set<number>;
  pendingApolloIds?: Set<number>;
  pendingContactIds?: Set<number>;
  pendingComprehensiveSearchIds?: Set<number>;
  onContactClick?: (contact: ContactWithCompanyInfo, company: Company) => void;
  setLocation: (path: string) => void;
  topContacts: ContactWithCompanyInfo[];
  viewMode: 'scroll' | 'slides';
  selectedEmailContact?: Contact | null;
}

const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  isExpanded,
  onToggleExpand,
  isSelected,
  onToggleSelection,
  selectedContacts,
  onToggleContactSelection,
  handleCompanyView,
  handleHunterSearch,
  handleApolloSearch,
  handleEnrichContact,
  handleComprehensiveEmailSearch,
  pendingHunterIds,
  pendingApolloIds,
  pendingContactIds,
  pendingComprehensiveSearchIds,
  onContactClick,
  setLocation,
  topContacts,
  viewMode,
  selectedEmailContact
}) => {
  return (
    <Card
      className={cn(
        "rounded-none md:rounded-lg transition-all duration-200 cursor-pointer",
        "hover:shadow-sm",
        isSelected && "border-blue-400 dark:border-blue-600",
        !isSelected && "border-border"
      )}
    >
      {/* Company Header - Unified design based on slides view */}
      <div 
        onClick={onToggleExpand}
        className="p-3"
      >
        <div className="flex items-center gap-3">
          {/* Checkbox - hidden completely */}
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onToggleSelection({stopPropagation: () => {}} as React.MouseEvent, company.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${company.name}`}
            className="mt-0.5 hidden"
          />
          
          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h3 className="font-semibold text-base leading-tight flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  {company.name}
                </h3>
                
                <div className="flex items-center gap-2 mt-1">
                  {company.website && (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      <span className="truncate max-w-[200px]">{company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                    </a>
                  )}
                  {company.contacts && company.contacts.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{company.contacts.length} contacts</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Expansion indicator and actions - unified design */}
              <div className="flex items-center gap-2">
                {company.contacts && company.contacts.length > 0 && viewMode === 'scroll' && (
                  <Badge 
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-accent"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Badge>
                )}
                
                {/* Company action menu - unified design */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCompanyView(company.id)}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contacts Section - Only visible when expanded */}
      {isExpanded && topContacts.length > 0 && (
        <CardContent className="pt-0 px-3 pb-3">
          <div className="border-t pt-2">
            <div className="space-y-1.5">
              {topContacts.map((contact) => (
                <div
                  key={`${company.id}-contact-${contact.id}`}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    selectedEmailContact?.id === contact.id && "bg-blue-100 border-l-4 border-blue-500 shadow-sm",
                    selectedContacts.has(contact.id) && "bg-blue-50/30 dark:bg-blue-950/10"
                  )}
                  onClick={() => onContactClick?.(contact, company)}
                >
                  <Checkbox 
                    checked={selectedContacts.has(contact.id)}
                    onCheckedChange={() => onToggleContactSelection({stopPropagation: () => {}} as React.MouseEvent, contact.id)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Select ${contact.name}`}
                    className="mt-0.5 hidden"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{contact.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {contact.role || "No role specified"}
                        </div>
                        <div className="text-xs mt-1">
                          {contact.email ? (
                            <span className="text-gray-600">{contact.email}</span>
                          ) : (
                            handleComprehensiveEmailSearch && (
                              <ComprehensiveSearchButton
                                contact={contact}
                                onSearch={handleComprehensiveEmailSearch}
                                isPending={pendingComprehensiveSearchIds?.has(contact.id)}
                                displayMode="text"
                              />
                            )
                          )}
                          {contact.alternativeEmails && contact.alternativeEmails.length > 0 && (
                            <div className="mt-0.5 space-y-0.5">
                              {contact.alternativeEmails.map((altEmail, index) => (
                                <div key={index} className="text-xs text-muted-foreground/70 italic">
                                  {altEmail}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {contact.probability && (
                          <TooltipProvider delayDuration={300}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Badge
                                    variant="secondary"
                                    className="text-xs cursor-help"
                                  >
                                    {contact.probability}%
                                  </Badge>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Score reflects the contact's affinity to the target role/designation searched.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        
                        <ContactActionColumn
                          contact={contact}
                          handleContactView={(id) => {
                            setLocation(`/contacts/${id}`);
                          }}
                          handleEnrichContact={handleEnrichContact}
                          handleHunterSearch={handleHunterSearch}
                          handleApolloSearch={handleApolloSearch}
                          pendingContactIds={pendingContactIds}
                          pendingHunterIds={pendingHunterIds}
                          pendingApolloIds={pendingApolloIds}
                          standalone={true}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {company.contacts && company.contacts.length > 3 && (
                <div className="text-center pt-2">
                  <span className="text-xs text-muted-foreground">
                    +{company.contacts.length - 3} more contacts available
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
      
      {/* No contacts message */}
      {isExpanded && topContacts.length === 0 && (
        <CardContent className="pt-0 px-4 pb-4">
          <div className="border-t pt-3">
            <div className="text-center py-4 text-sm text-muted-foreground">
              No contacts found for this company
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default function CompanyCards({ 
  companies, 
  handleCompanyView,
  handleHunterSearch,
  handleApolloSearch,
  handleEnrichContact,
  handleComprehensiveEmailSearch,
  pendingHunterIds,
  pendingApolloIds,
  pendingContactIds,
  pendingComprehensiveSearchIds,
  onContactClick,
  onViewModeChange,
  selectedEmailContact
}: CompanyCardsProps) {
  const [, setLocation] = useLocation();
  
  // State for view mode and current slide
  const [viewMode, setViewMode] = useState<'scroll' | 'slides'>('scroll');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // State to track which company cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // State to track selected companies and contacts
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  
  // State to highlight navigation buttons
  const [highlightNavButtons, setHighlightNavButtons] = useState(false);
  
  // Toggle expansion state for a company card
  const toggleCardExpansion = (companyId: number) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };
  
  // Check if a company card is expanded
  const isCardExpanded = (companyId: number) => {
    // In slides view, always show companies expanded
    if (viewMode === 'slides') return true;
    // In scroll view, use the normal expansion state
    return expandedCards.has(companyId);
  };
  
  // Navigation functions for slides view (with infinite loop)
  const handlePrevSlide = () => {
    setCurrentSlideIndex(prev => prev > 0 ? prev - 1 : companies.length - 1);
  };
  
  const handleNextSlide = () => {
    setCurrentSlideIndex(prev => prev < companies.length - 1 ? prev + 1 : 0);
  };
  
  // Reset slide index when switching to slides view or when companies change
  useEffect(() => {
    if (viewMode === 'slides' && currentSlideIndex >= companies.length) {
      setCurrentSlideIndex(Math.max(0, companies.length - 1));
    }
  }, [companies.length, viewMode, currentSlideIndex]);
  
  // Toggle company selection
  const toggleCompanySelection = (e: React.MouseEvent, companyId: number) => {
    e.stopPropagation();
    
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
        // Also deselect all contacts from this company
        const company = companies.find(c => c.id === companyId);
        if (company?.contacts) {
          setSelectedContacts(prev => {
            const updatedContacts = new Set(prev);
            company.contacts?.forEach(contact => updatedContacts.delete(contact.id));
            return updatedContacts;
          });
        }
      } else {
        newSet.add(companyId);
        // Also select all contacts from this company
        const company = companies.find(c => c.id === companyId);
        if (company?.contacts) {
          setSelectedContacts(prev => {
            const updatedContacts = new Set(prev);
            company.contacts?.forEach(contact => updatedContacts.add(contact.id));
            return updatedContacts;
          });
        }
      }
      return newSet;
    });
  };
  
  // Toggle contact selection
  const toggleContactSelection = (e: React.MouseEvent, contactId: number) => {
    e.stopPropagation();
    
    setSelectedContacts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(contactId)) {
        newSet.delete(contactId);
      } else {
        newSet.add(contactId);
      }
      return newSet;
    });
  };
  
  // Auto-expand first company when new search results arrive
  useEffect(() => {
    if (companies.length > 0 && expandedCards.size === 0) {
      const firstCompany = companies[0];
      const topContacts = getTopContacts(firstCompany);
      
      if (topContacts.length > 0) {
        console.log('Auto-expanding first company to show contacts:', firstCompany.name);
        setExpandedCards(new Set([firstCompany.id]));
      }
    }
  }, [companies]);
  
  // Get top contacts for a company (up to 3)
  const getTopContacts = (company: Company & { contacts?: ContactWithCompanyInfo[] }) => {
    if (!company.contacts || company.contacts.length === 0) {
      return [];
    }
    
    return [...company.contacts]
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 3);
  };

  return (
    <div className="w-full space-y-1">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between -mt-1 mb-2">
        <div className="flex items-center gap-0.5 bg-muted/20 rounded-md p-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode('scroll');
              onViewModeChange?.('scroll');
            }}
            className={cn(
              "px-2 h-6 text-[11px] font-medium transition-all",
              viewMode === 'scroll' 
                ? "bg-background text-gray-600 shadow-sm" 
                : "hover:bg-muted/50 text-gray-400/60 hover:text-gray-500"
            )}
          >
            <ScrollText className="h-3 w-3 mr-0.5" />
            Scroll
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setViewMode('slides');
              onViewModeChange?.('slides');
              // Highlight navigation buttons for 1 second
              setHighlightNavButtons(true);
              setTimeout(() => setHighlightNavButtons(false), 1000);
            }}
            className={cn(
              "px-2 h-6 text-[11px] font-medium transition-all",
              viewMode === 'slides' 
                ? "bg-background text-gray-600 shadow-sm" 
                : "hover:bg-muted/50 text-gray-400/60 hover:text-gray-500"
            )}
          >
            <Layers className="h-3 w-3 mr-0.5" />
            Slides
          </Button>
        </div>
        
        {/* Slide Counter and Navigation for Slides View */}
        {viewMode === 'slides' && companies.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevSlide}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                highlightNavButtons ? "bg-primary/20 border-primary" : "border-muted-foreground/20"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-1">
              {currentSlideIndex + 1} of {companies.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextSlide}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                highlightNavButtons ? "bg-primary/20 border-primary" : "border-muted-foreground/20"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Companies Display */}
      {viewMode === 'scroll' ? (
        // Scroll View - Show all companies
        companies.map((company) => (
          <CompanyCard
            key={`company-${company.id}`}
            company={company}
            isExpanded={isCardExpanded(company.id)}
            onToggleExpand={() => toggleCardExpansion(company.id)}
            isSelected={selectedCompanies.has(company.id)}
            onToggleSelection={toggleCompanySelection}
            selectedContacts={selectedContacts}
            onToggleContactSelection={toggleContactSelection}
            handleCompanyView={handleCompanyView}
            handleHunterSearch={handleHunterSearch}
            handleApolloSearch={handleApolloSearch}
            handleEnrichContact={handleEnrichContact}
            handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
            pendingHunterIds={pendingHunterIds}
            pendingApolloIds={pendingApolloIds}
            pendingContactIds={pendingContactIds}
            pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
            onContactClick={onContactClick}
            setLocation={setLocation}
            topContacts={getTopContacts(company)}
            viewMode={viewMode}
            selectedEmailContact={selectedEmailContact}
          />
        ))
      ) : (
        // Slides View - Show one company at a time
        companies.length > 0 && (
          <CompanyCard
            key={`company-${companies[currentSlideIndex].id}`}
            company={companies[currentSlideIndex]}
            isExpanded={isCardExpanded(companies[currentSlideIndex].id)}
            onToggleExpand={() => toggleCardExpansion(companies[currentSlideIndex].id)}
            isSelected={selectedCompanies.has(companies[currentSlideIndex].id)}
            onToggleSelection={toggleCompanySelection}
            selectedContacts={selectedContacts}
            onToggleContactSelection={toggleContactSelection}
            handleCompanyView={handleCompanyView}
            handleHunterSearch={handleHunterSearch}
            handleApolloSearch={handleApolloSearch}
            handleEnrichContact={handleEnrichContact}
            handleComprehensiveEmailSearch={handleComprehensiveEmailSearch}
            pendingHunterIds={pendingHunterIds}
            pendingApolloIds={pendingApolloIds}
            pendingContactIds={pendingContactIds}
            pendingComprehensiveSearchIds={pendingComprehensiveSearchIds}
            onContactClick={onContactClick}
            setLocation={setLocation}
            topContacts={getTopContacts(companies[currentSlideIndex])}
            viewMode={viewMode}
            selectedEmailContact={selectedEmailContact}
          />
        )
      )}
    </div>
  );
}