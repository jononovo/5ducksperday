import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Flame, Star, TrendingUp, Pencil, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfWeek, addDays, isToday, isSameDay, subWeeks, addWeeks } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingScheduleDays, setPendingScheduleDays] = useState<string[]>([]);
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = previous week
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoRevertTimer = useRef<NodeJS.Timeout | null>(null);

  // Fetch weekly activity data
  const { data: activityData, isLoading } = useQuery<WeeklyActivityData>({
    queryKey: ['/api/daily-outreach/weekly-activity', { weekOffset }],
    refetchInterval: isEditMode || weekOffset !== 0 ? false : 60000, // Don't auto-refresh in edit mode or when viewing past weeks
    placeholderData: keepPreviousData, // Show old data while loading new data
    staleTime: 30000 // Cache for 30 seconds
  });


  // Auto-revert to current week after 10 seconds
  useEffect(() => {
    if (weekOffset !== 0) {
      // Clear any existing timer
      if (autoRevertTimer.current) {
        clearTimeout(autoRevertTimer.current);
      }
      
      // Set new timer
      autoRevertTimer.current = setTimeout(() => {
        handleWeekNavigation(0);
      }, 10000);
      
      return () => {
        if (autoRevertTimer.current) {
          clearTimeout(autoRevertTimer.current);
        }
      };
    } else {
      // Clear timer when back to current week
      if (autoRevertTimer.current) {
        clearTimeout(autoRevertTimer.current);
        autoRevertTimer.current = null;
      }
    }
  }, [weekOffset]);

  // Save preferences mutation
  const savePreferences = useMutation({
    mutationFn: async (scheduleDays: string[]) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', {
        scheduleDays,
        minContactsRequired: 5
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Schedule updated',
        description: 'Your active days have been saved'
      });
      setIsEditMode(false);
      // Refresh the query to get updated data
      queryClient.invalidateQueries({ queryKey: ['/api/daily-outreach/weekly-activity'] });
    },
    onError: () => {
      toast({
        title: 'Failed to update schedule',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  });

  const handleEditToggle = () => {
    if (!isEditMode) {
      // Entering edit mode
      if (weekOffset !== 0) {
        setWeekOffset(0);
      }
      setIsEditMode(true);
      // Initialize pending schedule days from current data
      if (activityData) {
        setPendingScheduleDays(activityData.scheduleDays.map(day => day.toLowerCase()));
      }
    } else {
      // Save changes
      savePreferences.mutate(pendingScheduleDays);
    }
  };

  const handleWeekNavigation = (newOffset: number) => {
    if (isTransitioning || isEditMode) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setWeekOffset(newOffset);
      setIsTransitioning(false);
    }, 150);
  };

  const handleDayToggle = (dayOfWeek: string) => {
    const dayKey = dayOfWeek.toLowerCase();
    
    setPendingScheduleDays(prev => {
      const newDays = prev.includes(dayKey)
        ? prev.filter(d => d !== dayKey)
        : [...prev, dayKey];
      
      return newDays;
    });
  };

  if (isLoading || !activityData) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8" />
        <div className="flex gap-1.5 flex-1">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex-1 h-8 bg-muted animate-pulse rounded"
            />
          ))}
        </div>
        <div className="h-8 w-8" />
      </div>
    );
  }

  const { dayActivity, targetDailyThreshold } = activityData;
  
  // Check if all active days have reached threshold
  const allActiveDaysComplete = dayActivity
    .filter(day => day.isScheduledDay)
    .every(day => day.emailsSent >= targetDailyThreshold);

  // Get week date range for display
  const getWeekLabel = () => {
    if (weekOffset === 0) return '';
    if (weekOffset === -1) return 'Last week';
    const weekStart = startOfWeek(addWeeks(new Date(), weekOffset));
    const weekEnd = addDays(weekStart, 6);
    return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`;
  };


  return (
    <TooltipProvider>
      <div className="space-y-2">
        {/* Edit mode instruction message */}
        {isEditMode && (
          <div className="text-sm text-muted-foreground px-1">
            Select the days you are active. Then click save.
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Left Chevron Button */}
          {!isEditMode && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 transition-all",
                    weekOffset === -1 && "opacity-50 cursor-not-allowed",
                    isTransitioning && "opacity-30"
                  )}
                  onClick={() => weekOffset === 0 ? handleWeekNavigation(-1) : handleWeekNavigation(0)}
                  disabled={isTransitioning || weekOffset === -1}
                  data-testid="week-nav-left"
                >
                  {weekOffset === 0 ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{weekOffset === 0 ? 'View last week' : 'Back to current week'}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {/* Days row with slide animation */}
          <div 
            className={cn(
              "relative flex gap-1.5 flex-1 transition-all duration-300",
              allActiveDaysComplete && !isEditMode
                ? "bg-green-50 dark:bg-green-950/20 rounded-lg p-1" 
                : "",
              weekOffset !== 0 && !isEditMode && "ring-1 ring-amber-400/30 bg-amber-50/10 dark:bg-amber-950/10 rounded-lg",
              isTransitioning && "opacity-0 transform translate-x-4",
              !isTransitioning && "opacity-100 transform translate-x-0"
            )}
            data-testid="weekly-streak-row"
          >
            {/* Floating week indicator badge */}
            {weekOffset !== 0 && !isEditMode && (
              <div 
                className="absolute -top-4 -left-8 z-10 pointer-events-none animate-in fade-in duration-300"
                data-testid="badge-week-label"
              >
                <span className="inline-block rounded-full bg-amber-500/60 dark:bg-amber-600/60 backdrop-blur-sm text-white text-[10px] sm:text-xs px-2 py-0.5 shadow-sm font-medium">
                  {getWeekLabel()}
                </span>
              </div>
            )}
            {dayActivity.map((day) => {
              const date = new Date(day.date);
              const isCurrentDay = weekOffset === 0 && isToday(date);
              const hasReachedThreshold = day.emailsSent >= targetDailyThreshold;
              const hasSomeActivity = day.emailsSent > 0 && day.emailsSent < targetDailyThreshold;
              const isActiveIncomplete = day.isScheduledDay && !hasReachedThreshold;
              const dayKey = day.dayOfWeek.toLowerCase();
              const isChecked = pendingScheduleDays.includes(dayKey);
              
              // Determine tooltip content
              let tooltipContent = '';
              if (isEditMode) {
                tooltipContent = isChecked ? 'Click to mark as inactive' : 'Click to mark as active';
              } else if (isCurrentDay && day.isScheduledDay) {
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
                        "flex-1 flex items-center px-3 py-1.5 rounded-md border-2 transition-all duration-300 relative",
                        // Edit mode styles
                        isEditMode && "cursor-pointer hover:bg-accent",
                        isEditMode && isChecked && "bg-primary/10 border-primary",
                        isEditMode && !isChecked && "border-border opacity-60",
                        // Normal mode styles
                        !isEditMode && !day.isScheduledDay && !isCurrentDay && "border-border opacity-50",
                        !isEditMode && day.isScheduledDay && !isCurrentDay && "border-primary/50",
                        // Today's special styling with proper gradient
                        !isEditMode && isCurrentDay && "bg-gradient-to-br from-yellow-400/10 to-pink-500/10 border-transparent",
                        // Success state
                        !isEditMode && hasReachedThreshold && !isCurrentDay && "bg-green-50 dark:bg-green-950/30 border-green-500",
                        !isEditMode && hasReachedThreshold && isCurrentDay && "bg-green-50 dark:bg-green-950/30 border-transparent",
                        // Hover effect
                        !isEditMode && "hover:scale-105 cursor-default"
                      )}
                      style={{
                        ...(!isEditMode && isCurrentDay && {
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
                      onClick={isEditMode ? () => handleDayToggle(day.dayOfWeek) : undefined}
                      data-testid={`day-cell-${day.dayOfWeek.toLowerCase()}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="text-[11px] font-medium text-muted-foreground">
                          <span className="hidden sm:inline">{day.dayOfWeek.slice(0, 3).toUpperCase()}</span>
                          <span className="sm:hidden">{day.dayOfWeek[0].toUpperCase()}</span>
                        </div>
                        
                        {isEditMode ? (
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleDayToggle(day.dayOfWeek)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 sm:h-5 sm:w-5"
                            data-testid={`checkbox-${day.dayOfWeek.toLowerCase()}`}
                          />
                        ) : (
                          <>
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
                          </>
                        )}
                      </div>
                      
                      {!isEditMode && day.emailsSent > 0 && (
                        <div className="text-[10px] text-muted-foreground ml-auto">
                          {day.emailsSent}
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{tooltipContent}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            
            {!isEditMode && allActiveDaysComplete && (
              <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-bounce">
                🎉 Complete!
              </div>
            )}
          </div>
          
          {/* Edit/Save Button or Right Chevron */}
          {weekOffset === 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant={isEditMode ? "default" : "ghost"}
                  className="h-8 w-8 transition-all"
                  onClick={handleEditToggle}
                  disabled={savePreferences.isPending}
                  data-testid="edit-save-button"
                >
                  {isEditMode ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isEditMode ? 'Save changes' : 'Edit schedule'}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    "h-8 w-8 transition-all",
                    isTransitioning && "opacity-30"
                  )}
                  onClick={() => handleWeekNavigation(0)}
                  disabled={isTransitioning}
                  data-testid="week-nav-right"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Back to current week</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}