import { useEffect, useMemo, useRef, useState } from "react";
import {
  X, Type, Minus, Plus, Sun, Moon, Coffee, AlignLeft, AlignJustify,
  Volume2, VolumeX, Star, Bookmark, ExternalLink, Sparkles, Highlighter,
  Quote as QuoteIcon, Trash2, Map as MapIcon, Target,
} from "lucide-react";
import { AnimatePresence, motion, useSpring } from "motion/react";
import type { Article } from "../data";
import {
  summarize, extractQuotes, readability, personalReadTime, recordReadSpeed,
  getHighlights, addHighlight, removeHighlight, updateHighlight,
  savePosition, getPosition, todayProgress,
  type Highlight, type SummaryLevel, type StructuredSummary,
} from "../readingStudio";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SPRING_EDITORIAL, SPRING_SNAPPY } from "../motionPrimitives";

type Theme = "light" | "dark" | "sepia";
type Width = "narrow" | "medium" | "wide";
type Align = "right" | "justify";

type Props = {
  article: Article;
  onClose: () => void;
  onToggleStar?: (id: string) => void;
  onToggleSave?: (id: string) => void;
  isSaved?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
};

const FONTS = [
  { id: "vazir", label: "وزیرمتن", css: "Vazirmatn, Tahoma, sans-serif" },
  { id: "estedad", label: "استعداد", css: "'Estedad', Vazirmatn, sans-serif" },
  { id: "serif", label: "سریف تحریریه", css: "'Playfair Display', 'Estedad', Georgia, serif" },
];

const WIDTH_PX: Record<Width, string> = { narrow: "560px", medium: "700px", wide: "860px" };

