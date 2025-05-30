import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContactDiscoveryReportProps {
  companiesWithContacts: number;
  totalCompanies: number;
  totalContacts: number;
  onClose: () => void;
  isVisible: boolean;
}

export function ContactDiscoveryReport({
  companiesWithContacts,
  totalCompanies,
  totalContacts,
  onClose,
  isVisible
}: ContactDiscoveryReportProps) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    if (isVisible) {
      setShow(true);
    }
  }, [isVisible]);
  
  if (!show) return null;

  // Calculate coverage percentage
  const coveragePercentage = totalCompanies > 0 ? (companiesWithContacts / totalCompanies) * 100 : 0;
  
  // Determine success message based on coverage
  const getSuccessMessage = () => {
    if (coveragePercentage === 100) {
      return "Excellent! All companies have contacts.";
    } else if (coveragePercentage >= 80) {
      return "Great coverage! Most companies have contacts.";
    } else if (coveragePercentage >= 60) {
      return "Good results! Some companies still need contacts.";
    } else {
      return "Partial results. Additional search may help.";
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-900 border rounded-md mb-2 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Contact Discovery Results
        </h3>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => {
          setShow(false);
          onClose();
        }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-sm mt-1">
        <p>Found {totalContacts} contacts for {companiesWithContacts} of {totalCompanies} companies</p>
        <p className="text-muted-foreground text-xs mt-0.5">
          {getSuccessMessage()}
        </p>
      </div>
    </div>
  );
}