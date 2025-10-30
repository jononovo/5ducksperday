import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PanelLeft, Plus, Users, Send, Zap } from "lucide-react";
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

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <SheetPrimitive.Portal>
        {/* Custom lighter overlay */}
        <SheetPrimitive.Overlay 
          className="fixed inset-0 z-50 bg-black/20 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        {/* Custom sheet content */}
        <SheetPrimitive.Content
          className="fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm w-[80%] max-w-[384px] pl-0 pr-0 sm:max-w-[384px] !top-[52px] !h-[calc(100vh-52px)] !rounded-tr-2xl"
          onMouseLeave={() => {
            // Auto-close drawer when mouse leaves (desktop only)
            if (window.innerWidth >= 640) {
              onOpenChange(false);
            }
          }}
        >
        <div className="h-full overflow-auto">
          {/* New Search Button */}
          <div className="px-3 pt-2 pb-2">
            <button
              onClick={() => {
                onNewSearch();
                onOpenChange(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:-translate-y-0.5 hover:bg-blue-50 transition-all duration-200 group"
            >
              <Plus className="h-6 w-6 text-blue-500" strokeWidth={3} />
              <span className="text-sm font-medium text-gray-700">New Search</span>
            </button>
          </div>
          
          {/* Streak Link */}
          <div className="px-3 pb-2">
            <Link href="/streak">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <Zap className="h-5 w-5 text-gray-500 group-hover:text-yellow-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Streak</span>
              </button>
            </Link>
          </div>
          
          {/* Campaigns Link */}
          <div className="px-3 pb-2">
            <Link href="/campaigns">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <Send className="h-5 w-5 text-gray-500 group-hover:text-green-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Campaigns</span>
              </button>
            </Link>
          </div>
          
          {/* Contacts Link */}
          <div className="px-3 pb-3">
            <Link href="/contacts">
              <button
                onClick={() => onOpenChange(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg hover:shadow-md hover:bg-gray-100 hover:-translate-y-0.5 transition-all duration-200 group"
              >
                <Users className="h-5 w-5 text-gray-500 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Contacts</span>
              </button>
            </Link>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="border-t-0">
                <TableHead className="pr-2">Search Name</TableHead>
                <TableHead className="text-right w-14">Results</TableHead>
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
                  <TableCell className="text-sm font-medium text-gray-500 py-3 pr-2">
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
                  <TableCell className="text-right text-sm font-medium text-gray-700 py-3 pr-3">{list.resultCount}</TableCell>
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
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}