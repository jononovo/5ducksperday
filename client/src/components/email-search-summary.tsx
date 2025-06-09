import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SourceBreakdown {
  Perplexity: number;
  Apollo: number;
  Hunter: number;
}

interface EmailSearchSummaryProps {
  companiesWithEmails: number;
  totalCompanies: number;
  totalEmailsFound: number;
  sourceBreakdown?: SourceBreakdown;
  onClose: () => void;
  isVisible: boolean;
}

export function EmailSearchSummary({
  companiesWithEmails,
  totalCompanies,
  totalEmailsFound,
  sourceBreakdown,
  onClose,
  isVisible
}: EmailSearchSummaryProps) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setShow(true);
    }
  }, [isVisible]);
  
  if (!show) return null;
  
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-md mb-2 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <p>Found {totalEmailsFound} emails for {companiesWithEmails} of {totalCompanies} companies</p>
          <p className="text-muted-foreground text-xs mt-0.5">
            {companiesWithEmails >= 5 
              ? "Target achieved! At least 5 companies have email addresses."
              : "Some companies still need email addresses."}
          </p>
          {sourceBreakdown && (
            <p className="text-muted-foreground text-xs mt-0.5">
              Perplexity: {sourceBreakdown.Perplexity} Apollo: {sourceBreakdown.Apollo} Hunter: {sourceBreakdown.Hunter}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
          setShow(false);
          onClose();
        }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}