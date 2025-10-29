import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Building2, Target, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchResult {
  id: number;
  name: string;
  description: string | null;
  website: string | null;
  size: number | null;
  industry?: string;
}

interface SearchConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRefine: () => void;
  searchQuery: string;
  searchResults: SearchResult[];
}

export function SearchConfirmationModal({
  open,
  onClose,
  onConfirm,
  onRefine,
  searchQuery,
  searchResults
}: SearchConfirmationModalProps) {
  const [selectedResponse, setSelectedResponse] = useState<'perfect' | 'refine' | null>(null);

  const handleContinue = () => {
    if (selectedResponse === 'perfect') {
      onConfirm();
    } else if (selectedResponse === 'refine') {
      onRefine();
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Fullscreen modal content */}
      <div className="fixed inset-0 z-[101] bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 z-50 h-12 w-12 rounded-full bg-background/80 backdrop-blur hover:bg-background"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
          <span className="sr-only">Close</span>
        </Button>
        
        {/* Scrollable content */}
        <div className="h-full w-full overflow-auto">
          <div className="container max-w-4xl mx-auto p-6 md:p-8 pt-20 pb-10">
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Let's confirm your target market
              </h2>
              <p className="text-lg text-muted-foreground">
                We found {searchResults.length} companies matching your search. Before we set up your<br className="hidden md:block" />
                outreach campaign, let's make sure these are the right prospects.
              </p>
            </div>

            {/* Search query display */}
            <div className="mb-8">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-1">Your search:</p>
                <p className="text-muted-foreground">"{searchQuery}"</p>
              </div>
            </div>

            {/* Companies list */}
            <div className="mb-8">
              <ScrollArea className="h-[350px] md:h-[250px] border rounded-lg">
                <div className="p-4 space-y-3">
                  {searchResults.slice(0, 5).map((company) => (
                    <Card key={company.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium mb-1">{company.name}</h4>
                          {company.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {company.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                  {searchResults.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      ... and {searchResults.length - 5} more companies
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Selection options */}
            <div className="mb-8">
              <p className="font-medium text-lg mb-4">Are these the type of companies you want to reach?</p>
              <div className="grid md:grid-cols-2 gap-3">
                <Button
                  variant={selectedResponse === 'perfect' ? 'default' : 'outline'}
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => setSelectedResponse('perfect')}
                >
                  <CheckCircle className="h-5 w-5 mr-3 shrink-0" />
                  <div>
                    <div className="font-medium">Perfect match!</div>
                    <div className="text-sm opacity-90">These are exactly my ideal customers</div>
                  </div>
                </Button>
                <Button
                  variant={selectedResponse === 'refine' ? 'secondary' : 'outline'}
                  className="h-auto p-4 justify-start text-left"
                  onClick={() => setSelectedResponse('refine')}
                >
                  <AlertCircle className="h-5 w-5 mr-3 shrink-0" />
                  <div>
                    <div className="font-medium">No problem!</div>
                    <div className="text-sm opacity-90">You'll be able to refine your search criteria to find your ideal customers.</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col md:flex-row gap-3 justify-between">
              <Button 
                variant="outline" 
                size="lg"
                onClick={onClose}
                className="md:w-auto w-full"
              >
                Cancel
              </Button>
              <Button 
                size="lg"
                onClick={handleContinue}
                disabled={!selectedResponse}
                className="md:w-auto w-full"
              >
                {selectedResponse === 'refine' ? 'Refine Search' : 'Continue Setup'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}