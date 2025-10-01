import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Users, Building2, Clock, TrendingUp } from "lucide-react";

interface MainSearchSummaryProps {
  query: string;
  totalCompanies: number;
  totalContacts: number;
  searchDuration: number;
  isVisible: boolean;
  onClose: () => void;
  companies: any[];
}

export function MainSearchSummary({
  query,
  totalCompanies,
  totalContacts,
  searchDuration,
  isVisible,
  onClose,
  companies
}: MainSearchSummaryProps) {
  console.log("MainSearchSummary rendering:", { isVisible, totalCompanies, totalContacts, searchDuration });
  
  if (!isVisible) return null;

  // Calculate metrics from real data
  const averageContactsPerCompany = totalCompanies > 0 ? (totalContacts / totalCompanies).toFixed(1) : "0";
  const companiesWithContacts = companies.filter(company => company.contacts && company.contacts.length > 0).length;
  const successRate = totalCompanies > 0 ? Math.round((companiesWithContacts / totalCompanies) * 100) : 0;
  
  // Find top company by contact count
  const topCompany = companies.reduce((max, company) => {
    const contactCount = company.contacts ? company.contacts.length : 0;
    const maxContactCount = max.contacts ? max.contacts.length : 0;
    return contactCount > maxContactCount ? company : max;
  }, { name: "N/A", contacts: [] });

  // Count contact types from real data
  const contactTypes = companies.reduce((acc, company) => {
    if (!company.contacts) return acc;
    
    company.contacts.forEach((contact: any) => {
      const role = contact.role?.toLowerCase() || "";
      if (role.includes("ceo") || role.includes("cto") || role.includes("cfo") || role.includes("founder") || role.includes("president")) {
        acc.cLevel++;
      } else if (role.includes("manager") || role.includes("director") || role.includes("head") || role.includes("lead")) {
        acc.management++;
      } else {
        acc.staff++;
      }
    });
    
    return acc;
  }, { cLevel: 0, management: 0, staff: 0 });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Search Summary</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Companies Found:</span>
              <span className="text-sm font-bold text-blue-600">{totalCompanies}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Contacts Discovered:</span>
              <span className="text-sm font-bold text-green-600">{totalContacts}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Success Rate:</span>
              <span className="text-sm font-bold text-purple-600">{successRate}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Search Duration:</span>
              <span className="text-sm font-bold text-orange-600">{formatDuration(searchDuration)}</span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="text-xs text-gray-600">
              <span className="font-medium">Query:</span> {query}
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Avg Contacts/Company:</span> {averageContactsPerCompany}
            </div>
            {topCompany.name !== "N/A" && (
              <div className="text-xs text-gray-600">
                <span className="font-medium">Top Company:</span> {topCompany.name} ({topCompany.contacts?.length || 0} contacts)
              </div>
            )}
            <div className="text-xs text-gray-600">
              <span className="font-medium">Contact Types:</span> C-level: {contactTypes.cLevel}, Management: {contactTypes.management}, Staff: {contactTypes.staff}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}