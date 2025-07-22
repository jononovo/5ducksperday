import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface GmailProfile {
  email: string | null;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  profilePicture: string | null;
  verifiedEmail: boolean | null;
}

export function useGmailProfile() {
  const { data: profile, error, isLoading } = useQuery<GmailProfile, Error>({
    queryKey: ["/api/gmail/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnMount: false,
  });

  return {
    profile,
    isLoading,
    error,
    hasProfile: !!profile?.email,
  };
}