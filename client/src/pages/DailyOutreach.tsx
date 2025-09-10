import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  Building2, 
  User, 
  Mail,
  ChevronLeft,
  ChevronRight,
  Edit3,
  SkipForward,
  Loader2,
  ExternalLink,
  Info,
  Calendar,
  CheckCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { EmailSendButton } from '@/components/email-fallback/EmailSendButton';
import { apiRequest } from '@/lib/queryClient';
import { format } from 'date-fns';

interface OutreachItem {
  id: number;
  batchId: number;
  contactId: number;
  companyId: number;
  emailSubject: string;
  emailBody: string;
  emailTone: string;
  status: 'pending' | 'sent' | 'skipped' | 'edited';
  sentAt: string | null;
  editedContent: string | null;
  contact: {
    id: number;
    name: string;
    email: string;
    role: string | null;
  };
  company: {
    id: number;
    name: string;
    description: string | null;
    website: string | null;
  };
}

interface OutreachBatch {
  id: number;
  userId: number;
  batchDate: string;
  secureToken: string;
  status: string;
  expiresAt: string;
}

export default function DailyOutreach() {
  const params = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = params.token;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [editedBody, setEditedBody] = useState<string>('');
  const [sendingAnimation, setSendingAnimation] = useState(false);
  const [companyTooltipOpen, setCompanyTooltipOpen] = useState(false);
  
  // Fetch batch data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/daily-outreach/batch/${token}`],
    enabled: !!token,
  });
  
  // Check Gmail status
  const { data: gmailStatus } = useQuery({
    queryKey: ['/api/gmail/status'],
    refetchInterval: 30000, // Check every 30 seconds
  });
  
  // Gmail connect mutation
  const handleGmailConnect = () => {
    // Open Gmail OAuth flow in a new window
    const authUrl = `/api/gmail/auth`;
    const authWindow = window.open(authUrl, 'gmailAuth', 'width=600,height=600');
    
    // Listen for message from pop-up window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'GMAIL_AUTH_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        queryClient.invalidateQueries({ queryKey: ['/api/gmail/status'] });
        toast({
          title: "Gmail Connected",
          description: "You can now send emails via Gmail!",
        });
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Fallback: check if window is closed
    const checkClosed = setInterval(() => {
      if (authWindow?.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        queryClient.invalidateQueries({ queryKey: ['/api/gmail/status'] });
      }
    }, 1000);
  };
  
  // Send email via Gmail
  const sendEmailMutation = useMutation({
    mutationFn: async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
      return apiRequest('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body })
      });
    },
    onSuccess: (_, variables) => {
      // Mark as sent in database
      if (currentItem) {
        markSent.mutate(currentItem.id);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again or use a different method",
        variant: "destructive"
      });
    }
  });
  
  const handleSendEmail = async (to: string, subject: string, body: string) => {
    setSendingAnimation(true);
    
    // Show loading animation
    setTimeout(() => {
      sendEmailMutation.mutate({ to, subject, body });
      setSendingAnimation(false);
    }, 1500);
  };
  
  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async ({ itemId, subject, body }: { itemId: number; subject: string; body: string }) => {
      const response = await fetch(`/api/daily-outreach/batch/${token}/item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSubject: subject, emailBody: body })
      });
      if (!response.ok) throw new Error('Failed to update');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-outreach/batch/${token}`] });
      setEditingItem(null);
      toast({
        title: 'Email updated',
        description: 'Your changes have been saved'
      });
    }
  });
  
  // Mark as sent mutation
  const markSent = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/daily-outreach/batch/${token}/item/${itemId}/sent`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to mark as sent');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-outreach/batch/${token}`] });
      toast({
        title: 'Email sent!',
        description: 'Moving to the next prospect...'
      });
      
      // Move to next email after a short delay
      setTimeout(() => {
        if (pendingItems && currentIndex < pendingItems.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }, 1000);
    }
  });
  
  // Skip item mutation
  const skipItem = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await fetch(`/api/daily-outreach/batch/${token}/item/${itemId}/skip`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to skip');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/daily-outreach/batch/${token}`] });
      
      // Move to next email
      if (pendingItems && currentIndex < pendingItems.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
  });
  
  const handleEdit = (item: OutreachItem) => {
    setEditingItem(item.id);
    setEditedSubject(item.emailSubject);
    setEditedBody(item.emailBody);
  };
  
  const handleSave = (itemId: number) => {
    updateItem.mutate({ itemId, subject: editedSubject, body: editedBody });
  };
  
  const handleCancel = () => {
    setEditingItem(null);
    setEditedSubject('');
    setEditedBody('');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-lg">Loading your daily outreach...</p>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Unable to Load Outreach</p>
              <p className="text-muted-foreground">This link may be expired or invalid.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { batch, items } = data as { batch: OutreachBatch; items: OutreachItem[] };
  const pendingItems = items?.filter((item: OutreachItem) => item.status === 'pending') || [];
  const currentItem = pendingItems[currentIndex];
  const nextItem = pendingItems[currentIndex + 1];
  
  // If no pending items, show completion message
  if (pendingItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold mb-2">All Done!</h2>
              <p className="text-muted-foreground">
                You've completed your daily outreach. Check back tomorrow for your next batch of leads!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sending Animation Overlay */}
      {sendingAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm text-gray-600">Opening email application...</p>
          </div>
        </div>
      )}
      
      {/* Top Bar */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentIndex + 1} of {pendingItems.length}
            </Badge>
            <span className="text-sm text-muted-foreground">prospects remaining</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(), 'EEEE, MMMM d')}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {currentItem && (
          <Card className="mb-6">
            <div className="p-6">
              {/* Company and Contact Info */}
              <div className="mb-6">
                <div className="flex items-start justify-between mb-2">
                  <TooltipProvider>
                    <Tooltip open={companyTooltipOpen} onOpenChange={setCompanyTooltipOpen}>
                      <TooltipTrigger asChild>
                        <button 
                          className="flex items-center gap-2 text-left hover:text-blue-600 transition-colors"
                          onClick={() => setCompanyTooltipOpen(!companyTooltipOpen)}
                        >
                          <Building2 className="h-5 w-5 flex-shrink-0" />
                          <span className="text-xl font-semibold">{currentItem.company.name}</span>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm p-4">
                        <div className="space-y-2">
                          {currentItem.company.description && (
                            <p className="text-sm">{currentItem.company.description}</p>
                          )}
                          {currentItem.company.website && (
                            <a 
                              href={currentItem.company.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {currentItem.company.website}
                            </a>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {currentItem.contact.name}
                    {currentItem.contact.role && ` • ${currentItem.contact.role}`}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {currentItem.contact.email}
                  </span>
                </div>
              </div>
              
              {/* Email Content */}
              {editingItem === currentItem.id ? (
                // Edit Mode
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Subject</label>
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      placeholder="Email subject..."
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Message</label>
                    <Textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      rows={12}
                      placeholder="Email body..."
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleSave(currentItem.id)}
                      disabled={updateItem.isPending}
                    >
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      disabled={updateItem.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View Mode
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Subject:</p>
                    <p className="text-sm bg-gray-50 p-3 rounded-md">{currentItem.emailSubject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <div className="text-sm bg-gray-50 p-4 rounded-md whitespace-pre-wrap min-h-[200px]">
                      {currentItem.emailBody}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              {editingItem !== currentItem.id && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(currentItem)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    
                    {/* Gmail Connect Button - only show if not authenticated */}
                    {!gmailStatus?.authorized && (
                      <Button
                        onClick={handleGmailConnect}
                        variant="outline"
                        size="sm"
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Gmail API BETA
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => skipItem.mutate(currentItem.id)}
                      disabled={skipItem.isPending}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <SkipForward className="h-3 w-3 inline mr-1" />
                      Skip
                    </button>
                    
                    <EmailSendButton
                      to={currentItem.contact.email}
                      subject={currentItem.emailSubject}
                      body={currentItem.emailBody}
                      contact={currentItem.contact}
                      company={currentItem.company}
                      isGmailAuthenticated={gmailStatus?.authorized}
                      onSendViaGmail={handleSendEmail}
                      isPending={sendEmailMutation.isPending}
                      isSuccess={sendEmailMutation.isSuccess}
                      className="h-9 px-4 text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Navigation */}
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(Math.min(pendingItems.length - 1, currentIndex + 1))}
            disabled={currentIndex >= pendingItems.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        
        {/* Next Up Teaser */}
        {nextItem && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Next up:</p>
            <p className="text-sm font-medium">
              <strong>{nextItem.contact.name}</strong>
              {nextItem.contact.role && `, ${nextItem.contact.role}`} at {nextItem.company.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}