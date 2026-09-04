import { TOPICS, TOTAL_HOURS } from "../data/syllabus";
import { PYQS } from "../data/pyq";
import type { Topic } from "../data/syllabus";
import type { CheckId, Derived, Level, Settings, WindowMonths } from "./events";

/** The four things that make a topic done, and what share of it each represents. */
export const CHECKS = [
  { id: "read", label: "Material read", weight: 0.4 },
  { id: "notes", label: "Notes and Q&A", weight: 0.25 },
  { id: "pyq", label: "PYQs covered", weight: 0.2 },
  { id: "revised", label: "Revised", weight: 0.15 },
] as const;

export const DEPTHS = { none: 0, read: 0.4, notes: 0.65, pyq: 0.85, full: 1 } as const;

export function depthLabel(depth: number): string {
  if (depth >= 1) return "full";
  if (depth >= 0.85) return "pyq";
  if (depth >= 0.65) return "notes";
  if (depth >= 0.4) return "read";
  return "skip";
}

// ── PYQ scoring ───────────────────────────────────────────────────────────

const UNIT_AVERAGE: Record<string, number> = (() => {
  const sums: Record<string, { n: number; total: number }> = {};
  for (const t of TOPICS) {
    const key = `${t.paper}|${t.unit}`;
    sums[key] = sums[key] ?? { n: 0, total: 0 };
    sums[key].n++;
    sums[key].total += t.pyq;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(sums)) out[k] = v.total / v.n;
  return out;
})();

/** 60% the topic's own record since 2018, 40% the unit it sits in. */
export function pyqScore(topic: Topic): number {
  const unit = UNIT_AVERAGE[`${topic.paper}|${topic.unit}`] ?? 0;
  return Math.round((0.6 * topic.pyq + 0.4 * unit) * 100) / 100;
}

export function bandOf(topic: Topic): 1 | 2 | 3 {
  const s = pyqScore(topic);
  if (s >= 1.5) return 3;
  if (s >= 0.7) return 2;
  return 1;
}

/** How deep to go, given the topic's record and the student's ambition. */
/**
 * What each starting point is called, how long a run it suggests, and what it
 * does to the plan. The last line of each is the honest part: the level is not
 * a badge, it moves the depth table one step, and you can override both.
 */
export const LEVELS: {
  id: Level;
  label: string;
  blurb: string;
  months: WindowMonths;
}[] = [
  /*
   * The labels describe the candidate, not an action, and they are parallel.
   * "Have an overview" was an instruction wearing a description's clothes — you
   * cannot be "have an overview" — and it sat between two phrases of a different
   * grammar entirely. These three are the same shape as each other and read as
   * states a person can actually be in.
   */
  {
    id: "beginner",
    label: "Starting from scratch",
    blurb: "No formal background in the subject. The longest plan, with nothing left out.",
    months: 6,
  },
  {
    id: "guided",
    label: "Some background",
    blurb: "You know the outline and want to be taken through it properly. The standard plan.",
    months: 5,
  },
  {
    id: "pro",
    label: "Studied it before",
    blurb: "A graduate, or a repeat attempt. The shortest plan, and the least-asked topics are trimmed hardest.",
    months: 4,
  },
];

/**
 * Topics the current level and coverage target leave out of the plan entirely.
 * Surfaced in Settings because a dial that quietly removes a fifth of the
 * syllabus should say so in a number, not in a blurb.
 */
export function skippedTopics(d: Derived): Topic[] {
  return TOPICS.filter((t) => depthFor(d, t) === 0);
}

export function suggestedMonths(level: Level): WindowMonths {
  return LEVELS.find((l) => l.id === level)!.months;
}

const BANDS = ["lean", "mid", "high"] as const;
type Band = (typeof BANDS)[number];

/**
 * How deep to go on a topic, as a fraction of its full estimate.
 *
 * Two dials, and they compose. Your coverage target sets the base band; where
 * you started shifts it one step, because a graduate re-reading Durkheim needs
 * less of the low-yield tail than someone meeting him for the first time. The
 * shift is capped at both ends, so no level can push a heavily-asked topic
 * below full depth.
 */
export function depthFor(d: Derived, topic: Topic): number {
  const target = d.settings?.targetCoverage ?? 1;
  const base: Band = target >= 0.9 ? "high" : target >= 0.75 ? "mid" : "lean";
  const shift = d.settings?.level === "beginner" ? 1 : d.settings?.level === "pro" ? -1 : 0;
  const band = BANDS[Math.min(2, Math.max(0, BANDS.indexOf(base) + shift))]!;

  const table: Record<Band, Record<number, number>> = {
    high: { 3: DEPTHS.full, 2: DEPTHS.full, 1: DEPTHS.pyq },
    mid: { 3: DEPTHS.full, 2: DEPTHS.pyq, 1: DEPTHS.read },
    lean: { 3: DEPTHS.full, 2: DEPTHS.notes, 1: DEPTHS.none },
  };
  return table[band][bandOf(topic)]!;
}

// ── completion ────────────────────────────────────────────────────────────

/**
 * What writing an answer proves on its own.
 *
 * You cannot write a 40-mark answer on social mobility without having read
 * social mobility, and the PYQ check is the answer itself. Requiring the ticks
 * as well meant the wheel showed 0% for a topic the candidate had just been
 * marked on — the app disbelieving work it had done the marking for.
 *
 * Notes and revision are deliberately not on this list. Neither follows from
 * having written once, and revision in particular is the thing that has to
 * come back later; a topic that marks itself fully complete on first contact
 * leaves the revision queue and is never seen again.
 */
export const IMPLIED_BY_ATTEMPT = ["read", "pyq"] as const satisfies readonly CheckId[];

export function checksFor(d: Derived, topicId: string) {
  const ticked = d.checks[topicId] ?? {};
  let earliest: string | null = null;
  for (const a of d.attempts) {
    if (a.topicId !== topicId) continue;
    if (earliest === null || a.at < earliest) earliest = a.at;
  }
  if (earliest === null) return ticked;

  const out = { ...ticked };
  for (const id of IMPLIED_BY_ATTEMPT) {
    // An explicit tick wins: it may be older than the attempt, and the date is
    // used for revision intervals.
    if (!out[id]) out[id] = { at: earliest, prior: false, implied: true };
  }
  return out;
}

