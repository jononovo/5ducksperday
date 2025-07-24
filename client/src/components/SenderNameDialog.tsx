import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SenderNameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SenderNameDialog({ isOpen, onClose, onSuccess }: SenderNameDialogProps) {
  const [senderName, setSenderName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateSenderNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/user/sender-name", { senderName: name });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update sender name");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sender Name Updated",
        description: "Your emails will now show your professional name",
      });
      // Invalidate user preferences cache
      queryClient.invalidateQueries({ queryKey: ['/api/user/preferences'] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Name",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!senderName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name for professional emails",
        variant: "destructive",
      });
      return;
    }
    updateSenderNameMutation.mutate(senderName.trim());
  };

  const handleClose = () => {
    setSenderName("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Set Your Email Name</DialogTitle>
          <DialogDescription>
            Enter your name to appear in emails as "Your Name &lt;email@domain.com&gt;" instead of just your email address.
            This makes your outreach more professional and personal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="senderName" className="text-right">
              Name
            </Label>
            <Input
              id="senderName"
              placeholder="John Smith"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="col-span-3"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Skip for now
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateSenderNameMutation.isPending}
          >
            {updateSenderNameMutation.isPending ? "Saving..." : "Save Name"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}