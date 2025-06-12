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
import { ListChecks } from "lucide-react";
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed left-0 top-32 z-50 h-12 w-12 rounded-l-none rounded-r-lg border-l-0 border-r border-t border-b bg-background/95 backdrop-blur-sm shadow-md hover:bg-accent hover:text-accent-foreground transition-all duration-200"
        >
          <ListChecks className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-96 pl-0 pr-0">
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
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => onLoadSearch(list)}
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