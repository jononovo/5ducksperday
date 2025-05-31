import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Settings, Target, Users, Building, Crown, ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ContactSearchConfig {
  enableCoreLeadership: boolean;
  enableDepartmentHeads: boolean;
  enableMiddleManagement: boolean;
  enableCustomSearch: boolean;
  customSearchTarget: string;
}

interface ContactSearchOptimizerProps {
  onConfigChange: (config: ContactSearchConfig) => void;
  disabled?: boolean;
  isSearching?: boolean;
}

export default function ContactSearchOptimizer({ 
  onConfigChange, 
  disabled = false,
  isSearching = false
}: ContactSearchOptimizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState<ContactSearchConfig>({
    enableCoreLeadership: true,
    enableDepartmentHeads: true,
    enableMiddleManagement: true,
    enableCustomSearch: false,
    customSearchTarget: ""
  });

  // Load saved config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('contactSearchConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Error loading saved contact search config:', error);
      }
    }
  }, []);

  // Save config to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem('contactSearchConfig', JSON.stringify(config));
    onConfigChange(config);
  }, [config, onConfigChange]);

  const updateConfig = (updates: Partial<ContactSearchConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSelectAll = () => {
    const allSelected = config.enableCoreLeadership && config.enableDepartmentHeads && config.enableMiddleManagement;
    updateConfig({
      enableCoreLeadership: !allSelected,
      enableDepartmentHeads: !allSelected,
      enableMiddleManagement: !allSelected
    });
  };

  const getSelectedCount = () => {
    let count = 0;
    if (config.enableCoreLeadership) count++;
    if (config.enableDepartmentHeads) count++;
    if (config.enableMiddleManagement) count++;
    if (config.enableCustomSearch && config.customSearchTarget.trim()) count++;
    return count;
  };

  const getEstimatedTime = () => {
    const selectedCount = getSelectedCount();
    if (selectedCount === 0) return "0s";
    return `${selectedCount * 3-5}s`;
  };

  return (
    <Card className="w-full border-gray-200 bg-gray-50/50">
      <CardContent className="p-3">
        {/* Header with toggle */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-gray-100/50 -m-1 p-1 rounded"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-sm text-gray-700">
              Contact Discovery Options
            </span>
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
              {getSelectedCount()} active • ~{getEstimatedTime()}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            {/* Quick actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={disabled}
                className="text-xs h-7"
              >
                {config.enableCoreLeadership && config.enableDepartmentHeads && config.enableMiddleManagement 
                  ? "Deselect All" : "Select All"}
              </Button>
              <span className="text-xs text-gray-500">
                More searches = better coverage, longer time
              </span>
            </div>

            {/* Search type checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Core Leadership */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-start space-x-2 p-2 border rounded hover:bg-white transition-colors">
                      <Checkbox
                        id="coreLeadership"
                        checked={config.enableCoreLeadership}
                        onCheckedChange={(checked) => 
                          updateConfig({ enableCoreLeadership: checked as boolean })
                        }
                        disabled={disabled}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <div className="flex items-center gap-1">
                          <Crown className="h-3 w-3 text-amber-600" />
                          <Label 
                            htmlFor="coreLeadership" 
                            className="text-xs font-medium cursor-pointer"
                          >
                            Core Leadership
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          CEO, CTO, Founders
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>C-level executives, founders, board members, and directors</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Department Heads */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-start space-x-2 p-2 border rounded hover:bg-white transition-colors">
                      <Checkbox
                        id="departmentHeads"
                        checked={config.enableDepartmentHeads}
                        onCheckedChange={(checked) => 
                          updateConfig({ enableDepartmentHeads: checked as boolean })
                        }
                        disabled={disabled}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <div className="flex items-center gap-1">
                          <Building className="h-3 w-3 text-blue-600" />
                          <Label 
                            htmlFor="departmentHeads" 
                            className="text-xs font-medium cursor-pointer"
                          >
                            Department Heads
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          Sales, Marketing, IT
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Leaders of key departments like Sales, Marketing, Engineering, Finance</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Middle Management */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-start space-x-2 p-2 border rounded hover:bg-white transition-colors">
                      <Checkbox
                        id="middleManagement"
                        checked={config.enableMiddleManagement}
                        onCheckedChange={(checked) => 
                          updateConfig({ enableMiddleManagement: checked as boolean })
                        }
                        disabled={disabled}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-green-600" />
                          <Label 
                            htmlFor="middleManagement" 
                            className="text-xs font-medium cursor-pointer"
                          >
                            Middle Management
                          </Label>
                        </div>
                        <p className="text-xs text-gray-500">
                          Team leads, Managers
                        </p>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Team leads, senior managers, project managers, and key technical staff</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Custom search target */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="customSearch"
                  checked={config.enableCustomSearch}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableCustomSearch: checked as boolean })
                  }
                  disabled={disabled}
                />
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-purple-600" />
                  <Label 
                    htmlFor="customSearch" 
                    className="text-xs font-medium cursor-pointer"
                  >
                    Custom Target Role
                  </Label>
                </div>
              </div>
              
              {config.enableCustomSearch && (
                <Input
                  placeholder="e.g., Procurement Manager, IT Director, Head of Sales"
                  value={config.customSearchTarget}
                  onChange={(e) => updateConfig({ customSearchTarget: e.target.value })}
                  disabled={disabled}
                  className="text-xs h-8"
                />
              )}
              
              <p className="text-xs text-gray-500">
                Search for specific roles not covered by the standard categories
              </p>
            </div>

            {/* Status indicator during search */}
            {isSearching && (
              <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border-l-2 border-blue-300">
                Running {getSelectedCount()} contact discovery searches...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}