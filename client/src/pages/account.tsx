import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Settings, CreditCard, Package, ExternalLink, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

// Schema for profile updates
const profileSchema = z.object({
  username: z.string().min(1, "Name is required").max(50, "Name must be less than 50 characters"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

interface SubscriptionStatus {
  isSubscribed: boolean;
  currentPlan: string | null;
  planDisplayName: string | null;
}

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch user profile data
  const { data: profile, isLoading, error } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  // Fetch subscription status
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/user/subscription-status"],
    enabled: !!user,
  });

  // Form setup
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile) {
      form.reset({
        username: profile.username,
      });
    }
  }, [profile, form]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return apiRequest("PUT", "/api/user/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    updateProfileMutation.mutate(data);
  });

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (profile) {
      form.reset({
        username: profile.username,
      });
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Please log in to view your account.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Loading account information...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">
          Failed to load account information. Please try again.
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const generateEmailLink = (action: string, plan?: string) => {
    let subject, actionText, requestedAction;
    
    if (action === 'cancel') {
      subject = 'Request Subscription Cancellation';
      actionText = 'cancel';
      requestedAction = 'Cancellation';
    } else if (action === 'downgrade') {
      subject = `Request Downgrade to ${plan} Plan`;
      actionText = 'downgrade';
      requestedAction = `Downgrade to ${plan}`;
    } else {
      subject = `Request Upgrade to ${plan} Plan`;
      actionText = 'upgrade';
      requestedAction = `Upgrade to ${plan}`;
    }
    
    const body = encodeURIComponent(
      `Hello 5Ducks Support,

I would like to ${actionText} my subscription.

Account Email: ${profile?.email}
Current Plan: ${subscriptionStatus?.planDisplayName || 'Not subscribed'}
Requested Action: ${requestedAction}

Please process this request and let me know if you need any additional information.

Best regards,
${profile?.username}`
    );
    
    return `mailto:support@5ducks.ai?subject=${encodeURIComponent(subject)}&body=${body}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account information and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Name</Label>
                  {isEditing ? (
                    <Input
                      id="username"
                      {...form.register("username")}
                      placeholder="Enter your name"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{profile?.username}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    </div>
                  )}
                  {form.formState.errors.username && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="text-sm font-medium text-muted-foreground">
                    {profile?.email}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact support to change your email address
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Member Since</Label>
                <div className="text-sm font-medium text-muted-foreground">
                  {profile?.createdAt ? formatDate(profile.createdAt) : "N/A"}
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Products Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Products
            </CardTitle>
            <CardDescription>
              Manage your subscriptions and features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Product information will be available here soon.</p>
            </div>
          </CardContent>
        </Card>

        {/* Billing Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing
            </CardTitle>
            <CardDescription>
              Payment methods and billing history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div className="text-sm font-medium">
                {subscriptionStatus?.planDisplayName || 'Not subscribed'}
              </div>
            </div>

            {/* Subscription Actions */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subscription Actions</Label>
                <p className="text-xs text-muted-foreground">
                  Click to send email requests to support
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(generateEmailLink('downgrade', 'The Ugly Duckling'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Downgrade to "Ugly Duckling"
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(generateEmailLink('upgrade', 'Duckin\' Awesome'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Upgrade to "Duckin' Awesome"
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>

                {subscriptionStatus?.isSubscribed && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-destructive hover:text-destructive"
                    onClick={() => window.open(generateEmailLink('cancel'))}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Cancel Subscription
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}