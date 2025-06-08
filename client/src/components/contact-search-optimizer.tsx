import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Settings2, Target, Users, Building, Crown, ChevronDown, ChevronUp, Zap } from "lucide-react";
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
    <Card className="w-full border-slate-200 bg-white shadow-sm">
      <CardContent className="p-4">
        {/* Header with toggle */}
        <div 
          className="flex items-center justify-between cursor-pointer hover:bg-slate-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-slate-600" />
              <span className="font-medium text-sm text-slate-900">
                Contact Search
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {getSelectedCount()} active
            </Badge>
            <span className="text-xs text-slate-500">
              ~{getEstimatedTime()}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="mt-4 space-y-4">
            {/* Standard search options */}
            <div className="space-y-3">
              {/* Core Leadership */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">Core Leadership</div>
                    <div className="text-xs text-slate-500">CEO, CTO, Founders</div>
                  </div>
                </div>
                <Switch
                  checked={config.enableCoreLeadership}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableCoreLeadership: checked })
                  }
                  disabled={disabled}
                />
              </div>

              {/* Department Heads */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">Department Heads</div>
                    <div className="text-xs text-slate-500">Sales, Marketing, IT</div>
                  </div>
                </div>
                <Switch
                  checked={config.enableDepartmentHeads}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableDepartmentHeads: checked })
                  }
                  disabled={disabled}
                />
              </div>

              {/* Middle Management */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-green-500" />
                  <div>
                    <div className="font-medium text-sm text-slate-900">Middle Management</div>
                    <div className="text-xs text-slate-500">Team leads, Managers</div>
                  </div>
                </div>
                <Switch
                  checked={config.enableMiddleManagement}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableMiddleManagement: checked })
                  }
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Custom search target */}
            <div className="p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-500" />
                  <span className="font-medium text-sm text-slate-900">Custom Role Search</span>
                </div>
                <Switch
                  checked={config.enableCustomSearch}
                  onCheckedChange={(checked) => 
                    updateConfig({ enableCustomSearch: checked })
                  }
                  disabled={disabled}
                />
              </div>
              
              {config.enableCustomSearch && (
                <div className="space-y-2">
                  <Input
                    placeholder="e.g., Marketing Manager, Chief Security Officer, Legal Director"
                    value={config.customSearchTarget}
                    onChange={(e) => updateConfig({ customSearchTarget: e.target.value })}
                    disabled={disabled}
                    className="text-sm border-slate-300 focus:border-purple-500"
                  />
                  <p className="text-xs text-slate-500">
                    Boost scores for specific roles not covered above
                  </p>
                </div>
              )}
              
              {!config.enableCustomSearch && (
                <p className="text-xs text-slate-500">
                  Target specific roles for priority scoring
                </p>
              )}
            </div>

            {/* Status indicator during search */}
            {isSearching && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <Zap className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="text-sm text-blue-700 font-medium">
                  Running {getSelectedCount()} discovery searches...
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}