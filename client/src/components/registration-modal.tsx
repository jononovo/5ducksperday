import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Mail, ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRegistrationModal } from "@/hooks/use-registration-modal";
import { getAuth, sendPasswordResetEmail, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";

type RegistrationPage = "main" | "email" | "login" | "forgotPassword";

export function RegistrationModal() {
  const [currentPage, setCurrentPage] = useState<RegistrationPage>("main");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showGoogleAuthInfo, setShowGoogleAuthInfo] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const loginEmailRef = useRef<HTMLInputElement>(null);
  const forgotPasswordEmailRef = useRef<HTMLInputElement>(null);
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
    // Show Google auth info instead of navigating to a new page
    setShowGoogleAuthInfo(true);
  };
  
  const handleGoogleSignIn = async () => {
    try {
      const auth = getAuth();
      const provider = new GoogleAuthProvider();
      // Request additional scopes for email sending permissions
      provider.addScope('https://www.googleapis.com/auth/gmail.send');
      
      const result = await signInWithPopup(auth, provider);
      console.log("Google sign-in successful:", result);
      closeModal();
    } catch (error) {
      console.error("Google sign-in error:", error);
    }
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
    } else if (currentPage === "forgotPassword") {
      // Focus the email input field on the forgot password page
      setTimeout(() => forgotPasswordEmailRef.current?.focus(), 100);
      // Reset the email sent flag when navigating to this page
      setResetEmailSent(false);
    }
  }, [currentPage]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };

  const handleForgotPassword = () => {
    setCurrentPage("forgotPassword");
    // Reset email field for a fresh start
    setEmail("");
    setEmailValid(false);
  };

  const handleReturnToMain = () => {
    setCurrentPage("main");
    // Reset form fields
    setName("");
    setEmail("");
    setPassword("");
    setEmailValid(false);
  };

  const handleForgotPasswordSubmit = async () => {
    if (validateEmail(email)) {
      try {
        // Using Firebase's built-in password reset functionality
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email, {
          // Custom settings for the password reset email
          url: window.location.origin, // Redirect back to our app after reset
          handleCodeInApp: false // Let Firebase handle the reset flow
        });
        
        console.log("Password reset email sent to:", email);
        setResetEmailSent(true);
        
        // After 3 seconds, return to login page
        setTimeout(() => {
          setCurrentPage("login");
        }, 3000);
      } catch (error: any) {
        // Handle specific Firebase errors
        console.error("Password reset error:", error);
        alert(`Error sending reset email: ${error.message || "Please try again later."}`);
      }
    }
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
          {/* Login link in upper right corner - only show when not displaying Google auth info */}
          {!showGoogleAuthInfo && (
            <div className="absolute top-0 right-0 mt-6 mr-6 z-10">
              <button 
                onClick={handleLoginClick}
                className="text-sm text-white hover:text-blue-300 transition-colors"
              >
                Login
              </button>
            </div>
          )}
          
          {/* Main content - only show when not displaying Google auth info */}
          <AnimatePresence>
            {!showGoogleAuthInfo && (
              <motion.div 
                key="main-title"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center text-white mb-12 mt-16"
              >
                <h2 className="text-3xl font-bold mb-3">Join 5Ducks</h2>
                <p className="text-gray-200 text-lg">Access powerful sales tools and features</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Registration options */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            <AnimatePresence mode="wait">
              {!showGoogleAuthInfo ? (
                <motion.div 
                  key="registration-options"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
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
                </motion.div>
              ) : (
                <motion.div 
                  key="google-auth-info"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-4 text-white mb-4">
                    <h3 className="font-bold mb-2">Sending Permissions</h3>
                    <p className="text-sm">We curate email addresses of key contacts and help you send a compelling message.<br /><br />Please approve the additional permissions for sending email.</p>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
                    onClick={handleGoogleSignIn}
                  >
                    <Mail className="h-5 w-5 mr-2" />
                    Continue with Google
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                  
                  <div className="text-center mt-2">
                    <button 
                      onClick={() => setShowGoogleAuthInfo(false)}
                      className="text-sm text-white hover:text-blue-300 transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to options
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

      {currentPage === "forgotPassword" && (
        <div className="w-full max-w-md mx-auto relative">
          {/* Back button in upper left corner */}
          <div className="absolute top-0 left-0 mt-6 ml-6 z-10">
            <button 
              onClick={() => setCurrentPage("login")}
              className="text-sm text-white hover:text-blue-300 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          
          {/* Main content */}
          <div className="text-center text-white mb-8 mt-16">
            <h2 className="text-3xl font-bold mb-3">Reset Password</h2>
            <p className="text-gray-200 text-lg">Enter your email to receive reset instructions</p>
          </div>

          {/* Forgot password form */}
          <div className="space-y-4 max-w-sm mx-auto px-4">
            {resetEmailSent ? (
              <div className="text-center p-4 bg-green-500/20 border border-green-500/30 rounded-md text-white">
                <p>Password reset email sent!</p>
                <p className="text-sm mt-1">Please check your inbox for instructions.</p>
                <p className="text-xs mt-3">Returning to login page in a moment...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  ref={forgotPasswordEmailRef}
                  type="email"
                  placeholder="Email Address"
                  className={`w-full p-4 bg-white/10 border ${
                    email.length > 0 ? (emailValid ? 'border-green-400' : 'border-red-400') : 'border-white/20'
                  } rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-blue-300`}
                  value={email}
                  onChange={handleEmailChange}
                />
                
                <Button 
                  variant="outline" 
                  className="w-full justify-center relative bg-white/10 text-white border-white/20 hover:bg-white/20"
                  onClick={handleForgotPasswordSubmit}
                  disabled={!emailValid}
                >
                  Send Reset Email
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}