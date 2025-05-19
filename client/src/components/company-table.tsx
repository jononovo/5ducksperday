import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Eye, 
  ChevronDown, 
  ChevronRight, 
  ExternalLink, 
  Mail, 
  Gem,
  Target,
  Rocket,
  Star,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Company, Contact } from "@shared/schema";
import { ContactWithCompanyInfo } from "@/lib/results-analysis/prospect-filtering";

interface CompanyTableProps {
  companies: Array<Company & { contacts?: ContactWithCompanyInfo[] }>;
  handleCompanyView: (companyId: number) => void;
}

export default function CompanyTable({ companies, handleCompanyView }: CompanyTableProps) {
  console.log('CompanyTable received companies:', 
    companies.map(c => ({ id: c.id, name: c.name }))
  );
  
  // State to track which company rows are expanded
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  
  // Toggle expansion state for a company row
  const toggleRowExpansion = (companyId: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(companyId)) {
        newSet.delete(companyId);
      } else {
        newSet.add(companyId);
      }
      return newSet;
    });
  };
  
  // Check if a company row is expanded
  const isRowExpanded = (companyId: number) => expandedRows.has(companyId);
  
  // Get top contacts for a company (up to 3)
  const getTopContacts = (company: Company & { contacts?: ContactWithCompanyInfo[] }) => {
    if (!company.contacts || company.contacts.length === 0) {
      return [];
    }
    
    // Sort by probability descending and take the top 3
    return [...company.contacts]
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 3);
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Company Name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            console.log('Rendering company row:', { id: company.id, name: company.name });
            const isExpanded = isRowExpanded(company.id);
            const topContacts = getTopContacts(company);
            
            return (
              <>
                {/* Main company row - always visible */}
                <TableRow 
                  key={company.id} 
                  className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                  onClick={() => toggleRowExpansion(company.id)}
                >
                  <TableCell className="px-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{company.name}</TableCell>
                  <TableCell>
                    {company.website ? (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {company.contacts?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={company.totalScore && company.totalScore > 70 ? "default" : "secondary"}>
                      {company.totalScore ?? 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Company view button clicked:', { id: company.id, name: company.name });
                        handleCompanyView(company.id);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                
                {/* Expanded details row - only visible when expanded */}
                {isExpanded && topContacts.map((contact) => (
                  <TableRow 
                    key={`${company.id}-contact-${contact.id}`} 
                    className="bg-slate-50/50 dark:bg-slate-800/50 border-t-0"
                  >
                    <TableCell className="w-10 pl-2">
                      <div className="pl-8">
                        <input 
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300"
                          aria-label={`Select ${contact.name}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{contact.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{contact.role || "N/A"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={(contact.probability || 0) >= 80 ? "default" : "secondary"}
                      >
                        {contact.probability || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{contact.email || "Not available"}</span>
                    </TableCell>
                    <TableCell>
                      <div className="hidden md:flex gap-2">
                        <TooltipProvider delayDuration={500}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View contact</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Find email</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Gem className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>AeroLeads search</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Target className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Hunter.io search</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}