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
import { Eye, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
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
                {isExpanded && (
                  <TableRow key={`${company.id}-details`} className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/80 dark:hover:bg-slate-900/80">
                    <TableCell colSpan={6} className="px-4 py-4">
                      <div className="space-y-4">
                        {/* Company description section */}
                        {company.description && (
                          <div>
                            <h4 className="text-sm font-medium mb-1">About {company.name}</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {company.description}
                            </p>
                          </div>
                        )}
                        
                        {/* Key contacts section */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Key Contacts</h4>
                          {topContacts.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                              <Table className="w-full">
                                <TableHeader>
                                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                                    <TableHead className="py-2">Name</TableHead>
                                    <TableHead className="py-2">Role</TableHead>
                                    <TableHead className="py-2">Score</TableHead>
                                    <TableHead className="py-2">Email</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {topContacts.map((contact) => (
                                    <TableRow key={contact.id} className="hover:bg-slate-100 dark:hover:bg-slate-800">
                                      <TableCell className="py-2 font-medium">{contact.name}</TableCell>
                                      <TableCell className="py-2 text-sm">{contact.role || "N/A"}</TableCell>
                                      <TableCell className="py-2">
                                        <Badge
                                          variant={(contact.probability || 0) >= 80 ? "default" : "secondary"}
                                          className="text-xs"
                                        >
                                          {contact.probability || 0}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="py-2 text-sm">
                                        {contact.email || "Not available"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                              No key contacts found for this company
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}