/** Whether this check is standing on an attempt rather than on a tick. */
export function isImplied(d: Derived, topicId: string, check: CheckId): boolean {
  return Boolean(checksFor(d, topicId)[check]?.implied);
}

export function isChecked(d: Derived, topicId: string, check: CheckId): boolean {
  return Boolean(checksFor(d, topicId)[check]);
}

export function isPrior(d: Derived, topicId: string, check: CheckId): boolean {
  return Boolean(checksFor(d, topicId)[check]?.prior);
}

export function completionOf(d: Derived, topicId: string): number {
  const done = checksFor(d, topicId);
  return CHECKS.reduce((sum, c) => sum + (done[c.id] ? c.weight : 0), 0);
}

export function isComplete(d: Derived, topicId: string): boolean {
  return completionOf(d, topicId) > 0.999;
}

export function isAtDepth(d: Derived, topic: Topic): boolean {
  return completionOf(d, topic.id) >= depthFor(d, topic) - 0.001;
}

export function isOptional(d: Derived, topicId: string): boolean {
  const topic = TOPICS.find((t) => t.id === topicId);
  return topic ? depthFor(d, topic) === 0 : false;
}

// ── calibration ───────────────────────────────────────────────────────────

const MIN_SAMPLES = 5;

/** How the student's real time compares with the built-in estimates. */
export function calibration(d: Derived) {
  if (d.time.length < MIN_SAMPLES) {
    return { factor: 1, samples: d.time.length, ready: false };
  }
  let actual = 0;
  let expected = 0;
  for (const e of d.time) {
    const topic = TOPICS.find((t) => t.id === e.topicId);
    const check = CHECKS.find((c) => c.id === e.check);
    if (!topic || !check) continue;
    actual += e.minutes / 60;
    expected += topic.estHours * check.weight;
  }
  if (expected <= 0) return { factor: 1, samples: d.time.length, ready: false };
  const raw = actual / expected;
  return {
    factor: Math.min(3, Math.max(0.4, Math.round(raw * 100) / 100)),
    samples: d.time.length,
    ready: true,
  };
}

export function hoursFor(d: Derived, topic: Topic): number {
  return topic.estHours * calibration(d).factor;
}

export function totalHours(d: Derived): number {
  return Math.round(TOTAL_HOURS * calibration(d).factor * 10) / 10;
}

// ── progress ──────────────────────────────────────────────────────────────

export function progress(d: Derived) {
  const total = totalHours(d);
  const doneHours = TOPICS.reduce((s, t) => s + hoursFor(d, t) * completionOf(d, t.id), 0);
  return {
    doneHours: Math.round(doneHours * 10) / 10,
    totalHours: total,
    remainingHours: Math.round((total - doneHours) * 10) / 10,
    percent: Math.round((doneHours / total) * 1000) / 10,
    topicsComplete: TOPICS.filter((t) => isComplete(d, t.id)).length,
  };
}

/** Progress against the depth plan rather than the whole syllabus. */
export function coreProgress(d: Derived) {
  let totalH = 0;
  let doneH = 0;
  let topicCount = 0;
  let topicsComplete = 0;

  for (const t of TOPICS) {
    const depth = depthFor(d, t);
    if (depth === 0) continue;
    topicCount++;
    totalH += hoursFor(d, t) * depth;
    doneH += hoursFor(d, t) * Math.min(completionOf(d, t.id), depth);
    if (isAtDepth(d, t)) topicsComplete++;
  }

  return {
    totalHours: Math.round(totalH * 10) / 10,
    doneHours: Math.round(doneH * 10) / 10,
    remainingHours: Math.round((totalH - doneH) * 10) / 10,
    percent: totalH === 0 ? 0 : Math.round((doneH / totalH) * 1000) / 10,
    topicCount,
    topicsComplete,
    shareOfSyllabus: Math.round((totalH / totalHours(d)) * 1000) / 10,
  };
}

// ── time ──────────────────────────────────────────────────────────────────

/**
 * Add whole calendar months, clamping when the target month is shorter.
 * 31 January plus one month is 28 February, not 3 March.
 */
export function addMonths(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(d, last)),
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * The end of the preparation window.
 *
 * These exams run every year, so a plan anchored to one date resets to zero if
 * that date is missed. The tracker commits to four to six months instead, and a
 * round that does not end in a pass leaves you further ahead for the next one.
 *
 * Saves written before this change carry an examDate and no window; those still
 * work, which is why the fallback stays.
 */
export function windowEnd(settings: Settings | null): string | null {
  if (!settings) return null;
  if (settings.startDate && settings.windowMonths) {
    return addMonths(settings.startDate, settings.windowMonths);
  }
  return settings.examDate ?? null;
}

/** Whole calendar days from today to `day`, floored at zero. */
export function daysUntil(day: string, today = new Date()): number {
  const a = new Date(today);
  a.setHours(0, 0, 0, 0);
  const b = new Date(day);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

export function weeksUntil(day: string, today = new Date()): number {
  return Math.max(0, daysUntil(day, today) / 7);
}

/**
 * Calendar days left in the preparation window, or null if no window is set.
 * Never negative: a finished window reads zero, not a debt.
 */
export function daysLeft(settings: Settings | null, today = new Date()): number | null {
  const end = windowEnd(settings);
  return end === null ? null : daysUntil(end, today);
}

/** How the window reads in a sentence: "5-month plan", for labels. */
export function windowLabel(settings: Settings | null): string {
  const months = settings?.windowMonths;
  return months ? `${months}-month plan` : "plan";
}

export function requiredPace(d: Derived, today = new Date()): number {
  const end = windowEnd(d.settings);
  if (!end) return 0;
  const weeks = weeksUntil(end, today);
  if (weeks <= 0) return 0;
  return Math.round((coreProgress(d).remainingHours / weeks) * 10) / 10;
}

/** Measured pace from real work only. Prior knowledge never counts. */
export function observedPace(d: Derived, days = 21, today = new Date()): number | null {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);

  let hours = 0;
  let any = false;
  for (const topic of TOPICS) {
    const done = checksFor(d, topic.id);
    for (const c of CHECKS) {
      const rec = done[c.id];
      if (!rec || rec.prior) continue;
      any = true;
      if (new Date(rec.at) >= cutoff) hours += hoursFor(d, topic) * c.weight;
    }
  }
  if (!any) return null;
  return Math.round((hours / (days / 7)) * 10) / 10;
}

