import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { SenderProfile } from '@shared/schema';

interface SenderProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: SenderProfile | null;
  onSuccess?: () => void;
}

export function SenderProfileModal({
  isOpen,
  onClose,
  profile,
  onSuccess
}: SenderProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!profile;

  // Form state
  const [formData, setFormData] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    displayName: profile?.displayName || '',
    email: profile?.email || '',
    companyName: profile?.companyName || '',
    companyPosition: profile?.companyPosition || '',
    companyWebsite: profile?.companyWebsite || '',
    title: profile?.title || ''
  });

  // Auto-generate display name when first/last name changes
  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    const newData = { ...formData, [field]: value };
    
    // Auto-generate display name if not manually edited
    if (!profile || formData.displayName === `${formData.firstName} ${formData.lastName}`.trim()) {
      const firstName = field === 'firstName' ? value : formData.firstName;
      const lastName = field === 'lastName' ? value : formData.lastName;
      newData.displayName = `${firstName} ${lastName}`.trim() || '';
    }
    
    setFormData(newData);
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => 
      apiRequest('POST', '/api/sender-profiles', data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sender profile created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sender profile",
        variant: "destructive"
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) =>
      apiRequest('PUT', `/api/sender-profiles/${profile?.id}`, data),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sender profile updated successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'] });
      onSuccess?.();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update sender profile",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: "Validation Error",
        description: "First name, last name, and email are required",
        variant: "destructive"
      });
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Sender Profile' : 'Create New Sender Profile'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleNameChange('firstName', e.target.value)}
                placeholder="John"
                required
                data-testid="input-first-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleNameChange('lastName', e.target.value)}
                placeholder="Doe"
                required
                data-testid="input-last-name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="John Doe (auto-generated if empty)"
              data-testid="input-display-name"
            />
            <p className="text-xs text-muted-foreground">
              This is how your name will appear in the dropdown
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john.doe@company.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Dr., Mr., Ms."
                data-testid="input-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyPosition">Position</Label>
              <Input
                id="companyPosition"
                value={formData.companyPosition}
                onChange={(e) => setFormData({ ...formData, companyPosition: e.target.value })}
                placeholder="Sales Manager"
                data-testid="input-company-position"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Acme Corp"
                data-testid="input-company-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Company Website</Label>
              <Input
                id="companyWebsite"
                value={formData.companyWebsite}
                onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                placeholder="https://example.com"
                data-testid="input-company-website"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-submit"
            >
              {isSubmitting 
                ? (isEditing ? 'Updating...' : 'Creating...')
                : (isEditing ? 'Update Profile' : 'Create Profile')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}