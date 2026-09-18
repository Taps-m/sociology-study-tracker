/**
 * The answer, in a window of its own, to be read or printed.
 *
 * A forty-mark answer is a thousand words and it was being read through a
 * scrollport inside a modal inside the practice screen — three nested frames
 * for a document whose whole point is to be read straight through. A tab of its
 * own gives it the page width it was written for, and the browser's own print
 * dialog turns that tab into a PDF without this app needing to know how to make
 * one.
 *
 * It clones what is already on screen rather than re-rendering the answer as a
 * string. Rebuilding it would mean a second implementation of every part, badge
 * and underline, drifting out of step with the first the day either changes —
 * and one renderer that can also be printed beats two that agree for a while.
 */

/** Every custom property the app's inline styles reference. */
const VARS = [
  "--page",
  "--surface",
  "--panel",
  "--raised",
  "--line",
  "--hair",
  "--text",
  "--muted",
  "--accent",
  "--accent-soft",
  "--accent-ink",
  "--warn",
  "--warn-soft",
  "--good",
  "--good-soft",
  "--shadow",
  "--slice-0",
  "--slice-1",
  "--slice-2",
  "--slice-3",
  "--slice-4",
  "--slice-5",
];

/**
 * The app's own stylesheet, read back out of the document.
 *
 * Same-origin, so the rules are readable; a stylesheet that is not returns
 * nothing rather than throwing, and the page still renders, because everything
 * structural in this app is an inline style and only the classes — `.num`, the
 * tree and the flow diagram — come from here.
 */
function appCss(): string {
  let out = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      out += Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join("\n");
    } catch {
      // A cross-origin sheet. Nothing of ours lives in one.
    }
  }
  return out;
}

function themeVars(): string {
  const style = getComputedStyle(document.documentElement);
  return VARS.map((v) => `${v}: ${style.getPropertyValue(v).trim()};`).join("\n  ");
}

/**
 * Open `node` in a new tab, styled as it is here.
 *
 * Returns false when the browser blocked the window, so the caller can say so
 * instead of leaving a button that silently does nothing.
 */
export function openInTab(node: HTMLElement, title: string): boolean {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/[<&]/g, " ")}</title>
<style>
:root {
  ${themeVars()}
  color-scheme: ${getComputedStyle(document.documentElement).getPropertyValue("--page").trim().startsWith("#f") ? "light" : "dark"};
}
${appCss()}
body {
  margin: 0;
  padding: 32px 22px 60px;
  background: var(--page);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
}
main { max-width: 760px; margin: 0 auto; }
/* The split layout is for a screen with a rail beside it; here it is one column. */
.answer-split, .answer-main, .answer-aside { display: block; width: auto; max-width: none; }
h1.sheet-title { font-size: 19px; line-height: 1.35; margin: 0 0 22px; }
@media print {
  body { padding: 0; background: #fff; color: #000; }
  .answer-aside { break-before: page; }
  /* Keep a block and its heading together rather than breaking between them. */
  section, li { break-inside: avoid; }
}
</style>
</head>
<body>
<main>
<h1 class="sheet-title">${title.replace(/[<&]/g, " ")}</h1>
${node.outerHTML}
</main>
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(url, "_blank", "noopener");
  // Give the new tab time to load before the URL stops meaning anything.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(win);
}
