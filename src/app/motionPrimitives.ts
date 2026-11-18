export const SPRING_SNAPPY = {
  type: "spring" as const,
  stiffness: 520,
  damping: 36,
  mass: 0.7,
};

export const SPRING_SILK = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.85,
};

export const SPRING_EDITORIAL = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 0.9,
};

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Computes a bounded stagger delay (in seconds) so cascading lists feel
 * choreographed while keeping total latency strictly within perceptual budgets.
 */
export function computeStaggerDelay(
  index: number,
  stepSec = 0.026,
  maxSec = 0.2,
): number {
  if (!Number.isFinite(index) || index <= 0) return 0;
  const safeStep = Math.max(0, stepSec);
  const safeMax = Math.max(0, maxSec);
  return Number(Math.min(index * safeStep, safeMax).toFixed(4));
}

/**
 * Computes RTL-aware horizontal slide direction when switching tabs.
 * In an RTL tab bar, index 0 sits on the right and higher indices sit to the left.
 * Moving from index 0 -> 1 moves visually leftward (-1); 1 -> 0 moves rightward (+1).
 */
export function computeRtlTabDirection(
  prevTab: string,
  nextTab: string,
  tabOrder: readonly string[],
): -1 | 0 | 1 {
  if (prevTab === nextTab) return 0;
  const prevIdx = tabOrder.indexOf(prevTab);
  const nextIdx = tabOrder.indexOf(nextTab);
  if (prevIdx === -1 || nextIdx === -1 || prevIdx === nextIdx) return 0;
  return nextIdx > prevIdx ? -1 : 1;
}

/**
 * Computes a subtle magnetic translation offset (compositor-safe px) toward the pointer.
 */
export function computeMagneticOffset(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  strength = 0.22,
  maxOffset = 4,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const rawX = (clientX - centerX) * strength;
  const rawY = (clientY - centerY) * strength;
  const clamp = (v: number) => Math.max(-maxOffset, Math.min(maxOffset, v));
  return {
    x: Number(clamp(rawX).toFixed(2)),
    y: Number(clamp(rawY).toFixed(2)),
  };
}

/**
 * Computes pointer-local coordinates inside a card for CSS radial spotlight sheens.
 */
export function computeSpotlightCoords(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number },
): { x: number; y: number } {
  return {
    x: Math.round(clientX - rect.left),
    y: Math.round(clientY - rect.top),
  };
}

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * Formats a 1-based editorial index into zero-padded Persian numerals (e.g. 1 -> "۰۱", 12 -> "۱۲").
 */
export function formatEditorialIndex(oneBasedIndex: number): string {
  const safe = Math.max(1, Math.floor(Number.isFinite(oneBasedIndex) ? oneBasedIndex : 1));
  const padded = String(safe).padStart(2, "0");
  return padded.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}
