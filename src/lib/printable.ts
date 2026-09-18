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
  /*
   * Folded sections open in the copy that leaves.
   *
   * On screen the apparatus is collapsed so the answer is the answer. A tab
   * that is about to become a PDF is the opposite case: nothing there can be
   * clicked open later, so a fold that travelled shut would take the sources
   * and the legend out of the printed copy silently. The clone is opened; the
   * page on screen is untouched.
   */
  const copy = node.cloneNode(true) as HTMLElement;
  for (const d of Array.from(copy.querySelectorAll("details"))) d.setAttribute("open", "");

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
main { max-width: 1090px; margin: 0 auto; }
/*
 * The method checklist stays beside the answer here too, and sticks.
 *
 * It was one column, which put the seven steps a thousand words below the
 * answer they describe — by the time you reached them you could no longer see
 * what you were checking. The whole point of the list is to be held against
 * the page while reading it, so on screen it is a column on the right that
 * does not scroll away. The answer itself stays at its reading width; the
 * page is widened only by what the rail takes.
 */
.answer-split {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  justify-content: center;
}
.answer-main { flex: 1 1 760px; max-width: 760px; min-width: 0; }
.answer-aside { flex: 0 0 258px; position: sticky; top: 16px; }
h1.sheet-title { font-size: 19px; line-height: 1.35; margin: 0 0 22px; }
@media (max-width: 1000px) {
  main { max-width: 760px; }
  .answer-split { display: block; }
  .answer-main, .answer-aside { max-width: none; }
  .answer-aside { position: static; margin-top: 22px; }
}
@media print {
  body { padding: 0; background: #fff; color: #000; }
  main { max-width: none; }
  /* Sticky and paper do not mix: on paper the list is a page of its own. */
  .answer-split { display: block; }
  .answer-main, .answer-aside { max-width: none; }
  .answer-aside { position: static; break-before: page; }
  /* Keep a block and its heading together rather than breaking between them. */
  section, li { break-inside: avoid; }
}
</style>
</head>
<body>
<main>
<h1 class="sheet-title">${title.replace(/[<&]/g, " ")}</h1>
${copy.outerHTML}
</main>
</body>
</html>`;

  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const win = window.open(url, "_blank", "noopener");
  // Give the new tab time to load before the URL stops meaning anything.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return Boolean(win);
}
