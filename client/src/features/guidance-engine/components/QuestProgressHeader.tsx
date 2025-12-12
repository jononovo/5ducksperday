import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { X, Trophy, Target } from "lucide-react";
import type { QuestProgressHeaderProps } from "../types";

export function QuestProgressHeader({
  questName,
  challengesCompleted,
  totalChallenges,
  currentChallengeName,
  isVisible,
  onClose,
}: QuestProgressHeaderProps) {
  const progressPercentage = (challengesCompleted / totalChallenges) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-yellow-500/30 shadow-lg overflow-hidden"
          data-testid="quest-progress-header"
        >
          <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/quests" className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-400 hidden sm:inline">
                  {questName}
                </span>
              </Link>
              
              <div className="h-4 w-px bg-gray-600" />
              
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Target className="h-4 w-4 text-gray-400 flex-shrink-0 hidden sm:block" />
                <span className="text-xs text-gray-300 truncate">
                  {currentChallengeName || "Ready for next challenge"}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-16 sm:w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-500 to-amber-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {challengesCompleted}/{totalChallenges}
                </span>
              </div>
              
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
                data-testid="close-quest-header"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
