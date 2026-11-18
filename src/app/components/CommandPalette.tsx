import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Star, BookOpen, Bookmark, Rss, Hash, Globe2, Network,
  RefreshCw, Plus, Upload, Sun, Moon, Eye, EyeOff,
  ChevronLeft, BarChart3, Keyboard, FileText, ArrowLeft, Clock,
  Columns3, Workflow,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Article } from "../data";
import type { RemoteFeed } from "../api";
import type { TopicQuery } from "../timeline";
import { SPRING_SNAPPY } from "../motionPrimitives";

export type Command = {
  id: string;
  label: string;
  hint?: string;
  group: string;
  icon?: any;
  keywords?: string;
  shortcut?: string;
  run: () => void;
};

type Props = {
  open: boolean;
  onClose: () => void;
  articles: Article[];
  feeds: RemoteFeed[];
  actions: {
    setView: (v: string) => void;
    selectFeed: (id: string) => void;
    selectArticle: (id: string) => void;
    refresh: () => void;
    addFeed: () => void;
    importOpml: () => void;
    openHelp: () => void;
    openRules: () => void;
    toggleTheme: () => void;
    markAllRead: () => void;
    openStats: () => void;
    openDigest: () => void;
    openSourceHub: () => void;
    openSavedSearches: () => void;
    openKnowledge: () => void;
    openNotes: () => void;
    openTimeline: (topic?: TopicQuery) => void;
    toggleFocus: () => void;
  };
  theme: string;
};

const norm = (s: string) => s.toLowerCase().replace(/[\u200c]/g, "").trim();

function score(item: { label: string; keywords?: string }, q: string): number {
  if (!q) return 1;
  const hay = norm(`${item.label} ${item.keywords || ""}`);
  const needle = norm(q);
  if (!needle) return 1;
  if (hay.startsWith(needle)) return 100;
  if (hay.includes(` ${needle}`)) return 80;
  if (hay.includes(needle)) return 60;
  let i = 0;
  let matched = 0;
  for (const ch of needle) {
    const idx = hay.indexOf(ch, i);
    if (idx === -1) return 0;
    matched++;
    i = idx + 1;
  }
  return matched === needle.length ? 20 : 0;
}

