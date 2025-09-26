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
  Building2
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
}

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
  pendingComprehensiveSearchIds
}: CompanyCardsProps) {
  const [, setLocation] = useLocation();
  
  // State to track which company cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  
  // State to track selected companies and contacts
  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set());
  
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
  const isCardExpanded = (companyId: number) => expandedCards.has(companyId);
  
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
    <div className="w-full space-y-2">
      {companies.map((company) => {
        const isExpanded = isCardExpanded(company.id);
        const topContacts = getTopContacts(company);
        const isSelected = selectedCompanies.has(company.id);
        
        return (
          <Card
            key={`company-${company.id}`}
            className={cn(
              "rounded-none md:rounded-lg transition-all duration-200 cursor-pointer",
              "hover:shadow-sm",
              isSelected && "border-blue-400 dark:border-blue-600",
              !isSelected && "border-border"
            )}
          >
            {/* Company Header - Always visible */}
            <div 
              onClick={() => toggleCardExpansion(company.id)}
              className="p-3"
            >
              <div className="flex items-center gap-3">
                {/* Checkbox - hidden on mobile */}
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => toggleCompanySelection({stopPropagation: () => {}} as React.MouseEvent, company.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select ${company.name}`}
                  className="mt-0.5 hidden md:block"
                />
                
                {/* Company Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base leading-tight flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {company.name}
                      </h3>
                      
                      <div className="flex items-center gap-3 mt-1">
                        {company.website && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <a 
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-gray-600 hover:text-gray-800 transition-colors hover:underline"
                            >
                              {company.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                            </a>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span className="md:hidden">{company.contacts?.length || 0}</span>
                          <span className="hidden md:inline">{company.contacts?.length || 0} contacts</span>
                        </div>
                        
                        {company.totalScore && company.totalScore > 0 && (
                          <Badge 
                            variant={company.totalScore > 70 ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            Score: {company.totalScore}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions and Expand Chevron */}
                    <div className="flex items-center gap-2">
                      <TooltipProvider delayDuration={500}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompanyView(company.id);
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
                      
                      <div className={cn(
                        "transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )}>
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      </div>
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
                          "flex items-center gap-3 p-2 rounded-md transition-colors",
                          "hover:bg-muted/50",
                          selectedContacts.has(contact.id) && "bg-blue-50/30 dark:bg-blue-950/10"
                        )}
                      >
                        <Checkbox 
                          checked={selectedContacts.has(contact.id)}
                          onCheckedChange={() => toggleContactSelection({stopPropagation: () => {}} as React.MouseEvent, contact.id)}
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
      })}
    </div>
  );
}