import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface SearchTestResult {
  id: number;
  testId: string;
  strategyId: number;
  strategyName: string;
  query: string;
  companyQuality: number;
  contactQuality: number;
  emailQuality: number;
  overallScore: number;
  status: 'completed' | 'running' | 'failed';
  createdAt: string;
}

interface SearchTestResultsProps {
  strategyId: string | null;
  limit?: number;
}

// Local storage key for caching results
const LOCAL_STORAGE_KEY = "searchTestResults";
const STRATEGY_RESULTS_KEY = (id: string) => `searchTestResults_strategy_${id}`;

export function SearchTestResults({ strategyId, limit = 5 }: SearchTestResultsProps) {
  const { toast } = useToast();
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [localResults, setLocalResults] = useState<SearchTestResult[]>([]);
  
  // Load from local storage on component mount
  useEffect(() => {
    const storageKey = strategyId 
      ? STRATEGY_RESULTS_KEY(strategyId)
      : LOCAL_STORAGE_KEY;
    
    try {
      const savedResults = localStorage.getItem(storageKey);
      if (savedResults) {
        console.log(`Loading cached test results from localStorage (${storageKey})`);
        setLocalResults(JSON.parse(savedResults));
      }
    } catch (err) {
      console.error("Error loading test results from localStorage:", err);
    }
  }, [strategyId]);
  
  const { data, isLoading, error } = useQuery<SearchTestResult[]>({
    queryKey: strategyId 
      ? ["/api/search-test-results/strategy", strategyId] 
      : ["/api/search-test-results"],
    enabled: true,
    retry: false,
  });
  
  // Save data to localStorage when it changes
  useEffect(() => {
    if (data && data.length > 0) {
      // Save to local storage when we get new data
      const storageKey = strategyId 
        ? STRATEGY_RESULTS_KEY(strategyId)
        : LOCAL_STORAGE_KEY;
      
      try {
        console.log(`Saving ${data.length} test results to localStorage (${storageKey})`);
        localStorage.setItem(storageKey, JSON.stringify(data));
        setLocalResults(data);
      } catch (err) {
        console.error("Error saving test results to localStorage:", err);
      }
    }
  }, [data, strategyId]);
  
  // Handle query errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Could not load test results",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Get quality score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      case 'running':
        return <Badge variant="outline">Running</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Display loading skeleton - only show if we don't have local results to display
  if (isLoading && localResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we have an error but we have local results, use those instead
  // Otherwise, show error state
  if ((error || !data) && localResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Search Test Results</CardTitle>
          <CardDescription>
            No test results available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-6">
            Run search tests to see quality metrics
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine which results to display
  // Prefer API data over local storage, but fallback to local storage when API fails
  const resultsToUse = (data && data.length > 0) ? data : localResults;
  
  // Take the most recent 'limit' results
  const results = resultsToUse.length > 0 ? [...resultsToUse].slice(-limit) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Search Test Results
          {strategyId && results.length > 0 && ` for ${results[0].strategyName}`}
        </CardTitle>
        <CardDescription>
          Quality metrics from recent search tests
        </CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">
            No test results found. Run a test to see quality metrics.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-center">Company</TableHead>
                  <TableHead className="text-center">Contact</TableHead>
                  <TableHead className="text-center">Email</TableHead>
                  <TableHead className="text-center">Overall</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id} onClick={() => setSelectedTestId(result.testId)}>
                    <TableCell className="font-medium">
                      {formatDate(result.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {result.query}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getScoreColor(result.companyQuality)}`}>
                        {result.companyQuality}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getScoreColor(result.contactQuality)}`}>
                        {result.contactQuality}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getScoreColor(result.emailQuality)}`}>
                        {result.emailQuality}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${getScoreColor(result.overallScore)}`}>
                        {result.overallScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SearchTestResults;