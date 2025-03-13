import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon } from "lucide-react";
import type { SearchApproach } from "@shared/schema";

interface SearchStrategyProps {
  onStrategyChange: (strategyId: string) => void;
  defaultStrategy?: string;
}

export function SearchStrategies({ onStrategyChange, defaultStrategy }: SearchStrategyProps) {
  const [selectedStrategy, setSelectedStrategy] = useState(defaultStrategy);

  const { data: strategies } = useQuery<SearchApproach[]>({
    queryKey: ["/api/search-approaches"],
    select: (data: SearchApproach[]) => data
      .filter(s => s.active)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  });

  const handleStrategyChange = (value: string) => {
    setSelectedStrategy(value);
    onStrategyChange(value);
  };

  if (!strategies?.length) return null;

  return (
    <Card className="p-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">
            Search Strategy
          </label>
          <Select
            value={selectedStrategy}
            onValueChange={handleStrategyChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a search strategy" />
            </SelectTrigger>
            <SelectContent>
              {strategies.map((strategy) => (
                <SelectItem key={strategy.id} value={strategy.id.toString()}>
                  <div className="flex items-center gap-2">
                    {strategy.name}
                    {(strategy.config as any)?.validationStrategy === 'strict' && (
                      <Badge variant="secondary" className="ml-2">Strict</Badge>
                    )}
                    {strategy.moduleType === 'email_discovery' && (
                      <Badge variant="outline" className="ml-2">Enhanced</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <InfoIcon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">
                Choose different search strategies optimized for specific business types and roles.
                Each strategy uses different validation rules and search patterns.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {selectedStrategy && strategies.find(s => s.id.toString() === selectedStrategy) && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {strategies.find(s => s.id.toString() === selectedStrategy)?.prompt}
          </p>
          <div className="flex gap-2 mt-2">
            {strategies
              .find(s => s.id.toString() === selectedStrategy)
              ?.moduleType && (
                <Badge variant="outline">
                  {(strategies.find(s => s.id.toString() === selectedStrategy)?.moduleType || "").replace(/_/g, ' ')}
                </Badge>
              )}
            {strategies
              .find(s => s.id.toString() === selectedStrategy)
              ?.completedSearches?.map((search: string) => (
                <Badge key={search} variant="outline" className="text-xs">
                  {search.replace(/_/g, ' ')}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default SearchStrategies;