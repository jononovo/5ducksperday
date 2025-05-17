import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function RepliesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Replies</h1>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold mb-4">
            Track Your Conversation Replies
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            This page will display all responses to your outreach emails. 
            Currently, you have no replies to display.
          </p>
          
          <div className="p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
            <div className="text-slate-500 dark:text-slate-400">
              <p className="mb-4">Once you begin receiving replies, they'll appear here.</p>
              <p>You'll be able to:</p>
              <ul className="list-disc list-inside mb-6 text-left max-w-md mx-auto">
                <li>Track responses from prospects</li>
                <li>Measure engagement with your campaigns</li>
                <li>Prioritize follow-ups based on interest</li>
                <li>Analyze reply sentiment and content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}