export function CommandPalette({ open, onClose, articles, feeds, actions, theme }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const baseCommands: Command[] = useMemo(
    () => [
      { id: "view-all", label: "همه مقالات", group: "نماها", icon: BookOpen, keywords: "all home", run: () => actions.setView("all") },
      { id: "view-unread", label: "خوانده‌نشده‌ها", group: "نماها", icon: Eye, keywords: "unread جدید", run: () => actions.setView("unread") },
      { id: "view-starred", label: "نشان‌شده‌ها", group: "نماها", icon: Star, keywords: "starred favorite", run: () => actions.setView("starred") },
      { id: "view-saved", label: "ذخیره‌شده‌ها", group: "نماها", icon: Bookmark, keywords: "saved", run: () => actions.setView("saved") },
      { id: "view-studio", label: "میز کار تحریریه (استودیو)", group: "نماها", icon: Columns3, keywords: "studio editorial تحریریه", run: () => actions.setView("studio") },
      { id: "view-flow", label: "بوم بصری اتوماسیون", group: "نماها", icon: Workflow, keywords: "automation flow اتوماسیون", run: () => actions.setView("visual-flow") },
      { id: "view-international", label: "اخبار بین‌الملل", group: "نماها", icon: Globe2, keywords: "international foreign", run: () => actions.setView("international") },
      { id: "view-graph", label: "نقشهٔ رسانه‌ای (گراف)", group: "نماها", icon: Network, keywords: "graph network", run: () => actions.setView("graph") },
      { id: "view-stats", label: "داشبورد آمار تحلیلی", group: "نماها", icon: BarChart3, keywords: "dashboard stats آمار", run: () => actions.openStats() },
      { id: "view-digest", label: "گزارش روزانه", group: "نماها", icon: Globe2, keywords: "digest روزانه برترین", run: () => actions.openDigest() },
      { id: "act-refresh", label: "بروزرسانی همه فیدها", group: "اقدامات", icon: RefreshCw, shortcut: "R", run: () => actions.refresh() },
      { id: "act-add-feed", label: "افزودن فید جدید", group: "اقدامات", icon: Plus, run: () => actions.addFeed() },
      { id: "act-source-hub", label: "منبع‌یاب چندپلتفرمی", group: "اقدامات", icon: Plus, keywords: "youtube podcast telegram twitter newsletter منبع‌یاب", run: () => actions.openSourceHub() },
      { id: "act-saved-searches", label: "فیلترهای ذخیره‌شده", group: "اقدامات", icon: Hash, keywords: "filter saved search فیلتر جست‌وجو", run: () => actions.openSavedSearches() },
      { id: "act-knowledge", label: "موتور دانش و خوشه‌های خبر", group: "اقدامات", icon: Hash, keywords: "knowledge entities clusters threads dedup موتور دانش موجودیت", run: () => actions.openKnowledge() },
      { id: "act-notes", label: "دفترچه یادداشت‌ها", group: "اقدامات", icon: BookOpen, keywords: "notes backlinks یادداشت", shortcut: "N", run: () => actions.openNotes() },
      { id: "act-timeline", label: "خط زمانی موضوع", group: "اقدامات", icon: Clock, keywords: "timeline chronology خط زمانی", run: () => actions.openTimeline() },
      { id: "act-import-opml", label: "ورود و خروج OPML", group: "اقدامات", icon: Upload, run: () => actions.importOpml() },
      { id: "act-mark-all", label: "علامت‌گذاری همه به‌عنوان خوانده‌شده", group: "اقدامات", icon: EyeOff, run: () => actions.markAllRead() },
      { id: "act-rules", label: "مدیریت قواعد برچسب‌گذاری", group: "اقدامات", icon: Hash, run: () => actions.openRules() },
      { id: "act-focus", label: "حالت مطالعهٔ متمرکز", group: "اقدامات", icon: FileText, shortcut: "F", keywords: "focus reading mode", run: () => actions.toggleFocus() },
      { id: "act-theme", label: theme === "dark" ? "تغییر به تم روشن" : "تغییر به تم تاریک", group: "تنظیمات", icon: theme === "dark" ? Sun : Moon, run: () => actions.toggleTheme() },
      { id: "act-help", label: "میان‌برهای صفحه‌کلید", group: "تنظیمات", icon: Keyboard, shortcut: "?", run: () => actions.openHelp() },
    ],
    [actions, theme],
  );

  const feedCommands: Command[] = useMemo(
    () =>
      feeds.map((f) => ({
        id: `feed-${f.id}`,
        label: f.name,
        hint: f.icon,
        group: "فیدها",
        icon: Rss,
        keywords: f.name,
        run: () => actions.selectFeed(f.id),
      })),
    [feeds, actions],
  );

  const articleCommands: Command[] = useMemo(
    () =>
      articles.slice(0, 200).map((a) => ({
        id: `article-${a.id}`,
        label: a.title,
        hint: a.source,
        group: "مقالات",
        icon: FileText,
        keywords: `${a.source} ${a.preview}`,
        run: () => actions.selectArticle(a.id),
      })),
    [articles, actions],
  );

  const all = useMemo(
    () => [...baseCommands, ...feedCommands, ...articleCommands],
    [baseCommands, feedCommands, articleCommands],
  );

  const ranked = useMemo(() => {
    if (!q.trim()) return baseCommands;
    return all
      .map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 50)
      .map((x) => x.c);
  }, [all, baseCommands, q]);

  const grouped = useMemo(() => {
    const m = new Map<string, Command[]>();
    for (const c of ranked) {
      if (!m.has(c.group)) m.set(c.group, []);
      m.get(c.group)!.push(c);
    }
    return Array.from(m.entries());
  }, [ranked]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(ranked.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = ranked[active];
        if (cmd) {
          cmd.run();
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, ranked, active, onClose]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-cmd-idx="${active}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [active]);

  let cursor = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cmd-palette-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="پنل دستورات"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, pointerEvents: "auto" }}
          exit={{ opacity: 0, pointerEvents: "none" }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[11vh] px-4"
          onClick={onClose}
        >
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={SPRING_SNAPPY}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl bg-[var(--popover)] text-[var(--popover-foreground)] rounded-[var(--radius-xl)] shadow-[var(--shadow-2xl)] border border-[var(--border)] overflow-hidden flex flex-col max-h-[70vh]"
          >
            <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-[var(--border-subtle)]">
              <Search className="w-4 h-4 text-[var(--brand-500)] shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجوی فرمان، منبع یا مقاله…"
                className="flex-1 bg-transparent outline-none text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)]"
              />
              <button
                type="button"
                onClick={onClose}
                className="text-[10px] font-mono text-[var(--foreground-subtle)] hover:text-[var(--foreground)] bg-[var(--background-muted)] rounded px-1.5 py-0.5 cursor-pointer"
              >
                Esc
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto py-1.5 px-1.5">
              {grouped.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-[var(--foreground-subtle)]">
                  موردی منطبق با جستجوی شما یافت نشد
                </div>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="py-1">
                  <div className="px-3 py-1 text-[11px] font-semibold text-[var(--foreground-subtle)]">
                    {group}
                  </div>
                  {items.map((item) => {
                    const idx = cursor++;
                    const Icon = item.icon || ChevronLeft;
                    const isActive = idx === active;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-cmd-idx={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => {
                          item.run();
                          onClose();
                        }}
                        className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-right text-sm transition-all duration-150 cursor-pointer ${
                          isActive
                            ? "bg-[var(--accent)] text-[var(--foreground)] font-medium ring-1 ring-[var(--brand-500)]/25"
                            : "text-[var(--foreground-muted)] hover:bg-[var(--background-subtle)]"
                        }`}
                      >
                        <Icon
                          className={`relative z-10 w-4 h-4 shrink-0 transition-colors ${
                            isActive ? "text-[var(--brand-600)] dark:text-[var(--brand-400)]" : "text-[var(--foreground-subtle)]"
                          }`}
                        />
                        <span className="relative z-10 flex-1 truncate">{item.label}</span>
                        {item.hint && (
                          <span className="relative z-10 text-[11px] text-[var(--foreground-subtle)] truncate max-w-[36%]">
                            {item.hint}
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd className="relative z-10 text-[10px] font-mono bg-[var(--background-muted)] text-[var(--foreground-muted)] rounded px-1.5 py-0.5">
                            {item.shortcut}
                          </kbd>
                        )}
                        {isActive && (
                          <ArrowLeft className="relative z-10 w-3.5 h-3.5 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--border-subtle)] bg-[var(--background-subtle)]/70 px-4 py-2 text-[11px] text-[var(--foreground-subtle)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="font-mono bg-[var(--card)] border border-[var(--border-subtle)] rounded px-1">↑↓</kbd> حرکت
                </span>
                <span>
                  <kbd className="font-mono bg-[var(--card)] border border-[var(--border-subtle)] rounded px-1">↵</kbd> اجرا
                </span>
              </div>
              <span className="font-mono">⌘K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
