import {
  Link2, Printer, X, ExternalLink, Highlighter, Plus, Quote, Clock,
  Languages, Loader2, Maximize2, Check, BookOpen,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useSpring } from "motion/react";
import { Article } from "../data";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { TagEditor } from "./TagEditor";
import { SentimentBadge } from "./SentimentBadge";
import {
  loadNotes, newNote, appendHighlight, getLastNoteId, setLastNoteId,
  quotesForArticle, type Note,
} from "../notes";
import type { TopicQuery } from "../timeline";
import { api } from "../api";
import { studioUserId } from "./mobile/studio/studio";
import {
  extractFullContent, getFullContent, getArticleFa, setArticleFa,
} from "../translationCache";
import { SPRING_EDITORIAL, SPRING_SNAPPY } from "../motionPrimitives";
import { TactileToggleIcon } from "./MotionEffects";

type Props = {
  article: Article | null;
  onClose: () => void;
  toggleStar: (id: string) => void;
  toggleSave?: (id: string) => void;
  isSaved?: boolean;
  onTagsChange?: (id: string, tags: string[]) => void;
  related?: { article: Article; score: number }[];
  duplicates?: any[];
  onSelectRelated?: (id: string) => void;
  onOpenTimeline?: (topic: TopicQuery) => void;
  onOpenReadingMode?: () => void;
};

