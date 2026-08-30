/**
 * Colours are CSS variables, not values.
 *
 * Handing components `var(--accent)` rather than `#2563EB` means every inline
 * style in the app follows the theme automatically, so switching light and dark
 * is one attribute on <html> — nothing re-renders, nothing needs a context.
 * The real values live in index.css.
 */
export const C = {
  page: "var(--page)",
  surface: "var(--surface)",
  panel: "var(--panel)",
  raised: "var(--raised)",
  line: "var(--line)",
  hair: "var(--hair)",
  text: "var(--text)",
  muted: "var(--muted)",
  accent: "var(--accent)",
  accentSoft: "var(--accent-soft)",
  accentInk: "var(--accent-ink)",
  warn: "var(--warn)",
  warnSoft: "var(--warn-soft)",
  good: "var(--good)",
  goodSoft: "var(--good-soft)",
  dim: "var(--raised)",
  shadow: "var(--shadow)",

  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

export type ThemeName = "light" | "dark";
const KEY = "wbcs.theme";

export function loadTheme(): ThemeName {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* private mode, first run — fall through */
  }
  return "light";
}

export function applyTheme(t: ThemeName) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* not fatal: the theme just will not persist */
  }
}
