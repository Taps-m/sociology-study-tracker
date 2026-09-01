import { PYQS } from "./pyq";
import { TOPICS } from "./syllabus";
import { stdChapter, STANDARD_READINGS, type StdBookId, type StdReading } from "./standardBooks";

/**
 * How much of the last ten years each chapter actually accounts for.
 *
 * Not all chapters are worth the same evening. "Social Thinkers" is sixty-six
 * pages and it is asked about every single year; "Kinship System" is five pages
 * and has been asked twice in a decade. A reading list that presents those two
 * the same way is quietly telling a candidate to spend the same time on both.
 *
 * The number is derived, never written down. Every past question in ./pyq is
 * already tagged to syllabus topics, and ./standardBooks already says which
 * chapter covers which topic; put the two together and the weight of a chapter
 * falls out. Nothing here is a coaching site's guess at what is important.
 *
 * How the arithmetic works, so the figure can be argued with:
 *
 *   1. Every question is worth one unit. A question tagged to three topics
 *      gives a third to each — it is one question, not three.
 *   2. A topic's share is its units over all 152 questions, so the shares of
 *      every topic add up to the whole paper.
 *   3. A topic's share goes to the chapters of a book that actually cover it,
 *      split evenly when there is more than one. So within one book the
 *      chapters add up to the part of the syllabus that book covers — which is
 *      why they do not quite reach 100%, and should not be made to.
 *
 * Two of the 152 questions are tagged to no topic at all. They are counted in
 * the denominator rather than quietly dropped, because pretending the corpus is
 * 150 questions would inflate every percentage on the page.
 */

export const TOTAL_QUESTIONS = PYQS.length;
export const UNTAGGED_QUESTIONS = PYQS.filter((q) => q.topicIds.length === 0).length;

/** Share of the whole corpus attributable to each topic. Sums to just under 1. */
function topicShares(): Map<string, number> {
  const share = new Map<string, number>();
  for (const q of PYQS) {
    if (q.topicIds.length === 0) continue;
    const each = 1 / q.topicIds.length / TOTAL_QUESTIONS;
    for (const id of q.topicIds) share.set(id, (share.get(id) ?? 0) + each);
  }
  return share;
}

/**
 * Which chapters of a book carry a topic. The ones that cover it, or — when a
 * book only touches the topic in passing — the ones that touch it, so the
 * weight lands somewhere rather than evaporating.
 */
function chaptersFor(topicId: string, book: StdBookId): (number | string)[] {
  const mine = (STANDARD_READINGS[topicId] ?? []).filter((r) => r.book === book);
  const covers = mine.filter((r) => r.kind === "covers");
  const use = covers.length > 0 ? covers : mine;
  return [...new Set(use.map((r) => r.chapter))];
}

export interface ChapterWeight {
  /** Percent of the last ten years' questions, 0-100. */
  pct: number;
  /** Distinct past questions that touch this chapter. */
  questions: number;
}

const cache = new Map<string, ChapterWeight>();

