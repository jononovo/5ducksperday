import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import type { QuestionComponentProps } from "../types";

interface CompanyDetailsData {
  companyName: string;
  companyCity: string;
  companyState: string;
}

export function QuestionCompanyDetails<T extends Record<string, string> & CompanyDetailsData>({
  question,
  data,
  onTextInput,
}: QuestionComponentProps<T>) {
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

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">Company Name</label>
          <Input
            value={data.companyName || ""}
            onChange={(e) => onTextInput?.("companyName", e.target.value)}
            placeholder="Acme Inc."
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyName"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">City</label>
          <Input
            value={data.companyCity || ""}
            onChange={(e) => onTextInput?.("companyCity", e.target.value)}
            placeholder="San Francisco"
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyCity"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <label className="block text-sm font-medium text-gray-400 mb-2">State</label>
          <Input
            value={data.companyState || ""}
            onChange={(e) => onTextInput?.("companyState", e.target.value)}
            placeholder="California"
            className="h-14 bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-yellow-500/50 focus:ring-yellow-500/20 rounded-xl text-lg"
            data-testid="input-companyState"
          />
        </motion.div>
      </div>
    </div>
  );
}
