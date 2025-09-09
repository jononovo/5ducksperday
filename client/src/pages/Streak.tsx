import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { CalendarIcon, Mail, Zap, Building2, Users, TrendingUp, Pause, Play, ExternalLink, RefreshCw, Target, Flame, Sparkles, Rocket, Package, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { ProductOnboardingForm } from '@/components/product-onboarding-form';

interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  weeklyProgress: number;
  availableCompanies: number;
  availableContacts: number;
  emailsSentToday: number;
  emailsSentThisWeek: number;
  emailsSentThisMonth: number;
  emailsSentAllTime: number;
  companiesContactedThisWeek: number;
  companiesContactedThisMonth: number;
  companiesContactedAllTime: number;
  todaysBatch?: {
    id: number;
    token: string;
    createdAt: string;
    itemCount: number;
  };
}

interface VacationSettings {
  isOnVacation: boolean;
  vacationStartDate?: string;
  vacationEndDate?: string;
}

interface OutreachPreferences {
  enabled: boolean;
  scheduleDays?: string[];
  scheduleTime?: string;
  timezone?: string;
  minContactsRequired?: number;
  vacationMode?: boolean;
  vacationStartDate?: string | null;
  vacationEndDate?: string | null;
  activeProductId?: number;
}

interface Product {
  id: number;
  userId: number;
  title: string;
  productService: string;
  customerFeedback?: string;
  website?: string;
  businessType: 'product' | 'service';
  status: string;
  createdAt?: string;
}

