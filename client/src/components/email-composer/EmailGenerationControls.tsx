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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Box, Palette, Gift, Check, Info, Wand2, Loader2, IdCard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_OPTIONS } from "@/lib/tone-options";
import { OFFER_OPTIONS } from "@/lib/offer-options";
import { getGenerationModeConfig } from "@/components/email-generation-tabs";
import type { EmailGenerationControlsProps } from './types';
import { PromptContextBuilderDropdown } from './PromptContextBuilderDropdown';

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
  const [tonePopoverOpen, setTonePopoverOpen] = useState(false);
  const [offerPopoverOpen, setOfferPopoverOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  
  // Find the selected sender profile from the list
  const selectedSenderProfileData = senderProfiles.find(p => p.id === selectedSenderProfile);

  return (
    <div className="relative border-t border-b rounded-tr-lg md:border-t-0 md:border-b-0 md:mb-6 mb-4 overflow-hidden">
      <div className="relative">
        {/* Product Chip Display */}
        {selectedProductData && (
          <div className="flex items-center gap-2 p-2 border-b">
            <div className="group flex items-center gap-2 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm font-medium">
              <Box className="w-3 h-3" />
              <span>{selectedProductData.title}</span>
              <button
                onClick={onProductClear}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-destructive"
                title="Remove product"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        
        <Textarea
          ref={promptTextareaRef}
          placeholder={selectedProductData ? "Add additional context or instructions..." : "Add product, e.g.: Stationary products & printers"}
          value={getDisplayValue(emailPrompt, originalEmailPrompt)}
          onChange={(e) => {
            onPromptChange(e.target.value);
            onPromptResize();
          }}
          className="mobile-input mobile-input-text-fix resize-none transition-all duration-200 pb-8 border-0 rounded-none md:border md:rounded-md px-3 md:px-3 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
          style={{ minHeight: '32px', maxHeight: '120px' }}
        />
      </div>
      <div className="absolute bottom-1 left-2 flex items-center gap-2">
        {/* Product Selection */}
        <PromptContextBuilderDropdown
          contextType="product"
          items={products}
          selectedId={selectedProduct}
          onSelect={(id) => {
            if (id !== null) {
              const product = products.find(p => p.id === id);
              if (product) {
                onProductSelect(product);
              }
            } else {
              onProductClear();
            }
          }}
          triggerIcon={<Box className="w-3 h-3" />}
          triggerClassName="text-xs text-muted-foreground"
          headerTitle="Product Context"
          headerDescription="Insert from your existing product list"
          noneDescription="No specific product context"
          addNewLabel="Add New Product"
          showSource={false}
          showPosition={false}
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
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Email Tone</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Choose the personality for your email</p>
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
            <div className="px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">Offer Strategy</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Optional: Structure your offer for maximum impact</p>
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
        <PromptContextBuilderDropdown
          contextType="sender"
          items={senderProfiles}
          selectedId={selectedSenderProfile}
          onSelect={onSenderProfileSelect}
          triggerIcon={<IdCard className="w-3 h-3" />}
          triggerClassName="text-xs text-muted-foreground"
          showTriggerLabel={false}
          headerTitle="Sender Profile"
          headerDescription="Sender context for email generation"
          noneDescription="No sender context"
          addNewLabel="Add New Profile"
          showSource={true}
          showPosition={true}
          testIdPrefix="sender"
        />
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

    </div>
  );
}