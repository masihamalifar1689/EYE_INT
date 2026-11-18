/**
 * Brand accent override. Defaults to Curatorial Jade so Light & Dark editorial
 * palettes share one unified 10% accent across --brand-*, --accent, and --ring.
 */

const KEY = "kian.mobile.accent";

export type Accent = {
  id: string;
  name: string;
  swatch: string;
  brand500: string;
  brand600: string;
  brand700: string;
};

export const ACCENTS: Accent[] = [
  { id: "jade",    name: "یشم تحریریه", swatch: "#25B288", brand500: "#25B288", brand600: "#1F9D78", brand700: "#177B5E" },
  { id: "emerald", name: "زمرد",        swatch: "oklch(0.62 0.150 160)", brand500: "oklch(0.62 0.150 160)", brand600: "oklch(0.52 0.155 162)", brand700: "oklch(0.43 0.135 162)" },
  { id: "teal",    name: "فیروزه",      swatch: "oklch(0.62 0.130 200)", brand500: "oklch(0.62 0.130 200)", brand600: "oklch(0.52 0.135 202)", brand700: "oklch(0.43 0.120 202)" },
  { id: "gold",    name: "طلایی",       swatch: "#D99B16", brand500: "#D99B16", brand600: "#B87F0E", brand700: "#94640A" },
  { id: "violet",  name: "بنفش",        swatch: "oklch(0.55 0.230 300)", brand500: "oklch(0.55 0.230 300)", brand600: "oklch(0.46 0.235 302)", brand700: "oklch(0.38 0.205 302)" },
  { id: "rose",    name: "رز",          swatch: "oklch(0.60 0.215 12)",  brand500: "oklch(0.60 0.215 12)",  brand600: "oklch(0.50 0.220 14)",  brand700: "oklch(0.42 0.190 14)"  },
  { id: "amber",   name: "کهربا",       swatch: "oklch(0.70 0.180 65)",  brand500: "oklch(0.70 0.180 65)",  brand600: "oklch(0.60 0.190 60)",  brand700: "oklch(0.50 0.170 55)"  },
];

export function loadAccentId(): string {
  try { return localStorage.getItem(KEY) || "jade"; } catch { return "jade"; }
}

export function saveAccentId(id: string) {
  try { localStorage.setItem(KEY, id); } catch {}
}

export function applyAccent(id: string) {
  const a = ACCENTS.find((x) => x.id === id) ?? ACCENTS[0];
  const r = document.documentElement.style;
  r.setProperty("--brand-500", a.brand500);
  r.setProperty("--brand-600", a.brand600);
  r.setProperty("--brand-700", a.brand700);
  r.setProperty("--accent", `color-mix(in oklab, ${a.brand500} 12%, transparent)`);
  r.setProperty("--accent-foreground", a.brand600);
  r.setProperty("--ring", `color-mix(in oklab, ${a.brand500} 36%, transparent)`);
}
