import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ListChecks, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { List } from "@shared/schema";

export default function Lists() {
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const { data: lists = [] } = useQuery<List[]>({
    queryKey: ["/api/lists"],
  });
  const [, navigate] = useLocation();

  const handleCheckboxChange = (listId: number) => {
    setSelectedLists(prev => {
      if (prev.includes(listId)) {
        return prev.filter(id => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="w-5 h-5" />
              Company Lists
            </CardTitle>
            <Button
              variant="outline"
              disabled={selectedLists.length === 0}
              onClick={() => navigate(`/campaigns/new?lists=${selectedLists.join(',')}`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add to Campaign
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={selectedLists.length === lists.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedLists(lists.map(list => list.listId));
                      } else {
                        setSelectedLists([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>List ID</TableHead>
                <TableHead className="w-[50%]">Search Prompt</TableHead>
                <TableHead>Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lists.map((list) => (
                <TableRow 
                  key={list.id}
                  className="cursor-pointer hover:bg-muted"
                >
                  <TableCell>
                    <Checkbox 
                      checked={selectedLists.includes(list.listId)}
                      onCheckedChange={() => handleCheckboxChange(list.listId)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>
                  <TableCell onClick={() => navigate(`/lists/${list.listId}`)}>{list.listId}</TableCell>
                  <TableCell onClick={() => navigate(`/lists/${list.listId}`)}>{list.prompt}</TableCell>
                  <TableCell onClick={() => navigate(`/lists/${list.listId}`)}>{list.resultCount}</TableCell>
                </TableRow>
              ))}
              {lists.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No saved lists yet. Save a search to create a new list.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}