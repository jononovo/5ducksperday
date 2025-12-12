import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Trophy, Play, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FluffyGuideProps } from "../types";

interface ExtendedFluffyGuideProps extends FluffyGuideProps {
  onCloseGuide?: () => void;
}

export function FluffyGuide({ onClick, isActive, hasNewChallenge = false, onCloseGuide }: ExtendedFluffyGuideProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [, navigate] = useLocation();

  const handleClick = () => {
    if (isActive) {
      onClick?.();
    } else {
      setShowMenu(!showMenu);
    }
  };

  const handleViewQuests = () => {
    setShowMenu(false);
    navigate("/quests");
  };

  const handleStartQuest = () => {
    setShowMenu(false);
    onClick?.();
  };

  const handleCloseGuide = () => {
    setShowMenu(false);
    onCloseGuide?.();
  };

  if (isActive) {
    return null;
  }

  return createPortal(
    <>
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9980]"
            onClick={() => setShowMenu(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className="fixed bottom-6 right-6 z-[9990]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full mb-3 right-0 bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden min-w-[180px]"
            >
              <button
                onClick={handleStartQuest}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors"
                data-testid="fluffy-start-quest"
              >
                <Play className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">Start Quest</span>
              </button>
              <button
                onClick={handleViewQuests}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-white hover:bg-gray-800 transition-colors border-t border-gray-700"
                data-testid="fluffy-view-quests"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                <span className="text-sm font-medium">View All Quests</span>
              </button>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleCloseGuide}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-400 hover:bg-gray-800 hover:text-white transition-colors border-t border-gray-700"
                      data-testid="fluffy-close-guide"
                    >
                      <X className="h-4 w-4" />
                      <span className="text-sm font-medium">Close Guide</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-gray-800 text-white border-gray-700">
                    <p>You can open this again from the quest page</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleClick}
          className={`group transition-opacity duration-200 ${showMenu ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
          data-testid="fluffy-guide-button"
        >
          <motion.div
            className="relative w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg cursor-pointer"
            animate={{ y: showMenu ? 0 : [0, -3, 0] }}
            transition={{ duration: 2, repeat: showMenu ? 0 : Infinity, ease: "easeInOut" }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="text-xl">{showMenu ? "😊" : "🐥"}</span>
            
            <AnimatePresence>
              {hasNewChallenge && !showMenu && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                >
                  !
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            whileHover={{ opacity: 1, x: 0 }}
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg pointer-events-none"
          >
            Start Quest
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-l-8 border-l-gray-800 border-y-4 border-y-transparent" />
          </motion.div>
        </button>
      </motion.div>
    </>,
    document.body
  );
}