export function effectivePace(d: Derived, today = new Date()): number {
  const measured = observedPace(d, 21, today);
  if (measured !== null && measured > 0) return measured;
  return d.settings?.weeklyHours ?? 0;
}

export function projection(d: Derived, today = new Date()) {
  const end = windowEnd(d.settings);
  if (!d.settings || !end) {
    return { percent: 0, margin: 0, feasible: false, ofSyllabus: 0, measured: false };
  }
  const weeks = weeksUntil(end, today);
  const core = coreProgress(d);
  const reachable = Math.min(core.totalHours, core.doneHours + effectivePace(d, today) * weeks);
  const percent = core.totalHours === 0 ? 0 : Math.round((reachable / core.totalHours) * 1000) / 10;
  return {
    percent,
    margin: Math.round((percent - 100) * 10) / 10,
    feasible: percent >= 99.9,
    ofSyllabus: Math.round((reachable / totalHours(d)) * 1000) / 10,
    /**
     * False when nothing has been measured yet and the projection is running on
     * the hours the user *said* they would do. The arithmetic is sound either
     * way, but the claim is not the same one, and rule 4 says this app never
     * flatters. Anything showing this figure must say which it is.
     */
    measured: observedPace(d, 21, today) !== null,
  };
}

// ── answer attempts ───────────────────────────────────────────────────────

/** What the exam actually measures: answers written, and how they scored. */
export function attemptStats(d: Derived, days = 21, today = new Date()) {
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);
  const recent = d.attempts.filter((a) => new Date(a.at) >= cutoff);

  const marks = d.attempts.reduce((s, a) => s + a.marks, 0);
  const outOf = d.attempts.reduce((s, a) => s + a.outOf, 0);

  return {
    total: d.attempts.length,
    perWeek: Math.round((recent.length / (days / 7)) * 10) / 10,
    averagePercent: outOf === 0 ? null : Math.round((marks / outOf) * 1000) / 10,
    topicsAttempted: new Set(d.attempts.map((a) => a.topicId)).size,
  };
}

export function attemptsFor(d: Derived, topicId: string) {
  return d.attempts.filter((a) => a.topicId === topicId);
}

export interface AttemptTrend {
  topicId: string;
  /** How many answers have been written on this topic. */
  count: number;
  /** Every mark, oldest first, on the paper's own 40. */
  marks: number[];
  /** The same marks with the one thing that changes their meaning. */
  entries: { marks: number; aided: boolean }[];
  first: number;
  last: number;
  best: number;
  /** Last minus first. Zero on a single attempt. */
  change: number;
  /**
   * Marks from answers written without the skeleton open, oldest first.
   *
   * The only series that predicts anything. An aided answer scores better
   * because the app handed the candidate the criterion they keep dropping —
   * which is the point of the help, and exactly why it cannot be counted as
   * evidence they no longer need it.
   */
  unaided: number[];
  /** Last minus first across the unaided series. Null under two of them. */
  unaidedChange: number | null;
}

/**
 * One topic's answers, in the order they were written.
 *
 * The single number a candidate most wants and this app was not showing: not
 * what they scored, but whether writing the same topic again moved it. A mark
 * on its own says the answer was weak; 12 then 19 then 24 says the practice is
 * working, which is the only thing that keeps someone writing the fourth one.
 */
export function attemptTrend(d: Derived, topicId: string): AttemptTrend | null {
  const entries = attemptsFor(d, topicId)
    .slice()
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((a) => ({ marks: a.marks, aided: a.aided === true }));
  if (entries.length === 0) return null;
  const marks = entries.map((e) => e.marks);
  const unaided = entries.filter((e) => !e.aided).map((e) => e.marks);
  const first = marks[0]!;
  const last = marks[marks.length - 1]!;
  return {
    topicId,
    count: marks.length,
    marks,
    entries,
    first,
    last,
    best: Math.max(...marks),
    change: last - first,
    unaided,
    unaidedChange: unaided.length > 1 ? unaided[unaided.length - 1]! - unaided[0]! : null,
  };
}

export interface LastAnswer {
  at: string;
  marks: number;
  outOf: number;
  /** Every criterion, most marks dropped first. */
  lost: { key: string; scored: number; lost: number }[];
  totalLost: number;
  /** What the marker said at the time, where the attempt is new enough to have kept it. */
  weakest?: string;
  rewrite?: string;
  working?: string;
  outOfEach: number;
}

/**
 * The last answer on a topic, broken down by where the marks actually went.
 *
 * "You scored 22/40" tells a candidate they did badly. "You dropped 6 of the 18
 * on thinkers and 5 on examples" tells them what to do on Tuesday, and it is
 * the same data — the app has been storing the per-criterion scores all along
 * and showing only their total. Sorted by marks lost rather than by score, so
 * the row at the top is always the one worth an hour.
 */
export function lastAnswer(d: Derived, topicId: string): LastAnswer | null {
  const scored = attemptsFor(d, topicId)
    .filter((a) => a.scores)
    .sort((a, b) => a.at.localeCompare(b.at));
  const a = scored[scored.length - 1];
  if (!a || !a.scores) return null;

  const outOfEach = a.rubricOutOf ?? 10;
  const lost = (["structure", "content", "thinkers", "examples", "demand"] as const)
    .map((k) => ({ key: k, scored: a.scores![k], lost: outOfEach - a.scores![k] }))
    .sort((x, y) => y.lost - x.lost);

  return {
    at: a.at,
    marks: a.marks,
    outOf: a.outOf,
    lost,
    totalLost: lost.reduce((s, l) => s + l.lost, 0),
    weakest: a.weakest,
    rewrite: a.rewrite,
    working: a.working,
    outOfEach,
  };
}

