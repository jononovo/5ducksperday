import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface PerformanceData {
  dates: string[];
  scores: number[];
}

interface StrategyPerformanceChartProps {
  strategyId: string | null;
  name?: string;
}

export function StrategyPerformanceChart({ strategyId, name }: StrategyPerformanceChartProps) {
  const { toast } = useToast();
  const [chartData, setChartData] = useState<any[]>([]);

  // Skip the query if no strategyId is provided
  const { data, isLoading, error } = useQuery<PerformanceData>({
    queryKey: ["/api/search-test-results/strategy", strategyId, "performance"],
    enabled: !!strategyId,
    retry: false,
    onError: () => {
      toast({
        title: "Error",
        description: "Could not load performance data for this strategy",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (data?.dates && data?.scores) {
      // Format data for the chart
      const formattedData = data.dates.map((date, index) => ({
        date: new Date(date).toLocaleDateString(),
        score: data.scores[index],
      }));

      // Take only the last 10 data points if there are more
      const displayData = formattedData.slice(-10);
      setChartData(displayData);
    }
  }, [data]);

  // Get color based on score
  const getBarColor = (score: number) => {
    if (score >= 80) return "#22c55e"; // green
    if (score >= 60) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  if (!strategyId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Strategy Performance History</CardTitle>
          <CardDescription>
            Select a strategy to see its historical performance
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            No strategy selected
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="h-64">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !chartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance History: {name || `Strategy #${strategyId}`}</CardTitle>
          <CardDescription>
            No performance data available for this strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground text-center">
            Run tests with this strategy to collect performance data
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance History: {name || `Strategy #${strategyId}`}</CardTitle>
        <CardDescription>
          Historical overall quality scores from search tests
        </CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="date" 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fontSize: 12 }}
              tickCount={6}
              label={{ 
                value: 'Score',
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              formatter={(value) => [`${value}/100`, 'Quality Score']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="score" name="Quality Score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default StrategyPerformanceChart;