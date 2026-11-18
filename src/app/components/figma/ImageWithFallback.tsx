import React, { useEffect, useState } from "react";

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const { src, alt, style, className = "", referrerPolicy, ...rest } = props;
  const [didError, setDidError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDidError(false);
    setLoaded(false);
    if (!src) return;
    const timer = setTimeout(() => {
      setLoaded((isLoaded) => {
        if (!isLoaded) setDidError(true);
        return isLoaded;
      });
    }, 4500);
    return () => clearTimeout(timer);
  }, [src]);

  const showFallbackCard = !src || didError || !loaded;

  return (
    <div
      className={`relative overflow-hidden bg-[var(--background-muted)] select-none ${className}`}
      style={style}
    >
      {showFallbackCard && (
        <div
          role={!src || didError ? "img" : undefined}
          aria-label={!src || didError ? alt || "تصویر مقاله" : undefined}
          className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 22% 18%, color-mix(in oklab, var(--brand-500) 20%, transparent), transparent 58%), radial-gradient(circle at 82% 82%, color-mix(in oklab, var(--brand-600) 14%, transparent), transparent 55%), linear-gradient(135deg, rgba(120,115,108,0.08) 0%, transparent 100%)",
            }}
          />
          <span className="relative text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--brand-600)] dark:text-[var(--brand-400)] mb-1.5 opacity-80">
            FLOW · ARCHIVE
          </span>
          <span
            dir="auto"
            className="relative font-display text-sm font-semibold tracking-tight text-[var(--foreground-muted)] line-clamp-2 max-w-[32ch]"
          >
            {alt || "کیان · رسانه"}
          </span>
        </div>
      )}

      {src && !didError && (
        <img
          src={src}
          alt={alt || ""}
          referrerPolicy={referrerPolicy ?? "no-referrer"}
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalWidth < 40 && img.naturalHeight < 40) {
              setDidError(true);
              return;
            }
            setLoaded(true);
          }}
          onError={() => setDidError(true)}
          className={`relative z-10 w-full h-full object-cover transition-opacity duration-300 ease-out ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          {...rest}
        />
      )}
    </div>
  );
}
