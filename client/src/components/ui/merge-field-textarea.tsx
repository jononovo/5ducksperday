import React, { forwardRef } from 'react';
import { Textarea } from './textarea';
import { cn } from '@/lib/utils';
import { useMergeFieldContext } from '@/contexts/MergeFieldContext';
import { hasMergeFields, resolveMergeField } from '@/lib/merge-field-resolver';

interface MergeFieldTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
}

const MergeFieldTextarea = forwardRef<HTMLTextAreaElement, MergeFieldTextareaProps>(
  ({ value = '', className, ...props }, ref) => {
    const context = useMergeFieldContext();
    
    // If no context or edit mode, use standard textarea
    if (!context || context.isEditMode || !hasMergeFields(value)) {
      return <Textarea ref={ref} value={value} className={className} {...props} />;
    }

    // Create highlighted content for display
    const createHighlightedContent = (text: string) => {
      const mergeFieldPattern = /\{\{([^}]+)\}\}/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = mergeFieldPattern.exec(text)) !== null) {
        // Add text before merge field
        if (match.index > lastIndex) {
          parts.push(text.slice(lastIndex, match.index).replace(/\n/g, '<br>'));
        }
        
        // Add resolved merge field with highlighting
        const resolvedValue = resolveMergeField(match[1], context.mergeFieldContext);
        parts.push(`<span class="bg-blue-100 text-blue-900 px-1 rounded">${resolvedValue}</span>`);
        
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex).replace(/\n/g, '<br>'));
      }
      
      return parts.join('');
    };

    return (
      <div className="relative">
        {/* Invisible textarea for functionality */}
        <Textarea
          ref={ref}
          value={value}
          className={cn(className, "opacity-0 absolute inset-0 z-10 resize-none")}
          {...props}
        />
        {/* Visible highlighted content */}
        <div
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
            "overflow-auto whitespace-pre-wrap"
          )}
          dangerouslySetInnerHTML={{ __html: createHighlightedContent(value) }}
        />
      </div>
    );
  }
);

MergeFieldTextarea.displayName = "MergeFieldTextarea";

export { MergeFieldTextarea };