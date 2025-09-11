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
import { CalendarIcon, Mail, Zap, Building2, Users, TrendingUp, Pause, Play, ExternalLink, RefreshCw, Target, Flame, Sparkles, Rocket, Package, Plus, Check, Clock, Calendar as CalendarIcon2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { ProductOnboardingForm } from '@/components/product-onboarding-form';
import { CustomerProfileForm } from '@/components/customer-profile-form';
import { SenderProfileForm } from '@/components/sender-profile-form';
import { useLocation } from 'wouter';

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
  activeSenderProfileId?: number;
  activeCustomerProfileId?: number;
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
  targetCustomers?: string;
  primaryCustomerType?: string;
  marketNiche?: string;
}

interface SenderProfile {
  id: number;
  userId: number;
  name: string;
  email: string;
  companyName?: string;
  companyWebsite?: string;
  title?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface CustomerProfile {
  id: number;
  userId: number;
  title: string;
  industry?: string;
  companySize?: string;
  jobTitles?: string[];
  painPoints?: string[];
  goals?: string[];
  geography?: string;
  budget?: string;
  decisionMakingProcess?: string;
  currentSolutions?: string;
  buyingTriggers?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function StreakPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [daysPerWeek, setDaysPerWeek] = useState<number[]>([3]);
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationDates, setVacationDates] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showSenderForm, setShowSenderForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedSenderProfileId, setSelectedSenderProfileId] = useState<number | null>(null);
  const [selectedCustomerProfileId, setSelectedCustomerProfileId] = useState<number | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

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

  // Fetch sender profiles
  const { data: senderProfiles, isLoading: senderProfilesLoading } = useQuery<SenderProfile[]>({
    queryKey: ['/api/sender-profiles'],
    enabled: !!user
  });

  // Fetch customer profiles
  const { data: customerProfiles, isLoading: customerProfilesLoading } = useQuery<CustomerProfile[]>({
    queryKey: ['/api/customer-profiles'],
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

  // Set active sender profile mutation
  const setActiveSenderProfile = useMutation({
    mutationFn: async (senderProfileId: number) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', {
        activeSenderProfileId: senderProfileId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Sender profile selected',
        description: 'Your active sender profile has been updated'
      });
      refetchPreferences();
    }
  });

  // Set active customer profile mutation
  const setActiveCustomerProfile = useMutation({
    mutationFn: async (customerProfileId: number) => {
      const res = await apiRequest('PUT', '/api/daily-outreach/preferences', {
        activeCustomerProfileId: customerProfileId
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Customer profile selected',
        description: 'Your active customer profile has been updated'
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

      // Set active sender profile
      if (preferences.activeSenderProfileId) {
        setSelectedSenderProfileId(preferences.activeSenderProfileId);
      }

      // Set active customer profile
      if (preferences.activeCustomerProfileId) {
        setSelectedCustomerProfileId(preferences.activeCustomerProfileId);
      }
    }

    // Only auto-select profiles on initial load, not after user interaction
    if (!hasInitialized) {
      // Auto-select default sender profile
      if (senderProfiles && senderProfiles.length > 0 && !selectedSenderProfileId) {
        const defaultProfile = senderProfiles.find(p => p.isDefault) || senderProfiles[0];
        setSelectedSenderProfileId(defaultProfile.id);
      }

      // Auto-select first customer profile if available
      if (customerProfiles && customerProfiles.length > 0 && !selectedCustomerProfileId) {
        setSelectedCustomerProfileId(customerProfiles[0].id);
      }

      // Mark as initialized once we have data
      if (senderProfiles && customerProfiles && products) {
        setHasInitialized(true);
      }
    }
  }, [preferences, products, senderProfiles, customerProfiles, hasInitialized]);

  const handleProductChange = (productId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedProductId === productId) {
      setSelectedProductId(null);
      // Optionally clear the active product in preferences
      setActiveProduct.mutate(0); // or pass null if API supports it
    } else {
      setSelectedProductId(productId);
      setActiveProduct.mutate(productId);
    }
  };

  const handleSenderProfileChange = (profileId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedSenderProfileId === profileId) {
      setSelectedSenderProfileId(null);
      // Optionally clear the active sender profile in preferences
      setActiveSenderProfile.mutate(0); // or pass null if API supports it
    } else {
      setSelectedSenderProfileId(profileId);
      setActiveSenderProfile.mutate(profileId);
    }
  };

  const handleCustomerProfileChange = (profileId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedCustomerProfileId === profileId) {
      setSelectedCustomerProfileId(null);
      // Optionally clear the active customer profile in preferences
      setActiveCustomerProfile.mutate(0); // or pass null if API supports it
    } else {
      setSelectedCustomerProfileId(profileId);
      setActiveCustomerProfile.mutate(profileId);
    }
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
                <Button 
                  onClick={() => triggerEmail.mutate()} 
                  size="sm" 
                  className="w-full"
                  variant="ghost"
                  disabled={triggerEmail.isPending}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", triggerEmail.isPending && "animate-spin")} />
                  Re-generate
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

      {/* Adaptive Campaign Banner - Shows intro or metrics based on campaign status */}
      {(() => {
        // Simply check if campaign is activated (play button pressed)
        const isActivated = !!preferences?.enabled;
        
        // Calculate progress for intro banner
        const hasSenderProfile = !!selectedSenderProfileId;
        const hasProduct = !!selectedProductId;
        const hasCustomerProfile = !!selectedCustomerProfileId;
        const componentsFilledCount = [hasSenderProfile, hasProduct, hasCustomerProfile].filter(Boolean).length;
        
        if (isActivated) {
          // Show metrics banner for active campaigns
          return (
            <div className="mb-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium uppercase tracking-wider opacity-90">Campaign Active</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                      Your Campaign is Live! 🎯
                    </h2>
                    <p className="text-lg opacity-90 mb-4">Targeting ideal customers with personalized outreach</p>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <CalendarIcon2 className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-90">Day {Math.min(stats?.currentStreak || 0, 14)} of 14</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-90">{Math.max(14 - (stats?.currentStreak || 0), 0)} days remaining</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
                      <p className="text-sm opacity-90 mb-1">Emails Sent</p>
                      <p className="text-4xl font-bold">{stats?.emailsSentThisMonth || 0}</p>
                      <p className="text-xs opacity-70 mt-1">+{stats?.emailsSentToday || 0} today</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
                      <p className="text-sm opacity-90 mb-1">Companies Reached</p>
                      <p className="text-4xl font-bold">{stats?.companiesContactedThisMonth || 0}</p>
                      <p className="text-xs opacity-70 mt-1">This month</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6">
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-white h-full rounded-full transition-all duration-500" 
                         style={{width: `${Math.min(((stats?.currentStreak || 0) / 14) * 100, 100)}%`}}></div>
                  </div>
                  <p className="text-xs opacity-70 mt-2">Campaign Progress: {Math.round(Math.min(((stats?.currentStreak || 0) / 14) * 100, 100))}% Complete</p>
                </div>
              </div>
            </div>
          );
        } else {
          // Show simplified intro banner (same size as metrics banner)
          return (
            <div className="mb-8 bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-400 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
              {/* Background decoration */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium uppercase tracking-wider opacity-90">Campaign Setup</span>
                    </div>
                    <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                      Build Your Outreach Campaign 🎯
                    </h2>
                    <p className="text-lg opacity-90 mb-4">Configure the 3 components below to start generating daily leads</p>
                    
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-90">{hasSenderProfile ? '✓ Profile Set' : 'Add Your Profile'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-90">{hasProduct ? '✓ Product Added' : 'Define Product'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 opacity-80" />
                        <span className="text-sm opacity-90">{hasCustomerProfile ? '✓ Customer Defined' : 'Set Target'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
                      <p className="text-sm opacity-90 mb-1">Setup Progress</p>
                      <p className="text-4xl font-bold">{componentsFilledCount}/3</p>
                      <p className="text-xs opacity-70 mt-1">
                        {componentsFilledCount === 0 && "Let's start"}
                        {componentsFilledCount === 1 && "Good progress"}
                        {componentsFilledCount === 2 && "Almost ready"}
                        {componentsFilledCount === 3 && "Ready to launch"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6">
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <div className="bg-white h-full rounded-full transition-all duration-500" 
                         style={{width: `${(componentsFilledCount / 3) * 100}%`}}></div>
                  </div>
                  <p className="text-xs opacity-70 mt-2">Setup Progress: {Math.round((componentsFilledCount / 3) * 100)}% Complete</p>
                </div>
              </div>
            </div>
          );
        }
      })()}

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
              <Button
                variant="outline"
                className="w-full"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/daily-outreach/preview', {
                      headers: {
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                      }
                    });
                    if (response.ok) {
                      const html = await response.text();
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        newWindow.document.write(html);
                        newWindow.document.close();
                      }
                    } else {
                      toast({
                        title: "Error",
                        description: "Failed to load email preview",
                        variant: "destructive",
                      });
                    }
                  } catch (error) {
                    toast({
                      title: "Error", 
                      description: "Failed to open preview",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-2" />
                Preview Email Template
              </Button>
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

      {/* Campaign Status Banner */}
      <div className="mb-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium uppercase tracking-wider opacity-90">Campaign Active</span>
              </div>
              <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
                Your Campaign is Live! 🎯
              </h2>
              <p className="text-lg opacity-90 mb-4">Targeting ideal customers with personalized outreach</p>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CalendarIcon2 className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-90">Day 3 of 14</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-80" />
                  <span className="text-sm opacity-90">11 days remaining</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
                <p className="text-sm opacity-90 mb-1">Leads Generated</p>
                <p className="text-4xl font-bold">27</p>
                <p className="text-xs opacity-70 mt-1">+5 today</p>
              </div>
              <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
                <p className="text-sm opacity-90 mb-1">Response Rate</p>
                <p className="text-4xl font-bold">32%</p>
                <p className="text-xs opacity-70 mt-1">↑ 8% vs avg</p>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="mt-6">
            <div className="bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="bg-white h-full rounded-full transition-all duration-500" style={{width: '21%'}}></div>
            </div>
            <p className="text-xs opacity-70 mt-2">Campaign Progress: 21% Complete</p>
          </div>
        </div>
      </div>

      {/* Campaign Setup Row - 4 Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. Me (My Company/Profile) */}
        <Card className={cn(
          "relative group transition-all duration-300 border-2",
          selectedSenderProfileId 
            ? "border-primary bg-primary/5 shadow-lg" 
            : "hover:shadow-xl hover:border-primary/30"
        )}>
          {/* Progress indicator */}
          {selectedSenderProfileId && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Me
                </CardTitle>
                <CardDescription className="text-xs">
                  My Company
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowSenderForm(true)}
                data-testid="button-add-sender-profile"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {senderProfilesLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : senderProfiles && senderProfiles.length > 0 ? (
              <div className="space-y-2">
                {senderProfiles
                  .sort((a, b) => b.isDefault ? 1 : -1) // Default profiles first
                  .slice(0, 3)
                  .map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all",
                      selectedSenderProfileId === profile.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleSenderProfileChange(profile.id)}
                    data-testid={`sender-profile-${profile.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{profile.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                        {profile.title && (
                          <div className="text-xs text-muted-foreground truncate">{profile.title}</div>
                        )}
                      </div>
                      {selectedSenderProfileId === profile.id && (
                        <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="p-2 bg-secondary rounded-lg mb-2">
                  <div className="font-medium text-xs truncate">{user?.username || user?.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Default profile created
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. My Product */}
        <Card className={cn(
          "relative transition-all duration-300 border-2",
          selectedProductId 
            ? "border-primary bg-primary/5 shadow-lg" 
            : "hover:shadow-xl hover:border-primary/30"
        )}>
          {/* Progress indicator */}
          {selectedProductId && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  My Product
                </CardTitle>
                <CardDescription className="text-xs">
                  What are you selling?
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowOnboarding(true)}
                data-testid="button-add-product"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {productsLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : products && products.length > 0 ? (
              <div className="space-y-2">
                {products
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .slice(0, 3)
                  .map((product) => (
                  <div
                    key={product.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all",
                      selectedProductId === product.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleProductChange(product.id)}
                    data-testid={`product-${product.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{product.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {product.productService}
                        </div>
                      </div>
                      {selectedProductId === product.id && (
                        <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-16 w-16 rounded-full p-0"
                  onClick={() => setShowOnboarding(true)}
                  data-testid="button-create-product"
                >
                  <Plus className="h-8 w-8 text-muted-foreground/30" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Add your product
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Ideal Customer */}
        <Card className={cn(
          "relative transition-all duration-300 border-2",
          selectedCustomerProfileId 
            ? "border-primary bg-primary/5 shadow-lg" 
            : "hover:shadow-xl hover:border-primary/30"
        )}>
          {/* Progress indicator */}
          {selectedCustomerProfileId && (
            <div className="absolute -top-2 -right-2 z-10">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Ideal Customer
                </CardTitle>
                <CardDescription className="text-xs">
                  Who are you connecting with?
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowCustomerForm(true)}
                data-testid="button-add-customer-profile"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {customerProfilesLoading ? (
              <div className="text-xs text-muted-foreground">Loading...</div>
            ) : customerProfiles && customerProfiles.length > 0 ? (
              <div className="space-y-2">
                {customerProfiles
                  .slice(0, 3)
                  .map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "p-2 rounded-lg border cursor-pointer transition-all",
                      selectedCustomerProfileId === profile.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => handleCustomerProfileChange(profile.id)}
                    data-testid={`customer-profile-${profile.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-xs truncate">{profile.title}</div>
                        {profile.industry && (
                          <div className="text-xs text-muted-foreground truncate">{profile.industry}</div>
                        )}
                        {profile.companySize && (
                          <div className="text-xs text-muted-foreground truncate">{profile.companySize}</div>
                        )}
                      </div>
                      {selectedCustomerProfileId === profile.id && (
                        <Check className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : products && products.length > 0 && selectedProductId ? (
              <div className="space-y-2">
                {products
                  .filter(p => p.id === selectedProductId)
                  .slice(0, 1)
                  .map((product) => (
                  <div key={product.id} className="space-y-2">
                    {product.targetCustomers && (
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="font-medium text-xs">Target</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {product.targetCustomers}
                        </div>
                      </div>
                    )}
                    {product.primaryCustomerType && (
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="font-medium text-xs">Type</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {product.primaryCustomerType}
                        </div>
                      </div>
                    )}
                    {product.marketNiche && (
                      <div className="p-2 bg-secondary rounded-lg">
                        <div className="font-medium text-xs">Market</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {product.marketNiche}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <Plus className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  Define your audience
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4. Play Button */}
        <Card className={cn(
          "relative transition-all",
          preferences?.enabled 
            ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
            : "hover:shadow-lg"
        )}>
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-4">
            {/* Progress indicators at the top */}
            <div className="flex gap-2 mb-4">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                selectedSenderProfileId 
                  ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
                  : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
              )}>
                {selectedSenderProfileId ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="text-xs text-gray-400">1</span>
                )}
              </div>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                selectedProductId 
                  ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
                  : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
              )}>
                {selectedProductId ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="text-xs text-gray-400">2</span>
                )}
              </div>
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                selectedCustomerProfileId 
                  ? "bg-green-100 dark:bg-green-900/50 border-2 border-green-500" 
                  : "bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600"
              )}>
                {selectedCustomerProfileId ? (
                  <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : (
                  <span className="text-xs text-gray-400">3</span>
                )}
              </div>
            </div>
            
            {preferences?.enabled ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-3">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  Campaign Active
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Sending {daysPerWeek[0]} days/week
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => {
                    updatePreferences.mutate({ enabled: false });
                  }}
                >
                  Pause Campaign
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  size="lg"
                  className="h-16 w-16 rounded-full p-0 mb-3"
                  onClick={() => {
                    if (products && products.length > 0 && selectedProductId) {
                      updatePreferences.mutate({ 
                        enabled: true,
                        scheduleDays: ['monday', 'tuesday', 'wednesday'].slice(0, daysPerWeek[0])
                      });
                    } else {
                      toast({
                        title: "Setup Required",
                        description: "Please add your product information first",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={!products || products.length === 0 || !selectedProductId}
                >
                  <Play className="h-8 w-8 ml-1" />
                </Button>
                <p className="text-sm font-medium">
                  Start Campaign
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Launch daily outreach
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Onboarding Form */}
      <ProductOnboardingForm
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => {
          refetchPreferences();
          refetchStats();
        }}
      />

      {/* Customer Profile Form */}
      <CustomerProfileForm
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        onComplete={() => {
          refetchPreferences();
          refetchStats();
        }}
      />

      {/* Sender Profile Form */}
      <SenderProfileForm
        open={showSenderForm}
        onClose={() => setShowSenderForm(false)}
        onComplete={() => {
          refetchPreferences();
          refetchStats();
        }}
      />
    </div>
  );
}