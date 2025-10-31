import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Mail, 
  MousePointer, 
  Reply, 
  AlertCircle, 
  UserX,
  Play,
  Pause,
  Settings,
  Calendar,
  Users,
  Target,
  Eye,
  ChevronDown,
  MoreVertical,
  Trash2,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Campaign } from "@shared/schema";

interface CampaignWithMetrics extends Campaign {
  totalRecipients: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  emailsBounced: number;
  emailsUnsubscribed: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  emailSubject?: string;
  emailBody?: string;
  recipients: Array<{
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    status: string;
    sentAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    repliedAt: Date | null;
    bouncedAt: Date | null;
    unsubscribedAt: Date | null;
    lastActivity: Date | null;
  }>;
}

export default function CampaignDetail() {
  const params = useParams();
  const campaignId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);

  const { data: campaign, isLoading, error } = useQuery<CampaignWithMetrics>({
    queryKey: ['/api/campaigns', campaignId],
    enabled: !!campaignId
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async (updates: Partial<Campaign>) => {
      return apiRequest(`/api/campaigns/${campaignId}`, 'PUT', updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      toast({
        title: "Campaign updated",
        description: "Your campaign has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign",
        variant: "destructive",
      });
    }
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/campaigns/${campaignId}`, 'DELETE');
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "Your campaign has been deleted successfully.",
      });
      setLocation('/campaigns');
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive",
      });
    }
  });

  const handleCampaignAction = async (action: string) => {
    switch (action) {
      case 'pause':
        updateCampaignMutation.mutate({ status: 'paused' });
        break;
      case 'resume':
        updateCampaignMutation.mutate({ status: 'active' });
        break;
      case 'activate':
        updateCampaignMutation.mutate({ status: 'active' });
        break;
      case 'edit':
        setIsEditMode(true);
        toast({
          title: "Edit mode",
          description: "You can now edit the campaign settings.",
        });
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
          deleteCampaignMutation.mutate();
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading campaign details...</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h3 className="mt-2 text-sm font-semibold">Campaign not found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The campaign you're looking for doesn't exist or has been deleted.
          </p>
          <div className="mt-6">
            <Link href="/campaigns">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to campaigns
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', variant: 'secondary' as const, className: '' },
      scheduled: { label: 'Scheduled', variant: 'default' as const, className: '' },
      active: { label: 'Active', variant: 'default' as const, className: 'bg-green-500 hover:bg-green-600' },
      paused: { label: 'Paused', variant: 'secondary' as const, className: 'bg-yellow-500 hover:bg-yellow-600' },
      completed: { label: 'Completed', variant: 'secondary' as const, className: '' },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, className: '' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return (
      <Badge variant={config.variant} className={cn(config.className)}>
        {config.label}
      </Badge>
    );
  };

  const MetricCard = ({ 
    icon: Icon, 
    label, 
    value, 
    percentage, 
    color = "text-foreground" 
  }: { 
    icon: any; 
    label: string; 
    value: number; 
    percentage?: number; 
    color?: string;
  }) => (
    <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
      <Icon className={cn("h-8 w-8 mb-2", color)} />
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {percentage !== undefined && (
        <div className="text-xs text-muted-foreground mt-1">
          {percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Created {format(new Date(campaign.createdAt!), 'MMM d, yyyy')}
              </span>
              {campaign.startDate && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {campaign.status === 'completed' ? 'Ended' : 'Started'} {format(new Date(campaign.startDate), 'MMM d, yyyy')}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(campaign.status)}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                data-testid="button-campaign-actions"
              >
                Actions
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {campaign.status === 'active' ? (
                <DropdownMenuItem 
                  onClick={() => handleCampaignAction('pause')}
                  className="text-orange-600 dark:text-orange-400"
                  data-testid="menu-pause-campaign"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause Campaign
                </DropdownMenuItem>
              ) : campaign.status === 'paused' ? (
                <DropdownMenuItem 
                  onClick={() => handleCampaignAction('resume')}
                  className="text-green-600 dark:text-green-400"
                  data-testid="menu-resume-campaign"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Resume Campaign
                </DropdownMenuItem>
              ) : null}
              
              <DropdownMenuItem 
                onClick={() => handleCampaignAction('edit')}
                data-testid="menu-edit-campaign"
              >
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </DropdownMenuItem>
              
              {campaign.status === 'draft' && (
                <DropdownMenuItem 
                  onClick={() => handleCampaignAction('activate')}
                  className="text-blue-600 dark:text-blue-400"
                  data-testid="menu-activate-campaign"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Activate Campaign
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={() => handleCampaignAction('delete')}
                className="text-red-600 dark:text-red-400"
                data-testid="menu-delete-campaign"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Overview Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Overview
          </CardTitle>
          <CardDescription>Campaign performance at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard 
              icon={Mail} 
              label="Emails sent" 
              value={campaign.emailsSent} 
              color="text-pink-500"
            />
            <MetricCard 
              icon={Eye} 
              label="Opens" 
              value={campaign.emailsOpened}
              percentage={campaign.openRate}
              color="text-yellow-500"
            />
            <MetricCard 
              icon={MousePointer} 
              label="Clicks" 
              value={campaign.emailsClicked}
              percentage={campaign.clickRate}
              color="text-green-500"
            />
            <MetricCard 
              icon={Reply} 
              label="Replied" 
              value={campaign.emailsReplied}
              percentage={campaign.replyRate}
              color="text-blue-500"
            />
            <MetricCard 
              icon={AlertCircle} 
              label="Bounces" 
              value={campaign.emailsBounced}
              percentage={campaign.bounceRate}
              color="text-red-500"
            />
            <MetricCard 
              icon={UserX} 
              label="Unsubscribes" 
              value={campaign.emailsUnsubscribed}
              percentage={campaign.unsubscribeRate}
              color="text-gray-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Details */}
      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Campaign Details</TabsTrigger>
          <TabsTrigger value="recipients">Recipients ({campaign.totalRecipients})</TabsTrigger>
          <TabsTrigger value="activity">Activity Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campaign Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total recipients</span>
                  <span className="text-sm font-medium">{campaign.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sending progress</span>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(campaign.emailsSent / campaign.totalRecipients) * 100} 
                      className="w-24 h-2"
                    />
                    <span className="text-sm font-medium">
                      {((campaign.emailsSent / campaign.totalRecipients) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Generation type</span>
                  <Badge variant="outline">
                    {campaign.generationType === 'ai_unique' ? 'AI Unique' : 'Template'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Human review</span>
                  <span className="text-sm font-medium">
                    {campaign.requiresHumanReview ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tracking</span>
                  <span className="text-sm font-medium">
                    {campaign.trackEmails ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Unsubscribe link</span>
                  <span className="text-sm font-medium">
                    {campaign.unsubscribeLink ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Daily cap</span>
                  <span className="text-sm font-medium">
                    Max {campaign.dailyLeadTarget} emails/day
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Email Template Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Email Template</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Subject</div>
                    <div className="text-sm font-medium p-2 bg-muted rounded">
                      {campaign.emailSubject || 'No subject set'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Body Preview</div>
                    <div className="text-sm p-2 bg-muted rounded max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {campaign.emailBody ? 
                        campaign.emailBody.substring(0, 300) + (campaign.emailBody.length > 300 ? '...' : '') 
                        : 'No email body set'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recipients">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Recipients</CardTitle>
              <CardDescription>Track engagement for each recipient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium">Recipient</th>
                        <th className="text-left p-3 font-medium">Company</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Events</th>
                        <th className="text-left p-3 font-medium">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaign.recipients?.map((recipient) => (
                        <tr key={recipient.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div>
                              <div className="font-medium">
                                {recipient.firstName} {recipient.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{recipient.email}</div>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{recipient.companyName}</td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs">
                              {recipient.status}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              {recipient.openedAt && (
                                <Badge variant="secondary" className="text-xs">Opened</Badge>
                              )}
                              {recipient.clickedAt && (
                                <Badge variant="secondary" className="text-xs">Clicked</Badge>
                              )}
                              {recipient.repliedAt && (
                                <Badge className="text-xs bg-blue-500">Replied</Badge>
                              )}
                              {recipient.bouncedAt && (
                                <Badge variant="destructive" className="text-xs">Bounced</Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-sm text-muted-foreground">
                            {recipient.lastActivity ? 
                              format(new Date(recipient.lastActivity), 'MMM d, h:mm a') 
                              : 'No activity'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Recent campaign events and batch history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock activity timeline for now - will be populated from actual events */}
                <div className="flex gap-4 items-start">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Campaign started</span>
                      <span className="text-xs text-muted-foreground">
                        {campaign.startDate ? format(new Date(campaign.startDate), 'MMM d, h:mm a') : 'Not started'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Campaign activated and ready to send emails
                    </p>
                  </div>
                </div>

                {campaign.emailsSent > 0 && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Batch sent</span>
                        <span className="text-xs text-muted-foreground">Today</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Sent {campaign.emailsSent} emails to recipients
                      </p>
                    </div>
                  </div>
                )}

                {campaign.emailsOpened > 0 && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-purple-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Recipients engaged</span>
                        <span className="text-xs text-muted-foreground">Ongoing</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {campaign.emailsOpened} opens, {campaign.emailsClicked} clicks recorded
                      </p>
                    </div>
                  </div>
                )}

                {campaign.status === 'paused' && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Campaign paused</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.updatedAt ? format(new Date(campaign.updatedAt), 'MMM d, h:mm a') : 'Recently'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Campaign temporarily paused
                      </p>
                    </div>
                  </div>
                )}

                {campaign.status === 'completed' && (
                  <div className="flex gap-4 items-start">
                    <div className="h-2 w-2 rounded-full bg-gray-500 mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Campaign completed</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.endDate ? format(new Date(campaign.endDate), 'MMM d, h:mm a') : 'Recently'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        All scheduled emails have been sent
                      </p>
                    </div>
                  </div>
                )}

                {(!campaign.emailsSent || campaign.emailsSent === 0) && campaign.status !== 'completed' && (
                  <div className="text-center py-8 text-muted-foreground">
                    No activity yet. Campaign will start sending emails based on schedule.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}