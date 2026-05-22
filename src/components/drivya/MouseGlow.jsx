import { useEffect, useRef } from "react";

export function MouseGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    let ticking = false;
    const handler = (e) => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (glowRef.current) {
            glowRef.current.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, var(--mouse-glow), transparent 60%)`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity"
      style={{
        background: `radial-gradient(600px circle at -1000px -1000px, var(--mouse-glow), transparent 60%)`,
      }}
    />
  );
}
