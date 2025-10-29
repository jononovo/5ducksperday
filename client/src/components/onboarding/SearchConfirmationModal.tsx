import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, X, ThumbsUp, ThumbsDown, HelpCircle, Building2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

type CompanyRating = 'perfect' | 'unsure' | 'not-fit' | null;

export function SearchConfirmationModal({
  open,
  onClose,
  onConfirm,
  onRefine,
  searchQuery,
  searchResults
}: SearchConfirmationModalProps) {
  const [showRankingMode, setShowRankingMode] = useState(false);
  const [companyRatings, setCompanyRatings] = useState<Record<number, CompanyRating>>({});
  const [currentHighlightIndex, setCurrentHighlightIndex] = useState(0);

  const handleRateCompany = (companyId: number, rating: CompanyRating) => {
    setCompanyRatings(prev => ({ ...prev, [companyId]: rating }));
    
    // Move to next unrated company
    const nextUnratedIndex = searchResults.findIndex((company, idx) => 
      idx > currentHighlightIndex && !companyRatings[company.id] && companyRatings[company.id] !== rating
    );
    
    if (nextUnratedIndex !== -1) {
      setCurrentHighlightIndex(nextUnratedIndex);
    } else {
      // Check if all companies are rated
      const allRated = searchResults.every(company => 
        companyRatings[company.id] || (company.id === companyId && rating)
      );
      if (allRated) {
        // All companies rated, proceed to next step
        setTimeout(() => onConfirm(), 500);
      }
    }
  };

  const handleStartRanking = () => {
    setShowRankingMode(true);
    setCurrentHighlightIndex(0);
  };

  const handleNewSearch = () => {
    onClose();
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
          <div className="container max-w-5xl mx-auto p-6 md:p-8 pt-16 pb-10">
            {/* Compact Header */}
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-8 w-8 text-primary shrink-0" />
              <h2 className="text-2xl md:text-3xl font-bold">
                Let's confirm your target market
              </h2>
            </div>
            
            <p className="text-muted-foreground mb-4">
              We found {searchResults.length} companies matching your search. Before we set up your outreach campaign, let's make sure these are the right prospects.
            </p>

            {/* Search query display */}
            <div className="mb-4">
              <div className="p-3 bg-muted rounded-lg">
                <span className="font-medium">Your search:</span>
                <span className="text-muted-foreground ml-2">"{searchQuery}"</span>
              </div>
            </div>

            {/* Companies list with rating buttons */}
            <div className="mb-6">
              <ScrollArea className="h-[calc(100vh-380px)] md:h-[calc(100vh-320px)] border rounded-lg">
                <div className="p-4 space-y-3">
                  {searchResults.map((company, index) => (
                    <Card 
                      key={company.id} 
                      className={cn(
                        "p-4 transition-all duration-200",
                        showRankingMode && index === currentHighlightIndex && !companyRatings[company.id] && 
                        "ring-2 ring-primary shadow-lg scale-[1.02] bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium mb-1">{company.name}</h4>
                          {company.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {company.description}
                            </p>
                          )}
                        </div>
                        {showRankingMode && (
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={companyRatings[company.id] === 'perfect' ? 'default' : 'outline'}
                              className={cn(
                                "flex flex-col items-center gap-1 h-auto py-2 px-3",
                                companyRatings[company.id] === 'perfect' && "bg-green-500 hover:bg-green-600"
                              )}
                              onClick={() => handleRateCompany(company.id, 'perfect')}
                            >
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-xs">Perfect fit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant={companyRatings[company.id] === 'unsure' ? 'secondary' : 'outline'}
                              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
                              onClick={() => handleRateCompany(company.id, 'unsure')}
                            >
                              <HelpCircle className="h-4 w-4" />
                              <span className="text-xs">Not sure</span>
                            </Button>
                            <Button
                              size="sm"
                              variant={companyRatings[company.id] === 'not-fit' ? 'destructive' : 'outline'}
                              className="flex flex-col items-center gap-1 h-auto py-2 px-3"
                              onClick={() => handleRateCompany(company.id, 'not-fit')}
                            >
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-xs">Not a fit</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Action section */}
            {!showRankingMode ? (
              <div>
                <p className="font-medium text-lg mb-4">Are these the type of companies you want to reach?</p>
                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleNewSearch}
                    className="flex-1"
                  >
                    I want to do a NEW search
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleStartRanking}
                    className="flex-1"
                  >
                    Tell us which results are the best
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rate each company to help us find more like your favorites</p>
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(companyRatings).length} of {searchResults.length} companies rated
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setShowRankingMode(false)}
                >
                  Cancel ranking
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}