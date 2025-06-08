import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Settings2, Target, Users, Building, Crown, Check, Plus, X, Save, Edit2 } from "lucide-react";
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
  enableCustomSearch2: boolean;
  customSearchTarget2: string;
}

interface ContactSearchChipsProps {
  onConfigChange: (config: ContactSearchConfig) => void;
  disabled?: boolean;
  isSearching?: boolean;
  hasSearchResults?: boolean;
  inputHasChanged?: boolean;
}

function ContactSearchChips({ 
  onConfigChange, 
  disabled = false,
  isSearching = false,
  hasSearchResults = false,
  inputHasChanged = false
}: ContactSearchChipsProps) {
  const [isCustomInputExpanded, setIsCustomInputExpanded] = useState(false);
  const [isCustomInput2Expanded, setIsCustomInput2Expanded] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [customInput2Value, setCustomInput2Value] = useState("");
  const [originalCustomTarget, setOriginalCustomTarget] = useState("");
  const [config, setConfig] = useState<ContactSearchConfig>({
    enableCoreLeadership: true,
    enableDepartmentHeads: true,
    enableMiddleManagement: true,
    enableCustomSearch: false,
    customSearchTarget: "",
    enableCustomSearch2: false,
    customSearchTarget2: ""
  });

  // Load saved config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('contactSearchConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // Ensure all properties exist for backward compatibility
        const fullConfig = {
          enableCoreLeadership: true,
          enableDepartmentHeads: true,
          enableMiddleManagement: true,
          enableCustomSearch: false,
          customSearchTarget: "",
          enableCustomSearch2: false,
          customSearchTarget2: "",
          ...parsed
        };
        setConfig(fullConfig);
        setCustomInputValue(fullConfig.customSearchTarget || "");
        setCustomInput2Value(fullConfig.customSearchTarget2 || "");
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
      if (config.enableCustomSearch && !config.enableCustomSearch2) {
        // Disable current custom search
        updateConfig({ enableCustomSearch: false });
      } else {
        // Enable this custom search, disable the other
        updateConfig({ 
          enableCustomSearch: true,
          enableCustomSearch2: false
        });
      }
    } else {
      setIsCustomInputExpanded(true);
    }
  };

  const handleCustomInput2Save = () => {
    const trimmedValue = customInput2Value.trim();
    updateConfig({ 
      customSearchTarget2: trimmedValue,
      enableCustomSearch2: trimmedValue ? config.enableCustomSearch2 : false
    });
    // Always close the input after saving, whether empty or not
    setIsCustomInput2Expanded(false);
    // If empty, reset the input value
    if (!trimmedValue) {
      setCustomInput2Value("");
    }
  };

  const handleCustomInput2Expand = () => {
    // First, save and close the first input if it's expanded
    if (isCustomInputExpanded) {
      handleCustomInputSave();
    }
    setIsCustomInput2Expanded(true);
    setCustomInput2Value(config.customSearchTarget2);
  };

  const toggleCustomSearch2 = () => {
    if (config.customSearchTarget2.trim()) {
      if (config.enableCustomSearch2) {
        // Disable current custom search
        updateConfig({ enableCustomSearch2: false });
      } else {
        // Enable this custom search, disable the other
        // Don't overwrite saved values - just toggle the enable flags
        updateConfig({ 
          enableCustomSearch: false,
          enableCustomSearch2: true
        });
      }
    } else {
      setIsCustomInput2Expanded(true);
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
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                ${config.enableCoreLeadership 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                ${config.enableDepartmentHeads 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
                flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                ${config.enableMiddleManagement 
                  ? (hasSearchResults && !inputHasChanged)
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
            flex items-center justify-center px-3 py-2 rounded-full border border-dashed border-gray-300 
            text-gray-600 hover:bg-gray-50 transition-all duration-200 min-w-[40px]
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Plus className="h-4 w-4" />
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
              // If input is empty, close the edit mode and revert to previous state
              if (!customInputValue.trim()) {
                setIsCustomInputExpanded(false);
                setCustomInputValue(config.customSearchTarget);
              }
            }}
            autoFocus
          />
          <button
            onClick={handleCustomInputSave}
            disabled={disabled}
            className="text-purple-600 hover:text-purple-700"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              updateConfig({ 
                customSearchTarget: "",
                enableCustomSearch: false
              });
              setIsCustomInputExpanded(false);
              setCustomInputValue("");
            }}
            disabled={disabled}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
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
                  flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                  ${config.enableCustomSearch 
                    ? (hasSearchResults && !inputHasChanged)
                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {config.enableCustomSearch && <Check className="h-3 w-3" />}
                <Target className="h-3 w-3" />
                <span className="text-sm font-medium">{config.customSearchTarget}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomInputExpand();
                  }}
                  className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomInputExpand();
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Boost scores for {config.customSearchTarget} roles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Second Custom Search Chip - Empty State */}
      {!isCustomInput2Expanded && !config.customSearchTarget2.trim() && config.customSearchTarget.trim() && (
        <button
          onClick={handleCustomInput2Expand}
          disabled={disabled}
          className={`
            flex items-center justify-center px-3 py-2 rounded-full border border-dashed border-gray-300 
            text-gray-600 hover:bg-gray-50 transition-all duration-200 min-w-[40px]
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {/* Second Custom Input Expanded */}
      {isCustomInput2Expanded && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-full border border-purple-300 bg-purple-50">
          <input
            type="text"
            value={customInput2Value}
            onChange={(e) => setCustomInput2Value(e.target.value)}
            placeholder="e.g., Sales Director"
            disabled={disabled}
            className="h-6 text-sm border-none bg-transparent p-0 focus:ring-0 focus:outline-none min-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomInput2Save();
              }
              if (e.key === 'Escape') {
                setIsCustomInput2Expanded(false);
                setCustomInput2Value(config.customSearchTarget2);
              }
            }}
            onBlur={() => {
              // If input is empty, close the edit mode and revert to previous state
              if (!customInput2Value.trim()) {
                setIsCustomInput2Expanded(false);
                setCustomInput2Value(config.customSearchTarget2);
              }
            }}
            autoFocus
          />
          <button
            onClick={handleCustomInput2Save}
            disabled={disabled}
            className="text-purple-600 hover:text-purple-700"
          >
            <Save className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              updateConfig({ 
                customSearchTarget2: "",
                enableCustomSearch2: false
              });
              setIsCustomInput2Expanded(false);
              setCustomInput2Value("");
            }}
            disabled={disabled}
            className="text-red-500 hover:text-red-700"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Saved Second Custom Search Chip */}
      {config.customSearchTarget2.trim() && !isCustomInput2Expanded && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleCustomSearch2}
                disabled={disabled}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-200
                  ${config.enableCustomSearch2 
                    ? (hasSearchResults && !inputHasChanged)
                      ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {config.enableCustomSearch2 && <Check className="h-3 w-3" />}
                <Target className="h-3 w-3" />
                <span className="text-sm font-medium">{config.customSearchTarget2}</span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCustomInput2Expand();
                  }}
                  className="ml-1 text-gray-400 hover:text-gray-600 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCustomInput2Expand();
                    }
                  }}
                >
                  <Edit2 className="h-3 w-3" />
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Boost scores for {config.customSearchTarget2} roles</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

export default React.memo(ContactSearchChips);