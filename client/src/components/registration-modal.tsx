import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

type RegistrationPage = "main" | "email" | "verify" | "profile";

export function RegistrationModal() {
  const [currentPage, setCurrentPage] = useState<RegistrationPage>("main");
  const { user } = useAuth();
  const { closeModal } = useRegistrationModal();

  // If user is already logged in, don't show the modal
  if (user) {
    closeModal();
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
        <div className="w-full max-w-md mx-auto relative">
          {/* Login link in upper right corner */}
          <div className="absolute top-0 right-0 mt-6 mr-6 z-10">
            <button 
              onClick={handleLoginClick}
              className="text-sm text-white hover:text-blue-300 transition-colors"
            >
              Login
            </button>
          </div>
          
          {/* Main content */}
          <div className="text-center text-white mb-12 mt-16">
            <h2 className="text-3xl font-bold mb-3">Join 5Ducks</h2>
            <p className="text-gray-200 text-lg">Access powerful sales tools and features</p>
          </div>

          {/* Registration options */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <Button 
              variant="outline" 
              className="w-full justify-between relative bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleGmailClick}
            >
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Register with Gmail
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2 text-white border-white/50">Coming Soon</Badge>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-between relative bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleOutlookClick}
            >
              <div className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Register with Outlook
              </div>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2 text-white border-white/50">Coming Soon</Badge>
                <ChevronRight className="h-4 w-4" />
              </div>
            </Button>

            <div className="text-center mt-4">
              <button 
                onClick={handleOtherEmailClick}
                className="text-sm text-white hover:text-blue-300 transition-colors"
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