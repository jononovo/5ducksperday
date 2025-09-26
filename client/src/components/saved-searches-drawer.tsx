import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
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
import { SplitSquareHorizontal, X } from "lucide-react";
import type { List } from "@shared/schema";
import { generateListDisplayName } from "@/lib/list-utils";

interface SavedSearchesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoadSearch: (list: List) => void;
}

export function SavedSearchesDrawer({ open, onOpenChange, onLoadSearch }: SavedSearchesDrawerProps) {
  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });
  
  const [clickedId, setClickedId] = useState<number | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed left-0 top-32 md:top-20 z-50 h-8 w-8 md:h-10 md:w-10 rounded-l-none rounded-r-lg border-l-0 border-r border-t border-b bg-background/95 backdrop-blur-sm shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-200"
        >
          <SplitSquareHorizontal className="h-4 w-4 md:h-5 md:w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96 pl-0 pr-0">
        {/* Custom mobile-only close button */}
        <SheetClose className="md:hidden absolute top-4 right-4 z-10 h-11 w-11 rounded-md border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-center">
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </SheetClose>
        
        <div className="h-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70%]">Search Name</TableHead>
                <TableHead>Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list: List) => (
                <TableRow 
                  key={list.id}
                  className={`cursor-pointer hover:bg-muted ${clickedId === list.id ? 'bg-blue-100 dark:bg-blue-900/30' : ''}`}
                  onClick={() => {
                    setClickedId(list.id);
                    onLoadSearch(list);
                  }}
                >
                  <TableCell className="font-mono text-sm">
                    {generateListDisplayName(list)}
                  </TableCell>
                  <TableCell>{list.resultCount}</TableCell>
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
  );
}