/** Every topic written more than once, the ones that moved most first. */
export function attemptTrends(d: Derived): AttemptTrend[] {
  return TOPICS.map((t) => attemptTrend(d, t.id))
    .filter((t): t is AttemptTrend => t !== null && t.count > 1)
    .sort((a, b) => b.change - a.change);
}

// ── revision decay ────────────────────────────────────────────────────────

/** Days until the next revision is due, widening with each pass. */
export const REVISION_INTERVALS = [7, 21, 45, 90] as const;

export function intervalFor(count: number): number {
  if (count < 1) return REVISION_INTERVALS[0];
  return REVISION_INTERVALS[Math.min(count, REVISION_INTERVALS.length) - 1];
}

export interface RevisionState {
  count: number;
  lastAt: string | null;
  dueAt: string | null;
  overdueDays: number;
  inCycle: boolean;
}

/** Where a topic sits in its revision cycle. */
export function revisionState(d: Derived, topicId: string, today = new Date()): RevisionState {
  const history = (d.revisions[topicId] ?? []).filter((at) => new Date(at).getTime() > 0);
  if (history.length === 0) {
    return { count: 0, lastAt: null, dueAt: null, overdueDays: 0, inCycle: false };
  }
  const lastAt = history[history.length - 1];
  const due = new Date(lastAt);
  due.setDate(due.getDate() + intervalFor(history.length));
  const overdueDays = Math.floor((today.getTime() - due.getTime()) / 86400000);
  return {
    count: history.length,
    lastAt,
    dueAt: due.toISOString(),
    overdueDays: Math.max(0, overdueDays),
    inCycle: true,
  };
}

export interface DueTopic {
  topic: Topic;
  overdueDays: number;
  count: number;
}

/** Topics whose revision interval has elapsed, most overdue first. */
export function dueForRevision(d: Derived, today = new Date()): DueTopic[] {
  const out: DueTopic[] = [];
  for (const topic of TOPICS) {
    const r = revisionState(d, topic.id, today);
    if (r.inCycle && r.overdueDays > 0) {
      out.push({ topic, overdueDays: r.overdueDays, count: r.count });
    }
  }
  return out.sort((a, b) => b.overdueDays - a.overdueDays);
}

/**
 * Share of revised work still inside its interval.
 * Coverage never falls; this is what falls when revision slips.
 */
export function freshness(d: Derived, today = new Date()) {
  let inCycle = 0;
  let fresh = 0;
  for (const topic of TOPICS) {
    const r = revisionState(d, topic.id, today);
    if (!r.inCycle) continue;
    const weight = hoursFor(d, topic);
    inCycle += weight;
    if (r.overdueDays === 0) fresh += weight;
  }
  if (inCycle === 0) return { percent: null, topicsDue: 0 };
  return {
    percent: Math.round((fresh / inCycle) * 1000) / 10,
    topicsDue: dueForRevision(d, today).length,
  };
}

/**
 * What one revision pass costs, as a share of the topic's first-pass hours.
 * Going over something you already know is far cheaper than learning it, but it
 * is not free, and pretending it is free is how a plan quietly overpromises.
 */
export const REVISION_COST = 0.2;
const MIN_REVISION_HOURS = 0.25;

/**
 * Ceiling on how much of a week revision may take. Without it, a backlog after a
 * bad fortnight would eat every hour and no new topic would ever be opened again.
 * The overflow rolls into the following week rather than disappearing.
 */
export const REVISION_WEEK_SHARE = 0.5;

export function revisionHoursFor(d: Derived, topic: Topic): number {
  return Math.max(
    MIN_REVISION_HOURS,
    Math.round(hoursFor(d, topic) * REVISION_COST * 10) / 10,
  );
}

export interface RevisionItem extends DueTopic {
  hours: number;
}

/** Revisions already overdue today, most overdue first, with what they cost. */
export function revisionQueue(d: Derived, today = new Date()): RevisionItem[] {
  return dueForRevision(d, today).map((x) => ({
    ...x,
    hours: revisionHoursFor(d, x.topic),
  }));
}

/** Hours of revision currently overdue. */
export function revisionLoad(d: Derived, today = new Date()): number {
  return Math.round(revisionQueue(d, today).reduce((s, r) => s + r.hours, 0) * 10) / 10;
}

/**
 * Every topic in the cycle that falls due on or before `by`, soonest first.
 * Due dates are known exactly, so a week's revision load is a fact rather than
 * an estimate — no prediction is involved.
 */
function dueBy(d: Derived, by: Date, today: Date): RevisionItem[] {
  const out: RevisionItem[] = [];
  for (const topic of TOPICS) {
    const r = revisionState(d, topic.id, today);
    if (!r.inCycle || !r.dueAt) continue;
    if (new Date(r.dueAt).getTime() > by.getTime()) continue;
    out.push({
      topic,
      overdueDays: r.overdueDays,
      count: r.count,
      hours: revisionHoursFor(d, topic),
    });
  }
  return out.sort(
    (a, b) => b.overdueDays - a.overdueDays || bandOf(b.topic) - bandOf(a.topic),
  );
}

/**
 * Days on which real work was recorded. Prior knowledge is excluded, exactly as
 * it is from pace: ticking what you already knew is not a day of study.
 */
export function activeDays(d: Derived): Set<string> {
  const days = new Set<string>();
  const add = (at: string) => days.add(at.slice(0, 10));

  for (const topicId of Object.keys(d.checks)) {
    for (const rec of Object.values(d.checks[topicId] ?? {})) {
      if (rec && !rec.prior) add(rec.at);
    }
  }
  for (const t of d.time) add(t.at);
  for (const a of d.attempts) add(a.at);
  return days;
}

/** Hours of real work logged since Monday. Prior knowledge never counts. */
export function hoursThisWeek(d: Derived, today = new Date()): number {
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const from = monday.getTime();

  let minutes = 0;
  for (const t of d.time) if (Date.parse(t.at) >= from) minutes += t.minutes;
  return Math.round((minutes / 60) * 10) / 10;
}

