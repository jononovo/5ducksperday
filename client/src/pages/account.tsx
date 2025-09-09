import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProfileForm, type UserProfile, type SubscriptionStatus } from "@/features/user-account-settings";
import { DailyOutreachSettings } from "@/components/daily-outreach-settings";

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["/api/user/profile"],
    enabled: !!user,
  });

  // Fetch subscription status
  const { data: subscriptionStatus } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/user/subscription-status"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">
          Please log in to view your account settings.
        </div>
      </div>
    );
  }

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
      <div className="space-y-6">
        {/* Profile Section - Using ProfileForm from feature module */}
        <ProfileForm profile={profile} isLoading={isLoading} />

        {/* Daily Outreach Settings */}
        <DailyOutreachSettings />

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
                  onClick={() => window.open(generateEmailLink('downgrade', 'The Duckling'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Downgrade to "The Duckling"
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => window.open(generateEmailLink('upgrade', 'Mama Duck'))}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Upgrade to "Mama Duck"
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