import Lenis from 'lenis';

let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis {
  if (!lenisInstance) {
    lenisInstance = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      smoothTouch: false,
    });

    const raf = (time: number) => {
      lenisInstance?.raf(time);
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);
  }
  return lenisInstance;
}