/** The first day anything was recorded. Preparation started then, not at install. */
export function startedOn(d: Derived): string | null {
  const days = [...activeDays(d)].sort();
  return days[0] ?? null;
}

/**
 * How far through the run you are, 0 to 1, by elapsed days rather than by work
 * done. Used to judge whether a figure is ahead or behind, never to produce one.
 */
export function elapsedFraction(d: Derived, today = new Date()): number {
  if (!d.settings) return 0;
  const start = startedOn(d);
  if (!start) return 0;
  const from = Date.parse(start);
  const now = today.getTime();
  const end = windowEnd(d.settings);
  const finish = end ? Date.parse(end) : NaN;
  if (!(finish > from)) return 1;
  return Math.min(1, Math.max(0, (now - from) / (finish - from)));
}

export type Standing = "none" | "ahead" | "close" | "behind";

/**
 * Where a percentage sits against where it should be by now.
 *
 * A fixed threshold would call 1.5% a failure on day one, when day one is
 * exactly where 1.5% belongs — and by the time it turned green the colour would
 * have stopped meaning anything. This compares against elapsed time instead, so
 * the colour answers "am I keeping up", which is the only question worth a
 * colour.
 */
export function standingOf(d: Derived, percent: number, today = new Date()): Standing {
  // Nothing recorded yet is not slipping. Day one has no standing to report, and
  // colouring it amber tells a beginner they are already failing.
  if (!d.settings || startedOn(d) === null) return "none";
  const target = d.settings.targetCoverage * 100;
  const expected = elapsedFraction(d, today) * target;
  if (expected <= 0.5) return percent > 0 ? "ahead" : "none";
  const ratio = percent / expected;
  if (ratio >= 0.9) return "ahead";
  if (ratio >= 0.6) return "close";
  return "behind";
}

export interface Streak {
  current: number;
  best: number;
  today: boolean;
}

/**
 * Consecutive days worked. A streak survives a day that is still in progress —
 * if today is blank but yesterday was not, the run is alive until midnight.
 */
export function streak(d: Derived, today = new Date()): Streak {
  const days = activeDays(d);
  const key = (dt: Date) => dt.toISOString().slice(0, 10);
  const shift = (n: number) => new Date(today.getTime() - n * 86400000);

  const doneToday = days.has(key(today));
  let current = 0;
  if (doneToday || days.has(key(shift(1)))) {
    for (let i = doneToday ? 0 : 1; ; i++) {
      if (!days.has(key(shift(i)))) break;
      current++;
    }
  }

  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const day of sorted) {
    const ms = Date.parse(day);
    run = prev !== null && ms - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = ms;
  }

  return { current, best, today: doneToday };
}

// ── queue and plan ────────────────────────────────────────────────────────

export function hoursLeftOn(d: Derived, topic: Topic): number {
  const gap = Math.max(0, depthFor(d, topic) - completionOf(d, topic.id));
  return Math.round(hoursFor(d, topic) * gap * 10) / 10;
}

/**
 * The order a beginner should meet sociology in — which is not the order the
 * syllabus is printed in, and not the order of what is asked most.
 *
 * Faculty who teach this optional at scale changed their own sequence for this
 * reason: opening at unit one leaves a candidate reading about the discipline
 * before they have seen the discipline do anything. Stratification comes first
 * because it is visible from the window — caste, class, gender, who gets
 * treated how — so the ideas land against something already known. Only then do
 * the theorists mean anything: Marx on who owns what, Durkheim on what holds a
 * society together, Weber on why one answer is never enough. Power and the
 * state follow, because by then there is a structure to hang them on.
 *
 * After those three the ordering returns to yield, where it belongs.
 *
 * Note this is the WBCS syllabus, not the UPSC one whose unit numbers that
 * advice is usually given in — "start at chapter five" means stratification,
 * and stratification is a differently numbered unit here. The sequence is
 * translated, not copied.
 */
export const ON_RAMP: { paper: 1 | 2; unit: string; why: string }[] = [
  {
    paper: 1,
    unit: "Stratification",
    why: "You can see this one from the window. Caste, class, gender, who is treated how — sociology stops being abstract in about an hour.",
  },
  {
    paper: 1,
    unit: "Pathfinders",
    why: "The theorists land properly once you have seen what they were explaining. Marx on who owns what, Durkheim on what holds a society together, Weber on why one cause is never enough.",
  },
  {
    paper: 1,
    unit: "Politics and Society",
    why: "Power, the state, the nation. Grand questions, and by now you have the structure to hang them on.",
  },
];

/** Where a topic sits in the on-ramp, or Infinity if it is not part of it. */
function onRampRank(topic: Topic): number {
  const i = ON_RAMP.findIndex((r) => r.paper === topic.paper && r.unit === topic.unit);
  return i === -1 ? Infinity : i;
}

/**
 * Whether the teaching sequence still applies.
 *
 * It expires on its own. Once every on-ramp topic is at depth there is nothing
 * left to order, and someone who told us they have studied this before never
 * gets it — they do not need to be walked in through the front door.
 */
export function onRampActive(d: Derived): boolean {
  if (d.settings?.level === "pro") return false;
  return TOPICS.some((t) => onRampRank(t) < Infinity && depthFor(d, t) > 0 && !isAtDepth(d, t));
}

/** The next on-ramp unit to work through, with the reason it comes next. */
export function nextOnRamp(d: Derived): (typeof ON_RAMP)[number] | null {
  if (!onRampActive(d)) return null;
  return (
    ON_RAMP.find((r) =>
      TOPICS.some(
        (t) => t.paper === r.paper && t.unit === r.unit && depthFor(d, t) > 0 && !isAtDepth(d, t),
      ),
    ) ?? null
  );
}

