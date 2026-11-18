import {
  CheckCheck, RefreshCw, LayoutGrid, List, Newspaper, Share2,
  ArrowDownAZ, ArrowUpZA, Calendar, Inbox, Languages, Loader2, Check, CircleDot,
} from "lucide-react";
import { useMemo, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Article } from "../data";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  SPRING_SILK, SPRING_SNAPPY, computeStaggerDelay, formatEditorialIndex,
} from "../motionPrimitives";
import { AnimatedCounter, SpotlightCard, TactileToggleIcon } from "./MotionEffects";

function looksNonPersian(title: string): boolean {
  const t = String(title || "");
  if (!t.trim()) return false;
  const arabicScript = (t.match(/[؀-ۿ]/g) || []).length;
  const latin = (t.match(/[A-Za-zЀ-ӿͰ-Ͽ]/g) || []).length;
  return latin > 0 && latin >= arabicScript;
}

function needsFa(a: Article): boolean {
  if (a.titleTranslated || !a.title) return false;
  return a.lang ? a.lang !== "fa" : looksNonPersian(a.title);
}

const ROW_H = 68;
const VIRT_THRESHOLD = 80;

export type SortMode = "newest" | "oldest" | "source";

type Props = {
  articles: Article[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  viewMode: "cards" | "list" | "magazine";
  setViewMode: (v: "cards" | "list" | "magazine") => void;
  title: string;
  toggleStar: (id: string) => void;
  sortMode?: SortMode;
  setSortMode?: (s: SortMode) => void;
  onRefresh?: () => void;
  onMarkAllRead?: () => void;
  loading?: boolean;
  translateAll?: boolean;
  onToggleTranslateAll?: () => void;
  onTranslate?: (ids: string[]) => void;
  translatingIds?: Set<string>;
  subHeader?: ReactNode;
};

function parseDate(s: string): number {
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t;
}

export function ArticleList({
  articles,
  selectedId,
  setSelectedId,
  viewMode,
  setViewMode,
  title,
  toggleStar,
  sortMode = "newest",
  setSortMode,
  onRefresh,
  onMarkAllRead,
  loading,
  translateAll = false,
  onToggleTranslateAll,
  onTranslate,
  translatingIds,
  subHeader,
}: Props) {
  const [onlyUnreadQuick, setOnlyUnreadQuick] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const sorted = useMemo(() => {
    const base = onlyUnreadQuick ? articles.filter((a) => !a.read) : articles;
    const arr = [...base];
    if (sortMode === "newest") arr.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    else if (sortMode === "oldest") arr.sort((a, b) => parseDate(a.date) - parseDate(b.date));
    else if (sortMode === "source") arr.sort((a, b) => a.source.localeCompare(b.source, "fa"));
    return arr;
  }, [articles, sortMode, onlyUnreadQuick]);

  const selectedRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [vRange, setVRange] = useState({ start: 0, end: 60 });

  const virtualize = viewMode === "list" && sorted.length > VIRT_THRESHOLD;

  useEffect(() => {
    if (!virtualize) {
      selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const top = el.scrollTop;
      const h = el.clientHeight;
      const start = Math.max(0, Math.floor(top / ROW_H) - 8);
      const end = Math.min(sorted.length, Math.ceil((top + h) / ROW_H) + 8);
      setVRange({ start, end });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [virtualize, sorted.length, selectedId]);

  useEffect(() => {
    if (!virtualize) return;
    const idx = sorted.findIndex((a) => a.id === selectedId);
    if (idx < 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const top = idx * ROW_H;
    if (top < el.scrollTop || top + ROW_H > el.scrollTop + el.clientHeight) {
      el.scrollTo({ top: top - el.clientHeight / 2, behavior: "smooth" });
    }
  }, [selectedId, virtualize, sorted]);

  useEffect(() => {
    if (!translateAll || !onTranslate) return;
    const root = scrollRef.current;
    if (!root) return;
    let queued = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      if (queued.size) {
        onTranslate(Array.from(queued));
        queued = new Set();
      }
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = (e.target as HTMLElement).dataset.aid;
            if (id) queued.add(id);
          }
        }
        clearTimeout(timer);
        timer = setTimeout(flush, 300);
      },
      { root, rootMargin: "300px 0px" },
    );
    const observe = () => root.querySelectorAll("[data-aid]").forEach((el) => io.observe(el));
    observe();
    const mo = new MutationObserver(observe);
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(timer);
    };
  }, [translateAll, onTranslate, viewMode, sorted]);

  const SortIcon = sortMode === "oldest" ? ArrowUpZA : sortMode === "source" ? ArrowDownAZ : Calendar;
  const nextSort: SortMode = sortMode === "newest" ? "oldest" : sortMode === "oldest" ? "source" : "newest";
  const sortLabel = sortMode === "newest" ? "جدیدترین" : sortMode === "oldest" ? "قدیمی‌ترین" : "بر اساس منبع";
  const isEmpty = !loading && sorted.length === 0;

  const shareCurrentView = () => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 1600);
    } catch {
      // ignore
    }
  };

  const TransBtn = ({ a }: { a: Article }) => {
    if (!onTranslate || !needsFa(a)) return null;
    const busy = translatingIds?.has(a.id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onTranslate([a.id]);
        }}
        disabled={busy}
        aria-label="ترجمهٔ این تیتر به فارسی"
        title="ترجمهٔ این تیتر به فارسی"
        className="p-1.5 rounded-[var(--radius-sm)] text-[var(--foreground-subtle)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
      </button>
    );
  };

  const viewOptions: { id: "list" | "cards" | "magazine"; label: string; Icon: typeof List }[] = [
    { id: "list", label: "لیست فشرده", Icon: List },
    { id: "cards", label: "ویترین تحریریه", Icon: LayoutGrid },
    { id: "magazine", label: "مجله", Icon: Newspaper },
  ];

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-w-0 min-h-0 h-full">
      {/* Frosted Editorial Toolbar */}
      <div className="border-b border-[var(--border-subtle)] px-5 py-3 flex items-center gap-1.5 sticky top-0 bg-[var(--background)]/88 backdrop-blur-md z-10">
        <div className="flex items-baseline gap-2 min-w-0 mr-0 ml-auto">
          <h2 className="font-display text-base lg:text-lg font-semibold text-[var(--foreground)] whitespace-nowrap shrink-0">
            {title}
          </h2>
          <span className="text-xs text-[var(--foreground-subtle)] whitespace-nowrap shrink-0">
            <AnimatedCounter value={sorted.length} suffix="مقاله" />
          </span>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onRefresh}
          disabled={loading}
          aria-label="بروزرسانی"
          title="بروزرسانی"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] disabled:opacity-50 transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[var(--brand-500)]" : ""}`} />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onMarkAllRead}
          aria-label="علامت‌گذاری همه به عنوان خوانده‌شده"
          title="علامت‌گذاری همه به عنوان خوانده شده"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer shrink-0"
        >
          <CheckCheck className="w-4 h-4" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setSortMode?.(nextSort)}
          aria-label={`مرتب‌سازی: ${sortLabel}`}
          title={`ترتیب: ${sortLabel}`}
          className="px-2 py-1.5 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <SortIcon className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">{sortLabel}</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setOnlyUnreadQuick((v) => !v)}
          aria-pressed={onlyUnreadQuick}
          aria-label="فیلتر سریع نخوانده‌ها"
          title={onlyUnreadQuick ? "نمایش همه مقالات" : "فقط خوانده‌نشده‌ها"}
          className={`px-2 py-1.5 rounded-[var(--radius-md)] flex items-center gap-1.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            onlyUnreadQuick
              ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          }`}
        >
          <CircleDot className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline">نخوانده</span>
        </motion.button>

        {onToggleTranslateAll && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onToggleTranslateAll}
            aria-pressed={translateAll}
            aria-label="ترجمه همه"
            className={`px-2 py-1.5 rounded-[var(--radius-md)] flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              translateAll
                ? "bg-[var(--brand-600)] text-white"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
            }`}
            title={
              translateAll
                ? "ترجمه خودکار تیترها روشن است"
                : "ترجمه همهٔ تیترهای غیرفارسی به فارسی هنگام پیمایش"
            }
          >
            {translatingIds && translatingIds.size > 0 ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Languages className="w-3.5 h-3.5" />
            )}
            <span className="hidden 2xl:inline">ترجمه همه</span>
          </motion.button>
        )}

        <div className="w-px h-5 bg-[var(--border-subtle)] mx-0.5" />

        {/* Spring-Animated View Switcher */}
        <LayoutGroup id="article-view-switcher">
          <div
            role="group"
            aria-label="حالت نمایش لیست"
            className="flex items-center bg-[var(--background-muted)] rounded-[var(--radius-md)] p-0.5 border border-[var(--border-subtle)]"
          >
            {viewOptions.map(({ id, label, Icon }) => {
              const active = viewMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id)}
                  aria-label={label}
                  aria-pressed={active}
                  title={label}
                  className={`relative p-1.5 rounded-[calc(var(--radius-md)-2px)] transition-colors cursor-pointer ${
                    active ? "text-[var(--foreground)]" : "text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="article-viewmode-pill"
                      transition={SPRING_SILK}
                      className="absolute inset-0 rounded-[calc(var(--radius-md)-2px)] bg-[var(--card)] shadow-[var(--shadow-xs)] border border-[var(--border-subtle)]"
                    />
                  )}
                  <Icon className="relative z-10 w-4 h-4" />
                </button>
              );
            })}
          </div>
        </LayoutGroup>

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={shareCurrentView}
          aria-label="کپی پیوند این نما"
          title="کپی پیوند این نما"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
        >
          {copiedShare ? <Check className="w-4 h-4 text-[var(--brand-500)]" /> : <Share2 className="w-4 h-4" />}
        </motion.button>
      </div>

      {subHeader}

      {/* Scrollable Feed Canvas */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        {loading && articles.length === 0 && (
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-3 animate-pulse">
                <div className="w-2 h-2 rounded-full mt-2 bg-[var(--background-muted)]" />
                <div className="flex-1 space-y-2.5">
                  <div className="h-3 w-40 bg-[var(--background-muted)] rounded" />
                  <div className="h-4 w-3/4 bg-[var(--background-muted)] rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="p-16 text-center text-[var(--foreground-muted)] flex flex-col items-center gap-3"
          >
            <Inbox className="w-11 h-11 text-[var(--foreground-subtle)]/50 stroke-[1.4]" />
            <div className="font-display text-lg font-semibold text-[var(--foreground)]">مقاله‌ای در این نما یافت نشد</div>
            <div className="text-xs text-[var(--foreground-subtle)] max-w-xs">
              {onlyUnreadQuick
                ? "همهٔ مقالات این بخش خوانده شده‌اند."
                : "منبع جدیدی اضافه کنید یا فیلترهای فعال را بازنشانی نمایید."}
            </div>
            {onlyUnreadQuick && (
              <button
                type="button"
                onClick={() => setOnlyUnreadQuick(false)}
                className="mt-1 px-4 py-2 rounded-[var(--radius-md)] bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-medium cursor-pointer"
              >
                نمایش همه مقالات
              </button>
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {/* 1. LIST VIEW — High-Density Linear/Editorial Scannable Feed */}
          {viewMode === "list" && !isEmpty && (
            <motion.div
              key="mode-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              {virtualize ? (
                <div style={{ height: sorted.length * ROW_H, position: "relative" }}>
                  <div
                    className="divide-y divide-[var(--border-subtle)] absolute left-0 right-0"
                    style={{ top: vRange.start * ROW_H }}
                  >
                    {sorted.slice(vRange.start, vRange.end).map((a) => {
                      const isSelected = selectedId === a.id;
                      return (
                        <div
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedId(a.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedId(a.id);
                            }
                          }}
                          style={{ height: ROW_H }}
                          data-aid={a.id}
                          className={`topic-row group cursor-pointer w-full px-5 flex items-center gap-3.5 text-right transition-colors ${
                            isSelected
                              ? "bg-[var(--accent)]/65"
                              : "hover:bg-[var(--background-subtle)]"
                          } ${a.read && !isSelected ? "opacity-65" : ""}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-transform ${
                              a.read ? "bg-transparent" : "bg-[var(--brand-500)] scale-110"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-subtle)] tabular-nums mb-0.5">
                              <span>{a.sourceIcon}</span>
                              <span className="truncate max-w-[140px] font-medium text-[var(--foreground-muted)]">{a.source}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate max-w-[140px]">{a.date}</span>
                              {a.readTime && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{a.readTime}</span>
                                </>
                              )}
                            </div>
                            <div dir="auto" className="text-[14.5px] font-medium text-[var(--foreground)] truncate group-hover:text-[var(--brand-700)] dark:group-hover:text-[var(--brand-300)] transition-colors">
                              {a.title}
                            </div>
                          </div>
                          <TransBtn a={a} />
                          <TactileToggleIcon
                            active={a.starred}
                            kind="star"
                            title={a.starred ? "حذف نشان" : "نشان کردن"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(a.id);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <LayoutGroup id="article-list-rows">
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {sorted.map((a, idx) => {
                      const isSelected = selectedId === a.id;
                      return (
                        <motion.div
                          key={a.id}
                          ref={isSelected ? selectedRef : undefined}
                          role="button"
                          tabIndex={0}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.2,
                            delay: computeStaggerDelay(idx, 0.018, 0.16),
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          onClick={() => setSelectedId(a.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedId(a.id);
                            }
                          }}
                          data-aid={a.id}
                          className={`topic-row relative group cursor-pointer w-full px-5 py-3.5 flex items-start gap-3.5 text-right transition-colors ${
                            !isSelected ? "hover:bg-[var(--background-subtle)]" : ""
                          } ${a.read && !isSelected ? "opacity-65 hover:opacity-95" : ""}`}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="article-list-selected-bg"
                              transition={SPRING_SILK}
                              className="pointer-events-none absolute inset-0 bg-[var(--accent)]/60 border-y border-[var(--brand-500)]/20"
                            />
                          )}
                          <span
                            aria-hidden="true"
                            className={`relative z-10 w-1.5 h-1.5 rounded-full mt-2 shrink-0 transition-all ${
                              a.read ? "bg-transparent" : "bg-[var(--brand-500)]"
                            }`}
                          />
                          <div className="relative z-10 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-subtle)] tabular-nums mb-1">
                              <span>{a.sourceIcon}</span>
                              <span className="font-medium text-[var(--foreground-muted)] truncate max-w-[160px]">{a.source}</span>
                              {a.date && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{a.date}</span>
                                </>
                              )}
                              {a.readTime && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>{a.readTime}</span>
                                </>
                              )}
                            </div>
                            <div
                              dir="auto"
                              className={`text-[14.5px] leading-snug truncate transition-colors ${
                                isSelected
                                  ? "font-semibold text-[var(--foreground)]"
                                  : "font-medium text-[var(--foreground)] group-hover:text-[var(--brand-700)] dark:group-hover:text-[var(--brand-300)]"
                              }`}
                            >
                              {a.title}
                            </div>
                          </div>
                          {a.image && (
                            <div className="relative z-10 hidden sm:block w-14 h-11 rounded-[var(--radius-sm)] overflow-hidden shrink-0 bg-[var(--background-muted)] border border-[var(--border-subtle)]">
                              <ImageWithFallback
                                src={a.image}
                                alt={a.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="relative z-10 flex items-center gap-0.5 shrink-0">
                            <TransBtn a={a} />
                            <TactileToggleIcon
                              active={a.starred}
                              kind="star"
                              title={a.starred ? "حذف نشان" : "نشان کردن"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(a.id);
                              }}
                            />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </LayoutGroup>
              )}
            </motion.div>
          )}

          {/* 2. CARDS VIEW — Dynamic Curatorial Bento Showcase */}
          {viewMode === "cards" && !isEmpty && (
            <motion.div
              key="mode-cards"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 grid gap-4 grid-cols-1 lg:grid-cols-2"
            >
              {sorted.map((a, idx) => {
                const isLead = idx === 0;
                const isSelected = selectedId === a.id;

                if (isLead && a.image) {
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={SPRING_SNAPPY}
                      className="lg:col-span-2"
                    >
                      <SpotlightCard
                        dataAid={a.id}
                        onClick={() => setSelectedId(a.id)}
                        className={`topic-row group cursor-pointer rounded-[var(--radius-lg)] overflow-hidden bg-[var(--card)] border transition-all duration-300 ${
                          isSelected
                            ? "border-[var(--brand-500)] shadow-[var(--shadow-md)]"
                            : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                        }`}
                      >
                        <div className="grid grid-cols-1 xl:grid-cols-12 items-stretch">
                          <div className="xl:col-span-7 relative min-h-[220px] xl:min-h-[280px] overflow-hidden bg-[var(--background-muted)]">
                            <ImageWithFallback
                              src={a.image}
                              alt={a.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                            />
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent xl:hidden" />
                          </div>
                          <div className="xl:col-span-5 p-5 xl:p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] tabular-nums mb-3">
                                <span className="font-mono text-[var(--brand-600)] dark:text-[var(--brand-400)] font-semibold">
                                  {formatEditorialIndex(1)}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-[var(--foreground-muted)]">{a.source}</span>
                                {a.date && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{a.date}</span>
                                  </>
                                )}
                              </div>
                              <h3 className="font-display text-xl xl:text-2xl font-semibold text-[var(--foreground)] leading-snug mb-3 group-hover:text-[var(--brand-700)] dark:group-hover:text-[var(--brand-300)] transition-colors">
                                {a.title}
                              </h3>
                              <p className="text-sm text-[var(--foreground-muted)] leading-relaxed line-clamp-3">
                                {a.preview}
                              </p>
                            </div>
                            <div className="mt-5 pt-3.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-subtle)] tabular-nums">
                              <span>
                                {a.author ? `${a.author} · ` : ""}
                                {a.readTime}
                              </span>
                              <div className="flex items-center gap-1">
                                <TransBtn a={a} />
                                <TactileToggleIcon
                                  active={a.starred}
                                  kind="star"
                                  title={a.starred ? "حذف نشان" : "نشان کردن"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStar(a.id);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </SpotlightCard>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: computeStaggerDelay(idx, 0.025, 0.18),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                  >
                    <SpotlightCard
                      dataAid={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`topic-row group cursor-pointer h-full flex flex-col bg-[var(--card)] border rounded-[var(--radius-lg)] overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? "border-[var(--brand-500)] shadow-[var(--shadow-sm)]"
                          : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                      } ${a.read && !isSelected ? "opacity-75 hover:opacity-100" : ""}`}
                    >
                      {a.image && (
                        <div className="h-44 overflow-hidden bg-[var(--background-muted)] border-b border-[var(--border-subtle)]">
                          <ImageWithFallback
                            src={a.image}
                            alt={a.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                          />
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-[var(--foreground-subtle)] tabular-nums mb-2">
                            <span className="font-mono opacity-75">{formatEditorialIndex(idx + 1)}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-[var(--foreground-muted)] truncate">{a.source}</span>
                            {a.date && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{a.date}</span>
                              </>
                            )}
                          </div>
                          <h3 className="font-display text-base font-semibold text-[var(--foreground)] leading-snug mb-2 line-clamp-2 group-hover:text-[var(--brand-700)] dark:group-hover:text-[var(--brand-300)] transition-colors">
                            {a.title}
                          </h3>
                          <p className="text-[13px] text-[var(--foreground-muted)] leading-relaxed line-clamp-2 mb-3">
                            {a.preview}
                          </p>
                        </div>
                        <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--foreground-subtle)] tabular-nums">
                          <span>{a.readTime}</span>
                          <div className="flex items-center gap-1">
                            <TransBtn a={a} />
                            <TactileToggleIcon
                              active={a.starred}
                              kind="star"
                              title={a.starred ? "حذف نشان" : "نشان کردن"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStar(a.id);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* 3. MAGAZINE VIEW — Broadsheet Monograph Index */}
          {viewMode === "magazine" && !isEmpty && (
            <motion.div
              key="mode-magazine"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="p-6 divide-y divide-[var(--border-subtle)]"
            >
              {sorted.map((a, idx) => {
                const isSelected = selectedId === a.id;
                return (
                  <motion.article
                    key={a.id}
                    data-aid={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: computeStaggerDelay(idx, 0.024, 0.18),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onClick={() => setSelectedId(a.id)}
                    className={`topic-row group cursor-pointer flex flex-col sm:flex-row items-start gap-5 py-6 first:pt-1 transition-opacity ${
                      a.read && !isSelected ? "opacity-75 hover:opacity-100" : ""
                    }`}
                  >
                    <div className="hidden xl:flex flex-col items-end shrink-0 w-9 pt-1">
                      <span
                        className={`font-mono text-sm tabular-nums ${
                          isSelected
                            ? "text-[var(--brand-600)] dark:text-[var(--brand-400)] font-semibold"
                            : "text-[var(--foreground-subtle)]"
                        }`}
                      >
                        {formatEditorialIndex(idx + 1)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] tabular-nums mb-2">
                        <span className="font-medium text-[var(--foreground-muted)]">
                          {a.sourceIcon} {a.source}
                        </span>
                        {a.author && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{a.author}</span>
                          </>
                        )}
                        {a.date && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{a.date}</span>
                          </>
                        )}
                      </div>
                      <h3
                        className={`font-display text-lg lg:text-xl font-semibold leading-snug mb-2 transition-colors ${
                          isSelected
                            ? "text-[var(--brand-600)] dark:text-[var(--brand-400)]"
                            : "text-[var(--foreground)] group-hover:text-[var(--brand-700)] dark:group-hover:text-[var(--brand-300)]"
                        }`}
                      >
                        {a.title}
                      </h3>
                      <p className="text-sm text-[var(--foreground-muted)] leading-relaxed line-clamp-2 mb-3 max-w-[68ch]">
                        {a.preview}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--foreground-subtle)] tabular-nums">
                        <span>{a.readTime} مطالعه</span>
                        <TransBtn a={a} />
                        <TactileToggleIcon
                          active={a.starred}
                          kind="star"
                          title={a.starred ? "حذف نشان" : "نشان کردن"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(a.id);
                          }}
                        />
                      </div>
                    </div>

                    {a.image && (
                      <div className="w-full sm:w-44 h-32 shrink-0 rounded-[var(--radius-md)] overflow-hidden bg-[var(--background-muted)] border border-[var(--border-subtle)]">
                        <ImageWithFallback
                          src={a.image}
                          alt={a.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                        />
                      </div>
                    )}
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
