import React, { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Star, Bookmark } from "lucide-react";
import {
  SPRING_SNAPPY,
  computeMagneticOffset,
  computeSpotlightCoords,
} from "../motionPrimitives";

/**
 * Subtle magnetic button wrapper — pulls up to 3.5px toward the cursor using
 * compositor-only transform springs, and resets cleanly on pointer leave.
 */
export function MagneticButton({
  children,
  className = "",
  onClick,
  disabled,
  title,
  ariaLabel,
  testId,
  type = "button",
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  testId?: string;
  type?: "button" | "submit" | "reset";
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reduced || disabled || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setOffset(computeMagneticOffset(e.clientX, e.clientY, rect, 0.2, 3.5));
  };

  const handleLeave = () => {
    if (offset.x !== 0 || offset.y !== 0) setOffset({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      data-testid={testId}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      animate={{ x: offset.x, y: offset.y }}
      whileTap={disabled || reduced ? undefined : { scale: 0.96 }}
      transition={SPRING_SNAPPY}
      className={className}
    >
      {children}
    </motion.button>
  );
}

/**
 * Editorial card container with zero-rerender CSS radial spotlight tracking on hover.
 */
export function SpotlightCard({
  children,
  className = "",
  onClick,
  dataAid,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  dataAid?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { x, y } = computeSpotlightCoords(e.clientX, e.clientY, rect);
    el.style.setProperty("--spot-x", `${x}px`);
    el.style.setProperty("--spot-y", `${y}px`);
  };

  return (
    <article
      ref={ref}
      data-aid={dataAid}
      onClick={onClick}
      onMouseMove={handleMove}
      className={`spotlight-surface ${className}`}
    >
      {children}
    </article>
  );
}

/**
 * Vertically rolling tabular-numeral counter for live unread & article totals.
 */
export function AnimatedCounter({
  value,
  suffix = "",
  className = "",
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const formatted = value.toLocaleString("fa-IR");
  return (
    <span className={`inline-flex items-center overflow-hidden tabular-nums ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={formatted}
          initial={{ y: 9, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -9, opacity: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {formatted}
        </motion.span>
      </AnimatePresence>
      {suffix ? <span className="mr-1">{suffix}</span> : null}
    </span>
  );
}

/**
 * Tactile spring-choreographed Star / Bookmark button with subtle halo pop on activation.
 */
export function TactileToggleIcon({
  active,
  kind = "star",
  onClick,
  title,
  ariaLabel,
  className = "",
}: {
  active: boolean;
  kind?: "star" | "bookmark";
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  title?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const Icon = kind === "star" ? Star : Bookmark;
  const activeColor =
    kind === "star"
      ? "fill-amber-400 text-amber-400"
      : "fill-[var(--brand-500)] text-[var(--brand-500)]";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      aria-pressed={active}
      whileTap={{ scale: 0.84 }}
      transition={SPRING_SNAPPY}
      className={`relative p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer ${className}`}
    >
      <motion.span
        key={active ? "on" : "off"}
        initial={active ? { scale: 0.65, rotate: kind === "star" ? -18 : 0 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={SPRING_SNAPPY}
        className="grid place-items-center"
      >
        <Icon className={`w-4 h-4 transition-colors ${active ? activeColor : ""}`} />
      </motion.span>
      <AnimatePresence>
        {active && (
          <motion.span
            key="burst"
            initial={{ scale: 0.5, opacity: 0.55 }}
            animate={{ scale: 1.75, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className={`pointer-events-none absolute inset-1 rounded-full border ${
              kind === "star" ? "border-amber-400/70" : "border-[var(--brand-500)]/70"
            }`}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
