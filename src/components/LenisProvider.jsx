import React, { useEffect } from "react";
import { getLenis } from "@/lib/lenisInit";

/**
 * LenisProvider wraps the scrollable area and initializes Lenis for smooth, inertial scrolling.
 * It does not interfere with Framer Motion animations – Lenis handles the native scroll
 * container while Motion works on its own animated elements.
 */
export function LenisProvider({ children, className = "", style = {} }) {
  // Initialise Lenis once. The singleton in lenisInit.ts ensures the RAF loop runs only once.
  useEffect(() => {
    getLenis();
  }, []);

  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}
