import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

interface HighlightedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  rawValue: string; // The unresolved value with merge fields
  onChange: (value: string) => void;
  highlightPattern?: RegExp;
  highlightClassName?: string;
  resolveField?: (field: string) => string;
}

// Component that provides individual merge field highlighting while maintaining input functionality
const HighlightedInput = forwardRef<HTMLInputElement, HighlightedInputProps>(
  ({ 
    value, 
    rawValue, 
    onChange, 
    className, 
    highlightPattern = /\{\{[^}]+\}\}/g,
    highlightClassName = "bg-yellow-100 px-1 rounded",
    resolveField,
    ...props 
  }, ref) => {
    const hiddenInputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Expose the hidden input ref to parent components
    useImperativeHandle(ref, () => hiddenInputRef.current!);

    // Generate highlighted HTML content
    const generateHighlightedContent = (content: string, raw: string) => {
      if (!resolveField) return content;

      // Find all merge fields in the raw content using exec method
      let match;
      const mergeFields: string[] = [];
      const regex = new RegExp(highlightPattern.source, 'g');
      
      while ((match = regex.exec(raw)) !== null) {
        mergeFields.push(match[0]);
      }
      
      let highlightedContent = content;
      
      // Replace resolved values with highlighted versions
      mergeFields.forEach(mergeField => {
        const resolvedValue = resolveField(mergeField);
        if (resolvedValue && content.includes(resolvedValue)) {
          // Escape special regex characters in resolved value
          const escapedValue = resolvedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const valueRegex = new RegExp(escapedValue, 'g');
          highlightedContent = highlightedContent.replace(
            valueRegex,
            `<span class="${highlightClassName}">${resolvedValue}</span>`
          );
        }
      });

      return highlightedContent;
    };

    // Sync scroll position between input and overlay
    const syncScroll = () => {
      if (hiddenInputRef.current && overlayRef.current) {
        overlayRef.current.scrollLeft = hiddenInputRef.current.scrollLeft;
      }
    };

    // Handle input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    // Sync dimensions and positioning
    useEffect(() => {
      if (hiddenInputRef.current && overlayRef.current) {
        const input = hiddenInputRef.current;
        const overlay = overlayRef.current;
        
        // Copy computed styles
        const computedStyle = window.getComputedStyle(input);
        overlay.style.font = computedStyle.font;
        overlay.style.letterSpacing = computedStyle.letterSpacing;
        overlay.style.textAlign = computedStyle.textAlign;
        overlay.style.paddingLeft = computedStyle.paddingLeft;
        overlay.style.paddingRight = computedStyle.paddingRight;
        overlay.style.paddingTop = computedStyle.paddingTop;
        overlay.style.paddingBottom = computedStyle.paddingBottom;
        overlay.style.borderWidth = computedStyle.borderWidth;
        overlay.style.borderStyle = computedStyle.borderStyle;
      }
    });

    const highlightedContent = generateHighlightedContent(value, rawValue);

    return (
      <div className="relative">
        {/* Hidden input for functionality */}
        <input
          ref={hiddenInputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={syncScroll}
          className={cn(
            "relative z-10 bg-transparent text-transparent caret-black selection:bg-blue-200",
            className
          )}
          {...props}
        />
        
        {/* Overlay with highlighted content */}
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 z-0 pointer-events-none overflow-hidden whitespace-nowrap",
            className,
            "bg-background text-foreground" // Ensure proper colors
          )}
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
        />
        
        {/* Focus ring overlay */}
        {isFocused && (
          <div className="absolute inset-0 z-5 rounded-md ring-2 ring-ring ring-offset-2 pointer-events-none" />
        )}
      </div>
    );
  }
);

HighlightedInput.displayName = "HighlightedInput";

export { HighlightedInput };