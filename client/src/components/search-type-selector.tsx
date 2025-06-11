import React, { useState } from "react";
import { Building2, Users, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SearchType = "companies" | "contacts" | "emails";

export interface SearchTypeConfig {
  type: SearchType;
  label: string;
  icons: React.ReactNode[];
  estimatedTime: string;
}

interface SearchTypeSelectorProps {
  selectedType: SearchType;
  onTypeChange: (type: SearchType) => void;
  disabled?: boolean;
}

const searchTypeConfigs: SearchTypeConfig[] = [
  {
    type: "companies",
    label: "Only Companies",
    icons: [<Building2 key="company" className="h-4 w-4" />],
    estimatedTime: "~7 secs"
  },
  {
    type: "contacts",
    label: "+ Contacts",
    icons: [
      <Building2 key="company" className="h-4 w-4" />,
      <Users key="contacts" className="h-4 w-4" />
    ],
    estimatedTime: "~28 secs"
  },
  {
    type: "emails",
    label: "+ Emails",
    icons: [
      <Building2 key="company" className="h-4 w-4" />,
      <Users key="contacts" className="h-4 w-4" />,
      <Mail key="emails" className="h-4 w-4" />
    ],
    estimatedTime: "~45 secs"
  }
];

export function SearchTypeSelector({ selectedType, onTypeChange, disabled = false }: SearchTypeSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedConfig = searchTypeConfigs.find(config => config.type === selectedType) || searchTypeConfigs[2];

  const handleTypeSelect = (type: SearchType) => {
    onTypeChange(type);
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Search Type Icons in Input Field */}
      <div 
        className={`flex items-center gap-1 px-2 py-1 cursor-pointer hover:bg-gray-50 rounded transition-colors ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        onClick={() => !disabled && setIsModalOpen(true)}
      >
        {selectedConfig.icons.map((icon, index) => (
          <div key={index} className="text-gray-400">
            {icon}
          </div>
        ))}
      </div>

      {/* Search Type Selection Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Your Search Type</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {searchTypeConfigs.map((config) => (
              <div
                key={config.type}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${
                  selectedType === config.type 
                    ? 'border-blue-300 bg-blue-50' 
                    : 'border-gray-200'
                }`}
                onClick={() => handleTypeSelect(config.type)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {config.icons.map((icon, index) => (
                      <div key={index} className={`${
                        selectedType === config.type ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {icon}
                      </div>
                    ))}
                  </div>
                  <span className={`font-medium ${
                    selectedType === config.type ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    {config.label}
                  </span>
                </div>
                <span className="text-xs text-gray-500 font-mono">
                  {config.estimatedTime}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SearchTypeSelector;