export function ArticleView({
  article,
  onClose,
  toggleStar,
  toggleSave,
  isSaved = false,
  onTagsChange,
  related,
  onSelectRelated,
  onOpenTimeline,
  onOpenReadingMode,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [hl, setHl] = useState<{ x: number; y: number; quote: string } | null>(null);
  const [picker, setPicker] = useState<{ quote: string } | null>(null);
  const [quoteTick, setQuoteTick] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const progressSpring = useSpring(0, { stiffness: 280, damping: 32, mass: 0.6 });

  const quotes = useMemo(
    () => (article ? quotesForArticle(article.id) : []),
    [article?.id, quoteTick],
  );

  const [trans, setTrans] = useState<{ title: string; content: string } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [transFromCache, setTransFromCache] = useState(false);

  useEffect(() => {
    setTrans(null);
    setTranslating(false);
    setShowOriginal(false);
    setTransFromCache(false);
    setCopiedLink(false);
  }, [article?.id]);

  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullError, setFullError] = useState(false);
  const baseContent = fullContent ?? (article?.content || "");

  const loadFull = async () => {
    if (!article?.link || loadingFull) return;
    setLoadingFull(true);
    setFullError(false);
    const content = await extractFullContent(article.link);
    if (content && content.length > (article.content?.length || 0)) {
      setFullContent(content);
      setTrans(null);
    } else if (!article.content?.trim()) {
      setFullError(true);
    }
    setLoadingFull(false);
  };

  useEffect(() => {
    setFullContent(null);
    setLoadingFull(false);
    setFullError(false);
    if (!article?.link) return;
    const cached = getFullContent(article.link);
    if (cached && cached.length > (article.content?.length || 0)) {
      setFullContent(cached);
      return;
    }
    const short = (article.content?.trim().length || 0) < 600;
    if (short) {
      let cancelled = false;
      (async () => {
        setLoadingFull(true);
        const content = await extractFullContent(article.link);
        if (cancelled) return;
        if (content && content.length > (article.content?.length || 0)) setFullContent(content);
        else if (!article.content?.trim()) setFullError(true);
        setLoadingFull(false);
      })();
      return () => {
        cancelled = true;
      };
    }
  }, [article?.id]);

  const translateArticle = async () => {
    if (!article || translating) return;
    if (trans) {
      setShowOriginal((v) => !v);
      return;
    }
    const cached = getArticleFa(article.id);
    if (cached && cached.content) {
      setTrans(cached);
      setTransFromCache(true);
      setShowOriginal(false);
      return;
    }
    setTranslating(true);
    try {
      const paras = baseContent.split("\n\n");
      const texts = [article.title, ...paras];
      const out: string[] = [];
      for (let i = 0; i < texts.length; i += 20) {
        const chunk = texts.slice(i, i + 20);
        const r = await api.aiTranslateBatch({ texts: chunk, to: "fa" }, studioUserId());
        chunk.forEach((t, j) => out.push(r[j]?.trim() || t));
      }
      const value = { title: out[0] || article.title, content: out.slice(1).join("\n\n") };
      setArticleFa(article.id, value);
      setTrans(value);
      setTransFromCache(false);
      setShowOriginal(false);
    } catch (e) {
      console.log("article translation failed:", e);
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
      progressSpring.set(ratio);
    };
    progressSpring.jump(0);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [article?.id, progressSpring]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setHl(null);
    setPicker(null);
  }, [article?.id]);

  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setHl(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 4) {
        setHl(null);
        return;
      }
      const root = contentRef.current;
      if (!root) return;
      const anchor = sel.anchorNode;
      const node = anchor?.nodeType === 1 ? (anchor as Node) : anchor?.parentNode;
      if (!node || !root.contains(node)) {
        setHl(null);
        return;
      }
      const r = sel.getRangeAt(0).getBoundingClientRect();
      const sr = scrollRef.current?.getBoundingClientRect();
      if (!sr) return;
      setHl({ x: r.left + r.width / 2 - sr.left, y: r.top - sr.top - 8, quote: text });
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, [article?.id]);

  const quickHighlight = () => {
    if (!hl || !article) return;
    const last = getLastNoteId();
    const all = loadNotes();
    const target = (last && all.find((n) => n.id === last)) || all[0];
    if (target) {
      appendHighlight(target.id, hl.quote, article.title, article.id);
      setLastNoteId(target.id);
      setHl(null);
      setQuoteTick((t) => t + 1);
      window.getSelection()?.removeAllRanges();
    } else {
      setPicker({ quote: hl.quote });
      setHl(null);
    }
  };

  const pickHighlight = (noteId: string) => {
    if (!picker || !article) return;
    appendHighlight(noteId, picker.quote, article.title, article.id);
    setLastNoteId(noteId);
    setPicker(null);
    setQuoteTick((t) => t + 1);
    window.getSelection()?.removeAllRanges();
  };

  const createAndAttach = () => {
    if (!picker || !article) return;
    const n = newNote(`نقل‌قول‌های «${article.title.slice(0, 40)}»`);
    appendHighlight(n.id, picker.quote, article.title, article.id);
    setLastNoteId(n.id);
    setPicker(null);
    setQuoteTick((t) => t + 1);
    window.getSelection()?.removeAllRanges();
  };

  const copyLink = () => {
    const url = article?.link || window.location.href;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1600);
  };

  if (!article) {
    return (
      <aside className="w-full md:w-[440px] lg:w-[500px] xl:w-[560px] shrink-0 bg-[var(--background-subtle)] border-r border-[var(--border-subtle)] flex flex-col items-center justify-center p-8 text-center select-none">
        <BookOpen className="w-10 h-10 text-[var(--foreground-subtle)]/45 stroke-[1.4] mb-3" />
        <div className="font-display text-lg font-semibold text-[var(--foreground)] mb-1">
          مقاله‌ای برای مطالعه انتخاب نشده
        </div>
        <p className="text-xs text-[var(--foreground-subtle)] max-w-[30ch] leading-relaxed mb-4">
          یکی از خبرهای فهرست را انتخاب کنید یا با کلیدهای میان‌بر میان خبرها جابه‌جا شوید.
        </p>
        <div className="flex items-center gap-3 text-[11px] text-[var(--foreground-subtle)]">
          <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border-subtle)] font-mono">J</kbd> بعدی</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border-subtle)] font-mono">K</kbd> قبلی</span>
          <span>·</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--border-subtle)] font-mono">F</kbd> حالت تمرکز</span>
        </div>
      </aside>
    );
  }

  const paragraphs = (trans && !showOriginal ? trans.content : baseContent)
    .split("\n\n")
    .filter((p) => p.trim().length > 0);

  return (
    <aside
      data-testid="article-reader-pane"
      className="w-full md:w-[440px] lg:w-[500px] xl:w-[560px] shrink-0 bg-[var(--card)] border-r border-[var(--border-subtle)] flex flex-col h-full relative overflow-hidden"
    >
      {/* Compositor-only Spring Reading Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-transparent z-20 pointer-events-none">
        <motion.div
          style={{ scaleX: progressSpring }}
          className="h-full w-full bg-[var(--brand-500)] origin-right"
        />
      </div>

      {/* Clean Curatorial Action Bar */}
      <div className="shrink-0 border-b border-[var(--border-subtle)] px-4 py-2.5 flex items-center gap-1 bg-[var(--card)]/90 backdrop-blur-md z-10">
        <TactileToggleIcon
          active={article.starred}
          kind="star"
          title={article.starred ? "حذف نشان" : "نشان کردن (s)"}
          onClick={() => toggleStar(article.id)}
        />
        {toggleSave && (
          <TactileToggleIcon
            active={isSaved}
            kind="bookmark"
            title={isSaved ? "حذف از ذخیره‌شده‌ها" : "ذخیره برای مطالعه بعدی"}
            onClick={() => toggleSave(article.id)}
          />
        )}

        <div className="w-px h-4 bg-[var(--border-subtle)] mx-1" />

        {onOpenReadingMode && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={onOpenReadingMode}
            data-testid="open-reading-mode-btn"
            title="حالت مطالعهٔ متمرکز (F)"
            className="px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--background-subtle)] hover:bg-[var(--accent)] text-[var(--foreground)] hover:text-[var(--accent-foreground)] border border-[var(--border-subtle)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Maximize2 className="w-3.5 h-3.5 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
            <span>حالت تمرکز</span>
          </motion.button>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={translateArticle}
          disabled={translating}
          aria-label="ترجمهٔ کامل مقاله"
          className={`p-2 rounded-[var(--radius-md)] disabled:opacity-50 transition-colors cursor-pointer ${
            trans && !showOriginal
              ? "bg-[var(--brand-600)] text-white"
              : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)]"
          }`}
          title={trans ? (showOriginal ? "نمایش ترجمهٔ فارسی" : "نمایش متن اصلی") : "ترجمهٔ کامل خبر به فارسی"}
        >
          {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={copyLink}
          aria-label="کپی پیوند خبر"
          title="کپی پیوند خبر"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
        >
          {copiedLink ? <Check className="w-4 h-4 text-[var(--brand-500)]" /> : <Link2 className="w-4 h-4" />}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => window.print()}
          aria-label="چاپ مقاله"
          title="چاپ مقاله"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
        </motion.button>

        {article.link && (
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="مشاهده در منبع اصلی"
            title="مشاهده در منبع اصلی"
            className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="flex-1" />

        <motion.button
          type="button"
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          aria-label="بستن مقاله"
          title="بستن (Esc)"
          className="p-2 rounded-[var(--radius-md)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-muted)] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Scrollable Monograph Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        <AnimatePresence>
          {hl && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={SPRING_SNAPPY}
              onClick={quickHighlight}
              style={{ left: Math.max(72, Math.min(hl.x, 380)), top: Math.max(12, hl.y) }}
              className="absolute z-30 -translate-x-1/2 -translate-y-full bg-[var(--foreground)] text-[var(--background)] text-xs px-3 py-1.5 rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Highlighter className="w-3.5 h-3.5 text-[var(--brand-400)]" /> ذخیره در یادداشت
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {picker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
              onClick={() => setPicker(null)}
            >
              <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0 }}
                transition={SPRING_SNAPPY}
                onClick={(e) => e.stopPropagation()}
                className="w-80 max-h-[75%] bg-[var(--popover)] text-[var(--popover-foreground)] rounded-[var(--radius-lg)] shadow-[var(--shadow-xl)] flex flex-col overflow-hidden border border-[var(--border)]"
              >
                <div className="px-3.5 py-2.5 border-b border-[var(--border-subtle)] text-sm font-semibold">
                  افزودن به یادداشت
                </div>
                <div className="p-3 text-xs text-[var(--foreground-muted)] border-b border-[var(--border-subtle)] line-clamp-3 italic">
                  «{picker.quote}»
                </div>
                <div className="flex-1 overflow-y-auto">
                  {loadNotes()
                    .sort((a: Note, b: Note) => b.updatedAt - a.updatedAt)
                    .map((n: Note) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => pickHighlight(n.id)}
                        className="w-full text-right px-3.5 py-2 hover:bg-[var(--background-subtle)] border-b border-[var(--border-subtle)] text-xs truncate cursor-pointer"
                      >
                        {n.title || "بدون عنوان"}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  onClick={createAndAttach}
                  className="px-3.5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--primary-foreground)] text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> ایجاد یادداشت جدید
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Article-to-Article Choreographed Stage */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={article.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SPRING_EDITORIAL}
            className="w-full px-6 py-7"
          >
            {/* Unboxed Editorial Kicker */}
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] mb-3 tabular-nums">
              <span className="text-base">{article.sourceIcon}</span>
              {onOpenTimeline ? (
                <button
                  type="button"
                  onClick={() => onOpenTimeline({ kind: "source", source: article.source })}
                  className="font-semibold text-[var(--foreground-muted)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] inline-flex items-center gap-1 transition-colors cursor-pointer"
                  title="مشاهده خط زمانی این منبع"
                >
                  {article.source}
                  <Clock className="w-3 h-3 opacity-70" />
                </button>
              ) : (
                <span className="font-semibold text-[var(--foreground-muted)]">{article.source}</span>
              )}
              {article.author && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.author}</span>
                </>
              )}
            </div>

            {/* Monograph Display Headline */}
            <h1 dir="auto" className="font-display text-2xl lg:text-[26px] font-bold text-[var(--foreground)] leading-[1.42] mb-3.5">
              {trans && !showOriginal ? trans.title : article.title}
            </h1>

            {/* Unboxed Metadata Line */}
            <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] mb-5 flex-wrap tabular-nums">
              {article.date && <span>{article.date}</span>}
              {article.readTime && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{article.readTime} مطالعه</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <SentimentBadge article={article} size="sm" />
              {article.link && (
                <>
                  <span aria-hidden="true">·</span>
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--brand-600)] dark:text-[var(--brand-400)] font-medium hover:underline"
                  >
                    منبع اصلی <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </div>

            <div className="mb-6 pb-4 border-b border-[var(--border-subtle)]">
              <TagEditor tags={article.tags || []} onChange={(t) => onTagsChange?.(article.id, t)} />
            </div>

            {/* Framed Archival Media */}
            {article.image && (
              <figure className="mb-7">
                <div
                  onClick={onOpenReadingMode}
                  className={`rounded-[var(--radius-lg)] overflow-hidden bg-[var(--background-muted)] border border-[var(--border-subtle)] ${
                    onOpenReadingMode ? "cursor-zoom-in group" : ""
                  }`}
                >
                  <ImageWithFallback
                    src={article.image}
                    alt={article.title}
                    className="w-full h-[220px] sm:h-[260px] object-cover group-hover:scale-[1.02] transition-transform duration-500 ease-out"
                  />
                </div>
                <figcaption className="mt-2 text-[11px] text-[var(--foreground-subtle)] flex items-center justify-between">
                  <span className="truncate">{article.source}</span>
                  {onOpenReadingMode && <span className="opacity-75">کلیک برای نمای تمام‌صفحه</span>}
                </figcaption>
              </figure>
            )}

            {trans && (
              <div className="mb-4 py-2 px-3 rounded-[var(--radius-md)] bg-[var(--accent)]/60 text-xs text-[var(--accent-foreground)] flex items-center gap-2">
                <Languages className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">
                  {showOriginal ? "نمایش متن اصلی" : "ترجمه‌شده به فارسی"}
                  {!showOriginal && transFromCache ? " · از حافظه" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => setShowOriginal((v) => !v)}
                  className="font-semibold underline cursor-pointer"
                >
                  {showOriginal ? "نمایش ترجمه" : "نمایش متن اصلی"}
                </button>
              </div>
            )}

            {/* Editorial Long-Form Prose */}
            <div
              ref={contentRef}
              className="max-w-[65ch] text-[15.5px] leading-[1.95] text-[var(--foreground)] space-y-5"
            >
              {paragraphs.map((p, i) => (
                <p key={i} dir="auto" className="text-[var(--foreground)]/92">
                  {p}
                </p>
              ))}

              {loadingFull && (
                <div className="flex items-center gap-2 text-xs text-[var(--foreground-subtle)] pt-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--brand-500)]" />
                  در حال بارگذاری متن کامل خبر…
                </div>
              )}

              {!loadingFull && fullError && article.link && (
                <div className="pt-2 text-xs text-[var(--foreground-subtle)]">
                  امکان استخراج خودکار متن کامل نبود.{" "}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-600)] dark:text-[var(--brand-400)] font-medium hover:underline"
                  >
                    مطالعه در منبع اصلی
                  </a>
                </div>
              )}

              {!loadingFull && !fullContent && !fullError && article.link && baseContent.trim().length >= 600 && (
                <button
                  type="button"
                  onClick={loadFull}
                  className="pt-2 text-xs font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline cursor-pointer"
                >
                  بارگذاری متن کامل خبر از منبع اصلی
                </button>
              )}
            </div>

            {/* Saved Quotes */}
            {quotes.length > 0 && (
              <div className="mt-9 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-semibold text-[var(--foreground-muted)] mb-3 flex items-center gap-1.5">
                  <Quote className="w-3.5 h-3.5 text-[var(--brand-500)]" />
                  نقل‌قول‌های ذخیره‌شده
                </div>
                <div className="space-y-3">
                  {quotes.map(({ note, quotes: qs }) => (
                    <div
                      key={note.id}
                      className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--background-subtle)] p-3.5"
                    >
                      <div className="text-[11px] text-[var(--foreground-subtle)] mb-2">
                        یادداشت · {note.title || "بدون عنوان"}
                      </div>
                      <div className="space-y-2">
                        {qs.map((q, i) => (
                          <blockquote
                            key={i}
                            className="text-sm font-display italic text-[var(--foreground)] leading-relaxed"
                          >
                            «{q}»
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Editorial Stories */}
            {related && related.length > 0 && (
              <div className="mt-9 pt-6 border-t border-[var(--border-subtle)]">
                <div className="text-xs font-semibold text-[var(--foreground-muted)] mb-3">
                  مقالات مرتبط در همین حوزه
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {related.slice(0, 6).map((r) => (
                    <motion.button
                      key={r.article.id}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => onSelectRelated?.(r.article.id)}
                      className="text-right p-3 rounded-[var(--radius-md)] bg-[var(--background-subtle)] hover:bg-[var(--background-muted)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                    >
                      <div className="text-[11px] text-[var(--foreground-subtle)] mb-1 tabular-nums">
                        <span className="font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                          {r.article.source}
                        </span>
                        {" · "}
                        {Math.round(r.score * 100).toLocaleString("fa-IR")}٪ قرابت
                      </div>
                      <div className="text-xs font-semibold text-[var(--foreground)] line-clamp-2 leading-relaxed">
                        {r.article.title}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </motion.article>
        </AnimatePresence>
      </div>
    </aside>
  );
}
