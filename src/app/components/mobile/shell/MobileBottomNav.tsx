import { Home, Search, Bookmark, Globe2, User } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { LayoutGroup, motion } from "motion/react";
import { useHaptics } from "../hooks";
import { SPRING_SILK, SPRING_SNAPPY } from "../../../motionPrimitives";

export type MobileTab = "home" | "international" | "discover" | "saved" | "me";

type TabDef = {
  id: MobileTab;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  center?: boolean;
};

const TABS: TabDef[] = [
  { id: "home",          label: "خانه",      Icon: Home },
  { id: "international", label: "بین‌الملل", Icon: Globe2 },
  { id: "discover",      label: "کاوش",      Icon: Search, center: true },
  { id: "saved",         label: "ذخیره",     Icon: Bookmark },
  { id: "me",            label: "من",        Icon: User },
];

export function MobileBottomNav({
  active,
  onChange,
  badges,
}: {
  active: MobileTab;
  onChange: (t: MobileTab) => void;
  badges?: Partial<Record<MobileTab, number>>;
}) {
  const haptic = useHaptics();
  const center = TABS.find((t) => t.center)!;

  const press = (id: MobileTab) => {
    if (active !== id) haptic("select");
    onChange(id);
  };

  const W = 375;
  const H = 64;
  const BAR_TOP = 8;
  const CX = W / 2;
  const NOTCH_R = 34;

  const barPath =
    `M 0 ${BAR_TOP} ` +
    `L ${CX - NOTCH_R} ${BAR_TOP} ` +
    `A ${NOTCH_R} ${NOTCH_R} 0 0 0 ${CX + NOTCH_R} ${BAR_TOP} ` +
    `L ${W} ${BAR_TOP} ` +
    `L ${W} ${H} ` +
    `L 0 ${H} Z`;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[var(--z-mobile-bottomnav)] kian-bottomnav"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="پیمایش پایین"
    >
      <LayoutGroup id="mobile-bottom-nav-group">
        <div className="relative w-full" style={{ height: `${H}px` }}>
          <svg
            className="absolute inset-0 w-full h-full kian-bottomnav-svg"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            aria-hidden
          >
            <path d={barPath} fill="var(--card)" />
          </svg>

          <ul className="absolute left-0 right-0 grid grid-cols-5 h-full">
            {TABS.map((t) => {
              if (t.center) return <li key={t.id} aria-hidden />;
              const on = active === t.id;
              const b = badges?.[t.id];
              return (
                <li key={t.id} className="flex items-end justify-center pb-2">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    transition={SPRING_SNAPPY}
                    onClick={() => press(t.id)}
                    aria-current={on ? "page" : undefined}
                    aria-label={t.label}
                    className="relative min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-0.5 tap rounded-full"
                  >
                    <t.Icon
                      className={
                        on
                          ? "size-5 text-[var(--foreground)]"
                          : "size-5 text-[var(--foreground-subtle)]"
                      }
                      strokeWidth={on ? 2.2 : 1.75}
                    />
                    <span
                      className={`text-[10px] leading-none ${
                        on ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground-subtle)]"
                      }`}
                    >
                      {t.label}
                    </span>
                    {!!b && (
                      <span className="absolute top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--brand-500)] text-white text-[9px] grid place-items-center font-bold tabular-nums">
                        {b > 99 ? "+۹۹" : b.toLocaleString("fa-IR")}
                      </span>
                    )}
                    {on && (
                      <motion.span
                        layoutId="mobile-nav-dot"
                        transition={SPRING_SILK}
                        aria-hidden
                        className="absolute -bottom-0.5 w-1.5 h-1 rounded-full bg-[var(--brand-500)]"
                      />
                    )}
                  </motion.button>
                </li>
              );
            })}
          </ul>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            transition={SPRING_SNAPPY}
            onClick={() => press(center.id)}
            aria-current={active === center.id ? "page" : undefined}
            aria-label={center.label}
            className="absolute left-1/2 -translate-x-1/2 -top-4 size-[52px] rounded-full grid place-items-center bg-[var(--foreground)] text-[var(--card)] tap kian-bottomnav-fab shadow-lg"
          >
            <center.Icon className="size-6" strokeWidth={2.3} />
          </motion.button>
        </div>
      </LayoutGroup>
    </nav>
  );
}
