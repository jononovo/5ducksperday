import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GuidanceTooltipProps } from "../types";

export function GuidanceTooltip({
  targetSelector,
  instruction,
  position = "auto",
  isVisible,
  onDismiss,
  onBack,
  stepNumber,
  totalSteps,
}: GuidanceTooltipProps) {
  const [coords, setCoords] = useState<{ top: number; left: number; arrowPosition: string } | null>(null);
  const animationRef = useRef<number>();

  const calculatePosition = useCallback(() => {
    const element = document.querySelector(targetSelector);
    if (!element) {
      setCoords(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipWidth = 260;
    const tooltipHeight = 100;
    const spacing = 16;

    let finalPosition = position;
    if (position === "auto") {
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceLeft = rect.left;
      const spaceRight = window.innerWidth - rect.right;

      if (spaceBelow >= tooltipHeight + spacing) {
        finalPosition = "bottom";
      } else if (spaceAbove >= tooltipHeight + spacing) {
        finalPosition = "top";
      } else if (spaceRight >= tooltipWidth + spacing) {
        finalPosition = "right";
      } else {
        finalPosition = "left";
      }
    }

    let top = 0;
    let left = 0;
    let arrowPosition = "top";

    switch (finalPosition) {
      case "bottom":
        top = rect.bottom + spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "top";
        break;
      case "top":
        top = rect.top - tooltipHeight - spacing;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
        arrowPosition = "bottom";
        break;
      case "right":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + spacing;
        arrowPosition = "left";
        break;
      case "left":
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - spacing;
        arrowPosition = "right";
        break;
    }

    left = Math.max(10, Math.min(left, window.innerWidth - tooltipWidth - 10));
    top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));

    setCoords({ top, left, arrowPosition });
  }, [targetSelector, position]);

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      calculatePosition();
      animationRef.current = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetSelector, isVisible, calculatePosition]);

  if (!isVisible || !coords) return null;

  const arrowStyles: Record<string, React.CSSProperties> = {
    top: {
      position: "absolute",
      top: "-8px",
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderBottom: "8px solid #1f2937",
    },
    bottom: {
      position: "absolute",
      bottom: "-8px",
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: "8px solid transparent",
      borderRight: "8px solid transparent",
      borderTop: "8px solid #1f2937",
    },
    left: {
      position: "absolute",
      left: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
      borderRight: "8px solid #1f2937",
    },
    right: {
      position: "absolute",
      right: "-8px",
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: "8px solid transparent",
      borderBottom: "8px solid transparent",
      borderLeft: "8px solid #1f2937",
    },
  };

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed z-[9999] w-[260px] bg-gray-800 text-white rounded-lg shadow-2xl border border-yellow-500/30"
          style={{ top: coords.top, left: coords.left }}
          data-testid="guidance-tooltip"
        >
          <div style={arrowStyles[coords.arrowPosition]} />
          
          <span className="absolute -left-10 top-2 text-xl bg-yellow-100 border-2 border-yellow-300 rounded-full w-8 h-8 flex items-center justify-center shadow-md">🐥</span>
          
          <div className="p-3">
            <div className="flex items-start gap-2">
              <p className="text-sm text-gray-200 leading-snug flex-1">
                {instruction}
                <span className="inline-flex items-center align-middle ml-1">
                  {stepNumber && stepNumber > 1 && onBack && (
                    <button
                      className="text-gray-400 hover:text-yellow-400 h-5 w-5 p-0 inline-flex items-center justify-center transition-colors"
                      onClick={onBack}
                      data-testid="tooltip-back"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {stepNumber && totalSteps && (
                    <span className="text-xs text-gray-400 font-medium">
                      {stepNumber} / {totalSteps}
                    </span>
                  )}
                  <button
                    className="text-gray-400 hover:text-yellow-400 h-5 w-5 p-0 inline-flex items-center justify-center transition-colors"
                    onClick={onDismiss}
                    data-testid="tooltip-next"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </span>
              </p>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                  data-testid="tooltip-close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
