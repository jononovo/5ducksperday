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

  if (!credits || typeof credits.balance !== 'number') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground">
        <Coins className="h-4 w-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  const isLow = credits.balance < 500;
  const isCritical = credits.balance < 200;

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-medium",
        credits.isBlocked
          ? "text-red-800"
          : isCritical
          ? "text-orange-800"
          : isLow
          ? "text-yellow-800"
          : "text-yellow-600"
      )}
    >
      <Coins className="h-4 w-4" />
      <span>
        {credits.balance < 0 ? credits.balance : `${(credits.balance ?? 0).toLocaleString()}`}
      </span>
    </div>
  );
}