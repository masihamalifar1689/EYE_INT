import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_SNAPPY } from "../motionPrimitives";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}

export function ThemeToggle({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.88 }}
      transition={SPRING_SNAPPY}
      aria-label={theme === "dark" ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"}
      title={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
      className="relative size-8 grid place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--card)] hover:bg-[var(--background-muted)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ y: -10, rotate: -65, opacity: 0 }}
          animate={{ y: 0, rotate: 0, opacity: 1 }}
          exit={{ y: 10, rotate: 65, opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="grid place-items-center"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
