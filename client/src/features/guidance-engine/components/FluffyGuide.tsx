import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import type { FluffyGuideProps } from "../types";

export function FluffyGuide({ onClick, isActive, hasNewChallenge = false }: FluffyGuideProps) {
  return createPortal(
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-[9990] group"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      data-testid="fluffy-guide-button"
    >
      <motion.div
        className="relative w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg cursor-pointer"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-3xl">🐥</span>
        
        <AnimatePresence>
          {hasNewChallenge && !isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
            >
              !
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {isActive && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full"
            />
          )}
        </AnimatePresence>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        whileHover={{ opacity: 1, x: 0 }}
        className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg pointer-events-none"
      >
        {isActive ? "Continue Quest" : "Start Quest"}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-l-8 border-l-gray-800 border-y-4 border-y-transparent" />
      </motion.div>
    </motion.button>,
    document.body
  );
}