export function queue(d: Derived): Topic[] {
  const start = d.settings?.startUnit;
  const ramp = onRampActive(d);

  return TOPICS.filter(
    // A topic whose boxes are ticked but whose last answer scored under 50% is
    // not finished. Marks measure what the exam measures; checks do not.
    (t) => depthFor(d, t) > 0 && (!isAtDepth(d, t) || needsRework(d, t.id)),
  ).sort((a, b) => {
    if (start) {
      // A chosen starting unit outranks everything, including the on-ramp: it
      // is the one place the candidate has told us where they want to begin,
      // and second-guessing that would be rude. It stops mattering by itself —
      // its topics drop out of the queue at depth.
      const first = (t: Topic) => (t.unit === start ? 0 : 1);
      if (first(a) !== first(b)) return first(a) - first(b);
    }
    if (ramp) {
      const ra = onRampRank(a);
      const rb = onRampRank(b);
      if (ra !== rb) return ra - rb;
    }
    return bandOf(b) - bandOf(a) || a.estHours - b.estHours;
  });
}

export interface WeekPlan {
  weekIndex: number;
  topics: Topic[];
  /** Hours of new work. Unchanged meaning — the UI's existing figure. */
  hours: number;
  /** Revisions falling due in this week, most overdue first. */
  revisions: RevisionItem[];
  revisionHours: number;
  /** New work plus revision. What the week actually asks of you. */
  totalHours: number;
}

/**
 * Revision is booked before new work, because a topic left past its interval
 * decays whether or not the plan admits it. What is left of the weekly budget
 * then goes to new topics — so a growing revision load visibly slows new
 * coverage instead of silently making the projection a lie.
 */
export function packWeeks(d: Derived, weekCount: number, today = new Date()): WeekPlan[] {
  if (!d.settings) return [];
  const budget = d.settings.weeklyHours;
  const pending = queue(d);
  const weeks: WeekPlan[] = [];
  const scheduled = new Set<string>();
  let i = 0;
  let carried: RevisionItem[] = [];

  for (let w = 0; w < weekCount; w++) {
    const weekEnd = new Date(today.getTime() + (w + 1) * 7 * 86400000);
    const newlyDue = dueBy(d, weekEnd, today).filter((r) => !scheduled.has(r.topic.id));
    const candidates = [...carried, ...newlyDue];

    const week: WeekPlan = {
      weekIndex: w,
      topics: [],
      hours: 0,
      revisions: [],
      revisionHours: 0,
      totalHours: 0,
    };

    const revisionCap = budget * REVISION_WEEK_SHARE;
    carried = [];
    for (const r of candidates) {
      if (week.revisionHours + r.hours > revisionCap && week.revisions.length > 0) {
        carried.push(r);
        continue;
      }
      week.revisions.push(r);
      week.revisionHours = Math.round((week.revisionHours + r.hours) * 10) / 10;
      scheduled.add(r.topic.id);
    }

    const left = Math.max(0, budget - week.revisionHours);
    while (i < pending.length) {
      const cost = hoursLeftOn(d, pending[i]);
      if (week.hours + cost > left && week.topics.length > 0) break;
      if (week.hours + cost > left && left <= 0) break;
      week.topics.push(pending[i]);
      week.hours = Math.round((week.hours + cost) * 10) / 10;
      i++;
    }

    week.totalHours = Math.round((week.hours + week.revisionHours) * 10) / 10;
    weeks.push(week);

    if (i >= pending.length && carried.length === 0 && week.revisions.length === 0) break;
  }
  return weeks;
}

export interface Option {
  label: string;
  outcome: string;
}

/** Three arithmetic ways to close the gap. Consequences, not advice. */
export function options(d: Derived, today = new Date()): Option[] {
  if (!d.settings) return [];
  const end = windowEnd(d.settings);
  if (!end) return [];
  const weeks = weeksUntil(end, today);
  const proj = projection(d, today);
  if (proj.feasible || weeks <= 0) return [];

  const pace = effectivePace(d, today);
  const remaining = coreProgress(d).remainingHours;
  const need = requiredPace(d, today);
  const extraMinutes = Math.max(1, Math.ceil(((need - pace) / 7) * 60));

  const cheapestFirst = queue(d)
    .slice()
    .sort((a, b) => bandOf(a) - bandOf(b) || b.estHours - a.estHours);
  const affordable = pace * weeks;
  let shed = 0;
  let count = 0;
  while (count < cheapestFirst.length && remaining - shed > affordable) {
    shed += hoursLeftOn(d, cheapestFirst[count]);
    count++;
  }
  const shedHours = cheapestFirst
    .slice(0, count)
    .reduce((s, t) => s + hoursFor(d, t) * depthFor(d, t), 0);
  const keptPercent =
    Math.round(((coreProgress(d).totalHours - shedHours) / totalHours(d)) * 1000) / 10;

  const extraWeeks = Math.max(1, Math.ceil(remaining / Math.max(pace, 0.1) - weeks));

  return [
    { label: `Study ${extraMinutes} more minutes a day`, outcome: "reaches your target" },
    { label: `Go shallower on ${count} low-yield topics`, outcome: `covers ${keptPercent}%` },
    { label: `Extend the window by ${extraWeeks} weeks`, outcome: "reaches your target" },
  ];
}

// ── answers ───────────────────────────────────────────────────────────────

/** Below this, the topic goes back into the queue. */
export const RESURFACE_BELOW = 0.5;
/** Between the two, it is flagged but not reopened. */
export const FLAG_BELOW = 0.65;

/**
 * How long a weak answer waits before its topic returns to the queue.
 *
 * Seven days, the same as the first revision interval, and chosen for the same
 * reason: coming back to something a week later is how it sticks. Reopening it
 * the same afternoon punishes the candidate for having practised — the list
 * grows the moment they do the hardest thing the app asks of them, which is to
 * write an answer and find out it was poor. The topic is not hidden in the
 * meantime; it is listed as waiting, with the date it returns.
 */
export const REWORK_COOLDOWN_DAYS = 7;

export type AnswerVerdict = "none" | "unread" | "rework" | "shaky" | "solid";

/** The most recent answer written on a topic, if any. */
export function latestAttempt(d: Derived, topicId: string) {
  const all = attemptsFor(d, topicId);
  return all.length === 0 ? null : all[all.length - 1]!;
}

