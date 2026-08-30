import { TOPICS, TOTAL_HOURS } from "../data/syllabus";
import type { Topic } from "../data/syllabus";
import type { CheckId, Derived, Settings } from "./events";

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
export function depthFor(d: Derived, topic: Topic): number {
  const target = d.settings?.targetCoverage ?? 1;
  const band = target >= 0.9 ? "high" : target >= 0.75 ? "mid" : "lean";
  const table: Record<string, Record<number, number>> = {
    high: { 3: DEPTHS.full, 2: DEPTHS.full, 1: DEPTHS.pyq },
    mid: { 3: DEPTHS.full, 2: DEPTHS.pyq, 1: DEPTHS.read },
    lean: { 3: DEPTHS.full, 2: DEPTHS.notes, 1: DEPTHS.none },
  };
  return table[band][bandOf(topic)];
}

// ── completion ────────────────────────────────────────────────────────────

export function checksFor(d: Derived, topicId: string) {
  return d.checks[topicId] ?? {};
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

export function daysUntil(examDate: string, today = new Date()): number {
  const a = new Date(today);
  a.setHours(0, 0, 0, 0);
  const b = new Date(examDate);
  b.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
}

export function weeksUntil(examDate: string, today = new Date()): number {
  return Math.max(0, daysUntil(examDate, today) / 7);
}

export function requiredPace(d: Derived, today = new Date()): number {
  if (!d.settings) return 0;
  const weeks = weeksUntil(d.settings.examDate, today);
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
  if (!d.settings) return { percent: 0, margin: 0, feasible: false, ofSyllabus: 0 };
  const weeks = weeksUntil(d.settings.examDate, today);
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

export function queue(d: Derived): Topic[] {
  return TOPICS.filter((t) => depthFor(d, t) > 0 && !isAtDepth(d, t)).sort(
    (a, b) => bandOf(b) - bandOf(a) || a.estHours - b.estHours,
  );
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
  const weeks = weeksUntil(d.settings.examDate, today);
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
    { label: `Move the exam ${extraWeeks} weeks later`, outcome: "reaches your target" },
  ];
}

export type { Settings };
