import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Flame, Star, TrendingUp } from 'lucide-react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface WeeklyActivityData {
  dayActivity: {
    date: string;
    dayOfWeek: string;
    emailsSent: number;
    isScheduledDay: boolean;
  }[];
  scheduleDays: string[];
  targetDailyThreshold: number;
}

export function WeeklyStreakRow() {
  // Fetch weekly activity data
  const { data: activityData, isLoading } = useQuery<WeeklyActivityData>({
    queryKey: ['/api/daily-outreach/weekly-activity'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !activityData) {
    return (
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-8 bg-muted animate-pulse rounded"
          />
        ))}
      </div>
    );
  }

  const { dayActivity, targetDailyThreshold } = activityData;
  
  // Check if all active days have reached threshold
  const allActiveDaysComplete = dayActivity
    .filter(day => day.isScheduledDay)
    .every(day => day.emailsSent >= targetDailyThreshold);

  return (
    <TooltipProvider>
      <div 
        className={cn(
          "relative flex gap-1.5 transition-all duration-500",
          allActiveDaysComplete 
            ? "bg-green-50 dark:bg-green-950/20 rounded-lg p-1" 
            : ""
        )}
        data-testid="weekly-streak-row"
      >
      {dayActivity.map((day) => {
        const date = new Date(day.date);
        const isCurrentDay = isToday(date);
        const hasReachedThreshold = day.emailsSent >= targetDailyThreshold;
        const hasSomeActivity = day.emailsSent > 0 && day.emailsSent < targetDailyThreshold;
        const isActiveIncomplete = day.isScheduledDay && !hasReachedThreshold;
        
        // Determine tooltip content
        let tooltipContent = '';
        if (isCurrentDay && day.isScheduledDay) {
          tooltipContent = 'Today is Active';
        } else if (day.isScheduledDay) {
          tooltipContent = 'Marked as Active';
        } else {
          tooltipContent = 'Marked as Inactive';
        }
        
        return (
          <Tooltip key={day.dayOfWeek}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex-1 flex items-center justify-between px-3 py-1.5 rounded-md border-2 transition-all duration-300 relative",
                  // Base border styles
                  !day.isScheduledDay && !isCurrentDay && "border-border opacity-50",
                  day.isScheduledDay && !isCurrentDay && "border-primary/50",
                  // Today's special styling with proper gradient
                  isCurrentDay && "bg-gradient-to-br from-yellow-400/10 to-pink-500/10 border-transparent",
                  // Success state
                  hasReachedThreshold && !isCurrentDay && "bg-green-50 dark:bg-green-950/30 border-green-500",
                  hasReachedThreshold && isCurrentDay && "bg-green-50 dark:bg-green-950/30 border-transparent",
                  // Hover effect
                  "hover:scale-105 cursor-default"
                )}
                style={{
                  ...(isCurrentDay && {
                    background: hasReachedThreshold 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)' 
                      : day.isScheduledDay 
                        ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)' 
                        : undefined,
                    boxShadow: hasReachedThreshold
                      ? 'inset 0 0 0 3px rgb(34 197 94)'
                      : 'inset 0 0 0 3px transparent, 0 0 0 3px transparent, inset 0 0 0 3px transparent',
                    backgroundImage: !hasReachedThreshold 
                      ? 'linear-gradient(white, white), linear-gradient(135deg, #fbbf24 0%, #ec4899 100%)'
                      : undefined,
                    backgroundOrigin: !hasReachedThreshold ? 'border-box' : undefined,
                    backgroundClip: !hasReachedThreshold ? 'padding-box, border-box' : undefined,
                    border: isCurrentDay && !hasReachedThreshold ? '3px solid transparent' : undefined,
                  })
                }}
                data-testid={`day-cell-${day.dayOfWeek.toLowerCase()}`}
              >
                <div className="text-[11px] font-medium text-muted-foreground">
                  {day.dayOfWeek.slice(0, 3).toUpperCase()}
                </div>
                
                <div className="flex items-center gap-1">
                  {day.emailsSent > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      {day.emailsSent}
                    </div>
                  )}
                  {hasReachedThreshold ? (
                    <Flame 
                      className="h-4 w-4 text-orange-500 animate-pulse" 
                      data-testid={`icon-fire-${day.dayOfWeek.toLowerCase()}`}
                    />
                  ) : hasSomeActivity ? (
                    <Star 
                      className="h-3.5 w-3.5 text-yellow-500" 
                      data-testid={`icon-star-${day.dayOfWeek.toLowerCase()}`}
                    />
                  ) : isActiveIncomplete ? (
                    <span className="text-sm" data-testid={`icon-egg-${day.dayOfWeek.toLowerCase()}`}>🥚</span>
                  ) : (
                    <div 
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        day.isScheduledDay ? "bg-primary/30" : "bg-muted"
                      )}
                      data-testid={`icon-empty-${day.dayOfWeek.toLowerCase()}`}
                    />
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
        
        {allActiveDaysComplete && (
          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
            🎉 Complete!
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}