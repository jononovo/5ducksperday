import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmailSearchSummaryProps {
  companiesWithEmails: number;
  totalCompanies: number;
  onClose: () => void;
  isVisible: boolean;
}

export function EmailSearchSummary({
  companiesWithEmails,
  totalCompanies,
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
    <Card className="mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Email Search Results
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => {
          setShow(false);
          onClose();
        }}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <p>Found emails for {companiesWithEmails} of {totalCompanies} companies</p>
          <p className="text-muted-foreground mt-1">
            {companiesWithEmails >= 5 
              ? "Target achieved! At least 5 companies have email addresses."
              : "Some companies still need email addresses."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}