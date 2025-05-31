interface LandingPageTooltipProps {
  message: string;
  visible: boolean;
  position?: 'above-button' | 'custom';
  offsetX?: number;
  offsetY?: number;
  className?: string;
}

export function LandingPageTooltip({
  message,
  visible,
  position = 'above-button',
  offsetX = 0,
  offsetY = 0,
  className = ''
}: LandingPageTooltipProps) {
  // Temporarily removing visibility check for comparison

  const positionClasses = position === 'above-button' 
    ? 'absolute -top-20 left-1/2 transform -translate-x-1/2' 
    : 'absolute -top-20 transform -translate-x-1/2';

  const offsetStyle = offsetX !== 0 || offsetY !== 0 ? { 
    left: offsetX !== 0 ? `calc(50% + ${offsetX}px)` : undefined,
    top: offsetY !== 0 ? `${-80 + offsetY}px` : undefined
  } : {};

  return (
    <div 
      className={`${positionClasses} bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/90 dark:to-indigo-900/90 p-4 rounded-lg shadow-lg text-sm border-none z-10 w-64 animate-fade-in max-w-xs text-center ${className}`}
      style={offsetStyle}
    >
      <div className="tooltip-arrow"></div>
      <p className="font-medium text-blue-800 dark:text-blue-200">
        {message}
      </p>
    </div>
  );
}