import { useState } from 'react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Box, Palette, Gift, Check, Info, Wand2, Loader2, IdCard, Plus, Edit2, Trash2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_OPTIONS } from "@/lib/tone-options";
import { OFFER_OPTIONS } from "@/lib/offer-options";
import { getGenerationModeConfig } from "@/components/email-generation-tabs";
import type { EmailGenerationControlsProps, SenderProfile } from './types';
import { ProfileModal } from './ProfileModal';
import { ProfileDropdown } from './ProfileDropdown';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function EmailGenerationControls({
  selectedProduct,
  selectedProductData,
  onProductSelect,
  onProductClear,
  selectedTone,
  onToneSelect,
  selectedOfferStrategy,
  onOfferStrategySelect,
  selectedSenderProfile,
  onSenderProfileSelect,
  senderProfiles,
  products,
  emailPrompt,
  originalEmailPrompt,
  onPromptChange,
  onPromptResize,
  promptTextareaRef,
  getDisplayValue,
  onGenerate,
  isGenerating,
  drawerMode = 'compose',
  generationMode = 'merge_field'
}: EmailGenerationControlsProps) {
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [senderPopoverOpen, setSenderPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Sender profile state
  const [senderModalOpen, setSenderModalOpen] = useState(false);
  const [editingSenderProfile, setEditingSenderProfile] = useState<SenderProfile | null>(null);
  const [hoveredSenderProfileId, setHoveredSenderProfileId] = useState<number | null>(null);
  const [deleteSenderDialogOpen, setDeleteSenderDialogOpen] = useState(false);
  const [senderProfileToDelete, setSenderProfileToDelete] = useState<SenderProfile | null>(null);
  
  // Product state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteProductDialogOpen, setDeleteProductDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Find the selected sender profile from the list
  const selectedSenderProfileData = senderProfiles.find(p => p.id === selectedSenderProfile);

  const handleSelectProduct = (product: any) => {
    onProductSelect(product);
    setProductPopoverOpen(false);
  };

  const handleSelectNone = () => {
    onProductClear();
    setProductPopoverOpen(false);
  };

  const handleSelectSenderProfile = (profile: any) => {
    onSenderProfileSelect(profile.id);
    setSenderPopoverOpen(false);
  };

  // Sender profile handlers
  const handleAddNewSenderProfile = () => {
    setEditingSenderProfile(null);
    setSenderModalOpen(true);
    setSenderPopoverOpen(false);
  };

  const handleEditSenderProfile = (profile: SenderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSenderProfile(profile);
    setSenderModalOpen(true);
    setSenderPopoverOpen(false);
  };

  const handleDeleteSenderClick = (profile: SenderProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    setSenderProfileToDelete(profile);
    setDeleteSenderDialogOpen(true);
    setSenderPopoverOpen(false);
  };

  // Product handlers
  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
    setProductPopoverOpen(false);
  };

  const handleEditProduct = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProduct(product);
    setProductModalOpen(true);
    setProductPopoverOpen(false);
  };

  const handleDeleteProductClick = (product: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setProductToDelete(product);
    setDeleteProductDialogOpen(true);
    setProductPopoverOpen(false);
  };

  // Delete sender profile mutation
  const deleteSenderMutation = useMutation({
    mutationFn: async (profileId: number) =>
      apiRequest('DELETE', `/api/sender-profiles/${profileId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Sender profile deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sender-profiles'] });
      
      // If the deleted profile was selected, clear the selection
      if (selectedSenderProfile === senderProfileToDelete?.id) {
        onSenderProfileSelect(null);
      }
      
      setDeleteSenderDialogOpen(false);
      setSenderProfileToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete sender profile",
        variant: "destructive"
      });
    }
  });

  const handleConfirmDeleteSender = () => {
    if (senderProfileToDelete) {
      deleteSenderMutation.mutate(senderProfileToDelete.id);
    }
  };

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) =>
      apiRequest('DELETE', `/api/strategic-profiles/${productId}`),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Product deleted successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/strategic-profiles'] });
      
      // If the deleted product was selected, clear the selection
      if (selectedProduct === productToDelete?.id) {
        onProductClear();
      }
      
      setDeleteProductDialogOpen(false);
      setProductToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive"
      });
    }
  });

  const handleConfirmDeleteProduct = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete.id);
    }
  };

  return (
    <div className="relative border-t border-b rounded-tr-lg md:border-t-0 md:border-b-0 md:mb-6 mb-4 overflow-hidden">
      <Textarea
        ref={promptTextareaRef}
        placeholder="Add product, e.g.: Stationary products & printers"
        value={getDisplayValue(emailPrompt, originalEmailPrompt)}
        onChange={(e) => {
          onPromptChange(e.target.value);
          onPromptResize();
        }}
        className="mobile-input mobile-input-text-fix resize-none transition-all duration-200 pb-8 border-0 rounded-none md:border md:rounded-md px-3 md:px-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
        style={{ minHeight: '32px', maxHeight: '120px' }}
      />
      <div className="absolute bottom-1 left-2 flex items-center gap-2">
        {/* Product Selection */}
        <ProfileDropdown
          items={products}
          selectedId={selectedProduct}
          onSelect={(product) => {
            if (product) {
              handleSelectProduct(product);
            } else {
              handleSelectNone();
            }
          }}
          triggerIcon={<Box className="w-3 h-3" />}
          triggerLabel={selectedProductData ? (selectedProductData.title || selectedProductData.productService || 'Product') : undefined}
          headerIcon={<Box className="w-4 h-4 text-primary" />}
          headerTitle="Product Context"
          headerDescription="Insert from your existing product list"
          noneDescription="No specific product context"
          onAddNew={handleAddNewProduct}
          addNewLabel="Add New Product"
          onEdit={handleEditProduct}
          onDelete={handleDeleteProductClick}
          renderItem={(product) => (
            <>
              <div className="font-medium truncate">
                {product.title || product.productService || 'Untitled Product'}
              </div>
              {product.productService && product.title !== product.productService && (
                <div className="text-muted-foreground truncate mt-0.5">
                  {product.productService}
                </div>
              )}
            </>
          )}
          isOpen={productPopoverOpen}
          onOpenChange={setProductPopoverOpen}
          testIdPrefix="product"
        />

        {/* Tone Selection */}
        <Popover open={tonePopoverOpen} onOpenChange={setTonePopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
              title="Select email tone"
              data-testid="button-tone-selector"
            >
              <Palette className="w-3 h-3" />
              <span>{TONE_OPTIONS.find(t => t.id === selectedTone)?.name || 'Casual'}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Email Tone</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Choose the personality for your email</p>
            </div>
            <div className="p-2">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                    selectedTone === tone.id && "bg-accent"
                  )}
                  onClick={() => {
                    onToneSelect(tone.id);
                    setTonePopoverOpen(false);
                  }}
                  data-testid={`button-tone-${tone.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">{tone.name}</span>
                      <span className="text-muted-foreground"> - {tone.description}</span>
                    </div>
                    {selectedTone === tone.id && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Offer Strategy Selection */}
        <Popover open={offerPopoverOpen} onOpenChange={setOfferPopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-blue-50 transition-colors text-xs text-muted-foreground"
              title="Select offer strategy"
              data-testid="button-offer-selector"
            >
              <Gift className="w-3 h-3" />
              {selectedOfferStrategy !== 'none' && (
                <span>{OFFER_OPTIONS.find(o => o.id === selectedOfferStrategy)?.name}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Offer Strategy</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Optional: Structure your offer for maximum impact</p>
            </div>
            <div className="p-2">
              {OFFER_OPTIONS.map((offer) => (
                <button
                  key={offer.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                    selectedOfferStrategy === offer.id && "bg-accent"
                  )}
                  onClick={() => {
                    onOfferStrategySelect(offer.id);
                    setOfferPopoverOpen(false);
                  }}
                  data-testid={`button-offer-${offer.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium">{offer.name}</span>
                      <span className="text-muted-foreground"> - {offer.description}</span>
                    </div>
                    {selectedOfferStrategy === offer.id && (
                      <Check className="w-3 h-3 text-primary" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Sender Profile Selection */}
        <Popover open={senderPopoverOpen} onOpenChange={setSenderPopoverOpen}>
          <PopoverTrigger asChild>
            <button 
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded transition-colors text-xs text-muted-foreground",
                selectedSenderProfile ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"
              )}
              title="Select sender profile"
              data-testid="button-sender-selector"
            >
              <IdCard className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="start">
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Sender Profile</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Choose who's sending this email</p>
            </div>
            <div className="p-2 space-y-1">
              {/* None Option */}
              <button
                className={cn(
                  "w-full text-left p-3 rounded-md hover:bg-accent transition-colors",
                  selectedSenderProfile === null && "bg-accent"
                )}
                onClick={() => {
                  onSenderProfileSelect(null);
                  setSenderPopoverOpen(false);
                }}
                data-testid="button-sender-none"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-medium">None</span>
                    <span className="text-muted-foreground"> - No sender context</span>
                  </div>
                  {selectedSenderProfile === null && (
                    <Check className="w-3 h-3 text-primary" />
                  )}
                </div>
              </button>
              
              {/* Existing sender profiles */}
              {senderProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className={cn(
                    "w-full text-left p-3 rounded-md hover:bg-accent transition-colors group relative",
                    selectedSenderProfile === profile.id && "bg-accent"
                  )}
                  onClick={() => handleSelectSenderProfile(profile)}
                  onMouseEnter={() => setHoveredSenderProfileId(profile.id)}
                  onMouseLeave={() => setHoveredSenderProfileId(null)}
                  data-testid={`button-sender-${profile.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{profile.displayName}</span>
                        {profile.source === 'registered' && (
                          <span className="text-xs text-muted-foreground">(Registered User)</span>
                        )}
                        {profile.source === 'gmail' && (
                          <span className="text-xs text-muted-foreground">(Gmail API)</span>
                        )}
                      </div>
                      {profile.companyPosition && (
                        <div className="text-muted-foreground truncate mt-0.5">
                          {profile.companyPosition} {profile.companyName && `at ${profile.companyName}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Show check/star when not hovering THIS specific profile */}
                      {hoveredSenderProfileId !== profile.id && (
                        <>
                          {selectedSenderProfile === profile.id && (
                            <Check className="w-3 h-3 text-primary" />
                          )}
                          {profile.isDefault && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </>
                      )}
                      {/* Show edit/delete when hovering THIS specific profile */}
                      {hoveredSenderProfileId === profile.id && (
                        <>
                          <button
                            onClick={(e) => handleEditSenderProfile(profile, e)}
                            className="p-1 rounded hover:bg-accent-foreground/10"
                            title="Edit profile"
                            data-testid={`button-edit-sender-${profile.id}`}
                          >
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSenderClick(profile, e)}
                            className="p-1 rounded hover:bg-accent-foreground/10 hover:text-destructive"
                            title="Delete profile"
                            data-testid={`button-delete-sender-${profile.id}`}
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              
              {/* Add New button */}
              <button
                className="w-full text-left p-3 rounded-md hover:bg-accent transition-colors border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40"
                onClick={handleAddNewSenderProfile}
                data-testid="button-add-new-sender"
              >
                <div className="flex items-center gap-2 text-xs">
                  <Plus className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Add New Profile</span>
                </div>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-2">
        <TooltipProvider>
          <Tooltip open={tooltipOpen} onOpenChange={setTooltipOpen}>
            <TooltipTrigger asChild>
              <button 
                className="p-1 rounded hover:bg-accent transition-colors"
                onClick={() => setTooltipOpen(!tooltipOpen)}
                onBlur={() => setTooltipOpen(false)}
                data-testid="button-info-tooltip"
              >
                <Info className="w-3 h-3 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-sm max-w-xs">
              <p>Give us a sentence about your offer and we'll generate the email for you. It'll be awesome.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button 
          onClick={onGenerate} 
          variant={drawerMode === 'campaign' ? "default" : "yellow"}
          disabled={isGenerating}
          className={cn(
            "h-8 px-3 text-xs hover:scale-105 transition-all duration-300 ease-out",
            drawerMode === 'campaign' && getGenerationModeConfig(generationMode).buttonColor
          )}
          data-testid="button-generate-email"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          {isGenerating 
            ? "Generating..." 
            : drawerMode === 'campaign' 
              ? getGenerationModeConfig(generationMode).buttonText
              : "Generate Email"
          }
        </Button>
      </div>

      {/* Sender Profile Modal */}
      <ProfileModal
        profileType="sender"
        isOpen={senderModalOpen}
        onClose={() => {
          setSenderModalOpen(false);
          setEditingSenderProfile(null);
        }}
        profile={editingSenderProfile}
        onSuccess={() => {
          setSenderModalOpen(false);
          setEditingSenderProfile(null);
        }}
      />

      {/* Product Modal */}
      <ProfileModal
        profileType="product"
        isOpen={productModalOpen}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        profile={editingProduct}
        onSuccess={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Delete Sender Profile Dialog */}
      <AlertDialog open={deleteSenderDialogOpen} onOpenChange={setDeleteSenderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sender Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the sender profile "{senderProfileToDelete?.displayName}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteSenderDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteSender}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Product Dialog */}
      <AlertDialog open={deleteProductDialogOpen} onOpenChange={setDeleteProductDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the product "{productToDelete?.title || productToDelete?.productService}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteProductDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}