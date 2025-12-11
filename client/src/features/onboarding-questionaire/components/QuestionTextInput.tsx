import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionComponentProps } from "../types";

export function QuestionTextInput<T extends Record<string, string>>({
  question,
  data,
  onTextInput,
}: QuestionComponentProps<T>) {
  const value = (data[question.id as keyof T] as string) || "";

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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {question.inputType === "textarea" ? (
          <Textarea
            value={value}
            onChange={(e) => onTextInput?.(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg p-4"
            data-testid={`input-${question.id}`}
          />
        ) : (
          <Input
            type={question.inputType === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => onTextInput?.(question.id, e.target.value)}
            placeholder={question.placeholder}
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid={`input-${question.id}`}
          />
        )}
      </motion.div>
    </div>
  );
}
