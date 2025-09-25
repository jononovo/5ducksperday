import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { type TargetCustomerProfile } from '@shared/schema';
import { 
  SenderProfileCard, 
  ProductCard, 
  CustomerProfileCard, 
  ActivationCard 
} from '@/components/campaign-setup';
import {
  ActivationCTABanner,
  AdaptiveCampaignBanner
} from '@/components/campaign/banners';
import { WeeklyStreakRow } from '@/components/weekly-streak-row';

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
    prospects?: Array<{
      contact: {
        id: number;
        name: string;
        role: string | null;
        email: string | null;
      };
      company: {
        id: number;
        name: string;
      };
    }>;
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
  displayName: string;
  email: string;
  companyName?: string;
  companyWebsite?: string;
  title?: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Using TargetCustomerProfile from shared/schema instead of local interface

export default function StreakPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
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
  const { data: customerProfiles, isLoading: customerProfilesLoading } = useQuery<TargetCustomerProfile[]>({
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

  // Send test email mutation
  const sendTestEmail = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/daily-outreach/send-test-email');
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.success) {
        toast({
          title: 'Test email sent!',
          description: 'Check your inbox for the test notification email'
        });
      } else {
        toast({
          title: 'Failed to send test email',
          description: data.message || 'Please check your SendGrid configuration',
          variant: 'destructive'
        });
      }
    },
    onError: () => {
      toast({
        title: 'Error sending test email',
        description: 'Please verify your SendGrid settings are configured correctly',
        variant: 'destructive'
      });
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
      // Removed refetchPreferences() to prevent card refresh
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
      // Removed refetchPreferences() to prevent card refresh
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
      // Removed refetchPreferences() to prevent card refresh
    }
  });

  // Initial load effect - only runs once to set up initial state from preferences
  useEffect(() => {
    if (!hasInitialized && preferences && products && senderProfiles && customerProfiles) {
      // No longer need to set days per week from preferences
      
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
      } else if (products.length > 0) {
        // Default to first product if none selected
        setSelectedProductId(products[0].id);
      }

      // Set active sender profile
      if (preferences.activeSenderProfileId) {
        setSelectedSenderProfileId(preferences.activeSenderProfileId);
      } else if (senderProfiles.length > 0) {
        // Auto-select default sender profile
        const defaultProfile = senderProfiles.find(p => p.isDefault) || senderProfiles[0];
        setSelectedSenderProfileId(defaultProfile.id);
      }

      // Set active customer profile
      if (preferences.activeCustomerProfileId) {
        setSelectedCustomerProfileId(preferences.activeCustomerProfileId);
      } else if (customerProfiles.length > 0) {
        // Auto-select first customer profile if available
        setSelectedCustomerProfileId(customerProfiles[0].id);
      }

      // Mark as initialized
      setHasInitialized(true);
    }
  }, [hasInitialized, preferences, products, senderProfiles, customerProfiles]);

  // Separate effect for vacation mode updates only
  useEffect(() => {
    if (hasInitialized && preferences) {
      // Only update vacation mode settings, not profile selections
      
      if (preferences.vacationMode) {
        setVacationMode(true);
        if (preferences.vacationStartDate && preferences.vacationEndDate) {
          setVacationDates({
            from: new Date(preferences.vacationStartDate),
            to: new Date(preferences.vacationEndDate)
          });
        }
      } else {
        setVacationMode(false);
      }
    }
  }, [hasInitialized, preferences]);

  const handleProductChange = (productId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedProductId === productId) {
      setSelectedProductId(null);
    } else {
      setSelectedProductId(productId);
    }
  };

  const handleSenderProfileChange = (profileId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedSenderProfileId === profileId) {
      setSelectedSenderProfileId(null);
    } else {
      setSelectedSenderProfileId(profileId);
    }
  };

  const handleCustomerProfileChange = (profileId: number) => {
    // Toggle selection - if already selected, deselect it
    if (selectedCustomerProfileId === profileId) {
      setSelectedCustomerProfileId(null);
    } else {
      setSelectedCustomerProfileId(profileId);
    }
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
    const goal = stats?.weeklyGoal || preferences?.scheduleDays?.length || 3;
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
    <div className="container mx-auto px-4 py-4 max-w-6xl">
      {/* Header with Streak Counter */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Flame className="h-8 w-8 text-orange-500" />
              Your Sales Streak {getStreakEmoji()}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Weekly Goal Progress:</span>
              <span className="text-sm font-medium text-muted-foreground">
                {stats?.weeklyProgress || 0} of {stats?.weeklyGoal || preferences?.scheduleDays?.length || 3} Days
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{stats?.currentStreak || 0}</div>
            <div className="text-sm text-muted-foreground">Days</div>
          </div>
        </div>
      </div>

      {/* Weekly Streak Row - Below header */}
      <div className="mb-8">
        <WeeklyStreakRow />
      </div>

      {/* Activation CTA is now integrated into AdaptiveCampaignBanner carousel */}

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
                <div className="text-2xl font-bold">{stats.todaysBatch.itemCount} Emails Ready</div>
                
                {/* Prospect list */}
                {stats.todaysBatch.prospects && stats.todaysBatch.prospects.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {stats.todaysBatch.prospects.map((prospect, idx) => (
                      <div 
                        key={idx} 
                        className="py-2 cursor-pointer hover:bg-muted/50 transition-colors rounded px-2 -mx-2"
                        onClick={() => window.open(`/outreach/daily/${stats.todaysBatch?.token}`, '_blank')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            window.open(`/outreach/daily/${stats.todaysBatch?.token}`, '_blank');
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`View outreach email for ${prospect.contact.name}`}
                      >
                        <div className="text-sm">
                          <span className="font-medium">{prospect.contact.name}</span>
                          <span className="text-muted-foreground"> @ {prospect.company.name}</span>
                        </div>
                        {prospect.contact.role && (
                          <div className="text-xs text-muted-foreground">{prospect.contact.role}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
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
                  variant="outline"
                  disabled={triggerEmail.isPending}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", triggerEmail.isPending && "animate-spin")} />
                  Re-generate
                </Button>
                <button 
                  onClick={() => sendTestEmail.mutate()} 
                  className="w-full text-[10px] h-5 mt-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  disabled={sendTestEmail.isPending}
                >
                  Send Test Email
                </button>
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
                <button 
                  onClick={() => sendTestEmail.mutate()} 
                  className="w-full text-[10px] h-5 mt-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  disabled={sendTestEmail.isPending}
                >
                  Send Test Email
                </button>
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

      {/* Adaptive Campaign Banner - Shows intro, setup, or metrics based on status */}
      <AdaptiveCampaignBanner
        isActivated={!!preferences?.enabled}
        stats={stats}
        hasSenderProfile={!!selectedSenderProfileId}
        hasProduct={!!selectedProductId}
        hasCustomerProfile={!!selectedCustomerProfileId}
        onStartClick={() => setShowOnboarding(true)}
      />

      {/* Campaign Setup Row - 4 Components */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* 1. Sender Profile Card */}
        <SenderProfileCard
          senderProfiles={senderProfiles}
          selectedSenderProfileId={selectedSenderProfileId}
          isLoading={senderProfilesLoading}
          onProfileChange={handleSenderProfileChange}
          onAddProfile={() => setShowSenderForm(true)}
          user={user}
        />

        {/* 2. Product Card */}
        <ProductCard
          products={products}
          selectedProductId={selectedProductId}
          isLoading={productsLoading}
          onProductChange={handleProductChange}
          onAddProduct={() => setShowOnboarding(true)}
        />

        {/* 3. Customer Profile Card */}
        <CustomerProfileCard
          customerProfiles={customerProfiles}
          selectedCustomerProfileId={selectedCustomerProfileId}
          isLoading={customerProfilesLoading}
          onProfileChange={handleCustomerProfileChange}
          onAddProfile={() => setShowCustomerForm(true)}
        />

        {/* 4. Activation Card */}
        <ActivationCard
          isEnabled={preferences?.enabled || false}
          daysPerWeek={preferences?.scheduleDays?.length || 3}
          hasProduct={!!selectedProductId}
          hasSenderProfile={!!selectedSenderProfileId}
          hasCustomerProfile={!!selectedCustomerProfileId}
          onActivate={() => {
            // Save all selected profiles when activating the campaign
            updatePreferences.mutate({ 
              enabled: true,
              scheduleDays: preferences?.scheduleDays || ['monday', 'tuesday', 'wednesday'],
              activeProductId: selectedProductId,
              activeSenderProfileId: selectedSenderProfileId || 0,
              activeCustomerProfileId: selectedCustomerProfileId || 0
            });
          }}
          onDeactivate={() => {
            updatePreferences.mutate({ enabled: false });
          }}
        />
      </div>

      {/* Settings Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Schedule Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Outreach Settings
            </CardTitle>
            <CardDescription>
              Pause or preview daily prospects emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="pt-2">
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

      {/* Product Onboarding Form */}
      <ProductOnboardingForm
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={(profileId) => {
          if (profileId) {
            setSelectedProductId(profileId);
            setActiveProduct.mutate(profileId);
          }
          refetchPreferences();

          refetchStats();
        }}
      />

      {/* Customer Profile Form */}
      <CustomerProfileForm
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        onComplete={(profileId) => {
          if (profileId) {
            setSelectedCustomerProfileId(profileId);
            setActiveCustomerProfile.mutate(profileId);
          }
          refetchPreferences();
          refetchStats();
        }}
      />

      {/* Sender Profile Form */}
      <SenderProfileForm
        open={showSenderForm}
        onClose={() => setShowSenderForm(false)}
        onComplete={(profileId) => {
          if (profileId) {
            setSelectedSenderProfileId(profileId);
            setActiveSenderProfile.mutate(profileId);
          }
          refetchPreferences();

          refetchStats();
        }}
      />
    </div>
  );
}