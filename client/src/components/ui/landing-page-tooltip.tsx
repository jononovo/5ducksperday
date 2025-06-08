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
  if (!visible) {
    return null;
  }

  const positionClasses = position === 'above-button' 
    ? 'absolute -top-2 sm:-top-1 left-1/2 transform -translate-x-1/2' 
    : 'absolute -top-2 sm:-top-1 transform -translate-x-1/2';

  const offsetStyle = offsetX !== 0 ? { 
    left: `calc(50% + ${offsetX}px)`
  } : {};

  return (
    <div 
      className={`${positionClasses} bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/90 dark:to-indigo-900/90 p-4 rounded-lg shadow-lg text-sm border-none z-10 w-64 animate-fade-in max-w-xs text-center ${className} cursor-pointer`}
      style={offsetStyle}
      onClick={() => window.dispatchEvent(new CustomEvent('dismissTooltip'))}
    >
      <div className="tooltip-arrow"></div>
      <p className="font-medium text-blue-800 dark:text-blue-200">
        {message}
      </p>
    </div>
  );
}