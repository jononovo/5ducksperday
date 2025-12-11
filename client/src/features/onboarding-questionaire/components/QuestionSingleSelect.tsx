import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { QuestionComponentProps } from "../types";

export function QuestionSingleSelect<T extends Record<string, string>>({
  question,
  data,
  onSelect,
  onNext,
}: QuestionComponentProps<T>) {
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, []);

  const handleOptionClick = (optionId: string) => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
    }
    onSelect?.(question.id, optionId);
    autoAdvanceRef.current = setTimeout(() => {
      onNext?.();
    }, 400);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 mb-6">
          <span className="text-2xl">🐥</span>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {question.title}
          </h2>
        </div>
        {question.subtitle && (
          <p className="text-gray-400">{question.subtitle}</p>
        )}
      </div>

      <div className="space-y-3">
        {question.options?.map((option, index) => {
          const isSelected = data[question.id as keyof T] === option.id;
          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleOptionClick(option.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 text-left group ${
                isSelected
                  ? "bg-yellow-500/10 border-yellow-500/50 shadow-[0_0_20px_rgba(250,204,21,0.2)]"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
              }`}
              data-testid={`option-${question.id}-${option.id}`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  isSelected
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-white/10 text-gray-400 group-hover:text-white"
                }`}
              >
                {option.icon}
              </div>
              <span
                className={`text-lg font-medium transition-colors ${
                  isSelected ? "text-white" : "text-gray-300"
                }`}
              >
                {option.label}
              </span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-auto w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
