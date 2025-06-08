import { useState } from "react";
import { X, Settings2, HelpCircle, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface SearchSettingsDrawerProps {
  targetUrl?: string;
  setTargetUrl?: (url: string) => void;
  resultsUrl?: string;
  setResultsUrl?: (url: string) => void;
  customSelected?: boolean;
  isCustomLoading?: boolean;
  handleCustomWorkflowSearch?: () => void;
}

export default function SearchSettingsDrawer({ 
  approaches,
  targetUrl,
  setTargetUrl,
  resultsUrl,
  setResultsUrl,
  customSelected,
  isCustomLoading,
  handleCustomWorkflowSearch,

}: SearchSettingsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Settings Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="ml-2"
        aria-label="Search Settings"
      >
        <Settings2 className="h-5 w-5" />
      </Button>

      {/* Full Screen Drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl p-0 overflow-y-auto">
          <div className="h-full flex flex-col">
            <SheetHeader className="px-6 py-4 border-b sticky top-0 bg-background z-10">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-xl">Search Flow Settings</SheetTitle>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Configure search strategies and modules to customize your search experience
              </p>
            </SheetHeader>

            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-8">
                {/* Search Flow Settings Section */}
                <div>
                  <SearchFlowNew approaches={approaches} />
                </div>
                {/* External Search Configuration */}
                {setTargetUrl && setResultsUrl && handleCustomWorkflowSearch && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">External Search Configuration</h3>
                    <Separator className="mb-4" />
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <div className="flex items-center">
                          <Input
                            value={targetUrl || ""}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="Target URL"
                            className="w-full pr-8"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6">
                                  <HelpCircle className="h-4 w-4" />
                                  <span className="sr-only">Target URL Info</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Enter the URL where search requests should be sent. This endpoint should accept a JSON payload with query and callbackUrl fields.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <div className="flex items-center">
                          <Input
                            value={resultsUrl || ""}
                            onChange={(e) => setResultsUrl(e.target.value)}
                            placeholder="Results URL (optional)"
                            className="w-full pr-8"
                          />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6">
                                  <HelpCircle className="h-4 w-4" />
                                  <span className="sr-only">Results URL Info</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs">Enter the URL where search results should be sent back. This is included in the payload as callbackUrl. If left empty, the default webhook endpoint will be used.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      
                      <Button
                        variant={customSelected ? 'default' : 'outline'}
                        size="sm"
                        className="flex items-center gap-1 w-full"
                        onClick={handleCustomWorkflowSearch}
                        disabled={isCustomLoading}
                      >
                        {isCustomLoading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M12 18L12 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M4 12L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path d="M18 12L20 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <path 
                            d="M7 7L9 9M15 15L17 17M15 9L17 7M7 17L9 15" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round"/>
                          <circle 
                            cx="12" 
                            cy="12" 
                            r="4" 
                            fill={customSelected ? 'currentColor' : 'none'} 
                            stroke="currentColor" 
                            strokeWidth="1.5"/>
                        </svg>
                        Custom
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            


            <SheetFooter className="px-6 py-4 border-t sticky bottom-0 bg-background">
              <SheetClose asChild>
                <Button className="w-full sm:w-auto">
                  Close Settings
                </Button>
              </SheetClose>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}