/**
 * What the last answer on a topic says about it.
 *
 * Marks are the only signal in this app that measures what the exam measures,
 * so a topic whose boxes are ticked but whose answer scored 40% is not finished.
 * Below 50% it returns to the queue; 50-65% is flagged and left alone; above
 * that nothing happens.
 */
export function answerVerdict(d: Derived, topicId: string): AnswerVerdict {
  const last = latestAttempt(d, topicId);
  if (!last || last.outOf <= 0) return "none";
  // A page the model could not read produced a number, not a mark. Acting on it
  // would reopen a topic and dent an average on the strength of bad handwriting
  // in a photograph, which is a judgement about a camera, not about sociology.
  if (last.legible === false) return "unread";
  const share = last.marks / last.outOf;
  if (share < RESURFACE_BELOW) return "rework";
  if (share < FLAG_BELOW) return "shaky";
  return "solid";
}

/** The day a topic marked for rework comes back into the queue. */
export function reworkDueOn(d: Derived, topicId: string): string | null {
  if (answerVerdict(d, topicId) !== "rework") return null;
  const last = latestAttempt(d, topicId);
  if (!last) return null;
  const due = new Date(last.at);
  due.setDate(due.getDate() + REWORK_COOLDOWN_DAYS);
  return due.toISOString().slice(0, 10);
}

/** Topics waiting out the cooling-off period, soonest first. */
export function reworkWaiting(d: Derived, today = new Date()) {
  return TOPICS.map((t) => ({ topic: t, due: reworkDueOn(d, t.id) }))
    .filter((r): r is { topic: Topic; due: string } => r.due !== null && r.due > dayKey(today))
    .sort((a, b) => a.due.localeCompare(b.due));
}

/** Topics whose last answer was weak enough to reopen them. */
/**
 * Whether a weak answer has waited long enough to be worth reopening.
 *
 * The verdict is immediate; the consequence is not. Everything that reports on
 * the answer itself reads answerVerdict; only the queue reads this.
 */
export function needsRework(d: Derived, topicId: string, today = new Date()): boolean {
  const due = reworkDueOn(d, topicId);
  return due !== null && due <= dayKey(today);
}

/**
 * Every criterion averaged across scored attempts, for the trend.
 *
 * Attempts written before the rubric moved to eights are stored out of ten, so
 * each score is rescaled before it joins the average. Without this an old 7/10
 * and a new 7/8 would be added together as though they meant the same thing,
 * and the trend the whole card exists to show would be a trend in the marking
 * scheme rather than in the candidate.
 */
export const RUBRIC_OUT_OF = 8;

export function rubricAverages(d: Derived) {
  const keys = ["structure", "content", "thinkers", "examples", "demand"] as const;
  const sums: Record<string, { n: number; total: number }> = {};
  for (const a of d.attempts) {
    if (!a.scores) continue;
    const wasOutOf = a.rubricOutOf ?? 10;
    for (const k of keys) {
      sums[k] = sums[k] ?? { n: 0, total: 0 };
      sums[k].n++;
      sums[k].total += (a.scores[k] * RUBRIC_OUT_OF) / wasOutOf;
    }
  }
  return keys.map((k) => ({
    key: k,
    scored: sums[k]?.n ?? 0,
    average: sums[k]?.n ? Math.round((sums[k]!.total / sums[k]!.n) * 10) / 10 : null,
  }));
}

/** How close the candidate's own estimate has been to the score. */
export function selfMarkGap(d: Derived): { n: number; averageGap: number | null } {
  const pairs = d.attempts.filter((a) => a.selfMark !== undefined && a.scores);
  if (pairs.length === 0) return { n: 0, averageGap: null };
  const total = pairs.reduce((s, a) => s + (a.selfMark! - a.marks), 0);
  return { n: pairs.length, averageGap: Math.round((total / pairs.length) * 10) / 10 };
}

// ── blind spots ───────────────────────────────────────────────────────────

export interface UnitExposure {
  paper: 1 | 2;
  unit: string;
  /** Questions this unit supplied, 2018-2023. */
  askedA: number;
  askedB: number;
  /** Answers the candidate has written from it. */
  written: number;
  /** Topics in the unit that have been taken to their planned depth. */
  studied: number;
  topics: number;
}

/**
 * What each unit has asked, against what has been done about it.
 *
 * The Group A and Group B split is the point. Five questions are set in Group A
 * and three answered; three are set in Group B and two answered. So Group B is
 * far less forgiving — there is almost no choice in it — and the units feeding
 * it are not the units that dominate Group A. A candidate can be well prepared
 * on paper and unable to fill a section.
 */
export function unitExposure(d: Derived): UnitExposure[] {
  const byUnit = new Map<string, UnitExposure>();

  for (const t of TOPICS) {
    const key = `${t.paper}|${t.unit}`;
    const row = byUnit.get(key) ?? {
      paper: t.paper as 1 | 2,
      unit: t.unit,
      askedA: 0,
      askedB: 0,
      written: 0,
      studied: 0,
      topics: 0,
    };
    row.topics++;
    if (isAtDepth(d, t)) row.studied++;
    row.written += d.attempts.filter((a) => a.topicId === t.id).length;
    byUnit.set(key, row);
  }

  const unitOf = new Map(TOPICS.map((t) => [t.id, `${t.paper}|${t.unit}`]));
  for (const q of PYQS) {
    const keys = new Set(q.topicIds.map((id) => unitOf.get(id)).filter(Boolean) as string[]);
    for (const key of keys) {
      const row = byUnit.get(key);
      if (!row) continue;
      if (q.group === "A") row.askedA++;
      else row.askedB++;
    }
  }

  return [...byUnit.values()];
}

export interface BlindSpot {
  unit: string;
  paper: 1 | 2;
  askedB: number;
  askedA: number;
  studied: number;
  topics: number;
}

/**
 * Units that supply Group B questions and from which no answer has been
 * written. Group B first, because that is the section with no room to dodge.
 */
export function blindSpots(d: Derived): BlindSpot[] {
  return unitExposure(d)
    .filter((u) => u.askedB > 0 && u.written === 0)
    .sort((a, b) => b.askedB - a.askedB)
    .map(({ unit, paper, askedB, askedA, studied, topics }) => ({
      unit,
      paper,
      askedB,
      askedA,
      studied,
      topics,
    }));
}

