import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Globe,
  Trophy,
  Mail,
  X,
  Star,
  MessageSquare,
  Banknote,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import type { Company, Contact } from "@shared/schema";

interface CompanyDetailCardProps {
  companyId: number;
  onClose: () => void;
  onContactView: (contactId: number) => void;
  onContactFeedback: (contactId: number, feedbackType: string) => void;
  onContactEnrich: (contactId: number) => void;
  isContactPending: (contactId: number) => boolean;
  isContactEnriched: (contact: Contact) => boolean;
  getEnrichButtonClass: (contact: Contact) => string;
  getEnrichButtonText: (contact: Contact) => string;
}

export default function CompanyDetailCard({
  companyId,
  onClose,
  onContactView,
  onContactFeedback,
  onContactEnrich,
  isContactPending,
  isContactEnriched,
  getEnrichButtonClass,
  getEnrichButtonText,
}: CompanyDetailCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // Fetch company details
  const { data: company, isLoading } = useQuery<Company & { contacts?: Contact[] }>({
    queryKey: [`/api/companies/${companyId}`],
    // Handle error through onSuccess/onError instead
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Loading company details...</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center p-4">
            <div className="animate-pulse h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!company) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Company not found</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p>Could not find company with ID {companyId}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>{company.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {company.website && (
          <CardDescription>
            <a 
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline flex items-center"
            >
              <Globe className="h-4 w-4 mr-1" />
              {company.website}
            </a>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center p-3 border rounded-md">
            <Building2 className="h-5 w-5 mr-2 text-primary" />
            <div>
              <h4 className="text-sm font-medium">Size</h4>
              <p>{company.size || "Unknown"} employees</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded-md">
            <Users className="h-5 w-5 mr-2 text-primary" />
            <div>
              <h4 className="text-sm font-medium">Contacts</h4>
              <p>{company.contacts?.length || 0} identified</p>
            </div>
          </div>
          <div className="flex items-center p-3 border rounded-md">
            <Trophy className="h-5 w-5 mr-2 text-primary" />
            <div>
              <h4 className="text-sm font-medium">Score</h4>
              <p>{company.totalScore || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {company.description && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Description</h3>
            <p className="text-muted-foreground">{company.description}</p>
          </div>
        )}

        {/* Contacts */}
        {company.contacts && company.contacts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Key Contacts</h3>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {company.contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <TooltipProvider delayDuration={500}>
                          <Tooltip>
                            <DropdownMenu>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
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
                              <p>This allows you to rate if the contact is quality or not</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="font-medium">{contact.name}</TableCell>
                      <TableCell>{contact.role || "N/A"}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            (contact.probability || 0) >= 90
                              ? "default"
                              : (contact.probability || 0) >= 70
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {contact.probability || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>{contact.email || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <TooltipProvider delayDuration={500}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onContactView(contact.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Open this contact page</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onContactEnrich(contact.id)}
                                  disabled={isContactPending(contact.id) || isContactEnriched(contact)}
                                  className={getEnrichButtonClass(contact)}
                                >
                                  <Banknote className={`w-4 h-4 ${isContactPending(contact.id) ? "animate-spin" : ""}`} />
                                  {getEnrichButtonText(contact)}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Enrich this contact with additional data</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}