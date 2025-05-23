import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type RegistrationPage = "main" | "email" | "verify" | "profile";

export function RegistrationModal() {
  const [currentPage, setCurrentPage] = useState<RegistrationPage>("main");
  const { user } = useAuth();

  // If user is already logged in, don't show the modal
  if (user) {
    return null;
  }

  const handleLoginClick = () => {
    // Navigate to login page
    window.location.href = "/auth";
  };

  const handleGmailClick = () => {
    // Gmail registration will be implemented later
    console.log("Gmail registration clicked");
  };

  const handleOutlookClick = () => {
    // Outlook registration will be implemented later
    console.log("Outlook registration clicked");
  };

  const handleOtherEmailClick = () => {
    setCurrentPage("email");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {currentPage === "main" && (
        <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
          <div className="flex justify-end">
            <button 
              onClick={handleLoginClick}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Login
            </button>
          </div>
          
          <div className="text-center mb-8 mt-4">
            <h2 className="text-2xl font-bold mb-2">Join 5Ducks</h2>
            <p className="text-gray-600">Access powerful sales tools and features</p>
          </div>

          <div className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full justify-between relative"
              onClick={handleGmailClick}
            >
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Register with Gmail
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">Coming Soon</Badge>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-between relative"
              onClick={handleOutlookClick}
            >
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Register with Outlook
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">Coming Soon</Badge>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>

            <div className="text-center mt-2">
              <button 
                onClick={handleOtherEmailClick}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Other Email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}