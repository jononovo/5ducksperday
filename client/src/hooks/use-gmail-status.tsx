import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface GmailStatus {
  authorized: boolean;
  hasValidToken: boolean;
  email?: string;
}

export function useGmailStatus() {
  const { data: status, error, isLoading, refetch } = useQuery<GmailStatus, Error>({
    queryKey: ["/api/gmail/auth-status"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnMount: true,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    status,
    isLoading,
    error,
    isConnected: !!status?.authorized,
    refetch,
  };
}