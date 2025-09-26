import { useQuery } from "@tanstack/react-query";
import { Flame } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
}

export function StreakIndicator() {
  // Fetch streak stats
  const { data: stats, isLoading } = useQuery<StreakStats>({
    queryKey: ['/api/daily-outreach/streak-stats'],
    refetchInterval: 60000 // Refresh every minute
  });

  const streak = stats?.currentStreak || 0;

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1">
        <Flame className="h-4 w-4 animate-pulse text-gray-400" />
        <span className="text-sm font-medium text-muted-foreground">--</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/streak">
            <div className="flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-md transition-all">
              <div className="relative">
                <Flame 
                  className={cn(
                    "h-4 w-4",
                    streak >= 7 ? "text-orange-500" : 
                    streak >= 3 ? "text-yellow-500" : 
                    streak >= 1 ? "text-yellow-400" : 
                    "text-gray-400"
                  )}
                  style={{
                    filter: streak >= 3 ? 'drop-shadow(0 0 3px rgba(251, 146, 60, 0.5))' : undefined
                  }}
                />
              </div>
              <span className={cn(
                "text-sm font-medium",
                streak > 0 ? "text-foreground" : "text-muted-foreground"
              )}>
                {streak}
              </span>
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Streak: Number of consecutive days you were active on scheduled days.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}