import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const tourSteps = [
  {
    title: "Welcome to Simple B2B Sales",
    content: (
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">Welcome to Simple B2B Sales</h2>
        <p className="text-xl text-muted-foreground italic">
          5 Simple Leads DONE in 1 Minute EVERY Day
        </p>
        <div className="flex justify-center gap-4 text-4xl">
          <span>🐥</span>
          <span>🥚</span>
          <span>🥚</span>
          <span>🥚</span>
          <span>🥚</span>
        </div>
      </div>
    ),
  },
  {
    title: "Search for Leads",
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Smart Lead Search</h3>
        <p>
          Use natural language to find your ideal customers. Just type what you're
          looking for, and our AI will do the heavy lifting.
        </p>
      </div>
    ),
  },
  {
    title: "Prospect Management",
    content: (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Track Top Prospects</h3>
        <p>
          Automatically identify and enrich the most promising contacts. Save them
          to lists and start your outreach campaigns.
        </p>
      </div>
    ),
  },
];

interface IntroTourModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntroTourModal({ open, onOpenChange }: IntroTourModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tourSteps[currentStep].title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{tourSteps[currentStep].content}</div>
        <div className="flex justify-end gap-2">
          <Button onClick={handleNext}>
            {currentStep === tourSteps.length - 1 ? "Get Started" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