export default function StreakPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [daysPerWeek, setDaysPerWeek] = useState<number[]>([3]);
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationDates, setVacationDates] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Fetch streak stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<StreakStats>({
    queryKey: ['/api/daily-outreach/streak-stats'],
    enabled: !!user,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch user's products
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !!user
  });

  // Fetch current preferences
  const { data: preferences, refetch: refetchPreferences } = useQuery<OutreachPreferences>({
    queryKey: ['/api/daily-outreach/preferences'],
    enabled: !!user
  });

  // Update preferences mutation
  const updatePreferences = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Settings updated',
        description: 'Your outreach preferences have been saved'
      });
      refetchPreferences();
      refetchStats();
    }
  });

  // Update vacation mode
  const updateVacationMode = useMutation({
    mutationFn: async (data: VacationSettings) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/vacation', data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: vacationMode ? 'Vacation mode activated' : 'Back from vacation',
        description: vacationMode ? 'Daily emails paused' : 'Daily emails resumed'
      });
      refetchPreferences();
    }
  });

  // Trigger manual email
  const triggerEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-outreach/trigger');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: 'Email sent!',
          description: 'Check your inbox for today\'s prospects'
        });
        refetchStats();
      } else {
        toast({
          title: 'No contacts available',
          description: data.message || 'Add more contacts first',
          variant: 'destructive'
        });
      }
    }
  });

  // Set active product mutation
  const setActiveProduct = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', {
        activeProductId: productId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Product selected',
        description: 'Your active product has been updated'
      });
      refetchPreferences();
    }
  });

  useEffect(() => {
    if (preferences) {
      // Set days per week based on schedule days length
      const scheduleDays = preferences.scheduleDays || ['monday', 'tuesday', 'wednesday'];
      setDaysPerWeek([scheduleDays.length]);
      
      // Set vacation mode
      if (preferences.vacationMode) {
        setVacationMode(true);
        if (preferences.vacationStartDate && preferences.vacationEndDate) {
          setVacationDates({
            from: new Date(preferences.vacationStartDate),
            to: new Date(preferences.vacationEndDate)
          });
        }
      }
      
      // Set active product
      if (preferences.activeProductId) {
        setSelectedProductId(preferences.activeProductId);
      } else if (products && products.length > 0 && !selectedProductId) {
        // Default to first product if none selected
        setSelectedProductId(products[0].id);
      }
    }
  }, [preferences, products]);

  const handleProductChange = (productId: number) => {
    setSelectedProductId(productId);
    setActiveProduct.mutate(productId);
  };

  const handleDaysPerWeekChange = (value: number[]) => {
    setDaysPerWeek(value);
    // Map number of days to specific days
    const dayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const selectedDays = dayOptions.slice(0, value[0]);
    
    updatePreferences.mutate({
      scheduleDays: selectedDays,
      minContactsRequired: 5
    });
  };

  const handleVacationToggle = () => {
    const newVacationMode = !vacationMode;
    setVacationMode(newVacationMode);
    
    if (newVacationMode && vacationDates.from && vacationDates.to) {
      updateVacationMode.mutate({
        isOnVacation: true,
        vacationStartDate: format(vacationDates.from, 'yyyy-MM-dd'),
        vacationEndDate: format(vacationDates.to, 'yyyy-MM-dd')
      });
    } else if (!newVacationMode) {
      updateVacationMode.mutate({
        isOnVacation: false
      });
    }
  };

  const openTodaysEmail = () => {
    if (stats?.todaysBatch?.token) {
      window.open(`/outreach/daily/${stats.todaysBatch.token}`, '_blank');
    }
  };

  const getStreakEmoji = () => {
    const streak = stats?.currentStreak || 0;
    if (streak >= 30) return '🔥🔥🔥';
    if (streak >= 14) return '🔥🔥';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '';
  };

  const getProgressColor = () => {
    const progress = stats?.weeklyProgress || 0;
    const goal = stats?.weeklyGoal || daysPerWeek[0];
    const percentage = (progress / goal) * 100;
    
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Please log in to view your streak dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header with Streak Counter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              Your Sales Streak {getStreakEmoji()}
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your outreach progress and maintain your momentum
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{stats?.currentStreak || 0}</div>
            <div className="text-sm text-muted-foreground">day streak</div>
          </div>
        </div>

        {/* Weekly Progress Bar */}
        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Weekly Goal Progress</span>
              <span className={cn("text-sm font-bold", getProgressColor())}>
                {stats?.weeklyProgress || 0} / {stats?.weeklyGoal || daysPerWeek[0]} days
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${Math.min(((stats?.weeklyProgress || 0) / (stats?.weeklyGoal || daysPerWeek[0])) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activation CTA */}
      {preferences && !preferences.enabled && (
        <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Activate Your Daily Sales Companion</h2>
                </div>
                <p className="text-muted-foreground">
                  Get 5 personalized prospects delivered to your inbox every day.
                  Takes just 2 minutes to set up.
                </p>
              </div>
              <Button 
                size="lg" 
                className="min-w-[200px]"
                onClick={() => setShowOnboarding(true)}
              >
                <Rocket className="h-5 w-5 mr-2" />
                Start Daily Outreach
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Today's Prospects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.todaysBatch ? (
              <div className="space-y-3">
                <div className="text-2xl font-bold">{stats.todaysBatch.itemCount} ready</div>
                <Button 
                  onClick={openTodaysEmail} 
                  size="sm" 
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Review & Send
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">No batch today</div>
                <Button 
                  onClick={() => triggerEmail.mutate()} 
                  size="sm" 
                  className="w-full"
                  variant="outline"
                  disabled={triggerEmail.isPending}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", triggerEmail.isPending && "animate-spin")} />
                  Generate Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Available Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Companies</span>
                <span className="font-bold">{stats?.availableCompanies || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contacts</span>
                <span className="font-bold">{stats?.availableContacts || 0}</span>
              </div>
              {(stats?.availableContacts || 0) < 20 && (
                <p className="text-xs text-yellow-600 mt-2">
                  Running low! Add more contacts
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Outreach Schedule
            </CardTitle>
            <CardDescription>
              Configure how often you want to receive daily prospects
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Days per week</Label>
                <span className="text-sm font-medium">{daysPerWeek[0]} days</span>
              </div>
              <Slider
                value={daysPerWeek}
                onValueChange={handleDaysPerWeekChange}
                min={1}
                max={7}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Emails will be sent on the first {daysPerWeek[0]} days of the week
              </p>
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="vacation-mode">Vacation Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Pause emails temporarily
                  </p>
                </div>
                <Switch
                  id="vacation-mode"
                  checked={vacationMode}
                  onCheckedChange={handleVacationToggle}
                />
              </div>

              {vacationMode && (
                <div className="mt-4 space-y-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {vacationDates.from && vacationDates.to ? (
                          <>
                            {format(vacationDates.from, 'MMM d')} - {format(vacationDates.to, 'MMM d, yyyy')}
                          </>
                        ) : (
                          'Select vacation dates'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={vacationDates}
                        onSelect={(range: any) => {
                          setVacationDates(range || { from: undefined, to: undefined });
                          if (range?.from && range?.to) {
                            updateVacationMode.mutate({
                              isOnVacation: true,
                              vacationStartDate: format(range.from, 'yyyy-MM-dd'),
                              vacationEndDate: format(range.to, 'yyyy-MM-dd')
                            });
                          }
                        }}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Outreach Statistics
            </CardTitle>
            <CardDescription>
              Your sales activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-sm">Today</span>
                  <span className="font-bold">{stats?.emailsSentToday || 0} emails</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-sm">This Week</span>
                  <div className="text-right">
                    <div className="font-bold">{stats?.emailsSentThisWeek || 0} emails</div>
                    <div className="text-xs text-muted-foreground">{stats?.companiesContactedThisWeek || 0} companies</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-sm">This Month</span>
                  <div className="text-right">
                    <div className="font-bold">{stats?.emailsSentThisMonth || 0} emails</div>
                    <div className="text-xs text-muted-foreground">{stats?.companiesContactedThisMonth || 0} companies</div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                  <span className="text-sm font-medium">All Time</span>
                  <div className="text-right">
                    <div className="font-bold text-lg">{stats?.emailsSentAllTime || 0} emails</div>
                    <div className="text-xs text-muted-foreground">{stats?.companiesContactedAllTime || 0} companies</div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Longest Streak</span>
                  <span className="font-bold text-primary">{stats?.longestStreak || 0} days 🏆</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Selector */}
      <Card className="mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Active Product
          </CardTitle>
          <CardDescription className="text-sm">
            Select which product to promote in daily outreach
          </CardDescription>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-sm text-muted-foreground">Loading products...</div>
          ) : products && products.length > 0 ? (
            <div className="space-y-2">
              {products
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .slice(0, 3)
                .map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "p-3 rounded-lg border cursor-pointer transition-all",
                    selectedProductId === product.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                  onClick={() => handleProductChange(product.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{product.title}</h4>
                        {selectedProductId === product.id && (
                          <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded shrink-0">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {product.productService}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded shrink-0",
                      product.businessType === 'product' 
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    )}>
                      {product.businessType}
                    </span>
                  </div>
                </div>
              ))}
              {products.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  Showing 3 most recent products
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setShowOnboarding(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add New Product
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No products configured yet
              </p>
              <Button size="sm" onClick={() => setShowOnboarding(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Your First Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Onboarding Form */}
      <ProductOnboardingForm
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          refetchPreferences();
          refetchStats();
        }}
      />
    </div>
  );
}