/** Group B questions sitting in units you have never written an answer from. */
export function groupBAtRisk(d: Derived): number {
  return blindSpots(d).reduce((s, u) => s + u.askedB, 0);
}

/** The corpus, filtered to one topic. */
export function questionsForTopic(topicId: string) {
  return PYQS.filter((q) => q.topicIds.includes(topicId)).sort((a, b) => b.year - a.year);
}

/**
 * Every question asked anywhere in a topic's unit, minus the ones already
 * listed against the topic itself.
 *
 * The fallback for a topic WBCS has never asked directly. Practising a
 * neighbouring question is far better than inventing one: it is still the real
 * examiner's phrasing, still the real command words, and the unit is what the
 * paper actually sets around.
 */
export function questionsForUnit(paper: 1 | 2, unit: string, excludeTopicId?: string) {
  const inUnit = new Set(
    TOPICS.filter((t) => t.paper === paper && t.unit === unit).map((t) => t.id),
  );
  return PYQS.filter(
    (q) =>
      q.topicIds.some((id) => inUnit.has(id)) &&
      !(excludeTopicId && q.topicIds.includes(excludeTopicId)),
  ).sort((a, b) => b.year - a.year);
}

/** Answers already written against a given question's text. */
export function attemptsOnQuestion(d: Derived, text: string) {
  return d.attempts.filter((a) => a.questionText === text);
}

// ── what to do today ──────────────────────────────────────────────────────

export interface Task {
  id: string;
  topic: Topic;
  check: CheckId;
  label: string;
  minutes: number;
  /** Ticked today. Kept on the list rather than removed — see todaysBoard. */
  done?: boolean;
}

/** Today's share of the weekly commitment, in minutes. */
export function dailyBudget(d: Derived): number {
  return Math.max(20, Math.round(((d.settings?.weeklyHours ?? 7) / 7) * 60));
}

/**
 * Today's work, derived. For each topic in this week's plan, the next check it
 * still needs, stopping at the depth the planner set. Overdue revision comes
 * first because it decays whether or not anything lists it.
 *
 * Items are added until the next would overrun today's budget; one always gets
 * through, so the list is never empty while work remains.
 *
 * This is the single source for "today" — the dashboard card and the Today's
 * Study screen both read it, so they cannot disagree.
 */
export function todaysTasks(d: Derived, limit = 5): Task[] {
  const budget = dailyBudget(d);
  const out: Task[] = [];
  let used = 0;
  const fits = (m: number) => out.length === 0 || used + m <= budget;

  for (const r of revisionQueue(d).slice(0, 2)) {
    const minutes = Math.max(10, Math.round(r.hours * 60));
    if (!fits(minutes)) break;
    out.push({
      id: `${r.topic.id}:revised`,
      topic: r.topic,
      check: "revised",
      label: `Revise: ${r.topic.name}`,
      minutes,
    });
    used += minutes;
  }

  const week = packWeeks(d, 1)[0];
  for (const topic of week?.topics ?? []) {
    if (out.length >= limit) break;
    const target = depthFor(d, topic);
    let cumulative = 0;
    for (const c of CHECKS) {
      cumulative += c.weight;
      if (cumulative > target + 0.001) break;
      if (isChecked(d, topic.id, c.id)) continue;
      const minutes = Math.max(10, Math.round(hoursFor(d, topic) * c.weight * 60));
      if (!fits(minutes)) return out;
      out.push({
        id: `${topic.id}:${c.id}`,
        topic,
        check: c.id,
        label: `${c.label}: ${topic.name}`,
        minutes,
      });
      used += minutes;
      break;
    }
  }

  return out.slice(0, limit);
}

/** The local calendar day, as the log writes it. */
function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * What was ticked today, rebuilt as tasks.
 *
 * Knowledge marked as already held is excluded: it was never today's work, and
 * a list that congratulated you for it on the day you set the app up would be
 * flattering you with someone else's effort.
 */
export function completedToday(d: Derived, today = new Date()): Task[] {
  const key = dayKey(today);
  const out: Task[] = [];

  for (const topic of TOPICS) {
    const checks = d.checks[topic.id];
    if (!checks) continue;
    for (const c of CHECKS) {
      const rec = checks[c.id];
      if (!rec || rec.prior) continue;
      // The log stores an ISO instant; compare on the local day it fell in.
      if (dayKey(new Date(rec.at)) !== key) continue;
      out.push({
        id: `${topic.id}:${c.id}`,
        topic,
        check: c.id,
        label: `${c.label}: ${topic.name}`,
        minutes: Math.max(10, Math.round(hoursFor(d, topic) * c.weight * 60)),
        done: true,
      });
    }
  }
  return out;
}

export interface TodaysBoard {
  /** Finished first, then what is left. Both stay on screen all day. */
  tasks: Task[];
  done: number;
  total: number;
  minutesDone: number;
  minutesPlanned: number;
  budget: number;
}

/**
 * Today's list, including the things already crossed off.
 *
 * Removing a task the moment it is ticked was the old behaviour and it read as
 * deletion rather than progress: you did the work and the screen took the row
 * away, with nothing to show for it. A checklist has to keep what you finished
 * visible, or it cannot show you that you are getting somewhere.
 *
 * The count of remaining items is trimmed by what is already done, so a
 * productive morning does not keep growing the list it is trying to clear.
 */
export function todaysBoard(d: Derived, limit = 5, today = new Date()): TodaysBoard {
  const done = completedToday(d, today);
  const remaining = todaysTasks(d, Math.max(1, limit - done.length));
  const tasks = [...done, ...remaining];
  const minutesDone = done.reduce((s, t) => s + t.minutes, 0);

  return {
    tasks,
    done: done.length,
    total: tasks.length,
    minutesDone,
    minutesPlanned: minutesDone + remaining.reduce((s, t) => s + t.minutes, 0),
    budget: dailyBudget(d),
  };
}

export type { Settings };
