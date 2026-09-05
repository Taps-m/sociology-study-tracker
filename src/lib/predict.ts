import { PYQS, PYQ_YEARS } from "../data/pyq";
import { TOPICS, type Topic } from "../data/syllabus";

/**
 * How likely each chapter is to be asked next time.
 *
 * WHY THIS IS NOT A QUESTION COUNT
 *
 * The obvious model is "asked 5 times in 14 years, so 36%". Backtested on this
 * corpus — train on every year before a target, predict that year, eight times
 * over — that model scores WORSE than assuming every chapter equally likely.
 * Brier 0.178 against 0.171, and its log loss is 0.83 against 0.53, because it
 * confidently says 0% for chapters that then turn up. Counting past questions
 * is not merely weak here; it is confidently wrong, which is the expensive kind.
 *
 * The reason is sample size. Fourteen years and 224 questions across 85
 * chapters leaves most of them with one or two appearances, and one appearance
 * cannot separate "asked one year in seven" from "asked once, by chance".
 *
 * WHAT THIS DOES INSTEAD
 *
 * Partial pooling. Each chapter's rate is pulled toward its unit's rate, and
 * each unit's toward the paper's, by an amount fitted from the data rather than
 * chosen. A chapter with a long record keeps its own number; a chapter with one
 * appearance mostly inherits its neighbours'. That is why Simmel reads higher
 * than his two appearances alone would suggest — he sits in Pathfinders, the
 * heaviest unit in Paper I — and why a lone question in a quiet unit does not
 * lift a chapter far.
 *
 * Backtested the same way: Brier 0.168, log loss 0.521, and it beats both the
 * count and the flat rate at every cut-off. A small neural network on the same
 * features scored 0.181 — worse than assuming nothing — because 1,190
 * chapter-years with about 200 positives cannot support that many parameters.
 *
 * WHAT IT CANNOT DO
 *
 * It ranks; it does not foresee. The top band is trustworthy and the bottom
 * band is not: chapters this model puts under 8% still appeared 36% of the time
 * over three years in testing. A low number here means "rarely asked", never
 * "safe to skip", and the screen must say so.
 *
 * And every figure is validated on internal splits of 2010-2023 only. There is
 * no year outside the corpus to check against, so nothing here has yet faced a
 * paper it had not already seen. Until one exists, treat all of this as
 * provisional.
 *
 * Nothing is stored. Everything below is computed from PYQS at render time, so
 * correcting one question's topicIds moves every number the same instant.
 */

/** Probability grid. Coarse enough to be instant, fine enough for a bar. */
const STEPS = 400;
const GRID: number[] = [];
for (let i = 1; i < STEPS; i++) GRID.push(i / STEPS);

/** Unnormalised log density of Beta(a, b) at p. */
function logBeta(p: number, a: number, b: number): number {
  return (a - 1) * Math.log(p) + (b - 1) * Math.log(1 - p);
}

/**
 * Normalise log weights on the grid, then read off the mean and two quantiles.
 *
 * Done numerically rather than with a Beta quantile function because the whole
 * posterior fits in 400 points and this needs no special functions — no
 * lgamma, no incomplete beta, nothing to get subtly wrong in a browser.
 */
function summarise(logw: number[]): { mean: number; lo: number; hi: number } {
  const max = Math.max(...logw);
  const w = logw.map((l) => Math.exp(l - max));
  const total = w.reduce((a, b) => a + b, 0);
  let mean = 0;
  for (let i = 0; i < GRID.length; i++) mean += GRID[i]! * (w[i]! / total);
  let acc = 0;
  let lo = GRID[0]!;
  let hi = GRID[GRID.length - 1]!;
  let gotLo = false;
  for (let i = 0; i < GRID.length; i++) {
    acc += w[i]! / total;
    if (!gotLo && acc >= 0.1) {
      lo = GRID[i]!;
      gotLo = true;
    }
    if (acc >= 0.9) {
      hi = GRID[i]!;
      break;
    }
  }
  return { mean, lo, hi };
}

/**
 * log Γ(x), Lanczos approximation.
 *
 * Needed because the prior strength cannot be fitted on the grid. A weak prior
 * is U-shaped — most of its mass at 0 and 1 — and a 400-point grid reads that
 * as an enormous spike at its first point, so a grid search always chose the
 * weakest prior on offer and the model degenerated into the raw count it exists
 * to avoid. It gave environmental movements 71%, which is exactly 10/14: no
 * pooling at all. The marginal likelihood has a closed form, so use it.
 */
