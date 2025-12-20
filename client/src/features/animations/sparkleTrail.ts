/**
 * Credit Sparkle Trail Animation
 * 
 * Animates sparkle particles from a source element (credit badge) 
 * to the credits display in the header.
 */

interface SparkleConfig {
  size: number;
  delay: number;
  offsetX: number;
  offsetY: number;
}

const SPARKLE_CONFIGS: SparkleConfig[] = [
  { size: 20, delay: 0, offsetX: 0, offsetY: 0 },
  { size: 14, delay: 70, offsetX: -7, offsetY: 5 },
  { size: 10, delay: 140, offsetX: 6, offsetY: -4 },
];

const ANIMATION_DURATION = 1100; // ms

function createSparkleElement(
  startX: number,
  startY: number,
  config: SparkleConfig,
  index: number
): HTMLDivElement {
  const sparkle = document.createElement('div');
  
  sparkle.style.cssText = `
    position: fixed;
    left: ${startX + config.offsetX}px;
    top: ${startY + config.offsetY}px;
    width: ${config.size}px;
    height: ${config.size}px;
    background: radial-gradient(circle,
      rgba(255,255,255,0.9) 0%,
      rgba(255,215,0,0.6) 40%,
      transparent 70%);
    border-radius: 50%;
    pointer-events: none;
    z-index: ${10001 - index};
    box-shadow: 0 0 ${config.size / 2}px rgba(255,215,0,0.6),
                0 0 ${config.size}px rgba(255,180,0,0.4);
    transition: left ${ANIMATION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1),
                top ${ANIMATION_DURATION}ms cubic-bezier(0.25, 0.1, 0.25, 1),
                transform ${ANIMATION_DURATION}ms ease-out,
                opacity ${ANIMATION_DURATION}ms ease-out;
  `;
  
  return sparkle;
}

function applyBounceEffect(element: Element): void {
  const htmlElement = element as HTMLElement;
  const originalTransition = htmlElement.style.transition;
  const originalTransform = htmlElement.style.transform;
  
  htmlElement.style.transition = 'transform 0.2s ease-out';
  htmlElement.style.transform = 'scale(1.15)';
  
  setTimeout(() => {
    htmlElement.style.transform = originalTransform || 'scale(1)';
    setTimeout(() => {
      htmlElement.style.transition = originalTransition;
    }, 200);
  }, 200);
}

/**
 * Find the credits display target element in the header
 */
function findCreditsTarget(): Element | null {
  return document.querySelector('[data-credits-target]');
}

/**
 * Animate sparkle particles from a source element to the credits display
 * 
 * @param sourceElement - The element to animate from (credit badge/chip)
 * @param options - Optional configuration
 * @returns Promise that resolves when animation completes
 */
export function animateCreditSparkles(
  sourceElement: HTMLElement | null,
  options: {
    targetElement?: Element | null;
    onComplete?: () => void;
    bounce?: boolean;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    const { 
      targetElement = findCreditsTarget(), 
      onComplete,
      bounce = true 
    } = options;

    if (!sourceElement) {
      console.warn('[SparkleTrail] No source element provided');
      resolve();
      return;
    }

    if (!targetElement) {
      console.warn('[SparkleTrail] No target element found. Add data-credits-target to the credits display.');
      resolve();
      return;
    }

    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    SPARKLE_CONFIGS.forEach((config, index) => {
      setTimeout(() => {
        const sparkle = createSparkleElement(startX, startY, config, index);
        document.body.appendChild(sparkle);

        requestAnimationFrame(() => {
          sparkle.style.left = `${endX}px`;
          sparkle.style.top = `${endY}px`;
          sparkle.style.transform = 'scale(0.5)';
          sparkle.style.opacity = '0';
        });

        setTimeout(() => {
          sparkle.remove();
        }, ANIMATION_DURATION + 50);
      }, config.delay);
    });

    if (bounce && targetElement) {
      setTimeout(() => {
        applyBounceEffect(targetElement);
      }, ANIMATION_DURATION);
    }

    setTimeout(() => {
      onComplete?.();
      resolve();
    }, ANIMATION_DURATION + 250);
  });
}

/**
 * Hook for using sparkle animation in React components
 */
export function useSparkleTrail() {
  return {
    animateCreditSparkles,
    findCreditsTarget,
  };
}
