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

  const { data: strategies } = useQuery({
    queryKey: ["/api/search-approaches"],
    select: (data: SearchApproach[]) => data.filter(s => s.active),
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
                    {strategy.moduleType === "company_overview" && (
                      <Badge variant="secondary" className="ml-2">Default</Badge>
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
                Choose different search strategies to compare their effectiveness.
                Each strategy may use different algorithms and validation rules.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {selectedStrategy && strategies.find(s => s.id.toString() === selectedStrategy) && (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">
            {strategies.find(s => s.id.toString() === selectedStrategy)?.description}
          </p>
          <div className="flex gap-2 mt-2">
            {strategies
              .find(s => s.id.toString() === selectedStrategy)
              ?.completedSearches?.map((search) => (
                <Badge key={search} variant="outline">
                  {search}
                </Badge>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default SearchStrategies;