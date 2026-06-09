import { useEffect, useRef, useState } from "react";

/**
 * Lightweight IntersectionObserver-based scroll reveal.
 * Returns a ref to attach and a boolean `isVisible` that flips
 * to true once the element enters the viewport — then stays true
 * (observer disconnects to free resources).
 *
 * @param {{ rootMargin?: string, threshold?: number }} opts
 * @returns {{ ref: React.RefObject, isVisible: boolean }}
 */
export function useScrollReveal({
  rootMargin = "50px 0px",
  threshold = 0.01,
} = {}) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.unobserve(el);
  }, [rootMargin, threshold]);

  return { ref, isVisible };
}
