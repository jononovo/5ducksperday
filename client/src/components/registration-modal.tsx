import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRegistrationModal } from "@/hooks/use-registration-modal";

type RegistrationPage = "main" | "email" | "login";

export function RegistrationModal() {
  const [currentPage, setCurrentPage] = useState<RegistrationPage>("main");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const { closeModal } = useRegistrationModal();

  // If user is already logged in, don't show the modal
  if (user) {
    closeModal();
    return null;
  }

  const handleLoginClick = () => {
    setCurrentPage("login");
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
  
  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = regex.test(email);
    setEmailValid(isValid);
    return isValid;
  };
  
  // Focus the appropriate input field when the page changes
  useEffect(() => {
    if (currentPage === "email") {
      // Focus the name input field on the email registration page
      setTimeout(() => nameInputRef.current?.focus(), 100);
    } else if (currentPage === "login") {
      // Focus the email input field on the login page
      setTimeout(() => loginEmailRef.current?.focus(), 100);
    }
  }, [currentPage]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleForgotPassword = () => {
    // Implement forgot password logic later
    console.log("Forgot password clicked");
  };

  const handleReturnToMain = () => {
    setCurrentPage("main");
    // Reset form fields
    setName("");
    setEmail("");
    setPassword("");
    setEmailValid(false);
  };

  const handleSubmit = async () => {
    if (currentPage === "email" && validateEmail(email) && password.length >= 8) {
      try {
        // This would be where we integrate with Firebase auth
        console.log("Registration submitted with:", { name, email, password });
        // For now, just simulate success and close the modal
        closeModal();
      } catch (error) {
        console.error("Registration error:", error);
      }
    } else if (currentPage === "login" && validateEmail(email) && password.length >= 8) {
      try {
        // This would be where we integrate with Firebase auth
        console.log("Login submitted with:", { email, password });
        // For now, just simulate success and close the modal
        closeModal();
      } catch (error) {
        console.error("Login error:", error);
      }
    }
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

      {currentPage === "email" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Back button in upper left corner */}
          <div className="absolute top-0 left-0 mt-6 ml-6 z-10">
            <button 
              onClick={handleReturnToMain}
              className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
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
          <div className="text-center text-white mb-8 mt-16">
            <h2 className="text-3xl font-bold mb-3">Create Your Account</h2>
            <p className="text-gray-200 text-lg">Register with your email address</p>
          </div>

          {/* Registration form */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <div className="space-y-4">
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Your Name"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              
              <input
                ref={emailInputRef}
                type="email"
                placeholder="Email Address"
                className={`w-full p-4 bg-white/10 border ${
                  email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                value={email}
                onChange={handleEmailChange}
              />
              
              {/* Password field only appears after @ is typed in email */}
              {email.includes('@') && (
                <div>
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
                </div>
              )}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleSubmit}
              disabled={!emailValid || password.length < 8}
            >
              Go
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {currentPage === "login" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Back button in upper left corner */}
          <div className="absolute top-0 left-0 mt-6 ml-6 z-10">
            <button 
              onClick={handleReturnToMain}
              className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
          {/* Main content */}
          <div className="text-center text-white mb-8 mt-16">
            <h2 className="text-3xl font-bold mb-3">Welcome Back</h2>
            <p className="text-gray-200 text-lg">Log in to your account</p>
          </div>

          {/* Login form */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <div className="space-y-4">
              <input
                ref={loginEmailRef}
                type="email"
                placeholder="Email Address"
                className={`w-full p-4 bg-white/10 border ${
                  email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                value={email}
                onChange={handleEmailChange}
              />
              
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full p-4 bg-white/10 border border-white/20 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
              onClick={handleSubmit}
              disabled={!emailValid || password.length < 8}
            >
              Go
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            
            <div className="text-center mt-2">
              <button 
                onClick={handleForgotPassword}
                className="text-sm text-white hover:text-blue-300 transition-colors"
              >
                Forgot password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}