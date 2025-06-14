import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

interface HighlightedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value: string;
  rawValue: string; // The unresolved value with merge fields
  onChange: (value: string) => void;
  highlightPattern?: RegExp;
  highlightClassName?: string;
  resolveField?: (field: string) => string;
}

// Component that provides individual merge field highlighting in textarea while maintaining functionality
const HighlightedTextarea = forwardRef<HTMLTextAreaElement, HighlightedTextareaProps>(
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
    const hiddenTextareaRef = useRef<HTMLTextAreaElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    // Expose the hidden textarea ref to parent components
    useImperativeHandle(ref, () => hiddenTextareaRef.current!);

    // Generate highlighted HTML content with proper line breaks
    const generateHighlightedContent = (content: string, raw: string) => {
      if (!resolveField) return content.replace(/\n/g, '<br>');

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

      // Convert line breaks to HTML
      return highlightedContent.replace(/\n/g, '<br>');
    };

    // Sync scroll position between textarea and overlay
    const syncScroll = () => {
      if (hiddenTextareaRef.current && overlayRef.current) {
        overlayRef.current.scrollTop = hiddenTextareaRef.current.scrollTop;
        overlayRef.current.scrollLeft = hiddenTextareaRef.current.scrollLeft;
      }
    };

    // Handle input changes
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    };

    // Sync dimensions and positioning
    useEffect(() => {
      if (hiddenTextareaRef.current && overlayRef.current) {
        const textarea = hiddenTextareaRef.current;
        const overlay = overlayRef.current;
        
        // Copy computed styles for exact matching
        const computedStyle = window.getComputedStyle(textarea);
        overlay.style.font = computedStyle.font;
        overlay.style.letterSpacing = computedStyle.letterSpacing;
        overlay.style.textAlign = computedStyle.textAlign;
        overlay.style.paddingLeft = computedStyle.paddingLeft;
        overlay.style.paddingRight = computedStyle.paddingRight;
        overlay.style.paddingTop = computedStyle.paddingTop;
        overlay.style.paddingBottom = computedStyle.paddingBottom;
        overlay.style.borderWidth = computedStyle.borderWidth;
        overlay.style.borderStyle = computedStyle.borderStyle;
        overlay.style.lineHeight = computedStyle.lineHeight;
        overlay.style.wordWrap = computedStyle.wordWrap;
        overlay.style.whiteSpace = computedStyle.whiteSpace;
      }
    });

    // Auto-resize functionality
    useEffect(() => {
      if (hiddenTextareaRef.current) {
        const textarea = hiddenTextareaRef.current;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
        
        // Sync overlay height
        if (overlayRef.current) {
          overlayRef.current.style.height = textarea.style.height;
        }
      }
    }, [value]);

    const highlightedContent = generateHighlightedContent(value, rawValue);

    return (
      <div className="relative">
        {/* Hidden textarea for functionality */}
        <textarea
          ref={hiddenTextareaRef}
          value={value}
          onChange={handleTextareaChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onScroll={syncScroll}
          className={cn(
            "relative z-10 bg-transparent text-transparent caret-black selection:bg-blue-200 resize-none",
            className
          )}
          {...props}
        />
        
        {/* Overlay with highlighted content */}
        <div
          ref={overlayRef}
          className={cn(
            "absolute inset-0 z-0 pointer-events-none overflow-hidden",
            className,
            "bg-background text-foreground resize-none" // Ensure proper colors
          )}
          style={{
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word'
          }}
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

HighlightedTextarea.displayName = "HighlightedTextarea";

export { HighlightedTextarea };