function logGamma(x: number): number {
  const g = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let a = 0.99999999999980993;
  for (let i = 0; i < g.length; i++) a += g[i]! / (z + i + 1);
  const t = z + g.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(a);
}

/** log B(a, b). */
function logBetaFn(a: number, b: number): number {
  return logGamma(a) + logGamma(b) - logGamma(a + b);
}

/** Exact log marginal likelihood of k of n under a Beta(a, b) prior. */
function logMarginal(k: number, n: number, a: number, b: number): number {
  return logBetaFn(a + k, b + n - k) - logBetaFn(a, b);
}

/**
 * Pick the prior strength the data actually supports.
 *
 * A grid search rather than an optimiser: twelve candidates, and the surface is
 * smooth and single-peaked, so nothing subtler is warranted. Strength is in
 * "years of prior evidence" — on the fourteen-year corpus this lands near 16,
 * meaning a chapter needs about sixteen years of its own record before it
 * outweighs its unit. That is the data saying, in its own voice, do not trust
 * per-chapter counts.
 */
const STRENGTHS = [0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48];

function fitStrength(counts: number[], n: number, m: number): number {
  let best = STRENGTHS[0]!;
  let bestScore = -Infinity;
  for (const a of STRENGTHS) {
    const A = a * m;
    const B = a * (1 - m);
    if (A <= 0 || B <= 0) continue;
    const score = counts.reduce((s, k) => s + logMarginal(k, n, A, B), 0);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

export interface Chance {
  topic: Topic;
  /** Posterior mean: the chance it appears at all in a given year. */
  p: number;
  /** 80% credible interval. Wide means "one or two data points". */
  lo: number;
  hi: number;
  /** Distinct years it was asked, out of the years in the corpus. */
  asked: number;
  of: number;
  /** Distinct years it appeared in each group. */
  inA: number;
  inB: number;
}

/** Which distinct years each topic appeared in, optionally within one group. */
function yearsAsked(group?: "A" | "B"): Map<string, Set<number>> {
  const m = new Map<string, Set<number>>();
  for (const t of TOPICS) m.set(t.id, new Set());
  for (const q of PYQS) {
    if (group && q.group !== group) continue;
    for (const id of q.topicIds) m.get(id)?.add(q.year);
  }
  return m;
}

/**
 * Every chapter's chance, most likely first.
 *
 * `group` restricts the record to Group A or Group B. That matters more than it
 * looks: Group B offers three questions and you answer two, so a chapter's rate
 * *within Group B* is worth more to a candidate than its rate overall — and the
 * two groups draw on different units, with Research Methods appearing in Paper
 * I only ever in Group B.
 */
export function chances(group?: "A" | "B"): Chance[] {
  const n = PYQ_YEARS.length;
  const years = yearsAsked(group);
  const yearsA = yearsAsked("A");
  const yearsB = yearsAsked("B");
  const k = new Map<string, number>();
  for (const t of TOPICS) k.set(t.id, years.get(t.id)!.size);

  const total = [...k.values()].reduce((a, b) => a + b, 0);
  const global = total / (n * TOPICS.length) || 1 / n;

  // unit rates, pooled toward the global rate
  const byUnit = new Map<string, Topic[]>();
  for (const t of TOPICS) {
    const key = `${t.paper}|${t.unit}`;
    byUnit.set(key, [...(byUnit.get(key) ?? []), t]);
  }
  const aUnit = fitStrength(
    [...byUnit.values()].map((ts) => ts.reduce((s, t) => s + k.get(t.id)!, 0)),
    n * Math.max(...[...byUnit.values()].map((v) => v.length)),
    global,
  );
  const unitRate = new Map<string, number>();
  for (const [key, ts] of byUnit) {
    const kk = ts.reduce((s, t) => s + k.get(t.id)!, 0);
    unitRate.set(key, (kk + aUnit * global) / (n * ts.length + aUnit));
  }

  const aTopic = fitStrength([...k.values()], n, global);

  return TOPICS.map((t) => {
    const m = unitRate.get(`${t.paper}|${t.unit}`)!;
    const A = aTopic * m;
    const B = aTopic * (1 - m);
    const kk = k.get(t.id)!;
    const logw = GRID.map(
      (p) => logBeta(p, A, B) + kk * Math.log(p) + (n - kk) * Math.log(1 - p),
    );
    const s = summarise(logw);
    return {
      topic: t,
      p: s.mean,
      lo: s.lo,
      hi: s.hi,
      asked: kk,
      of: n,
      inA: yearsA.get(t.id)!.size,
      inB: yearsB.get(t.id)!.size,
    };
  }).sort((x, y) => y.p - x.p);
}

/**
 * How the model scored when it was tested, stated on the screen rather than in
 * a commit message.
 *
 * These come from the rolling backtest described at the top of this file: eight
 * one-year-ahead predictions, each trained only on the years before it. They
 * are hard-coded because re-running the backtest in the browser would cost
 * seconds for a number that only changes when the corpus does — and when the
 * corpus does change, a test fails and this gets updated.
 */
export const BACKTEST = {
  years: 8,
  brier: { flat: 0.1712, count: 0.1784, network: 0.1812, pooled: 0.168 },
  logLoss: { flat: 0.5262, count: 0.8302, network: 0.5631, pooled: 0.5213 },
  /** Share of the chapters actually asked that year which were in the top N. */
  hit: { count: [23, 31, 36, 41], pooled: [24, 32, 38, 41] },
  hitAt: [10, 15, 20, 25],
} as const;

/* ─────────────────────────── TIERS ─────────────────────────────────────── */

/**
 * Where the ranking actually divides — and why there is only one division.
 *
 * The obvious presentation is three equal tiers: top, middle, bottom third.
 * Tested, that is the worst of every split available. Equal thirds put 48% of
 * the paper in the top tier, which reads well until you divide by the number of
 * chapters it took: 1.70% of the paper per chapter, against 1.04% for the rest.
 * A 1.6x return. It buys the bigger headline by dragging twelve low-yield
 * chapters up into the top tier and diluting it.
 *
 * Running 1-D k-means over the 85 posterior means finds the real structure. The
 * first break is at chapter 16 — a 2.09 percentage-point gap, between 31.9% and
 * 29.8%. The second break k-means proposes has a gap of 0.42pp, which is not a
 * break; it is the algorithm being made to return three clusters in a region
 * that contains one. From chapter 17 to chapter 85 the estimates fall by less
 * than half a point apiece and the questions those chapters actually attracted
 * are flat across the whole range: 0.98% of the paper per chapter at the top of
 * that band, 0.91% at the bottom.
 *
 * So: two tiers, not three. Cutting the remainder into a "middle" and a
 * "bottom" would draw a line the evidence does not contain, and a candidate who
 * believed it would deprioritise chapters on the strength of a 0.4-point
 * difference. The third group below is not a tier — it is a fact about the
 * record: five chapters have never been asked in fourteen years.
 */
export const TIER_CUT = 16;

/**
 * What each tier actually delivered, measured out of sample.
 *
 * NOT the share of the corpus each tier holds — that is 63%/37% and it is
 * flattery, because the tiers were drawn using the same questions they are then
 * scored against. These are from the rolling backtest: for each of the last
 * eight years the model was refitted on the preceding years only, the tiers
 * redrawn from that fit, and the share of that year's questions recorded. It is
 * what the grouping would have delivered in advance. Measured in hindsight the
 * top tier reads 63%; measured honestly it reads 37%.
 *
 * Hard-coded for the same reason BACKTEST is: re-running eight refits in the
 * browser costs seconds for a number that only moves when the corpus does, and
 * when the corpus moves a test fails and this gets updated.
 */
export const TIER_FACTS = {
  years: 8,
  /** Share of a year's questions, and the min and max across those years. */
  share: { high: 37.3, standard: 62.7 },
  range: { high: [31, 50], standard: [50, 69] },
  /** Share of the paper per chapter — the number the tiering exists to move. */
  yield: { high: 2.331, standard: 0.98 },
  /** In-sample share of the top tier, kept so the screen can show the gap. */
  inSampleHigh: 63,
  /** The gap at the cut, in percentage points, and the two rates either side. */
  cutGap: 2.09,
} as const;

export type TierId = "high" | "standard" | "never";

export interface Tier {
  id: TierId;
  chapters: Chance[];
}

/**
 * The ranking in three groups: the real division, the remainder, and the
 * chapters with no record at all.
 *
 * The tiers are always drawn on the whole-paper ranking, never on the group
 * scope. A chapter's tier is a claim about its overall priority, and that is
 * what the backtest above measured; re-cutting it per group would put numbers
 * on screen that were never tested. The scope still changes each row's own
 * probability, which is the question it answers.
 */
export function tiers(): Tier[] {
  const all = chances();
  const asked = new Set<string>();
  for (const q of PYQS) for (const id of q.topicIds) asked.add(id);
  const never = all.filter((c) => !asked.has(c.topic.id));
  const rest = all.filter((c) => asked.has(c.topic.id));
  return [
    { id: "high", chapters: rest.slice(0, TIER_CUT) },
    { id: "standard", chapters: rest.slice(TIER_CUT) },
    { id: "never", chapters: never },
  ];
}
