import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Flame, Star, TrendingUp } from 'lucide-react';
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';

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
      <div className="flex gap-2 p-4 bg-card rounded-lg border">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex-1 h-16 bg-muted animate-pulse rounded"
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
    <div 
      className={cn(
        "relative flex gap-2 p-4 rounded-lg border transition-all duration-500",
        allActiveDaysComplete 
          ? "bg-green-50 dark:bg-green-950/20 border-green-500 shadow-lg shadow-green-500/20" 
          : "bg-card"
      )}
      data-testid="weekly-streak-row"
    >
      {dayActivity.map((day) => {
        const date = new Date(day.date);
        const isCurrentDay = isToday(date);
        const hasReachedThreshold = day.emailsSent >= targetDailyThreshold;
        const hasSomeActivity = day.emailsSent > 0 && day.emailsSent < targetDailyThreshold;
        
        return (
          <div
            key={day.dayOfWeek}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all duration-300",
              // Base border styles
              !day.isScheduledDay && !isCurrentDay && "border-border opacity-50",
              day.isScheduledDay && !isCurrentDay && "border-primary/50",
              // Today's special styling
              isCurrentDay && !day.isScheduledDay && "border-primary border-[3px] shadow-md",
              isCurrentDay && day.isScheduledDay && "border-primary border-[3px] shadow-lg bg-primary/5",
              // Success state
              hasReachedThreshold && "bg-green-50 dark:bg-green-950/30 border-green-500",
              // Hover effect
              "hover:scale-105 cursor-default"
            )}
            data-testid={`day-cell-${day.dayOfWeek.toLowerCase()}`}
          >
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {day.dayOfWeek.slice(0, 3).toUpperCase()}
            </div>
            
            <div className="h-8 w-8 flex items-center justify-center">
              {hasReachedThreshold ? (
                <Flame 
                  className="h-6 w-6 text-orange-500 animate-pulse" 
                  data-testid={`icon-fire-${day.dayOfWeek.toLowerCase()}`}
                />
              ) : hasSomeActivity ? (
                <Star 
                  className="h-5 w-5 text-yellow-500" 
                  data-testid={`icon-star-${day.dayOfWeek.toLowerCase()}`}
                />
              ) : (
                <div 
                  className={cn(
                    "h-2 w-2 rounded-full",
                    day.isScheduledDay ? "bg-primary/30" : "bg-muted"
                  )}
                  data-testid={`icon-empty-${day.dayOfWeek.toLowerCase()}`}
                />
              )}
            </div>
            
            {day.emailsSent > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                {day.emailsSent}
              </div>
            )}
          </div>
        );
      })}
      
      {allActiveDaysComplete && (
        <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full animate-bounce">
          🎉 Week Complete!
        </div>
      )}
    </div>
  );
}