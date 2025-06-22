import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NotificationToastProps {
  notificationState: {
    isOpen: boolean;
    notification: any | null;
    badge: any | null;
  };
  onClose: () => void;
}

export function NotificationToast({ notificationState, onClose }: NotificationToastProps) {
  if (!notificationState.isOpen || (!notificationState.notification && !notificationState.badge)) {
    return null;
  }

  const content = notificationState.badge || notificationState.notification;
  // Parse markdown-style bold text and line breaks in description
  const formatDescription = (text: string) => {
    return text.split('\n').map((line, lineIndex) => (
      <span key={lineIndex}>
        {line.split('**').map((part, partIndex) => 
          partIndex % 2 === 1 ? <strong key={partIndex}>{part}</strong> : part
        )}
        {lineIndex < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-md rounded-lg border-2 shadow-xl",
        variantStyles[variant]
      )}>
        <DialogHeader className="text-center space-y-4">
          {badge && (
            <div className="flex justify-center">
              <Badge 
                variant="outline" 
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium border-2",
                  badgeVariants[variant]
                )}
              >
                {emoji && <span className="mr-2">{emoji}</span>}
                {badge}
              </Badge>
            </div>
          )}
          <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-700 leading-relaxed text-base">
            {formatDescription(description)}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button 
            onClick={onClose}
            className="w-full rounded-md bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}