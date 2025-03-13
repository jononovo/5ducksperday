import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SearchApproach } from "@shared/schema";

export default function Build() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch search strategies
  const { data: strategies } = useQuery<SearchApproach[]>({
    queryKey: ["/api/search-approaches"],
  });

  // Initialize default strategies
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/search-approaches/initialize", {});
      if (!res.ok) throw new Error("Failed to initialize strategies");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-approaches"] });
      toast({
        title: "Success",
        description: "Default search strategies have been initialized.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to initialize search strategies.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search Strategies</h1>
          <p className="text-muted-foreground">
            Manage and customize your search approaches
          </p>
        </div>
        <Button onClick={() => initializeMutation.mutate()}>
          Initialize Default Strategies
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validation Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategies?.map((strategy) => (
              <TableRow key={strategy.id}>
                <TableCell className="font-medium">{strategy.name}</TableCell>
                <TableCell>{strategy.moduleType}</TableCell>
                <TableCell>
                  {strategy.active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </TableCell>
                <TableCell>
                  {strategy.sequence?.validationStrategy || "moderate"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
