/** Cubic ease-out — smooth on reload without spring overshoot */
export const easeSmooth = [0.22, 1, 0.36, 1];

export function tweenEnter(duration = 0.78, delay = 0) {
  return {
    type: "tween",
    duration,
    delay,
    ease: easeSmooth,
  };
}
