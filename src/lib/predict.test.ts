import { describe, expect, it } from "vitest";
import { PYQ_YEARS } from "../data/pyq";
import { TOPICS } from "../data/syllabus";
import { chances } from "./predict";

const ALL = chances();
const byName = (s: string) => ALL.find((c) => c.topic.name.startsWith(s))!;

describe("chapter chances", () => {
  it("covers every chapter exactly once, ranked", () => {
    expect(ALL).toHaveLength(TOPICS.length);
    expect(new Set(ALL.map((c) => c.topic.id)).size).toBe(TOPICS.length);
    for (let i = 1; i < ALL.length; i++) expect(ALL[i]!.p).toBeLessThanOrEqual(ALL[i - 1]!.p);
  });

  it("gives every chapter a real probability inside its own interval", () => {
    for (const c of ALL) {
      expect(c.p, c.topic.id).toBeGreaterThan(0);
      expect(c.p, c.topic.id).toBeLessThan(1);
      expect(c.lo, c.topic.id).toBeLessThanOrEqual(c.p);
      expect(c.hi, c.topic.id).toBeGreaterThanOrEqual(c.p);
    }
  });

  /*
   * The bug this file exists to prevent.
   *
   * The prior strength was first fitted on the probability grid. A weak prior
   * is U-shaped, the grid read its first point as an enormous spike, and the
   * search therefore always chose the weakest prior available — which turns
   * the model back into the raw count it was built to replace. It gave
   * environmental movements exactly 10/14 = 71%, and the failure was silent:
   * plausible-looking numbers, no error, and a model that scores worse than
   * assuming nothing. Pooling has to be visible in the output or it is not
   * happening.
   */
  it("pools: a much-asked chapter reads below its raw rate", () => {
    const env = byName("Ecological and environmental");
    const raw = env.asked / env.of;
    expect(raw).toBeGreaterThan(0.6);
    expect(env.p).toBeLessThan(raw - 0.1);
    expect(env.p).toBeGreaterThan(0.4);
  });

  it("pools the other way: a chapter never asked is not written off", () => {
    const never = ALL.filter((c) => c.asked === 0);
    expect(never.length).toBeGreaterThan(0);
    // Under 8% these still turned up 36% of the time across three test years,
    // so a floor of zero would be a lie the screen repeats.
    for (const c of never) expect(c.p, c.topic.id).toBeGreaterThan(0.02);
  });

  it("lifts a thin record in a heavy unit above its own count", () => {
    // Simmel: two years in fourteen, but he sits in Pathfinders, which is the
    // heaviest unit in Paper I. Raw counting says 14%; borrowing from his
    // neighbours says about twice that.
    const simmel = byName("Simmel");
    expect(simmel.asked).toBe(2);
    expect(simmel.p).toBeGreaterThan(simmel.asked / simmel.of + 0.08);
  });

  it("says less confidently what it knows less about", () => {
    // A one-appearance chapter must carry a wider interval than a nine.
    const thin = ALL.filter((c) => c.asked <= 1);
    const thick = ALL.filter((c) => c.asked >= 7);
    const width = (c: { lo: number; hi: number }) => c.hi - c.lo;
    expect(Math.max(...thin.map(width))).toBeLessThan(Math.max(...thick.map(width)));
  });

  it("ranks differently inside Group B, where the choice is tightest", () => {
    const b = chances("B");
    expect(b).toHaveLength(TOPICS.length);
    // Research Methods is a Group B fixture and barely appears in Group A, so
    // restricting to B must move it up. This is the structural finding the
    // whole screen rests on.
    const rank = (list: typeof ALL, s: string) =>
      list.findIndex((c) => c.topic.name.startsWith(s));
    expect(rank(b, "Field method")).toBeLessThan(rank(ALL, "Field method"));
    for (const c of b) expect(c.inB).toBeLessThanOrEqual(PYQ_YEARS.length);
  });
});
