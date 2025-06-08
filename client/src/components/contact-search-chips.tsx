import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Settings2, Target, Users, Building, Crown, Check, Plus, X } from "lucide-react";
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

interface ContactSearchChipsProps {
  onConfigChange: (config: ContactSearchConfig) => void;
  disabled?: boolean;
  isSearching?: boolean;
}

export default function ContactSearchChips({ 
  onConfigChange, 
  disabled = false,
  isSearching = false
}: ContactSearchChipsProps) {
  const [isCustomInputExpanded, setIsCustomInputExpanded] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
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
        setCustomInputValue(parsed.customSearchTarget || "");
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

  const handleCustomInputSave = () => {
    const trimmedValue = customInputValue.trim();
    updateConfig({ 
      customSearchTarget: trimmedValue,
      enableCustomSearch: trimmedValue ? config.enableCustomSearch : false
    });
    // Always close the input after saving, whether empty or not
    setIsCustomInputExpanded(false);
    // If empty, reset the input value
    if (!trimmedValue) {
      setCustomInputValue("");
    }
  };

  const handleCustomInputExpand = () => {
    setIsCustomInputExpanded(true);
    setCustomInputValue(config.customSearchTarget);
  };

  const toggleCustomSearch = () => {
    if (config.customSearchTarget.trim()) {
      updateConfig({ enableCustomSearch: !config.enableCustomSearch });
    } else {
      setIsCustomInputExpanded(true);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {/* Core Leadership Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateConfig({ enableCoreLeadership: !config.enableCoreLeadership })}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200
                ${config.enableCoreLeadership 
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableCoreLeadership && <Check className="h-3 w-3" />}
              <Crown className="h-3 w-3" />
              <span className="text-sm font-medium">Core Leadership</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>CEO, CTO, Founders, C-level executives</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Department Heads Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateConfig({ enableDepartmentHeads: !config.enableDepartmentHeads })}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200
                ${config.enableDepartmentHeads 
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableDepartmentHeads && <Check className="h-3 w-3" />}
              <Building className="h-3 w-3" />
              <span className="text-sm font-medium">Department Heads</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Sales, Marketing, IT, Finance department leaders</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Middle Management Chip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => updateConfig({ enableMiddleManagement: !config.enableMiddleManagement })}
              disabled={disabled}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200
                ${config.enableMiddleManagement 
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {config.enableMiddleManagement && <Check className="h-3 w-3" />}
              <Users className="h-3 w-3" />
              <span className="text-sm font-medium">Middle Management</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Team leads, senior managers, project managers</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Custom Search Chip */}
      {!isCustomInputExpanded && !config.customSearchTarget.trim() && (
        <button
          onClick={handleCustomInputExpand}
          disabled={disabled}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-full border border-dashed border-purple-300 
            text-purple-600 hover:bg-purple-50 transition-all duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Plus className="h-3 w-3" />
          <span className="text-sm font-medium">Custom Role</span>
        </button>
      )}

      {/* Custom Input Expanded */}
      {isCustomInputExpanded && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-purple-300 bg-purple-50">
          <Target className="h-3 w-3 text-purple-600" />
          <Input
            value={customInputValue}
            onChange={(e) => setCustomInputValue(e.target.value)}
            placeholder="e.g., Marketing Manager"
            disabled={disabled}
            className="h-6 text-sm border-none bg-transparent p-0 focus:ring-0 focus:outline-none min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomInputSave();
              }
              if (e.key === 'Escape') {
                setIsCustomInputExpanded(false);
                setCustomInputValue(config.customSearchTarget);
              }
            }}
            onBlur={() => {
              // Auto-save when clicking outside the input
              handleCustomInputSave();
            }}
            autoFocus
          />
          <button
            onClick={handleCustomInputSave}
            disabled={disabled}
            className="text-purple-600 hover:text-purple-700"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Saved Custom Search Chip */}
      {config.customSearchTarget.trim() && !isCustomInputExpanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCustomSearch}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200
                  ${config.enableCustomSearch 
                    ? 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {config.enableCustomSearch && <Check className="h-3 w-3" />}
                <Target className="h-3 w-3" />
                <span className="text-sm font-medium">{config.customSearchTarget}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomInputExpand();
                  }}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Boost scores for {config.customSearchTarget} roles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}