import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserCircle, Banknote, Mail, Star, ThumbsUp, ThumbsDown, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { ContactActionColumn } from "@/components/contact-action-column";
import type { TopProspectsCardProps } from "./types";

const INITIAL_VISIBLE_COUNT = 5;

export function TopProspectsCard({
  prospects,
  selectedContacts,
  pendingContactIds,
  pendingHunterIds,
  pendingApolloIds,
  isVisible,
  onEnrichProspects,
  onSelectAll,
  onCheckboxChange,
  onContactView,
  onEnrichContact,
  onHunterSearch,
  onApolloSearch,
  onContactFeedback,
}: TopProspectsCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isVisible || prospects.length === 0) return null;

  const isContactSelected = (contactId: number) => selectedContacts.has(contactId);
  
  const getSelectedProspects = () => {
    return prospects.filter(contact => selectedContacts.has(contact.id));
  };

  const handleSelectAllContacts = (checked: boolean) => {
    onSelectAll(checked);
  };
  
  const visibleProspects = isExpanded ? prospects : prospects.slice(0, INITIAL_VISIBLE_COUNT);
  const remainingCount = prospects.length - INITIAL_VISIBLE_COUNT;
  const hasMoreProspects = remainingCount > 0;

  return (
    <Card className="w-full rounded-none md:rounded-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="w-5 h-5" />
            Top Prospects
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const selectedProspects = getSelectedProspects();
                if (selectedProspects.length > 0) {
                  onEnrichProspects(selectedProspects);
                } else {
                  onEnrichProspects(prospects);
                }
              }}
              data-testid="button-enrich-prospects"
            >
              <Banknote className="mr-2 h-4 w-4" />
              {selectedContacts.size > 0 
                ? `Enrich Selected (${selectedContacts.size})` 
                : "Enrich All Prospects"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Highest probability contacts across all companies
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 hidden">
                  <Checkbox 
                    checked={prospects.length > 0 && prospects.every(contact => selectedContacts.has(contact.id))}
                    onCheckedChange={handleSelectAllContacts}
                    aria-label="Select all contacts"
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell"><span className="text-xs">Company</span></TableHead>
                <TableHead className="hidden md:table-cell"><span className="text-xs">Email</span></TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProspects.map((contact) => (
                <TableRow key={contact.id} className="group" data-testid={`row-prospect-${contact.id}`}>
                  <TableCell className="w-10 hidden">
                    <Checkbox 
                      checked={isContactSelected(contact.id)}
                      onCheckedChange={() => onCheckboxChange(contact.id)}
                      aria-label={`Select ${contact.name}`}
                      data-testid={`checkbox-prospect-${contact.id}`}
                    />
                  </TableCell>
                  <TableCell className="py-1 pl-1">
                    <div className="font-medium leading-tight" data-testid={`text-name-${contact.id}`}>
                      {contact.name}
                    </div>
                    <div className="text-xs text-slate-500 leading-tight -mt-0.5 truncate max-w-[300px]" title={contact.role || "N/A"}>
                      {contact.role || "N/A"}
                    </div>
                    <div className="md:hidden text-xs text-muted-foreground leading-tight mt-0.5">
                      <div>{contact.companyName}</div>
                      <div className="flex flex-col mt-1">
                        <div>{contact.email || (
                          <Mail className="h-4 w-4 text-gray-400 inline" />
                        )}</div>
                        {contact.alternativeEmails && contact.alternativeEmails.length > 0 && (
                          <div className="flex flex-col gap-0.5 mt-1">
                            {contact.alternativeEmails.map((email, i) => (
                              <span key={i} className="italic opacity-70">
                                {email}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Company name - hidden on mobile, shown as small text */}
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-muted-foreground">{contact.companyName}</span>
                  </TableCell>
                  
                  {/* Email - hidden on mobile, shown as small text */}
                  <TableCell className="py-1 hidden md:table-cell">
                    <div className="text-xs text-muted-foreground">
                      {contact.email || (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground">
                                <Mail className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p>Use "Action" icons on this row to find this email. 👉🏼</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {contact.alternativeEmails && contact.alternativeEmails.length > 0 && (
                      <div className="text-xs text-muted-foreground opacity-75 mt-1">
                        {contact.alternativeEmails.map((altEmail, index) => (
                          <div key={index} className="text-xs italic">
                            {altEmail}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Badge variant="secondary" data-testid={`badge-score-${contact.id}`}>
                      {contact.probability || 0}
                    </Badge>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center">
                      {/* Contact actions (first 5 icons) */}
                      <ContactActionColumn
                        contact={contact}
                        handleContactView={onContactView}
                        handleEnrichContact={onEnrichContact}
                        handleHunterSearch={onHunterSearch}
  
                        handleApolloSearch={onApolloSearch}
                        pendingContactIds={pendingContactIds}
                        pendingHunterIds={pendingHunterIds}
  
                        pendingApolloIds={pendingApolloIds}
                        standalone={true}
                      />
                      
                      {/* Feedback button - both desktop and mobile */}
                      <TooltipProvider delayDuration={500}>
                        <Tooltip>
                          <DropdownMenu>
                            <TooltipTrigger asChild>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 w-6 p-0 ml-1"
                                  data-testid={`button-feedback-${contact.id}`}
                                >
                                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => onContactFeedback(contact.id, "excellent")}>
                                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                                Excellent Match
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onContactFeedback(contact.id, "ok")}>
                                <ThumbsUp className="h-4 w-4 mr-2 text-blue-500" />
                                OK Match
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onContactFeedback(contact.id, "terrible")}>
                                <ThumbsDown className="h-4 w-4 mr-2 text-red-500" />
                                Not a Match
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <TooltipContent>
                            <p>Rate this contact</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Expand/Collapse button - styled like company cards */}
          {hasMoreProspects && (
            <div className="px-4 pb-3 pt-1">
              <Button
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs text-muted-foreground hover:text-gray-600 dark:hover:text-gray-400 hover:bg-accent/50 transition-all py-2 rounded-md"
                data-testid="button-toggle-prospects"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Show fewer prospects
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    +{remainingCount} more prospects available
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
