import React from "react";
import { Link } from "wouter";

interface LogoProps {
  // Size variant options
  size?: "sm" | "md" | "lg";
  // Whether to include emojis
  showEmojis?: boolean;
  // Whether to make it a link to home
  asLink?: boolean;
  // Optional additional className
  className?: string;
}

export function Logo({ 
  size = "md", 
  showEmojis = true, 
  asLink = true,
  className = ""
}: LogoProps) {
  // Size-specific classes
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  // Emoji size classes
  const emojiSizeClasses = {
    sm: "text-lg ml-1",
    md: "text-2xl ml-2",
    lg: "text-3xl ml-3"
  };
  
  const LogoContent = (
    <div className={`font-bold flex items-center ${sizeClasses[size]} ${className}`}>
      <span className="text-gray-500 dark:text-gray-400">5</span>
      <span className="text-gray-700 dark:text-gray-300">Ducks</span>
      
      {showEmojis && (
        <div className={`flex ${emojiSizeClasses[size]}`}>
          <span className={sizeClasses[size]}>🐥</span>
          <span className={size === "sm" ? "text-md" : "text-xl"}>🥚🥚🥚🥚</span>
        </div>
      )}
    </div>
  );
  
  // If logo should be a link, wrap in Link component
  if (asLink) {
    return (
      <Link href="/" className="group hover:opacity-90 transition-opacity">
        {LogoContent}
      </Link>
    );
  }
  
  // Otherwise just return the logo content
  return LogoContent;
}