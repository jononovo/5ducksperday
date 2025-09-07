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
}

export default function SearchSettingsDrawer({}: SearchSettingsDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Settings Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="opacity-40 hover:opacity-60 text-gray-400 hover:text-gray-500"
        aria-label="Search Settings"
      >
        <Settings2 className="h-4 w-4" />
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
                <div>
                  <h3 className="text-lg font-medium mb-4">Search Settings</h3>
                  <Separator className="mb-4" />
                  
                  <p className="text-sm text-muted-foreground">
                    Search configuration options will be available here in a future update.
                  </p>
                </div>
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