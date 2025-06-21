import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  badge?: string;
  badgeColor?: string;
  message: string;
  actionText: string;
  icon?: React.ReactNode;
  className?: string;
}

export function GameDialog({
  isOpen,
  onClose,
  title,
  badge,
  badgeColor = "bg-yellow-100 text-yellow-800",
  message,
  actionText,
  icon,
  className
}: GameDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "sm:max-w-md bg-white border border-gray-200 rounded-xl shadow-xl",
        "focus:outline-none focus:ring-0",
        className
      )}>
        <DialogHeader className="text-center space-y-4">
          {/* Icon and Badge Row */}
          <div className="flex items-center justify-center gap-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            {badge && (
              <Badge variant="secondary" className={cn("font-medium px-3 py-1", badgeColor)}>
                {badge}
              </Badge>
            )}
          </div>
          
          {/* Title */}
          <DialogTitle className="text-xl font-bold text-gray-900">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {/* Message Content */}
        <div className="py-4 text-center">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        
        {/* Action Button */}
        <DialogFooter className="flex justify-center">
          <Button 
            onClick={onClose}
            className="bg-black text-white hover:bg-gray-800 rounded-lg px-6 py-2 font-medium transition-colors"
          >
            {actionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}