export function ReadingMode({ article, onClose, onToggleStar, onToggleSave, isSaved, onPrev, onNext }: Props) {
  const stored = (k: string, fb: string) => {
    try { return localStorage.getItem(k) || fb; } catch { return fb; }
  };
  const storedNum = (k: string, fb: number) => {
    try { return Number(localStorage.getItem(k)) || fb; } catch { return fb; }
  };

  const [theme, setTheme] = useState<Theme>(stored("rm.theme", "light") as Theme);
  const [fontSize, setFontSize] = useState<number>(storedNum("rm.fs", 18));
  const [lineHeight, setLineHeight] = useState<number>(storedNum("rm.lh", 1.95));
  const [width, setWidth] = useState<Width>(stored("rm.w", "medium") as Width);
  const [align, setAlign] = useState<Align>(stored("rm.al", "justify") as Align);
  const [font, setFont] = useState(stored("rm.font", "vazir"));
  const [progress, setProgress] = useState(0);
  const progressSpring = useSpring(0, { stiffness: 280, damping: 32, mass: 0.6 });
  const [speaking, setSpeaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const articleBodyRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const resumedRef = useRef<boolean>(false);

  const [panel, setPanel] = useState<null | "summary" | "highlights" | "quotes" | "minimap">(null);
  const [summaryLevel, setSummaryLevel] = useState<SummaryLevel>("short");
  const [highlights, setHighlights] = useState<Highlight[]>(() => getHighlights(article.id));
  const [selection, setSelection] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  useEffect(() => {
    setHighlights(getHighlights(article.id));
    resumedRef.current = false;
    startTimeRef.current = Date.now();
  }, [article.id]);

  useEffect(() => { localStorage.setItem("rm.theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("rm.fs", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("rm.lh", String(lineHeight)); }, [lineHeight]);
  useEffect(() => { localStorage.setItem("rm.w", width); }, [width]);
  useEffect(() => { localStorage.setItem("rm.al", align); }, [align]);
  useEffect(() => { localStorage.setItem("rm.font", font); }, [font]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const pct = max > 0 ? Math.min(1, el.scrollTop / max) : 0;
      setProgress(pct);
      progressSpring.set(pct);
      savePosition(article.id, pct);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [article?.id, progressSpring]);

  useEffect(() => {
    if (resumedRef.current) return;
    const t = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const saved = getPosition(article.id);
      if (saved && saved > 0.1) {
        const max = el.scrollHeight - el.clientHeight;
        el.scrollTo({ top: saved * max, behavior: "smooth" });
      }
      resumedRef.current = true;
    }, 200);
    return () => clearTimeout(t);
  }, [article.id]);

  useEffect(() => {
    return () => {
      const seconds = (Date.now() - startTimeRef.current) / 1000;
      const words = (article.content || article.preview || "").trim().split(/\s+/).filter(Boolean).length;
      if (progress > 0.7) recordReadSpeed(Math.round(words * progress), seconds);
    };
  }, [article.id, progress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
      else if (e.key === "j" || e.key === "ArrowDown") containerRef.current?.scrollBy({ top: 300, behavior: "smooth" });
      else if (e.key === "k" || e.key === "ArrowUp") containerRef.current?.scrollBy({ top: -300, behavior: "smooth" });
      else if (e.key === "ArrowLeft") onNext?.();
      else if (e.key === "ArrowRight") onPrev?.();
      else if (e.key.toLowerCase() === "s") setPanel((p) => (p === "summary" ? null : "summary"));
      else if (e.key.toLowerCase() === "h") setPanel((p) => (p === "highlights" ? null : "highlights"));
      else if (e.key.toLowerCase() === "q") setPanel((p) => (p === "quotes" ? null : "quotes"));
      else if (e.key.toLowerCase() === "m") setPanel((p) => (p === "minimap" ? null : "minimap"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => () => { try { window.speechSynthesis?.cancel(); } catch {} }, []);

  const speak = () => {
    try {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      const text = `${article.title}. ${article.content || article.preview || ""}`;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fa-IR";
      u.rate = 1.0;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
      setSpeaking(true);
    } catch {}
  };

  const themeClasses = useMemo(() => {
    if (theme === "sepia") return "bg-[#F6EFE2] text-[#2C2418]";
    if (theme === "dark") return "bg-[#0B0D0E] text-[#F3F5F6]";
    return "bg-[#FCFBF9] text-[#161514]";
  }, [theme]);

  const fontFamily = FONTS.find((f) => f.id === font)?.css || FONTS[0].css;
  const wordCount = (article.content || "").trim().split(/\s+/).filter(Boolean).length;
  const remainingMin = Math.max(1, Math.round((1 - progress) * personalReadTime(wordCount)));
  const paragraphs = (article.content || article.preview || "").split(/\n{2,}|\n/).filter(Boolean);

  const fullText = useMemo(() => article.content || article.preview || "", [article.content, article.preview]);
  const summary = useMemo(() => summarize(fullText, summaryLevel), [fullText, summaryLevel]);
  const quotes = useMemo(() => extractQuotes(fullText), [fullText]);
  const stats = useMemo(() => readability(fullText), [fullText]);
  const goal = todayProgress([]);

  const onTextMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 4) {
      setSelection(null);
      return;
    }
    const range = sel!.getRangeAt(0);
    setSelection({ text, rect: range.getBoundingClientRect() });
  };

  const applyHighlight = (color: Highlight["color"]) => {
    if (!selection) return;
    const h = addHighlight({ articleId: article.id, text: selection.text, color });
    setHighlights((prev) => [...prev, h]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  const renderHighlightedParagraph = (p: string, idx: number) => {
    if (highlights.length === 0) return <p key={idx}>{p}</p>;
    const ranges: { start: number; end: number; color: Highlight["color"] }[] = [];
    for (const h of highlights) {
      let from = 0;
      while (true) {
        const i = p.indexOf(h.text, from);
        if (i < 0) break;
        ranges.push({ start: i, end: i + h.text.length, color: h.color });
        from = i + h.text.length;
      }
    }
    if (ranges.length === 0) return <p key={idx}>{p}</p>;
    ranges.sort((a, b) => a.start - b.start);
    const parts: any[] = [];
    let cursor = 0;
    const colorClass: Record<Highlight["color"], string> = {
      yellow: "bg-yellow-200/70 dark:bg-yellow-500/30",
      green: "bg-emerald-200/70 dark:bg-emerald-500/30",
      blue: "bg-sky-200/70 dark:bg-sky-500/30",
      rose: "bg-rose-200/70 dark:bg-rose-500/30",
    };
    for (const r of ranges) {
      if (r.start < cursor) continue;
      if (r.start > cursor) parts.push(p.slice(cursor, r.start));
      parts.push(
        <mark key={`${idx}-${r.start}`} className={`${colorClass[r.color]} rounded px-0.5`}>
          {p.slice(r.start, r.end)}
        </mark>,
      );
      cursor = r.end;
    }
    if (cursor < p.length) parts.push(p.slice(cursor));
    return <p key={idx}>{parts}</p>;
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="حالت مطالعه متمرکز"
      data-testid="reading-mode-modal"
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1, pointerEvents: "auto" }}
      exit={{ opacity: 0, scale: 0.985, pointerEvents: "none" }}
      transition={SPRING_EDITORIAL}
      className={`fixed inset-0 z-50 ${themeClasses} transition-colors duration-300`}
      dir="rtl"
    >
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-black/5 dark:bg-white/10 z-20 pointer-events-none">
        <motion.div
          style={{ scaleX: progressSpring }}
          className="h-full w-full bg-[var(--brand-500)] origin-right"
        />
      </div>

      <div ref={containerRef} className="h-full overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto px-6 pt-20 pb-36"
          style={{ maxWidth: WIDTH_PX[width], fontFamily, fontSize: `${fontSize}px`, lineHeight }}
        >
          {article.image && (
            <div className="mb-9 rounded-2xl overflow-hidden border border-current/10">
              <ImageWithFallback
                src={article.image}
                alt={article.title}
                className="w-full max-h-[420px] object-cover"
              />
            </div>
          )}

          <div className="text-xs opacity-65 mb-4 flex items-center gap-2 flex-wrap tabular-nums font-sans">
            <span className="font-semibold">{article.source}</span>
            {article.author && (
              <>
                <span>·</span>
                <span>{article.author}</span>
              </>
            )}
            {article.date && (
              <>
                <span>·</span>
                <span>{article.date}</span>
              </>
            )}
            <span>·</span>
            <span>{article.readTime || `${Math.ceil(wordCount / 200)} دقیقه`}</span>
          </div>

          <h1
            style={{ fontSize: `${Math.round(fontSize * 1.85)}px`, lineHeight: 1.38 }}
            className="mb-6 font-display font-bold"
          >
            {article.title}
          </h1>

          {article.preview && (
            <p
              className="opacity-80 mb-8 pb-6 border-b border-current/10 italic"
              style={{ fontSize: `${Math.round(fontSize * 1.05)}px` }}
            >
              {article.preview}
            </p>
          )}

          <div
            ref={articleBodyRef}
            onMouseUp={onTextMouseUp}
            onTouchEnd={onTextMouseUp}
            className="space-y-6"
            style={{ textAlign: align }}
          >
            {paragraphs.map((p, i) => renderHighlightedParagraph(p, i))}
          </div>

          <div className="mt-14 pt-6 border-t border-current/10 flex items-center justify-between text-xs opacity-65 font-sans tabular-nums">
            <span>{remainingMin.toLocaleString("fa-IR")} دقیقه باقی‌مانده</span>
            {article.link && (
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-100 underline-offset-4 hover:underline"
              >
                مشاهدهٔ منبع اصلی <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top-Right Theme Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/6 dark:bg-white/8 backdrop-blur-md rounded-full p-1 border border-current/10">
        <button
          type="button"
          onClick={() => setTheme("light")}
          aria-label="حالت کاغذ روشن"
          className={`p-2 rounded-full transition-colors cursor-pointer ${theme === "light" ? "bg-white shadow-xs text-slate-900" : "opacity-65 hover:opacity-100"}`}
          title="روشن"
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("sepia")}
          aria-label="حالت کاغذ سپیا"
          className={`p-2 rounded-full transition-colors cursor-pointer ${theme === "sepia" ? "bg-[#e8d9b4] text-[#3b2f17] shadow-xs" : "opacity-65 hover:opacity-100"}`}
          title="سپیا"
        >
          <Coffee className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          aria-label="حالت شب"
          className={`p-2 rounded-full transition-colors cursor-pointer ${theme === "dark" ? "bg-slate-800 text-white shadow-xs" : "opacity-65 hover:opacity-100"}`}
          title="تاریک"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top-Left Monograph Utilities */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPanel(panel === "summary" ? null : "summary")}
          aria-label="خلاصه هوشمند"
          className={`p-2 rounded-full transition-colors cursor-pointer ${panel === "summary" ? "bg-[var(--brand-500)] text-white" : "bg-black/6 dark:bg-white/10 hover:bg-black/12"}`}
          title="خلاصه (s)"
        >
          <Sparkles className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "highlights" ? null : "highlights")}
          aria-label="هایلایت‌ها"
          className={`relative p-2 rounded-full transition-colors cursor-pointer ${panel === "highlights" ? "bg-amber-500 text-white" : "bg-black/6 dark:bg-white/10 hover:bg-black/12"}`}
          title="هایلایت‌ها (h)"
        >
          <Highlighter className="w-4 h-4" />
          {highlights.length > 0 && (
            <span className="absolute -top-1 -left-1 bg-amber-500 text-white text-[9px] rounded-full px-1 tabular-nums">
              {highlights.length.toLocaleString("fa-IR")}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "quotes" ? null : "quotes")}
          aria-label="نقل‌قول‌ها"
          className={`p-2 rounded-full transition-colors cursor-pointer ${panel === "quotes" ? "bg-[var(--brand-600)] text-white" : "bg-black/6 dark:bg-white/10 hover:bg-black/12"}`}
          title="نقل‌قول‌ها (q)"
        >
          <QuoteIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "minimap" ? null : "minimap")}
          aria-label="نقشهٔ مقاله"
          className={`p-2 rounded-full transition-colors cursor-pointer ${panel === "minimap" ? "bg-[var(--brand-500)] text-white" : "bg-black/6 dark:bg-white/10 hover:bg-black/12"}`}
          title="نقشهٔ مقاله (m)"
        >
          <MapIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          data-testid="close-reading-mode-btn"
          aria-label="بستن حالت مطالعه"
          className="p-2 rounded-full bg-black/8 dark:bg-white/12 hover:bg-black/16 transition-colors cursor-pointer"
          title="بستن (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {selection && (
        <div
          className="fixed z-50 flex items-center gap-1 bg-slate-900 text-white rounded-full shadow-2xl px-1.5 py-1"
          style={{ top: Math.max(8, selection.rect.top - 44), left: Math.max(8, selection.rect.left + selection.rect.width / 2 - 80) }}
        >
          {(["yellow", "green", "blue", "rose"] as Highlight["color"][]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => applyHighlight(c)}
              className="w-6 h-6 rounded-full border-2 border-white/30 hover:scale-110 transition cursor-pointer"
              style={{ background: c === "yellow" ? "#facc15" : c === "green" ? "#10b981" : c === "blue" ? "#3b82f6" : "#f43f5e" }}
              title={`هایلایت ${c}`}
            />
          ))}
        </div>
      )}

      {/* Animated Monograph Side Panel */}
      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 16, scale: 0.98 }}
            transition={SPRING_SNAPPY}
            className="absolute top-16 right-4 bottom-24 w-80 max-w-[90vw] bg-[var(--popover)] text-[var(--popover-foreground)] rounded-[var(--radius-xl)] shadow-[var(--shadow-2xl)] border border-[var(--border)] z-30 flex flex-col overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border-subtle)]">
              <div className="text-xs font-semibold flex-1">
                {panel === "summary" && "خلاصهٔ هوشمند"}
                {panel === "highlights" && `هایلایت‌ها (${highlights.length.toLocaleString("fa-IR")})`}
                {panel === "quotes" && `نقل‌قول‌ها (${quotes.length.toLocaleString("fa-IR")})`}
                {panel === "minimap" && "فهرست بندهای مقاله"}
              </div>
              <button
                type="button"
                onClick={() => setPanel(null)}
                aria-label="بستن پنل"
                className="p-1 hover:bg-[var(--background-muted)] rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {panel === "summary" && (
              <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
                <div className="flex items-center gap-1 mb-3">
                  {(["tldr", "short", "structured"] as SummaryLevel[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setSummaryLevel(l)}
                      className={`text-[11px] px-2.5 py-1 rounded-[var(--radius-md)] cursor-pointer transition-colors ${
                        summaryLevel === l
                          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                          : "bg-[var(--background-muted)] text-[var(--foreground-muted)]"
                      }`}
                    >
                      {l === "tldr" ? "چکیده" : l === "short" ? "پاراگراف" : "ساختاریافته"}
                    </button>
                  ))}
                </div>
                {summaryLevel === "structured" ? (
                  <div className="space-y-2.5">
                    {Object.entries(summary as StructuredSummary).map(
                      ([k, v]) =>
                        v && (
                          <div key={k}>
                            <div className="text-[10px] font-semibold text-[var(--foreground-subtle)] mb-0.5">
                              {k === "what" ? "موضوع" : k === "who" ? "کنشگران" : k === "where" ? "مکان" : k === "when" ? "زمان" : "علت"}
                            </div>
                            <div className="text-sm">{v}</div>
                          </div>
                        ),
                    )}
                  </div>
                ) : (
                  <p>{summary as string}</p>
                )}
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-2 text-[11px] text-[var(--foreground-subtle)] tabular-nums">
                  <span>{stats.words.toLocaleString("fa-IR")} واژه</span>
                  <span>·</span>
                  <span>{stats.sentences.toLocaleString("fa-IR")} جمله</span>
                  <span>·</span>
                  <span>سطح {stats.level}</span>
                </div>
              </div>
            )}

            {panel === "highlights" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {highlights.length === 0 && (
                  <div className="text-xs text-[var(--foreground-subtle)] text-center py-8">
                    بخشی از متن مقاله را انتخاب کنید تا هایلایت شود.
                  </div>
                )}
                {highlights.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-[var(--radius-md)] p-2.5 border border-[var(--border-subtle)] bg-[var(--background-subtle)]"
                  >
                    <div className="text-xs leading-relaxed">{h.text}</div>
                    {editingNote === h.id ? (
                      <div className="mt-2">
                        <textarea
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          rows={2}
                          className="w-full text-[11px] bg-[var(--card)] border border-[var(--border)] rounded p-1.5"
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              updateHighlight(h.id, { note: noteDraft });
                              setHighlights(getHighlights(article.id));
                              setEditingNote(null);
                            }}
                            className="text-[10px] px-2 py-0.5 bg-[var(--brand-500)] text-white rounded cursor-pointer"
                          >
                            ذخیره
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNote(null)}
                            className="text-[10px] px-2 py-0.5 bg-[var(--background-muted)] rounded cursor-pointer"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    ) : h.note ? (
                      <div
                        className="mt-1 text-[11px] italic opacity-75 cursor-pointer"
                        onClick={() => {
                          setEditingNote(h.id);
                          setNoteDraft(h.note || "");
                        }}
                      >
                        {h.note}
                      </div>
                    ) : null}
                    <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--foreground-subtle)]">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNote(h.id);
                          setNoteDraft(h.note || "");
                        }}
                        className="hover:text-[var(--foreground)] cursor-pointer"
                      >
                        {h.note ? "ویرایش یادداشت" : "افزودن یادداشت"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeHighlight(h.id);
                          setHighlights(getHighlights(article.id));
                        }}
                        className="hover:text-rose-500 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {panel === "quotes" && (
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {quotes.length === 0 && (
                  <div className="text-xs text-[var(--foreground-subtle)] text-center py-8">
                    نقل‌قول مستقیمی شناسایی نشد.
                  </div>
                )}
                {quotes.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--radius-md)] p-3 bg-[var(--background-subtle)] border border-[var(--border-subtle)]"
                  >
                    <div className="text-xs font-display italic leading-relaxed">«{q.text}»</div>
                    {q.speaker && (
                      <div className="text-[10px] text-[var(--foreground-subtle)] mt-1.5">— {q.speaker}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {panel === "minimap" && (
              <div className="flex-1 overflow-y-auto p-3">
                <div className="space-y-1">
                  {paragraphs.map((p, i) => {
                    const target = i / Math.max(1, paragraphs.length - 1);
                    const active = Math.abs(progress - target) < 1 / Math.max(2, paragraphs.length);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          const el = containerRef.current;
                          if (!el) return;
                          el.scrollTo({ top: target * (el.scrollHeight - el.clientHeight), behavior: "smooth" });
                        }}
                        className={`w-full text-right text-[11px] line-clamp-2 px-2.5 py-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer ${
                          active
                            ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-medium"
                            : "hover:bg-[var(--background-subtle)]"
                        }`}
                      >
                        <span className="opacity-50 ml-1 tabular-nums">{(i + 1).toLocaleString("fa-IR")}.</span>
                        {p.slice(0, 80)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Reading Goal Pill */}
      <div
        className="hidden md:block absolute bottom-20 right-4 bg-[var(--card)]/90 backdrop-blur-md rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] border border-[var(--border-subtle)] px-3.5 py-2.5 text-[var(--foreground)]"
        dir="rtl"
      >
        <div className="flex items-center gap-2 text-[11px] tabular-nums">
          <Target className="w-3.5 h-3.5 text-[var(--brand-500)]" />
          <span>هدف مطالعه امروز</span>
          <span className="opacity-70">
            {goal.read.toLocaleString("fa-IR")}/{goal.total.toLocaleString("fa-IR")}
          </span>
        </div>
        <div className="h-1 bg-[var(--background-muted)] rounded-full overflow-hidden mt-1.5 w-32">
          <div className="h-full bg-[var(--brand-500)] transition-all" style={{ width: `${goal.pct * 100}%` }} />
        </div>
      </div>

      {/* Floating Glassmorphic Typographic Dock */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.08, ...SPRING_SNAPPY }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#141618]/92 text-white backdrop-blur-md rounded-full px-2.5 py-1.5 shadow-2xl border border-white/10 max-w-[95vw] overflow-x-auto scrollbar-none"
      >
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.max(13, s - 1))}
          aria-label="کوچک‌تر کردن قلم"
          className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          title="کوچکتر"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <Type className="w-3.5 h-3.5 opacity-60 shrink-0" />
        <span className="text-[10px] font-mono tabular-nums w-6 text-center shrink-0">{fontSize}</span>
        <button
          type="button"
          onClick={() => setFontSize((s) => Math.min(30, s + 1))}
          aria-label="بزرگ‌تر کردن قلم"
          className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer"
          title="بزرگتر"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        <select
          value={font}
          onChange={(e) => setFont(e.target.value)}
          aria-label="انتخاب قلم"
          className="bg-transparent text-[11px] outline-none cursor-pointer shrink-0"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id} className="text-slate-900">
              {f.label}
            </option>
          ))}
        </select>
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        {(["narrow", "medium", "wide"] as Width[]).map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => setWidth(w)}
            className={`px-2 py-1 rounded-full text-[10px] transition-colors cursor-pointer shrink-0 ${
              width === w ? "bg-white/20 font-medium" : "opacity-65 hover:opacity-100"
            }`}
          >
            {w === "narrow" ? "باریک" : w === "medium" ? "متوسط" : "پهن"}
          </button>
        ))}
        <span className="w-px h-4 bg-white/15 mx-1 shrink-0" />
        <button
          type="button"
          onClick={() => setAlign((a) => (a === "justify" ? "right" : "justify"))}
          aria-label="ترازبندی متن"
          className="p-1.5 rounded-full hover:bg-white/10 cursor-pointer shrink-0"
          title="ترازبندی"
        >
          {align === "justify" ? <AlignJustify className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={speak}
          aria-label="خوانش صوتی"
          className={`p-1.5 rounded-full cursor-pointer shrink-0 ${speaking ? "bg-[var(--brand-500)]" : "hover:bg-white/10"}`}
          title="پخش صوتی"
        >
          {speaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
        {onToggleStar && (
          <button
            type="button"
            onClick={() => onToggleStar(article.id)}
            aria-label="نشان کردن"
            className={`p-1.5 rounded-full hover:bg-white/10 cursor-pointer shrink-0 ${article.starred ? "text-amber-400" : ""}`}
            title="نشان"
          >
            <Star className="w-3.5 h-3.5" fill={article.starred ? "currentColor" : "none"} />
          </button>
        )}
        {onToggleSave && (
          <button
            type="button"
            onClick={() => onToggleSave(article.id)}
            aria-label="ذخیره کردن"
            className={`p-1.5 rounded-full hover:bg-white/10 cursor-pointer shrink-0 ${isSaved ? "text-[var(--brand-400)]" : ""}`}
            title="ذخیره"
          >
            <Bookmark className="w-3.5 h-3.5" fill={isSaved ? "currentColor" : "none"} />
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
