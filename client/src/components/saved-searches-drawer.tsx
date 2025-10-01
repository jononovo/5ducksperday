import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { PanelLeft, Plus } from "lucide-react";
import type { List } from "@shared/schema";
import { generateListDisplayName } from "@/lib/list-utils";

interface SavedSearchesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSearch: (list: List) => void;
  onNewSearch: () => void;
}

export function SavedSearchesDrawer({ open, onOpenChange, onLoadSearch, onNewSearch }: SavedSearchesDrawerProps) {
  const { data: lists = [] } = useQuery<List[]>({
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
          
          <Table>
            <TableHeader>
              <TableRow className="border-t-0">
                <TableHead className="w-[70%]">Search Name</TableHead>
                <TableHead className="text-right">Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list: List) => (
                <TableRow 
                  key={list.id}
                  className={`cursor-pointer hover:bg-muted border-0 ${clickedId === list.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  onClick={() => {
                    setClickedId(list.id);
                    onLoadSearch(list);
                  }}
                >
                  <TableCell className="text-sm font-medium text-gray-500 py-2">
                    {generateListDisplayName(list)}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium text-gray-700 py-2">{list.resultCount}</TableCell>
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