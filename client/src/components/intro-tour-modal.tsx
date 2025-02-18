import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const tourSteps = [
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

  // Query to get user preferences
  const { data: preferences } = useQuery({
    queryKey: ["/api/user/preferences"],
  });

  // Mutation to update preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/preferences", {
        hasSeenTour: true,
      });
      return response.json();
    },
  });

  useEffect(() => {
    if (open && preferences?.hasSeenTour) {
      onOpenChange(false);
    }
  }, [open, preferences, onOpenChange]);

  const handleNext = async () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await updatePreferencesMutation.mutateAsync();
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