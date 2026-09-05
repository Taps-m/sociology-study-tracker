import { expect, it } from "vitest";
import { PYQS } from "./pyq";
import { STANDARD_READINGS, STD_BOOKS, type StdBookId } from "./standardBooks";
import { TOPICS } from "./syllabus";
import {
  TOTAL_QUESTIONS,
  chapterBadge,
  chapterPages,
  chapterWeight,
  unitEmphasis,
  unitShare,
  unitShareLabel,
} from "./weightage";

/**
 * The weights are derived from the question corpus, so what has to be pinned is
 * the arithmetic — a percentage that is wrong is worse than no percentage,
 * because a candidate plans an evening around it.
 */

it("counts every question in the denominator, including the untagged ones", () => {
  expect(TOTAL_QUESTIONS).toBe(PYQS.length);
});

it("no chapter is worth more than the whole paper", () => {
  for (const b of STD_BOOKS) {
    for (const ch of b.chapters) {
      const w = chapterWeight(b.id, ch.n);
      expect(w.pct, `${b.short} ch. ${ch.n}`).toBeGreaterThanOrEqual(0);
      expect(w.pct, `${b.short} ch. ${ch.n}`).toBeLessThanOrEqual(100);
      expect(w.questions).toBeLessThanOrEqual(TOTAL_QUESTIONS);
    }
  }
});

it("a book's chapters never add up to more than the corpus", () => {
  for (const b of STD_BOOKS) {
    const total = b.chapters.reduce((a, ch) => a + chapterWeight(b.id, ch.n).pct, 0);
    expect(total, b.short).toBeLessThanOrEqual(100.001);
  }
});

/**
 * A topic's weight is spread across the chapters that cover it and nowhere
 * else, so one book's chapters should account for every tagged question that
 * book has a reading for — no weight quietly lost on the way.
 */
it("every mapped topic's weight lands in some chapter of its own book", () => {
  for (const b of STD_BOOKS) {
    const mapped = new Set<string>();
    for (const [id, rs] of Object.entries(STANDARD_READINGS)) {
      if (rs.some((r) => r.book === b.id)) mapped.add(id);
    }
    if (mapped.size === 0) continue;
    const total = b.chapters.reduce((a, ch) => a + chapterWeight(b.id, ch.n).pct, 0);
    expect(total, `${b.short} lost weight somewhere`).toBeGreaterThan(0);
  }
});

it("page counts match the chapter ranges", () => {
  expect(chapterPages("sangwan", 4)).toBe(67);
  expect(chapterPages("sangwan", 6)).toBe(12);
  expect(chapterPages("rao", 26)).toBe(5);
  expect(chapterPages("sangwan", 99 as unknown as number)).toBe(0);
});

/**
 * The badge states two facts and passes no judgement on either. An earlier
 * draft told the candidate a chapter "costs" its pages, which read as a warning
 * off the single chapter — Marx, Durkheim, Weber, Parsons, Merton — that nobody
 * sitting this exam can skip.
 */
it("the badge never tells the candidate what something is worth", () => {
  const forbidden = /\b(costs?|only|just|skip|not worth|don't bother|avoid)\b/i;
  for (const b of STD_BOOKS) {
    for (const ch of b.chapters) {
      const badge = chapterBadge({ book: b.id as StdBookId, chapter: ch.n, kind: "covers" });
      if (!badge) continue;
      expect(badge.short, `${b.short} ch. ${ch.n}`).not.toMatch(forbidden);
      expect(badge.full, `${b.short} ch. ${ch.n}`).not.toMatch(forbidden);
    }
  }
});

it("says under 1% rather than rounding a real chapter down to nothing", () => {
  const heavy = chapterBadge({ book: "sangwan", chapter: 4, kind: "covers" })!;
  expect(heavy.short).toMatch(/^\d+% of questions · 67 pages$/);

  for (const b of STD_BOOKS) {
    for (const ch of b.chapters) {
      const w = chapterWeight(b.id, ch.n);
      const badge = chapterBadge({ book: b.id as StdBookId, chapter: ch.n, kind: "covers" })!;
      if (w.pct > 0 && w.pct < 0.5) expect(badge.short).toMatch(/under 1%/);
      if (w.pct === 0) expect(badge.short).toMatch(/not asked in 10 years/);
    }
  }
});

it("each paper's units account for the whole of that paper", () => {
  for (const paper of [1, 2] as const) {
    const units = [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))];
    const total = units.reduce((a, u) => a + unitShare(paper, u), 0);
    expect(total, `paper ${paper}`).toBeCloseTo(100, 6);
  }
});

/**
 * The banding is relative to each paper's own average, so it must mark a few
 * units and not most of them. A screen where everything is highlighted has
 * highlighted nothing.
 *
 * It must also be allowed to mark none. On fourteen years Paper II has no
 * heavy unit at all — its eight units run from 16.1% down to 10.2% with one
 * outlier below, which is as flat as eight buckets get. That is a fact about
 * the paper, not a failure of the banding: Paper I concentrates on the
 * thinkers and Paper II does not concentrate anywhere. An earlier version of
 * this test demanded at least one heavy unit per paper and started failing the
 * moment the corpus got big enough to show the difference.
 */
it("marks a handful of units, not half of them", () => {
  for (const paper of [1, 2] as const) {
    const units = [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))];
    const heavy = units.filter((u) => unitEmphasis(paper, u) === "heavy");
    expect(heavy.length, `paper ${paper} heavy`).toBeLessThanOrEqual(Math.ceil(units.length / 4));
  }
});

/**
 * The two papers are shaped differently, and the app should not pretend
 * otherwise. Paper I has a centre of gravity; Paper II is flat.
 */
it("Paper I concentrates and Paper II does not", () => {
  const share = (p: 1 | 2) => {
    const units = [...new Set(TOPICS.filter((t) => t.paper === p).map((t) => t.unit))];
    return units.map((u) => unitShare(p, u)).sort((a, b) => b - a);
  };
  const p1 = share(1);
  const p2 = share(2);
  // Paper I's top unit is worth more than a quarter of the paper.
  expect(p1[0]!).toBeGreaterThan(25);
  // Paper II's top unit is worth less than a fifth, and its top three are
  // within three points of each other.
  expect(p2[0]!).toBeLessThan(20);
  expect(p2[0]! - p2[2]!).toBeLessThan(3);
});

it("the heaviest unit in Paper I is the theorists, and it is marked", () => {
  expect(unitShare(1, "Pathfinders")).toBeGreaterThan(20);
  expect(unitEmphasis(1, "Pathfinders")).toBe("heavy");
});

it("a unit with no questions shows nothing rather than a bare zero", () => {
  expect(unitShareLabel(1, "No Such Unit")).toBeNull();
});
