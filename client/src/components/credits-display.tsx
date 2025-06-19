import { useQuery } from "@tanstack/react-query";
import { Coins, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditData {
  balance: number;
  isBlocked: boolean;
  lastTopUp: number;
  totalUsed: number;
  monthlyAllowance: number;
}

export function CreditsDisplay() {
  const { data: credits, isLoading } = useQuery<CreditData>({
    queryKey: ['/api/credits'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Coins className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!credits) {
    return null;
  }

  const isLow = credits.balance < 500;
  const isCritical = credits.balance < 100;

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
        credits.isBlocked
          ? "bg-red-100 text-red-800 border border-red-200"
          : isCritical
          ? "bg-orange-100 text-orange-800 border border-orange-200"
          : isLow
          ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
          : "bg-green-100 text-green-800 border border-green-200"
      )}
    >
      {credits.isBlocked ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Coins className="h-4 w-4" />
      )}
      <span>
        {credits.isBlocked ? "Blocked" : `${credits.balance.toLocaleString()} credits`}
      </span>
    </div>
  );
}