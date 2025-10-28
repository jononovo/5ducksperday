import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Building2, Users, Target } from 'lucide-react';
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" />
            Let's confirm your target market
          </DialogTitle>
          <DialogDescription className="text-base">
            We found {searchResults.length} companies matching your search. Before we set up your outreach campaign, let's make sure these are the right prospects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">Your search:</p>
            <p className="text-sm text-muted-foreground">"{searchQuery}"</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Sample companies found:</p>
            <ScrollArea className="h-[200px] border rounded-lg p-3">
              <div className="space-y-2">
                {searchResults.slice(0, 5).map((company, index) => (
                  <Card key={company.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{company.name}</span>
                        </div>
                        {company.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {company.description}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {company.size && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              {company.size} employees
                            </Badge>
                          )}
                          {company.industry && (
                            <Badge variant="secondary" className="text-xs">
                              {company.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
                {searchResults.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ... and {searchResults.length - 5} more companies
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Are these the type of companies you want to reach?</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={selectedResponse === 'perfect' ? 'default' : 'outline'}
                className="h-auto py-3 px-4 justify-start"
                onClick={() => setSelectedResponse('perfect')}
              >
                <CheckCircle className="h-4 w-4 mr-2 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Perfect match!</div>
                  <div className="text-xs text-muted-foreground">These are exactly my ideal customers</div>
                </div>
              </Button>
              <Button
                variant={selectedResponse === 'refine' ? 'default' : 'outline'}
                className="h-auto py-3 px-4 justify-start"
                onClick={() => setSelectedResponse('refine')}
              >
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" />
                <div className="text-left">
                  <div className="font-medium">Need adjustment</div>
                  <div className="text-xs text-muted-foreground">Let me refine my search criteria</div>
                </div>
              </Button>
            </div>
          </div>

          {selectedResponse === 'perfect' && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">Great! Let's continue</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Next, we'll set up your product information to create personalized outreach messages for these companies.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedResponse === 'refine' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-amber-900 dark:text-amber-100">No problem!</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You'll be able to refine your search criteria to find your ideal customers.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!selectedResponse}
          >
            {selectedResponse === 'refine' ? 'Refine Search' : 'Continue Setup'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}