import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Rocket } from 'lucide-react';

interface ActivationCTABannerProps {
  onStartClick: () => void;
}

export function ActivationCTABanner({ onStartClick }: ActivationCTABannerProps) {
  return (
    <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardContent className="py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-3">
              <Sparkles className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Activate Your Daily Sales Companion</h2>
            </div>
            <p className="text-muted-foreground">
              Get 5 personalized prospects delivered to your inbox every day.
              Takes just 2 minutes to set up.
            </p>
          </div>
          <Button 
            size="lg" 
            className="min-w-[200px]"
            onClick={onStartClick}
          >
            <Rocket className="h-5 w-5 mr-2" />
            Start Daily Outreach
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}