export function chapterWeight(book: StdBookId, chapter: number | string): ChapterWeight {
  const key = `${book}|${chapter}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const shares = topicShares();
  let pct = 0;
  const seen = new Set<string>();

  for (const [topicId, share] of shares) {
    const chapters = chaptersFor(topicId, book);
    if (!chapters.some((c) => c === chapter)) continue;
    pct += (share / chapters.length) * 100;
    seen.add(topicId);
  }

  // Questions are counted once even when two of a chapter's topics share one.
  const questions = new Set<number>();
  PYQS.forEach((q, i) => {
    if (q.topicIds.some((id) => seen.has(id))) questions.add(i);
  });

  const out = { pct, questions: questions.size };
  cache.set(key, out);
  return out;
}

export function weightOf(r: StdReading): ChapterWeight {
  return chapterWeight(r.book, r.chapter);
}

/**
 * The percent as it should be read on a row.
 *
 * Rounding a chapter that was asked once in ten years up to "1%" is fine;
 * rounding it to "0%" when it is not zero is a lie a candidate could act on, so
 * anything above nothing but below half a percent says so instead.
 */
export function weightLabel(w: ChapterWeight): string {
  if (w.pct === 0) return "not asked in 10 years";
  if (w.pct < 0.5) return "under 1% of questions";
  return `${Math.round(w.pct)}% of questions`;
}

/** Three steps, so a reading list can be scanned rather than read. */
export type WeightBand = "heavy" | "steady" | "light" | "none";

export function weightBand(w: ChapterWeight): WeightBand {
  if (w.pct === 0) return "none";
  if (w.pct >= 6) return "heavy";
  if (w.pct >= 2) return "steady";
  return "light";
}

/** How long the chapter is. The other half of every reading decision. */
export function chapterPages(book: StdBookId, chapter: number | string): number {
  const ch = stdChapter(book, chapter);
  return ch ? ch.to - ch.from + 1 : 0;
}

/**
 * The badge: two plain facts, and no verdict on either.
 *
 * An earlier draft of this said a chapter "costs you 67 pages", which is the
 * wrong idea in the wrong direction. Social Thinkers is sixty-seven pages and
 * thirteen per cent of the last decade — it is Marx, Durkheim, Weber, Parsons
 * and Merton, half the paper leans on it, and nobody sitting this exam gets to
 * skip it. Pricing it like a purchase only makes the one chapter no one can
 * avoid look like a bad deal.
 *
 * So the length is here to plan an evening around, not to weigh against the
 * percentage. Both figures are stated and neither is judged: the exam has
 * choice in it, a chapter asked once in ten years can still be the question you
 * can answer, and a long chapter is usually long because it holds a lot.
 */
export function chapterBadge(r: StdReading): { short: string; full: string } | null {
  const w = weightOf(r);
  const pages = chapterPages(r.book, r.chapter);
  if (pages === 0) return null;

  const share =
    w.pct === 0
      ? "not asked in 10 years"
      : w.pct < 0.5
        ? "under 1% of questions"
        : `${Math.round(w.pct)}% of questions`;

  return {
    short: `${share} · ${pages} pages`,
    full:
      w.pct === 0
        ? `${pages} pages, and no question in the last ten years of papers has come from this chapter.`
        : `This chapter accounts for ${w.pct.toFixed(1)}% of the questions asked in the last ten years — ${w.questions} of ${TOTAL_QUESTIONS} — and runs to ${pages} pages, which is what to plan the evening around. The page range on this line points at the part covering this topic.`,
  };
}

/**
 * What a whole unit is worth, as a share of its own paper.
 *
 * This is the figure that belongs on a unit row, and it replaced the estimated
 * hours that used to sit there. "31h" against Pathfinders is a mountain, and it
 * was a mountain measured with my own guesses at how long each topic takes —
 * an intimidating number that was not even reliable. The share of the paper is
 * measured from the real papers, and it pulls you toward a unit rather than
 * warning you off it.
 *
 * Against its own paper rather than both, because nobody sits Paper I and Paper
 * II as one exam: under the Paper I heading, the units add up to Paper I.
 */
export function unitShare(paper: 1 | 2, unit: string): number {
  const inUnit = new Set(TOPICS.filter((t) => t.paper === paper && t.unit === unit).map((t) => t.id));
  if (inUnit.size === 0) return 0;

  const papersQuestions = PYQS.filter((q) => q.paper === paper && q.topicIds.length > 0);
  if (papersQuestions.length === 0) return 0;

  let units = 0;
  for (const q of papersQuestions) {
    const hits = q.topicIds.filter((id) => inUnit.has(id)).length;
    if (hits > 0) units += hits / q.topicIds.length;
  }
  return (units / papersQuestions.length) * 100;
}

/** The unit row's label: a percentage, or nothing rather than a bare zero. */
export function unitShareLabel(paper: 1 | 2, unit: string): string | null {
  const pct = unitShare(paper, unit);
  if (pct === 0) return null;
  return pct < 0.5 ? "<1%" : `${Math.round(pct)}%`;
}

/**
 * How loudly to say it.
 *
 * Banded against the paper's own average rather than a fixed number, because a
 * paper with ten units averages ten per cent and one with eight averages twelve
 * and a half — a threshold that suits one mislabels the other. Heavy is half
 * again above average, quiet is comfortably below it, and everything else is
 * left alone. One or two units end up marked in each paper, which is the point:
 * a screen where everything is highlighted has highlighted nothing.
 *
 * Only the top is coloured. Nothing is greyed out as not worth doing — the
 * quiet end is merely quiet, because the paper offers choice and a unit worth
 * two and a half per cent can still be the question you can answer.
 */
export type UnitEmphasis = "heavy" | "normal" | "quiet";

export function unitEmphasis(paper: 1 | 2, unit: string): UnitEmphasis {
  const units = [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))];
  if (units.length === 0) return "normal";
  const average = 100 / units.length;
  const pct = unitShare(paper, unit);
  if (pct >= average * 1.5) return "heavy";
  if (pct <= average * 0.6) return "quiet";
  return "normal";
}
