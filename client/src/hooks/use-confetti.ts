import confetti from 'canvas-confetti';

export function useConfetti() {
  const triggerConfetti = () => {
    // Create a celebratory confetti burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#4CAF50', '#2196F3'], // Gold, Green, Blue
      angle: 90,
      startVelocity: 30,
      gravity: 0.8,
      shapes: ['square', 'circle'],
      ticks: 200,
      zIndex: 1000,
      scalar: 1.2,
      disableForReducedMotion: true
    });

    // Add a delayed second burst for extra effect
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { y: 0.7 },
        colors: ['#FF9800', '#E91E63', '#9C27B0'], // Orange, Pink, Purple
        angle: 120,
        startVelocity: 25,
        gravity: 1,
        shapes: ['square'],
        ticks: 150,
        zIndex: 1000,
        scalar: 0.8,
        disableForReducedMotion: true
      });
    }, 250);
  };

  return { triggerConfetti };
}
