import { Button } from "@/components/ui/button";
import { ChevronDown, CheckSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ContactList, Campaign, Contact } from "@shared/schema";

interface SelectionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  selectedContactIds: number[];
}

export function SelectionToolbar({ selectedCount, onClear, selectedContactIds }: SelectionToolbarProps) {
  const [showListSelector, setShowListSelector] = useState(false);
  const [showCampaignSelector, setShowCampaignSelector] = useState(false);
  const [selectedContactList, setSelectedContactList] = useState<string>("");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const { toast } = useToast();
  const checkboxRef = useRef<HTMLButtonElement>(null);
  
  // Confirmation dialog state
  const [confirmListDialogOpen, setConfirmListDialogOpen] = useState(false);
  const [confirmCampaignDialogOpen, setConfirmCampaignDialogOpen] = useState(false);
  const [pendingListId, setPendingListId] = useState<number | null>(null);
  const [pendingCampaignId, setPendingCampaignId] = useState<number | null>(null);
  const [invalidContactsCount, setInvalidContactsCount] = useState(0);
  
  // Report dialog state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    totalSubmitted: number;
    noEmailError: number;
    duplicationError: number;
    successfullyAdded: number;
    operationType: 'list' | 'campaign';
  } | null>(null);
  
  // Log initial state for debugging
  useEffect(() => {
    console.log('[SelectionToolbar] Component mounted/updated:', {
      selectedCount,
      selectedContactIds,
      contactIdCount: selectedContactIds.length
    });
  }, [selectedCount, selectedContactIds]);

  // Set indeterminate state on the checkbox element and apply blue styling
  useEffect(() => {
    if (checkboxRef.current) {
      const input = checkboxRef.current.querySelector('input');
      if (input) {
        input.indeterminate = selectedCount > 0;
      }
    }
  }, [selectedCount]);

  // Fetch contact lists
  const { data: contactLists = [] } = useQuery<ContactList[]>({
    queryKey: ['/api/contact-lists'],
  });

  // Fetch active campaigns
  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['/api/campaigns'],
  });
  
  // Filter to only show active campaigns
  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  
  // Fetch contact details for selected IDs to check for emails
  const { data: selectedContacts = [] } = useQuery<Contact[]>({
    queryKey: ['/api/contacts/bulk', selectedContactIds],
    queryFn: async () => {
      if (selectedContactIds.length === 0) return [];
      const response = await fetch('/api/contacts/bulk?' + new URLSearchParams({
        ids: selectedContactIds.join(',')
      }));
      if (!response.ok) {
        throw new Error('Failed to fetch contact details');
      }
      return response.json();
    },
    enabled: selectedContactIds.length > 0,
  });

  const addContactsMutation = useMutation({
    mutationFn: async ({ contactListId, contactIds }: { contactListId: number; contactIds: number[] }) => {
      console.log('[SelectionToolbar] Making API request to add contacts:', {
        contactListId,
        contactIds,
        endpoint: `/api/contact-lists/${contactListId}/contacts`
      });
      
      const response = await apiRequest(
        'POST',
        `/api/contact-lists/${contactListId}/contacts`,
        { contactIds }
      );
      const data = await response.json();
      console.log('[SelectionToolbar] API response:', data);
      return data;
    },
    onSuccess: (data, { contactListId }) => {
      console.log('[SelectionToolbar] Mutation succeeded:', { data, contactListId });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/contact-lists'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contact-lists/${contactListId}/contacts`] });
      
      // Show report dialog with results
      setReportData({
        totalSubmitted: selectedContactIds.length,
        noEmailError: data.noEmailCount || 0,
        duplicationError: data.duplicateCount || 0,
        successfullyAdded: data.addedCount || 0,
        operationType: 'list'
      });
      setReportDialogOpen(true);
      
      // DON'T clear selections here - wait for report dialog to close
      // This keeps SelectionToolbar mounted so the dialog can be shown
      setShowListSelector(false);
      setSelectedContactList("");
      setPendingListId(null);
      setConfirmListDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('[SelectionToolbar] Mutation failed:', error);
      toast({
        title: "Error adding contacts",
        description: error.message || "Failed to add contacts to the list",
        variant: "destructive",
      });
    }
  });

  const addContactsToCampaignMutation = useMutation({
    mutationFn: async ({ campaignId, contactIds }: { campaignId: number; contactIds: number[] }) => {
      console.log('[SelectionToolbar] Making API request to add contacts to campaign:', {
        campaignId,
        contactIds,
        endpoint: `/api/campaigns/${campaignId}/add-contacts`
      });
      
      const response = await apiRequest(
        'POST',
        `/api/campaigns/${campaignId}/add-contacts`,
        { contactIds }
      );
      const data = await response.json();
      console.log('[SelectionToolbar] Campaign API response:', data);
      return data;
    },
    onSuccess: (data, { campaignId }) => {
      console.log('[SelectionToolbar] Campaign mutation succeeded:', { data, campaignId });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/campaigns'] });
      queryClient.invalidateQueries({ queryKey: [`/api/campaigns/${campaignId}`] });
      
      // Show report dialog with results
      setReportData({
        totalSubmitted: selectedContactIds.length,
        noEmailError: data.noEmailCount || 0,
        duplicationError: data.duplicateCount || 0,
        successfullyAdded: data.addedCount || 0,
        operationType: 'campaign'
      });
      setReportDialogOpen(true);
      
      // DON'T clear selections here - wait for report dialog to close
      // This keeps SelectionToolbar mounted so the dialog can be shown
      setShowCampaignSelector(false);
      setSelectedCampaign("");
      setPendingCampaignId(null);
      setConfirmCampaignDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('[SelectionToolbar] Campaign mutation failed:', error);
      toast({
        title: "Error adding contacts to campaign",
        description: error.message || "Failed to add contacts to the campaign",
        variant: "destructive",
      });
    }
  });

  // Handle list selection - Show confirmation dialog
  useEffect(() => {
    if (selectedContactList && selectedContactList !== "") {
      const listId = parseInt(selectedContactList);
      console.log('[SelectionToolbar] Contact list selected:', {
        selectedContactList,
        listId,
        selectedContactIds,
        contactCount: selectedContactIds.length
      });
      
      if (!isNaN(listId) && selectedContactIds.length > 0) {
        // Calculate invalid contacts
        const invalidCount = selectedContacts.filter(c => !c.email).length;
        setInvalidContactsCount(invalidCount);
        setPendingListId(listId);
        setShowListSelector(false); // Hide selector immediately
        
        // Defer opening the dialog to ensure the dropdown has fully closed
        // This prevents the selection click from auto-confirming the dialog
        setTimeout(() => {
          setConfirmListDialogOpen(true);
        }, 100);
      } else if (selectedContactIds.length === 0) {
        console.warn('[SelectionToolbar] No contacts selected to add');
        toast({
          title: "No contacts selected",
          description: "Please select contacts before adding them to a list.",
          variant: "destructive",
        });
        setSelectedContactList("");
        setShowListSelector(false);
      }
    }
  }, [selectedContactList, selectedContactIds, selectedContacts, toast]);

  // Handle campaign selection - Show confirmation dialog
  useEffect(() => {
    if (selectedCampaign && selectedCampaign !== "") {
      const campaignId = parseInt(selectedCampaign);
      console.log('[SelectionToolbar] Campaign selected:', {
        selectedCampaign,
        campaignId,
        selectedContactIds,
        contactCount: selectedContactIds.length
      });
      
      if (!isNaN(campaignId) && selectedContactIds.length > 0) {
        // Calculate invalid contacts
        const invalidCount = selectedContacts.filter(c => !c.email).length;
        setInvalidContactsCount(invalidCount);
        setPendingCampaignId(campaignId);
        setShowCampaignSelector(false); // Hide selector immediately
        
        // Defer opening the dialog to ensure the dropdown has fully closed
        // This prevents the selection click from auto-confirming the dialog
        setTimeout(() => {
          setConfirmCampaignDialogOpen(true);
        }, 100);
      } else if (selectedContactIds.length === 0) {
        console.warn('[SelectionToolbar] No contacts selected to add to campaign');
        toast({
          title: "No contacts selected",
          description: "Please select contacts before adding them to a campaign.",
          variant: "destructive",
        });
        setSelectedCampaign("");
        setShowCampaignSelector(false);
      }
    }
  }, [selectedCampaign, selectedContactIds, selectedContacts, toast]);
  
  // Handlers for confirmation dialogs
  const handleConfirmAddToList = () => {
    if (pendingListId) {
      console.log('[SelectionToolbar] Confirmed adding to list');
      addContactsMutation.mutate({
        contactListId: pendingListId,
        contactIds: selectedContactIds,
      });
    }
    setConfirmListDialogOpen(false);
    setPendingListId(null);
    setSelectedContactList("");
  };
  
  const handleCancelAddToList = () => {
    setConfirmListDialogOpen(false);
    setPendingListId(null);
    setSelectedContactList("");
  };
  
  const handleConfirmAddToCampaign = () => {
    if (pendingCampaignId) {
      console.log('[SelectionToolbar] Confirmed adding to campaign');
      addContactsToCampaignMutation.mutate({
        campaignId: pendingCampaignId,
        contactIds: selectedContactIds,
      });
    }
    setConfirmCampaignDialogOpen(false);
    setPendingCampaignId(null);
    setSelectedCampaign("");
  };
  
  const handleCancelAddToCampaign = () => {
    setConfirmCampaignDialogOpen(false);
    setPendingCampaignId(null);
    setSelectedCampaign("");
  };

  // Mobile: Fixed bottom toolbar
  // Desktop: Inline with top buttons
  const isMobile = window.innerWidth < 768;

  const toolbar = (
    <div className={`flex items-center gap-2 ${isMobile ? 'w-full justify-between px-4 py-2 bg-background border-t' : ''}`}>
      {showListSelector ? (
        <Select
          value={selectedContactList}
          onValueChange={(value) => {
            console.log('[SelectionToolbar] List value changed:', value);
            setSelectedContactList(value);
          }}
          onOpenChange={(open) => {
            console.log('[SelectionToolbar] Select open state changed:', open);
            if (!open) {
              setShowListSelector(false);
              // Don't reset selectedContactList here - let the mutation handle cleanup
            }
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Choose a contact list" />
          </SelectTrigger>
          <SelectContent>
            {contactLists.map((list) => (
              <SelectItem key={list.id} value={list.id.toString()}>
                <div className="flex items-center justify-between w-full">
                  <span>{list.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {list.contactCount} contacts
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : showCampaignSelector ? (
        <Select
          value={selectedCampaign}
          onValueChange={(value) => {
            console.log('[SelectionToolbar] Campaign value changed:', value);
            setSelectedCampaign(value);
          }}
          onOpenChange={(open) => {
            console.log('[SelectionToolbar] Campaign select open state changed:', open);
            if (!open) {
              setShowCampaignSelector(false);
              // Don't reset selectedCampaign here - let the mutation handle cleanup
            }
          }}
        >
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder={
              activeCampaigns.length === 0 
                ? "No active campaigns available" 
                : "Choose an active campaign"
            } />
          </SelectTrigger>
          <SelectContent>
            {activeCampaigns.length === 0 ? (
              <div className="p-2 text-sm text-muted-foreground">
                No active campaigns found. Please create and activate a campaign first.
              </div>
            ) : (
              activeCampaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id.toString()}>
                  <div className="flex flex-col">
                    <span>{campaign.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {campaign.subject ? campaign.subject.substring(0, 50) + '...' : 'No subject'}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1.5">
          {/* Gmail-style checkbox with indeterminate state */}
          <Checkbox
            ref={checkboxRef}
            checked={selectedCount > 0 ? "indeterminate" : false}
            onCheckedChange={() => onClear()}
            className="h-4 w-4 ml-1 data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[state=indeterminate]:border-primary"
            aria-label={`${selectedCount} selected, click to deselect all`}
          />
          
          {/* Selected count displayed separately */}
          <span className="text-primary text-[11px] font-medium">{selectedCount}</span>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 px-2 text-[11px] font-medium text-gray-600"
                title="Add selected to list"
              >
                Add to
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                console.log('[SelectionToolbar] "Contact List" clicked, showing selector');
                setShowListSelector(true);
              }}>
                Contact List
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                console.log('[SelectionToolbar] "Campaign" clicked, showing selector');
                setShowCampaignSelector(true);
              }}>
                Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    // Mobile: Fixed bottom position
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-40 shadow-lg border-t">
          {toolbar}
        </div>
        
        {/* Contact List Confirmation Dialog */}
        <Dialog open={confirmListDialogOpen} onOpenChange={setConfirmListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Adding Contacts</DialogTitle>
              <DialogDescription>
                Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to "{contactLists.find(l => l.id === pendingListId)?.name}".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelAddToList}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAddToList}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Campaign Confirmation Dialog */}
        <Dialog open={confirmCampaignDialogOpen} onOpenChange={setConfirmCampaignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Adding Contacts</DialogTitle>
              <DialogDescription>
                Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to campaign "{campaigns.find(c => c.id === pendingCampaignId)?.name}".
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleCancelAddToCampaign}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAddToCampaign}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Report Dialog - Shows after operation completes */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Operation Report</DialogTitle>
              <DialogDescription>
                Results of adding contacts to {reportData?.operationType === 'list' ? 'contact list' : 'campaign'}:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total contacts submitted:</span>
                <span className="text-sm font-medium">{reportData?.totalSubmitted || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">No email error:</span>
                <span className="text-sm font-medium text-amber-600">{reportData?.noEmailError || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duplication error:</span>
                <span className="text-sm font-medium text-amber-600">{reportData?.duplicationError || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Successfully added:</span>
                <span className="text-sm font-medium text-green-600">{reportData?.successfullyAdded || 0}</span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => {
                setReportDialogOpen(false);
                onClear(); // Clear selections now that user has seen the report
              }}>
                OK
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Desktop: Return inline toolbar for parent to place
  return (
    <>
      {toolbar}
      
      {/* Contact List Confirmation Dialog */}
      <Dialog open={confirmListDialogOpen} onOpenChange={setConfirmListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Adding Contacts</DialogTitle>
            <DialogDescription>
              Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to "{contactLists.find(l => l.id === pendingListId)?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelAddToList}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddToList}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Campaign Confirmation Dialog */}
      <Dialog open={confirmCampaignDialogOpen} onOpenChange={setConfirmCampaignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Adding Contacts</DialogTitle>
            <DialogDescription>
              Adding {selectedCount} contact{selectedCount !== 1 ? 's' : ''} to campaign "{campaigns.find(c => c.id === pendingCampaignId)?.name}".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelAddToCampaign}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmAddToCampaign}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Report Dialog - Shows after operation completes */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operation Report</DialogTitle>
            <DialogDescription>
              Results of adding contacts to {reportData?.operationType === 'list' ? 'contact list' : 'campaign'}:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total contacts submitted:</span>
              <span className="text-sm font-medium">{reportData?.totalSubmitted || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">No email error:</span>
              <span className="text-sm font-medium text-amber-600">{reportData?.noEmailError || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Duplication error:</span>
              <span className="text-sm font-medium text-amber-600">{reportData?.duplicationError || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Successfully added:</span>
              <span className="text-sm font-medium text-green-600">{reportData?.successfullyAdded || 0}</span>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setReportDialogOpen(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}