import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, Users, Send } from "lucide-react";
import type { SearchList } from "@shared/schema";
import { generateListPromptOnly } from "@/lib/list-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SavedSearchesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSearch: (list: SearchList) => void;
  onNewSearch: () => void;
}

export function SavedSearchesDrawer({ open, onOpenChange, onLoadSearch, onNewSearch }: SavedSearchesDrawerProps) {
  const { data: lists = [] } = useQuery<SearchList[]>({
    queryKey: ["/api/lists"],
  });
  
  const [clickedId, setClickedId] = useState<number | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (
    <>
      {/* Invisible hover zone for desktop - opens drawer on hover with delay */}
      <div 
        className="hidden min-[700px]:block fixed left-0 top-0 h-full w-[2%] z-40"
        onMouseEnter={() => {
          // Only open on wider viewports (700px+) after 500ms delay
          if (window.innerWidth >= 700) {
            hoverTimeoutRef.current = setTimeout(() => {
              onOpenChange(true);
            }, 500);
          }
        }}
        onMouseLeave={() => {
          // Clear timeout if mouse leaves before drawer opens
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
        }}
      />
      
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed left-0 top-32 md:top-20 z-50 h-8 w-8 md:h-10 md:w-10 rounded-l-none rounded-r-lg border-l-0 border-r border-t border-b bg-background/95 backdrop-blur-sm shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 [&_svg]:!size-3 md:[&_svg]:!size-5"
        >
          <PanelLeft className="text-gray-400" />
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-96 pl-0 pr-0"
        onMouseLeave={() => {
          // Auto-close drawer when mouse leaves
          onOpenChange(false);
        }}
      >
        <div className="h-full overflow-auto">
          {/* New Search Button */}
          <div className="px-3 pt-2 pb-3">
            <button
              onClick={() => {
                onNewSearch();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:shadow-lg hover:-translate-y-0.5 hover:bg-blue-50/50 transition-all duration-200 group"
            >
              <Plus className="h-6 w-6 text-blue-500" strokeWidth={3} />
              <span className="text-sm font-medium text-gray-700">New Search</span>
            </button>
          </div>
          
          {/* Campaigns Link */}
          <div className="px-3 pb-3">
            <Link href="/streak">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 transition-all duration-200 group"
              >
                <Send className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Campaigns</span>
              </button>
            </Link>
          </div>
          
          {/* Contacts Link */}
          <div className="px-3 pb-3">
            <Link href="/contacts">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 transition-all duration-200 group"
              >
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Contacts</span>
              </button>
            </Link>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-t-0">
                <TableHead className="w-[70%]">Search Name</TableHead>
                <TableHead className="text-right">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list: SearchList) => (
                <TableRow 
                  key={list.id}
                  className={`cursor-pointer hover:bg-muted border-0 ${clickedId === list.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  onClick={() => {
                    setClickedId(list.id);
                    onLoadSearch(list);
                  }}
                >
                  <TableCell className="text-sm font-medium text-gray-500 py-3">
                    <TooltipProvider delayDuration={1500}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-pointer">{generateListPromptOnly(list)}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Search ID: {list.listId}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-gray-700 py-3 pr-6">{list.resultCount}</TableCell>
                </TableRow>
              ))}
              {lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    No saved searches yet. Complete a search to create your first saved search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}