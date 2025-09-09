import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Edit3, 
  SkipForward, 
  Clock, 
  Building2, 
  User, 
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const token = params.token;
  
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editedSubject, setEditedSubject] = useState<string>('');
  const [editedBody, setEditedBody] = useState<string>('');
  
  // Fetch batch data
  const { data, isLoading, error } = useQuery({
    queryKey: [`/api/daily-outreach/batch/${token}`],
    enabled: !!token,
  });
  
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
        title: 'Email marked as sent',
        description: 'Great job on your outreach!'
      });
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
      toast({
        title: 'Email skipped',
        description: 'You can always come back to it later'
      });
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
  
  const copyToClipboard = (subject: string, body: string, email: string) => {
    const emailContent = `To: ${email}\nSubject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(emailContent);
    toast({
      title: 'Copied to clipboard',
      description: 'Email content ready to paste'
    });
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-lg">Loading your daily outreach...</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-6 w-6" />
              Unable to Load Outreach
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">This link may be expired or invalid.</p>
            <Button onClick={() => setLocation('/')}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const { batch, items } = data as { batch: OutreachBatch; items: OutreachItem[] };
  const pendingItems = items?.filter((item: OutreachItem) => item.status === 'pending') || [];
  const sentItems = items?.filter((item: OutreachItem) => item.status === 'sent') || [];
  const skippedItems = items?.filter((item: OutreachItem) => item.status === 'skipped') || [];
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Daily Outreach</h1>
        <p className="text-muted-foreground">
          Review and send your personalized emails to today's prospects
        </p>
        
        {/* Progress Summary */}
        <div className="flex gap-4 mt-4">
          <Badge variant="outline" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {pendingItems.length} Pending
          </Badge>
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {sentItems.length} Sent
          </Badge>
          {skippedItems.length > 0 && (
            <Badge variant="outline" className="gap-1 text-yellow-600">
              <SkipForward className="h-3 w-3" />
              {skippedItems.length} Skipped
            </Badge>
          )}
        </div>
      </div>
      
      {/* Email Cards */}
      <div className="space-y-6">
        {items?.map((item: OutreachItem) => (
          <Card key={item.id} className={item.status !== 'pending' ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {item.company.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {item.contact.name}
                      {item.contact.role && ` - ${item.contact.role}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {item.contact.email}
                    </span>
                  </CardDescription>
                </div>
                
                {item.status === 'sent' && (
                  <Badge className="bg-green-100 text-green-800">Sent</Badge>
                )}
                {item.status === 'skipped' && (
                  <Badge className="bg-yellow-100 text-yellow-800">Skipped</Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {editingItem === item.id ? (
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
                      rows={8}
                      placeholder="Email body..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleSave(item.id)}
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
                    <p className="text-sm bg-muted p-2 rounded">{item.emailSubject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap">
                      {item.emailBody}
                    </div>
                  </div>
                  
                  {item.status === 'pending' && (
                    <div className="flex gap-2 pt-2">
                      <Button 
                        onClick={() => handleEdit(item)}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(item.emailSubject, item.emailBody, item.contact.email)}
                        variant="outline"
                        size="sm"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Copy Email
                      </Button>
                      <Button
                        onClick={() => markSent.mutate(item.id)}
                        disabled={markSent.isPending}
                        size="sm"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Mark as Sent
                      </Button>
                      <Button
                        onClick={() => skipItem.mutate(item.id)}
                        disabled={skipItem.isPending}
                        variant="ghost"
                        size="sm"
                      >
                        <SkipForward className="h-4 w-4 mr-1" />
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Completion Message */}
      {pendingItems.length === 0 && sentItems.length > 0 && (
        <Card className="mt-8 bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-6 w-6" />
              Great job!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700">
              You've completed your daily outreach. Check back tomorrow for your next batch of leads!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}