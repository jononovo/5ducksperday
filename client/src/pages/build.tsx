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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, Search, Mail, Users, ArrowRight } from "lucide-react";
import { StrategyPerformanceChart } from "@/components/strategy-performance-chart";

interface TestResult {
  id: string;
  strategyName: string;
  strategyId: number;
  testQuery: string;
  timestamp: string;
  companyQuality: number;
  contactQuality: number;
  emailQuality: number;
  overallScore: number;
  status: "completed" | "running" | "failed";
}

export default function Build() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [testQuery, setTestQuery] = useState<string>("");
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);

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

  const generateScores = () => {
    // Function to generate a weighted score between 30-100 with a normal-ish distribution
    const generateScore = (strategyId: number, category: string) => {
      // Base random component
      const random = Math.random();
      
      // Create a weighted curve that favors mid-range scores (60-80)
      let baseScore = 40 + (random * 60);
      
      // Add strategy-specific adjustment (±15 points)
      const strategyFactor = ((strategyId * 13) % 31) / 31 * 30 - 15;
      
      // Add category-specific adjustment (±10 points)
      const categoryIndex = ['companyQuality', 'contactQuality', 'emailQuality'].indexOf(category);
      const categoryFactor = ((categoryIndex + 1) * 7 % 21) / 21 * 20 - 10;
      
      // Combine all factors and ensure within range
      let score = baseScore + strategyFactor + categoryFactor;
      return Math.min(Math.max(Math.round(score), 30), 100);
    };

    return {
      companyQuality: generateScore(parseInt(selectedStrategy), 'companyQuality'),
      contactQuality: generateScore(parseInt(selectedStrategy), 'contactQuality'),
      emailQuality: generateScore(parseInt(selectedStrategy), 'emailQuality')
    };
  };

  const runSearchTest = async () => {
    if (!testQuery || !selectedStrategy || isRunningTest) return;
    
    setIsRunningTest(true);
    
    // Show toast notification
    toast({
      title: "Starting search quality test",
      description: `Testing strategy for: "${testQuery}"`,
    });
    
    try {
      // Create a running test result entry
      const runningTest: TestResult = {
        id: `test-${Date.now()}`,
        strategyName: strategies?.find(s => s.id.toString() === selectedStrategy)?.name || 'Unknown Strategy',
        strategyId: parseInt(selectedStrategy),
        testQuery,
        timestamp: new Date().toISOString(),
        companyQuality: 0,
        contactQuality: 0,
        emailQuality: 0,
        overallScore: 0,
        status: "running"
      };
      
      setTestResults(prev => [runningTest, ...prev]);
      
      // Call the API to start the test
      const response = await apiRequest("POST", "/api/search-test", {
        strategyId: parseInt(selectedStrategy),
        query: testQuery
      });
      
      if (!response.ok) {
        throw new Error("API call failed");
      }
      
      // Parse the API response
      const data = await response.json();
      console.log('Search test API response:', data);
      
      // Extract scores from API response
      const scores = {
        companyQuality: data.metrics.companyQuality,
        contactQuality: data.metrics.contactQuality,
        emailQuality: data.metrics.emailQuality
      };
      
      // Use overall score returned from API or calculate it
      const overallScore = data.overallScore || 
        Math.round((scores.companyQuality + scores.contactQuality + scores.emailQuality) / 3);
      
      // Update the test result
      setTestResults(prev => prev.map(result => 
        result.id === runningTest.id 
          ? {
              ...result,
              ...scores,
              overallScore,
              status: "completed" 
            }
          : result
      ));
      
      toast({
        title: "Test completed",
        description: `Overall quality score: ${overallScore}/100`,
      });
    } catch (error) {
      toast({
        title: "Test failed",
        description: "There was an error running the search quality test.",
        variant: "destructive"
      });
      
      setTestResults(prev => prev.map(result => 
        result.id === `test-${Date.now()}` 
          ? { ...result, status: "failed" }
          : result
      ));
    } finally {
      setIsRunningTest(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Search Testing & Benchmarking</h1>
          <p className="text-muted-foreground">
            Evaluate and compare search strategy performance
          </p>
        </div>
        <Button onClick={() => initializeMutation.mutate()}>
          Initialize Default Strategies
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Test Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle>Run Search Quality Test</CardTitle>
            <CardDescription>
              Test a search strategy against quality metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Test Query</label>
                <Input
                  placeholder="e.g., law firms in chicago"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Search Strategy</label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies?.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id.toString()}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={runSearchTest} 
                  disabled={!testQuery || !selectedStrategy || isRunningTest}
                  className="w-full md:w-auto"
                >
                  {isRunningTest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Running Test
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Search Quality Benchmark Results</CardTitle>
            <CardDescription>
              Performance metrics for search strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Test Query</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <BarChart3 className="mr-1 h-4 w-4" />
                        Company Quality
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Users className="mr-1 h-4 w-4" />
                        Contact Quality
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <Mail className="mr-1 h-4 w-4" />
                        Email Quality
                      </div>
                    </TableHead>
                    <TableHead>Overall Score</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                        No test results yet. Run a test to see results here.
                      </TableCell>
                    </TableRow>
                  ) : (
                    testResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.strategyName}</TableCell>
                        <TableCell>{result.testQuery}</TableCell>
                        <TableCell>
                          {result.status === "running" ? (
                            <Progress value={undefined} className="h-2 w-16" />
                          ) : (
                            <div className="flex items-center">
                              <span className={getScoreColor(result.companyQuality)}>
                                {result.companyQuality}
                              </span>
                              <span className="text-muted-foreground">/100</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === "running" ? (
                            <Progress value={undefined} className="h-2 w-16" />
                          ) : (
                            <div className="flex items-center">
                              <span className={getScoreColor(result.contactQuality)}>
                                {result.contactQuality}
                              </span>
                              <span className="text-muted-foreground">/100</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === "running" ? (
                            <Progress value={undefined} className="h-2 w-16" />
                          ) : (
                            <div className="flex items-center">
                              <span className={getScoreColor(result.emailQuality)}>
                                {result.emailQuality}
                              </span>
                              <span className="text-muted-foreground">/100</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === "running" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Badge variant={getScoreBadgeVariant(result.overallScore)}>
                              {result.overallScore}/100
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === "running" ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600">Running</Badge>
                          ) : result.status === "completed" ? (
                            <Badge variant="outline" className="bg-green-50 text-green-600">Completed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-600">Failed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Strategy Performance History Chart */}
        <StrategyPerformanceChart 
          strategyId={selectedStrategy || null}
          name={strategies?.find(s => s.id.toString() === selectedStrategy)?.name}
        />
      </div>
    </div>
  );
}