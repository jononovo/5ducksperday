import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface SearchProgressIndicatorProps {
  isSearching: boolean;
}

export default function SearchProgressIndicator({ isSearching }: SearchProgressIndicatorProps) {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  
  // Listen for console logs and capture relevant search messages
  useEffect(() => {
    if (!isSearching) {
      setLogMessages([]);
      setCurrentIndex(0);
      return;
    }
    
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Helper function to process a message and add it to logs if relevant
    const processMessage = (message: string, isError = false) => {
      // Only capture search-related logs with relevant keywords
      if (
        message.includes('search') || 
        message.includes('query') || 
        message.includes('API') || 
        message.includes('Perplexity') ||
        message.includes('contacts') ||
        message.includes('companies') ||
        message.includes('parsing') ||
        message.includes('formatting') ||
        message.includes('analyzing') ||
        message.includes('processing') ||
        message.includes('enriching') ||
        message.includes('discovering') ||
        message.includes('error') ||
        message.includes('failed') ||
        message.includes('failure') ||
        isError
      ) {
        // Clean up the message - remove quotes, brackets, etc.
        const cleanMessage = message
          .replace(/["[\]{}]/g, '')
          .replace(/,/g, ' ')
          .trim();
        
        // Format errors differently
        const formattedMessage = isError ? `🔴 Error: ${cleanMessage}` : cleanMessage;
        
        setLogMessages(prev => {
          // Only add if it's a new message
          if (prev.includes(formattedMessage)) return prev;
          return [...prev, formattedMessage];
        });
      }
    };
    
    // Override console.log
    console.log = (...args) => {
      originalConsoleLog(...args);
      const message = args.join(' ');
      processMessage(message);
    };
    
    // Override console.error to capture errors
    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.join(' ');
      processMessage(message, true);
    };
    
    // Override console.warn to capture warnings
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      const message = args.join(' ');
      processMessage(message, true);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [isSearching]);
  
  // Cycle through messages with minimum display time
  useEffect(() => {
    if (!logMessages.length || !isSearching) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % logMessages.length);
    }, 2000); // Show each message for 2 seconds minimum
    
    return () => clearInterval(interval);
  }, [logMessages, isSearching]);
  
  if (!isSearching || !logMessages.length) return null;
  
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-sm transition-all duration-300">
      <div className="flex items-center">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-500" />
        <div className={`flex-1 truncate ${logMessages[currentIndex].includes('Error:') ? 'text-red-800' : ''}`}>
          {logMessages[currentIndex]}
        </div>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="ml-2 text-xs text-slate-500 hover:text-slate-700"
        >
          {expanded ? 'Hide' : 'More'}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-2 max-h-32 overflow-y-auto">
          {logMessages.map((msg, i) => (
            <div 
              key={i} 
              className={`px-2 py-1 rounded ${
                msg.includes('Error:') ? 'bg-red-50 text-red-800' : 
                i === currentIndex ? 'bg-blue-50' : ''
              }`}
            >
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}