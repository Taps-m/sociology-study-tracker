import { describe, expect, it } from "vitest";
import { PYQS } from "../data/pyq";
import { TOPICS } from "../data/syllabus";
import { chances, tiers, TIER_CUT, TIER_FACTS } from "./predict";

const GROUPS = tiers();
const HIGH = GROUPS.find((g) => g.id === "high")!;
const STANDARD = GROUPS.find((g) => g.id === "standard")!;
const NEVER = GROUPS.find((g) => g.id === "never")!;

/*
 * The claims this grouping puts on screen, held to the corpus.
 *
 * Everything here is a number a candidate reads and then spends evenings on, so
 * each one is pinned to something checkable rather than to my arithmetic on the
 * day. If the corpus grows — a 2024 paper turns up, a tagging call is settled —
 * these fail, and that is the point: the screen quotes fixed figures, and a
 * fixed figure that has drifted from its data is worse than no figure.
 */
describe("tiers", () => {
  it("accounts for every chapter exactly once", () => {
    const ids = GROUPS.flatMap((g) => g.chapters.map((c) => c.topic.id));
    expect(ids).toHaveLength(TOPICS.length);
    expect(new Set(ids).size).toBe(TOPICS.length);
  });

  it("cuts the first tier where the ranking actually gaps", () => {
    // The whole design rests on this gap being real. If the corpus moves it,
    // TIER_CUT and every percentage in TIER_FACTS need refitting, not nudging.
    const all = chances().filter((c) => c.p > 0);
    const gap = (all[TIER_CUT - 1]!.p - all[TIER_CUT]!.p) * 100;
    expect(HIGH.chapters).toHaveLength(TIER_CUT);
    expect(gap).toBeCloseTo(TIER_FACTS.cutGap, 1);

    // And it must be a gap, not just a step: bigger than the typical spacing
    // through the flat region it is supposed to be separating from.
    const flat = all.slice(TIER_CUT, 70);
    const typical =
      flat.slice(1).reduce((s, c, i) => s + (flat[i]!.p - c.p), 0) / (flat.length - 1);
    expect(gap).toBeGreaterThan(typical * 100 * 3);
  });

  it("puts the never-asked chapters in their own group and nowhere else", () => {
    const asked = new Set(PYQS.flatMap((q) => q.topicIds));
    for (const c of NEVER.chapters) expect(asked.has(c.topic.id), c.topic.id).toBe(false);
    for (const c of [...HIGH.chapters, ...STANDARD.chapters]) {
      expect(asked.has(c.topic.id), c.topic.id).toBe(true);
    }
    expect(NEVER.chapters).toHaveLength(TOPICS.length - asked.size);
  });

  it("keeps the tiers ordered, and orders within them", () => {
    const worstHigh = Math.min(...HIGH.chapters.map((c) => c.p));
    const bestStandard = Math.max(...STANDARD.chapters.map((c) => c.p));
    expect(worstHigh).toBeGreaterThan(bestStandard);
    for (const g of GROUPS) {
      for (let i = 1; i < g.chapters.length; i++) {
        expect(g.chapters[i]!.p).toBeLessThanOrEqual(g.chapters[i - 1]!.p);
      }
    }
  });

  it("states a per-chapter yield that beats the tier below it", () => {
    // The screen claims 2.4x. If that ratio ever falls near 1 the grouping has
    // stopped separating anything and the whole screen is theatre.
    const ratio = TIER_FACTS.yield.high / TIER_FACTS.yield.standard;
    expect(ratio).toBeGreaterThan(2);
    // The two shares are shares of one paper and must not exceed it.
    expect(TIER_FACTS.share.high + TIER_FACTS.share.standard).toBeCloseTo(100, 0);
    // Sanity: the quoted yields are the quoted shares over the real tier sizes.
    expect(TIER_FACTS.share.high / HIGH.chapters.length).toBeCloseTo(
      TIER_FACTS.yield.high,
      2,
    );
    expect(TIER_FACTS.share.standard / STANDARD.chapters.length).toBeCloseTo(
      TIER_FACTS.yield.standard,
      2,
    );
  });

  it("keeps the honest figure below the flattering one", () => {
    // If these ever converge, the backtest has stopped being out of sample.
    expect(TIER_FACTS.share.high).toBeLessThan(TIER_FACTS.inSampleHigh);
    // Every year in the range must bracket the mean it is quoted against.
    const [lo, hi] = TIER_FACTS.range.high;
    expect(TIER_FACTS.share.high).toBeGreaterThan(lo);
    expect(TIER_FACTS.share.high).toBeLessThan(hi);
  });

  it("does not let the second group read as a skip list", () => {
    // The standard tier carries the majority of the paper. Any presentation
    // that makes it look optional is contradicted by this number.
    expect(TIER_FACTS.share.standard).toBeGreaterThan(50);
    expect(STANDARD.chapters.length).toBeGreaterThan(HIGH.chapters.length * 3);
  });
});
