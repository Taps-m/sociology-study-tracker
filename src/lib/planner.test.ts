import { describe, expect, it } from "vitest";
import { TOPICS } from "../data/syllabus";
import { on, project } from "./events";
import type { Derived, Settings, StudyEvent } from "./events";
import {
  attemptStats,
  bandOf,
  calibration,
  coreProgress,
  addMonths,
  daysLeft,
  daysUntil,
  depthFor,
  dueForRevision,
  freshness,
  intervalFor,
  isAtDepth,
  observedPace,
  packWeeks,
  progress,
  queue,
  REVISION_WEEK_SHARE,
  revisionHoursFor,
  revisionLoad,
  revisionQueue,
  revisionState,
  answerVerdict,
  needsRework,
  reworkDueOn,
  reworkWaiting,
  REWORK_COOLDOWN_DAYS,
  rubricAverages,
  selfMarkGap,
  CHECKS,
  blindSpots,
  groupBAtRisk,
  questionsForTopic,
  questionsForUnit,
  attemptsOnQuestion,
  unitExposure,
  todaysBoard,
  completedToday,
  todaysTasks,
  windowEnd,
  windowLabel,
  LEVELS,
  skippedTopics,
  ON_RAMP,
  onRampActive,
  nextOnRamp,
  suggestedMonths,
  DEPTHS,
  isChecked,
  isPrior,
  isImplied,
  completionOf,
  isComplete,
  attemptTrend,
  attemptTrends,
} from "./planner";
import { PYQS, PYQ_YEARS } from "../data/pyq";

const WEEKLY_HOURS = 10;
const SETTINGS = {
  startDate: "2026-09-01",
  windowMonths: 4,
  weeklyHours: WEEKLY_HOURS,
  targetCoverage: 0.8,
} satisfies Settings;
const settings = on.settings(SETTINGS);

const highYield = TOPICS.find((t) => t.pyq >= 3)!;
/** Never asked, and in a unit that is also cold. */
const coldTopic = TOPICS.find((t) => t.pyq === 0 && bandOf(t) === 1)!;
/** Never asked itself, but sitting in a heavily examined unit. */
const promotedTopic = TOPICS.find((t) => t.pyq === 0 && bandOf(t) > 1)!;

function build(events: StudyEvent[]) {
  return project([settings, ...events]);
}

describe("projection", () => {
  it("starts at zero", () => {
    expect(progress(build([])).percent).toBe(0);
  });

  it("credits a check at its weight", () => {
    const d = build([on.check(highYield.id, "read")]);
    expect(progress(d).doneHours).toBeCloseTo(highYield.estHours * 0.4, 1);
  });

  it("undoes a check", () => {
    const d = build([on.check(highYield.id, "read"), on.uncheck(highYield.id, "read")]);
    expect(progress(d).percent).toBe(0);
  });

  it("records every revision, not just the last", () => {
    const d = build([on.check(highYield.id, "revised"), on.check(highYield.id, "revised")]);
    expect(d.revisions[highYield.id]).toHaveLength(2);
  });
});

describe("depth", () => {
  it("gives repeat topics full depth and cold ones a read", () => {
    const d = build([]);
    expect(depthFor(d, highYield)).toBe(1);
    expect(depthFor(d, coldTopic)).toBe(0.4);
  });

  it("promotes a never-asked topic that sits in a heavily examined unit", () => {
    const d = build([]);
    expect(promotedTopic).toBeDefined();
    expect(depthFor(d, promotedTopic)).toBeGreaterThan(0.4);
  });

  it("goes deeper on the cold tail for a beginner and shallower for a graduate", () => {
    const at = (level: "beginner" | "guided" | "pro") =>
      project([on.settings({ ...SETTINGS, level })]);

    // Heavily asked topics are full depth at every level. The level only ever
    // moves the tail, which is the whole point of asking.
    for (const level of ["beginner", "guided", "pro"] as const) {
      expect(depthFor(at(level), highYield)).toBe(DEPTHS.full);
    }

    expect(depthFor(at("beginner"), coldTopic)).toBeGreaterThan(
      depthFor(at("guided"), coldTopic),
    );
    expect(depthFor(at("pro"), coldTopic)).toBeLessThan(depthFor(at("guided"), coldTopic));
  });

  it("clamps rather than running off the end of the depth table", () => {
    const lean = project([on.settings({ ...SETTINGS, targetCoverage: 0.5, level: "pro" })]);
    const high = project([on.settings({ ...SETTINGS, targetCoverage: 1, level: "beginner" })]);
    expect(depthFor(lean, coldTopic)).toBe(DEPTHS.none);
    expect(depthFor(high, coldTopic)).toBe(DEPTHS.pyq);
  });

  it("treats a save written before levels existed as the middle setting", () => {
    const legacy = project([on.settings(SETTINGS)]);
    const guided = project([on.settings({ ...SETTINGS, level: "guided" })]);
    expect(depthFor(legacy, coldTopic)).toBe(depthFor(guided, coldTopic));
  });

  it("suggests the longest run for a beginner and the shortest for a graduate", () => {
    expect(suggestedMonths("beginner")).toBe(6);
    expect(suggestedMonths("guided")).toBe(5);
    expect(suggestedMonths("pro")).toBe(4);
    expect(LEVELS).toHaveLength(3);
  });

  it("can say how many topics a level and target leave out", () => {
    const guided = project([on.settings({ ...SETTINGS, level: "guided" })]);
    const pro = project([on.settings({ ...SETTINGS, level: "pro" })]);
    const beginner = project([on.settings({ ...SETTINGS, level: "beginner" })]);
    expect(skippedTopics(guided)).toHaveLength(0);
    expect(skippedTopics(beginner)).toHaveLength(0);
    expect(skippedTopics(pro).length).toBeGreaterThan(0);
    expect(skippedTopics(pro).every((t) => bandOf(t) === 1)).toBe(true);
  });

  it("promotes only a small minority of never-asked topics", () => {
    // A fixed count would have to be edited every time a paper is added, which
    // turns a real guard into a chore. What must hold is that promotion stays
    // exceptional — it exists so a topic sitting in a heavily examined unit is
    // not ignored, not so that everything gets promoted — and that every
    // promoted topic really does sit in a unit the examiner has visited.
    const promoted = TOPICS.filter((t) => t.pyq === 0 && bandOf(t) > 1);
    expect(promoted.length).toBeLessThan(TOPICS.length * 0.12);

    for (const t of promoted) {
      const unitAsked = TOPICS.filter(
        (x) => x.paper === t.paper && x.unit === t.unit,
      ).reduce((sum, x) => sum + x.pyq, 0);
      expect(unitAsked, `${t.id} promoted out of an unexamined unit`).toBeGreaterThan(0);
    }
  });

  it("queues higher-yield topics first", () => {
    const q = queue(build([]));
    expect(q[0].pyq).toBeGreaterThanOrEqual(q[q.length - 1].pyq);
  });

  it("plans fewer hours than the full syllabus", () => {
    const d = build([]);
    expect(coreProgress(d).totalHours).toBeLessThan(progress(d).totalHours);
  });
});

describe("pace and calibration", () => {
  it("ignores prior knowledge when measuring pace", () => {
    const d = build([on.check(highYield.id, "read", { prior: true })]);
    expect(observedPace(d)).toBeNull();
  });

  it("stays neutral until there are enough samples", () => {
    const d = build([on.check(highYield.id, "read", { minutes: 600 })]);
    expect(calibration(d).factor).toBe(1);
  });

  it("scales hours once samples arrive", () => {
    const events = TOPICS.slice(0, 6).map((t) => on.check(t.id, "read", { minutes: 600 }));
    const cal = calibration(build(events));
    expect(cal.ready).toBe(true);
    expect(cal.factor).toBeGreaterThan(1);
  });

  it("clamps a mis-tapped entry", () => {
    const events = TOPICS.slice(0, 6).map((t) => on.check(t.id, "read", { minutes: 100000 }));
    expect(calibration(build(events)).factor).toBe(3);
  });
});

describe("revision decay", () => {
  const day = 86400000;
  const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

  function withRevisions(times: string[]) {
    const events: StudyEvent[] = times.map((at) => ({
      ...on.check(highYield.id, "revised"),
      at,
    }));
    return build(events);
  }

  it("leaves unrevised topics out of the cycle", () => {
    const d = build([on.check(highYield.id, "read")]);
    expect(revisionState(d, highYield.id).inCycle).toBe(false);
    expect(dueForRevision(d)).toHaveLength(0);
  });

  it("is not due inside the first interval", () => {
    const d = withRevisions([ago(3)]);
    expect(revisionState(d, highYield.id).overdueDays).toBe(0);
    expect(dueForRevision(d)).toHaveLength(0);
  });

  it("falls due after seven days", () => {
    const d = withRevisions([ago(10)]);
    expect(revisionState(d, highYield.id).overdueDays).toBe(3);
    expect(dueForRevision(d)).toHaveLength(1);
  });

  it("widens the interval with each revision", () => {
    expect(intervalFor(1)).toBe(7);
    expect(intervalFor(2)).toBe(21);
    expect(intervalFor(9)).toBe(90);

    const twice = withRevisions([ago(40), ago(10)]);
    expect(revisionState(twice, highYield.id).count).toBe(2);
    expect(revisionState(twice, highYield.id).overdueDays).toBe(0);
  });

  it("reports freshness only once something is in the cycle", () => {
    expect(freshness(build([])).percent).toBeNull();
    expect(freshness(withRevisions([ago(2)])).percent).toBe(100);
    expect(freshness(withRevisions([ago(30)])).percent).toBe(0);
  });

  it("never lets missed revision reduce coverage", () => {
    const stale = withRevisions([ago(60)]);
    const fresh = withRevisions([ago(1)]);
    expect(progress(stale).percent).toBe(progress(fresh).percent);
  });
});

describe("revision reaches the week plan", () => {
  const day = 86400000;
  const ago = (days: number) => new Date(Date.now() - days * day).toISOString();

  /** Put `n` topics into the cycle, each revised once and now well overdue. */
  function overdue(n: number, daysAgo = 30) {
    const events: StudyEvent[] = TOPICS.slice(0, n).map((t) => ({
      ...on.check(t.id, "revised"),
      at: ago(daysAgo),
    }));
    return build(events);
  }

  it("charges a revision pass a fraction of the first pass, never zero", () => {
    const d = overdue(1);
    const t = TOPICS[0];
    expect(revisionHoursFor(d, t)).toBeLessThan(t.estHours);
    expect(revisionHoursFor(d, t)).toBeGreaterThanOrEqual(0.25);
  });

  it("books overdue revision into the coming week", () => {
    const d = overdue(3);
    const week = packWeeks(d, 1)[0]!;
    expect(week.revisions.length).toBe(3);
    expect(week.revisionHours).toBeGreaterThan(0);
    expect(week.totalHours).toBe(
      Math.round((week.hours + week.revisionHours) * 10) / 10,
    );
  });

  it("takes those hours out of new work, not out of thin air", () => {
    const clean = packWeeks(build([]), 1)[0]!;
    const loaded = packWeeks(overdue(6), 1)[0]!;
    expect(loaded.revisionHours).toBeGreaterThan(0);
    expect(loaded.hours).toBeLessThan(clean.hours);
    expect(loaded.totalHours).toBeLessThanOrEqual(WEEKLY_HOURS + 6);
  });

  it("caps revision at half a week and carries the rest forward", () => {
    const d = overdue(40);
    const weeks = packWeeks(d, 3);
    const cap = WEEKLY_HOURS * REVISION_WEEK_SHARE;
    for (const w of weeks) {
      // A single item may exceed the cap on its own; two must not.
      if (w.revisions.length > 1) expect(w.revisionHours).toBeLessThanOrEqual(cap);
    }
    expect(weeks[1]!.revisions.length).toBeGreaterThan(0);
    const ids = weeks.flatMap((w) => w.revisions.map((r) => r.topic.id));
    expect(new Set(ids).size).toBe(ids.length); // never scheduled twice
  });

  it("schedules a topic that falls due later in the horizon, not just today's backlog", () => {
    // Revised twice, last one yesterday: interval widens to 21 days, so it is
    // not due now and not due next week — it comes due in week index 2.
    const d = build(
      TOPICS.slice(0, 2).flatMap((t) => [
        { ...on.check(t.id, "revised"), at: ago(30) },
        { ...on.check(t.id, "revised"), at: ago(1) },
      ]),
    );
    expect(revisionQueue(d)).toHaveLength(0); // nothing overdue today
    const weeks = packWeeks(d, 4);
    expect(weeks[0]!.revisions).toHaveLength(0);
    expect(weeks[1]!.revisions).toHaveLength(0);
    expect(weeks[2]!.revisions.length).toBe(2);
  });

  it("reports the overdue backlog as hours", () => {
    expect(revisionLoad(build([]))).toBe(0);
    expect(revisionLoad(overdue(4))).toBeGreaterThan(0);
  });

  it("still leaves coverage untouched", () => {
    expect(progress(overdue(5)).percent).toBe(progress(overdue(5, 1)).percent);
  });
});

describe("answers feed back into the plan", () => {
  /** Tick every check a topic's planned depth calls for. */
  function atDepth(topic: (typeof TOPICS)[number], extra: StudyEvent[] = []) {
    const events: StudyEvent[] = [];
    let cumulative = 0;
    for (const c of CHECKS) {
      cumulative += c.weight;
      if (cumulative > depthFor(build([]), topic) + 0.001) break;
      events.push(on.check(topic.id, c.id));
    }
    return build([...events, ...extra]);
  }

  it("says nothing about a topic with no answer", () => {
    expect(answerVerdict(build([]), highYield.id)).toBe("none");
  });

  it("reworks below half marks, flags to 65%, leaves the rest alone", () => {
    expect(answerVerdict(build([on.attempt(highYield.id, 19, 40, 35)]), highYield.id)).toBe("rework");
    expect(answerVerdict(build([on.attempt(highYield.id, 20, 40, 35)]), highYield.id)).toBe("shaky");
    expect(answerVerdict(build([on.attempt(highYield.id, 25, 40, 35)]), highYield.id)).toBe("shaky");
    expect(answerVerdict(build([on.attempt(highYield.id, 26, 40, 35)]), highYield.id)).toBe("solid");
  });

  it("judges on the most recent answer, not the first", () => {
    const d = build([
      on.attempt(highYield.id, 12, 40, 35),
      on.attempt(highYield.id, 32, 40, 35),
    ]);
    expect(answerVerdict(d, highYield.id)).toBe("solid");
    expect(needsRework(d, highYield.id)).toBe(false);
  });

  it("puts a finished topic back in the queue when its answer was weak — after a week", () => {
    const done = atDepth(highYield);
    expect(queue(done).some((t) => t.id === highYield.id)).toBe(false);

    // The verdict is immediate. The consequence waits, so that writing an
    // answer and finding out it was poor does not immediately enlarge the
    // list — which is a punishment for doing the hardest thing the app asks.
    const today = atDepth(highYield, [on.attempt(highYield.id, 15, 40, 40)]);
    expect(answerVerdict(today, highYield.id)).toBe("rework");
    expect(needsRework(today, highYield.id)).toBe(false);
    expect(queue(today).some((t) => t.id === highYield.id)).toBe(false);
    expect(reworkDueOn(today, highYield.id)).not.toBe(null);

    const later = new Date();
    later.setDate(later.getDate() - (REWORK_COOLDOWN_DAYS + 1));
    const cooled = atDepth(highYield, [
      { ...on.attempt(highYield.id, 15, 40, 40), at: later.toISOString() },
    ]);
    expect(needsRework(cooled, highYield.id)).toBe(true);
    expect(queue(cooled).some((t) => t.id === highYield.id)).toBe(true);
  });

  it("leaves a finished topic alone when the answer was good", () => {
    const strong = atDepth(highYield, [on.attempt(highYield.id, 34, 40, 33)]);
    expect(queue(strong).some((t) => t.id === highYield.id)).toBe(false);
  });

  it("averages each criterion only over the answers that were scored", () => {
    const d = build([
      on.attempt(highYield.id, 30, 40, 35, {
        rubricOutOf: 8,
        scores: { structure: 8, content: 6, thinkers: 4, examples: 7, demand: 5 },
      }),
      on.attempt(highYield.id, 20, 40, 35),
    ]);
    const byKey = Object.fromEntries(rubricAverages(d).map((r) => [r.key, r]));
    expect(byKey.thinkers!.average).toBe(4);
    expect(byKey.thinkers!.scored).toBe(1);
  });

  it("counts an answer as evidence the material was read", () => {
    // No checks ticked at all — just one answer written on the topic.
    const d = build([on.attempt(highYield.id, 22, 40, 35)]);
    expect(isChecked(d, highYield.id, "read")).toBe(true);
    expect(isChecked(d, highYield.id, "pyq")).toBe(true);
    expect(isImplied(d, highYield.id, "read")).toBe(true);
    // read 0.4 + pyq 0.2. Notes and revision are not implied by writing once.
    expect(completionOf(d, highYield.id)).toBeCloseTo(0.6, 5);
    expect(isChecked(d, highYield.id, "notes")).toBe(false);
    expect(isChecked(d, highYield.id, "revised")).toBe(false);
    expect(isComplete(d, highYield.id)).toBe(false);
  });

  it("leaves a real tick alone rather than replacing it with an implied one", () => {
    // The tick carries a date the revision intervals count from, and it is
    // older than the attempt. Overwriting it would move a revision due date.
    const d = build([
      on.check(highYield.id, "read", { prior: true }),
      on.attempt(highYield.id, 22, 40, 35),
    ]);
    expect(isImplied(d, highYield.id, "read")).toBe(false);
    expect(isPrior(d, highYield.id, "read")).toBe(true);
    expect(isImplied(d, highYield.id, "pyq")).toBe(true);
  });

  it("reads the attempts on a topic in the order they were written", () => {
    const d = build([
      on.attempt(highYield.id, 12, 40, 35),
      on.attempt(highYield.id, 19, 40, 35),
      on.attempt(highYield.id, 24, 40, 35),
    ]);
    const t = attemptTrend(d, highYield.id)!;
    expect(t.count).toBe(3);
    expect(t.marks).toEqual([12, 19, 24]);
    expect(t.change).toBe(12);
    expect(t.best).toBe(24);
    // A topic written once has no trend to report.
    expect(attemptTrends(build([on.attempt(highYield.id, 12, 40, 35)]))).toEqual([]);
  });

  it("rescales attempts marked before the rubric moved to eights", () => {
    // No rubricOutOf means it was marked out of ten. 5/10 and 4/8 are the same
    // answer; averaged raw they would read as 4.5, which is a trend in the
    // marking scheme rather than in the candidate.
    const d = build([
      on.attempt(highYield.id, 20, 40, 35, {
        scores: { structure: 5, content: 5, thinkers: 5, examples: 5, demand: 5 },
      }),
      on.attempt(highYield.id, 20, 40, 35, {
        rubricOutOf: 8,
        scores: { structure: 4, content: 4, thinkers: 4, examples: 4, demand: 4 },
      }),
    ]);
    const byKey = Object.fromEntries(rubricAverages(d).map((r) => [r.key, r]));
    expect(byKey.thinkers!.average).toBe(4);
    expect(byKey.thinkers!.scored).toBe(2);
  });

  it("measures how far the self-mark misses, and ignores unscored attempts", () => {
    expect(selfMarkGap(build([])).averageGap).toBeNull();
    const d = build([
      on.attempt(highYield.id, 24, 40, 35, {
        selfMark: 32,
        scores: { structure: 6, content: 6, thinkers: 6, examples: 6, demand: 6 },
      }),
      on.attempt(highYield.id, 20, 40, 35, { selfMark: 30 }),
    ]);
    expect(selfMarkGap(d).n).toBe(1);
    expect(selfMarkGap(d).averageGap).toBe(8);
  });
});

describe("the question corpus", () => {
  it("holds whole papers, five of eight in each", () => {
    // Derived rather than a magic number, so adding a year is a data change
    // and not a test edit. Each paper is five Group A and three Group B.
    const papers = new Set(PYQS.map((q) => `${q.year}-${q.paper}`));
    expect(PYQS).toHaveLength(papers.size * 8);
    expect(PYQS.filter((q) => q.group === "A")).toHaveLength(papers.size * 5);
    expect(PYQS.filter((q) => q.group === "B")).toHaveLength(papers.size * 3);

    // Every paper is complete: no year half-transcribed and quietly counted.
    for (const key of papers) {
      const [year, paper] = key.split("-").map(Number);
      const inPaper = PYQS.filter((q) => q.year === year && q.paper === paper);
      expect(inPaper, key).toHaveLength(8);
      expect(new Set(inPaper.map((q) => q.number)).size, key).toBe(8);
    }
  });

  it("declares every year it actually holds", () => {
    const inCorpus = [...new Set(PYQS.map((q) => q.year))].sort();
    expect([...PYQ_YEARS].sort()).toEqual(inCorpus);
  });

  it("never points at a topic that does not exist", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    for (const q of PYQS) {
      for (const id of q.topicIds) {
        expect(ids.has(id), `${q.year} P${q.paper} Q${q.number} -> ${id}`).toBe(true);
      }
    }
  });

  it("explains any question it could not place", () => {
    for (const q of PYQS.filter((x) => x.topicIds.length === 0)) {
      expect(q.note, `${q.year} P${q.paper} Q${q.number}`).toBeTruthy();
    }
  });

  it("finds the questions asked on a topic", () => {
    const busiest = TOPICS.reduce((a, b) => (b.pyq > a.pyq ? b : a));
    expect(questionsForTopic(busiest.id).length).toBeGreaterThan(0);
  });
});

describe("blind spots", () => {
  it("counts what each unit asked in each group", () => {
    const rows = unitExposure(build([]));
    const totalA = rows.reduce((s, r) => s + r.askedA, 0);
    const totalB = rows.reduce((s, r) => s + r.askedB, 0);
    // A question spanning two units counts for both, so these meet or exceed
    // the paper counts rather than matching them exactly.
    expect(totalA).toBeGreaterThanOrEqual(50);
    expect(totalB).toBeGreaterThanOrEqual(30);
  });

  it("flags every Group B unit before any answer is written", () => {
    const spots = blindSpots(build([]));
    expect(spots.length).toBeGreaterThan(0);
    expect(spots.every((s) => s.askedB > 0)).toBe(true);
    // Sorted by exposure, worst first.
    for (let i = 1; i < spots.length; i++) {
      expect(spots[i - 1]!.askedB).toBeGreaterThanOrEqual(spots[i]!.askedB);
    }
    expect(groupBAtRisk(build([]))).toBeGreaterThan(0);
  });

  it("clears a unit once an answer has been written from it", () => {
    const before = blindSpots(build([]));
    const worst = before[0]!;
    const topic = TOPICS.find((t) => t.unit === worst.unit)!;
    const after = blindSpots(build([on.attempt(topic.id, 28, 40, 35)]));

    expect(after.some((s) => s.unit === worst.unit)).toBe(false);
    expect(groupBAtRisk(build([on.attempt(topic.id, 28, 40, 35)]))).toBeLessThan(
      groupBAtRisk(build([])),
    );
  });

  it("counts a weak answer as written — exposure is about practice, not marks", () => {
    const worst = blindSpots(build([]))[0]!;
    const topic = TOPICS.find((t) => t.unit === worst.unit)!;
    const d = build([on.attempt(topic.id, 8, 40, 35)]);
    expect(blindSpots(d).some((s) => s.unit === worst.unit)).toBe(false);
  });
});

describe("attempts", () => {
  it("averages marks across attempts", () => {
    const d = build([
      on.attempt(highYield.id, 20, 40, 25),
      on.attempt(highYield.id, 30, 40, 25),
    ]);
    expect(attemptStats(d).averagePercent).toBe(62.5);
    expect(attemptStats(d).total).toBe(2);
  });
});

describe("dates", () => {
  it("never goes negative once the window has passed", () => {
    expect(daysUntil("2020-01-01")).toBe(0);
  });
});

describe("the preparation window", () => {
  it("adds whole calendar months", () => {
    expect(addMonths("2026-08-29", 5)).toBe("2027-01-29");
    expect(addMonths("2026-11-15", 4)).toBe("2027-03-15");
  });

  it("clamps to the last day when the target month is shorter", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"); // not 3 March
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29"); // leap year
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
  });

  it("ends the stated number of months after the start", () => {
    const w = (months: 4 | 5 | 6) =>
      windowEnd({ startDate: "2026-08-29", windowMonths: months, weeklyHours: 10, targetCoverage: 0.8 });
    expect(w(4)).toBe("2026-12-29");
    expect(w(5)).toBe("2027-01-29");
    expect(w(6)).toBe("2027-02-28");
  });

  it("still honours an exam date saved before windows existed", () => {
    expect(windowEnd({ examDate: "2027-01-01", weeklyHours: 10, targetCoverage: 0.8 })).toBe(
      "2027-01-01",
    );
  });

  it("has no end, and no days left, when nothing is set", () => {
    expect(windowEnd(null)).toBe(null);
    expect(daysLeft(null)).toBe(null);
    expect(windowEnd({ weeklyHours: 10, targetCoverage: 0.8 })).toBe(null);
  });

  it("counts the full length on day one and zero after the end", () => {
    const s = { startDate: "2026-08-29", windowMonths: 5 as const, weeklyHours: 10, targetCoverage: 0.8 };
    expect(daysLeft(s, new Date("2026-08-29T09:00:00"))).toBe(153);
    expect(daysLeft(s, new Date("2026-08-30T00:01:00"))).toBe(152);
    expect(daysLeft(s, new Date("2027-03-15T12:00:00"))).toBe(0);
  });

  it("names the window in plain words", () => {
    expect(windowLabel({ startDate: "2026-08-29", windowMonths: 5, weeklyHours: 10, targetCoverage: 0.8 })).toBe(
      "5-month plan",
    );
    expect(windowLabel(null)).toBe("plan");
  });
});

describe("notes", () => {
  it("keeps the latest note on a topic", () => {
    const d = build([
      on.note(highYield.id, "first thoughts"),
      on.note(highYield.id, "better thoughts"),
    ]);
    expect(d.notes[highYield.id]?.text).toBe("better thoughts");
  });

  it("trims, and treats an emptied note as a deletion", () => {
    const written = build([on.note(highYield.id, "  spaced out  ")]);
    expect(written.notes[highYield.id]?.text).toBe("spaced out");

    const cleared = build([on.note(highYield.id, "something"), on.note(highYield.id, "   ")]);
    expect(cleared.notes[highYield.id]).toBeUndefined();
  });

  it("keeps notes on different topics apart", () => {
    const d = build([on.note(highYield.id, "A"), on.note(coldTopic.id, "B")]);
    expect(d.notes[highYield.id]?.text).toBe("A");
    expect(d.notes[coldTopic.id]?.text).toBe("B");
  });

  it("does not disturb anything the planner counts", () => {
    const withNote = build([on.check(highYield.id, "read"), on.note(highYield.id, "x")]);
    const without = build([on.check(highYield.id, "read")]);
    expect(progress(withNote).percent).toBe(progress(without).percent);
  });
});

describe("the beginner on-ramp", () => {
  const beginner = (events: StudyEvent[] = []) =>
    project([on.settings({ ...SETTINGS, level: "beginner" }), ...events]);

  it("opens on stratification rather than on the highest-yield topic", () => {
    const d = beginner();
    const first = queue(d)[0]!;
    expect(first.unit).toBe("Stratification");
    // And that is genuinely a departure: left to yield, something else leads.
    const byYield = TOPICS.filter((t) => depthFor(d, t) > 0).sort(
      (a, b) => bandOf(b) - bandOf(a) || a.estHours - b.estHours,
    )[0]!;
    expect(byYield.unit).not.toBe("Stratification");
  });

  it("runs stratification, then the thinkers, then power", () => {
    const d = beginner();
    const units = queue(d)
      .slice(0, 20)
      .map((t) => t.unit);
    const at = (u: string) => units.indexOf(u);
    expect(at("Stratification")).toBeGreaterThanOrEqual(0);
    expect(at("Stratification")).toBeLessThan(at("Pathfinders"));
    expect(at("Pathfinders")).toBeLessThan(at("Politics and Society"));
  });

  it("names the unit it is starting on and says why", () => {
    const next = nextOnRamp(beginner());
    expect(next?.unit).toBe("Stratification");
    expect(next?.why.length).toBeGreaterThan(30);
  });

  it("does not walk a graduate in through the front door", () => {
    const pro = project([on.settings({ ...SETTINGS, level: "pro" })]);
    expect(onRampActive(pro)).toBe(false);
    expect(nextOnRamp(pro)).toBe(null);
  });

  it("still lets a candidate override it by choosing where to start", () => {
    const d = beginner([on.settings({ startUnit: "Research Methods" })]);
    expect(queue(d)[0]!.unit).toBe("Research Methods");
  });

  it("expires on its own once the sequence is finished", () => {
    const rampTopics = TOPICS.filter((t) =>
      ON_RAMP.some((r) => r.paper === t.paper && r.unit === t.unit),
    );
    const done = rampTopics.flatMap((t) =>
      CHECKS.map((c) => on.check(t.id, c.id, { prior: true })),
    );
    const d = beginner(done);
    expect(onRampActive(d)).toBe(false);
    // And ordering hands back to yield without anything else changing.
    expect(queue(d)[0]!.unit).not.toBe("Stratification");
  });

  it("reorders the queue without dropping or adding a single topic", () => {
    // Comparing against another level would not test this: the level also
    // moves the depth table, so the two queues would legitimately differ.
    // What must hold is that the on-ramp only sorts — every topic that
    // qualifies is still present.
    const d = beginner();
    const eligible = TOPICS.filter((t) => depthFor(d, t) > 0 && !isAtDepth(d, t));
    expect(new Set(queue(d).map((t) => t.id))).toEqual(new Set(eligible.map((t) => t.id)));
  });
});

describe("choosing a past question to practise", () => {
  const asked = TOPICS.find((t) => questionsForTopic(t.id).length > 0)!;

  it("offers the real questions asked on a topic, newest first", () => {
    const qs = questionsForTopic(asked.id);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) expect(q.topicIds).toContain(asked.id);
    const years = qs.map((q) => q.year);
    expect(years).toEqual([...years].sort((a, b) => b - a));
  });

  it("matches the per-topic count the syllabus advertises", () => {
    // If these ever disagree, one of the two is lying to the candidate.
    for (const t of TOPICS) {
      expect(questionsForTopic(t.id).length, t.id).toBe(t.pyq);
    }
  });

  it("falls back to the rest of the unit for a topic never asked directly", () => {
    const never = TOPICS.find(
      (t) => t.pyq === 0 && questionsForUnit(t.paper, t.unit, t.id).length > 0,
    )!;
    expect(never).toBeDefined();
    const nearby = questionsForUnit(never.paper, never.unit, never.id);
    // Real questions from the same unit, and none of them already on the topic.
    for (const q of nearby) expect(q.topicIds).not.toContain(never.id);
  });

  it("does not offer a unit question twice", () => {
    const t = TOPICS[0]!;
    const nearby = questionsForUnit(t.paper, t.unit, t.id);
    const keys = nearby.map((q) => `${q.year}-${q.paper}-${q.number}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("remembers that a question has been answered before, and what it scored", () => {
    const q = questionsForTopic(asked.id)[0]!;
    const d = build([
      on.attempt(asked.id, 22, 40, 35, { questionText: q.text, group: q.group }),
    ]);
    const before = attemptsOnQuestion(d, q.text);
    expect(before).toHaveLength(1);
    expect(before[0]!.marks).toBe(22);
    expect(attemptsOnQuestion(d, "a question never written")).toHaveLength(0);
  });

  it("records which group an answer came from, so Group B can be watched", () => {
    const q = questionsForTopic(asked.id)[0]!;
    const d = build([on.attempt(asked.id, 20, 40, 35, { questionText: q.text, group: "B" })]);
    expect(d.attempts[0]!.group).toBe("B");
  });
});

describe("today's list keeps what you finished", () => {
  const topicOf = (d: Derived) => todaysTasks(d)[0]!;

  it("does not remove a task the moment it is ticked", () => {
    const before = build([]);
    const first = topicOf(before);
    const after = build([on.check(first.topic.id, first.check)]);

    const board = todaysBoard(after);
    expect(board.tasks.some((t) => t.id === first.id)).toBe(true);
    expect(board.tasks.find((t) => t.id === first.id)?.done).toBe(true);
    expect(board.done).toBe(1);
  });

  it("counts what is done against what was listed", () => {
    const before = build([]);
    const first = topicOf(before);
    const after = build([on.check(first.topic.id, first.check)]);
    const board = todaysBoard(after);
    expect(board.total).toBeGreaterThanOrEqual(board.done);
    expect(board.done).toBeLessThanOrEqual(board.tasks.length);
  });

  it("puts finished work first, and leaves the rest to do", () => {
    const before = build([]);
    const first = topicOf(before);
    const board = todaysBoard(build([on.check(first.topic.id, first.check)]));
    expect(board.tasks[0]!.done).toBe(true);
    expect(board.tasks.slice(board.done).every((t) => !t.done)).toBe(true);
  });

  it("does not credit you for knowledge you said you already had", () => {
    // Marking prior knowledge on setup day must not fill the list with
    // congratulations for work nobody did.
    const first = topicOf(build([]));
    const d = build([on.check(first.topic.id, first.check, { prior: true })]);
    expect(completedToday(d)).toHaveLength(0);
    expect(todaysBoard(d).done).toBe(0);
  });

  it("forgets yesterday's ticks, so each day starts clean", () => {
    const first = topicOf(build([]));
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const stale = {
      ...on.check(first.topic.id, first.check),
      at: yesterday.toISOString(),
    };
    expect(completedToday(build([stale]))).toHaveLength(0);
  });

  it("keeps the minutes honest: done plus remaining is what was planned", () => {
    const first = topicOf(build([]));
    const board = todaysBoard(build([on.check(first.topic.id, first.check)]));
    const sum = board.tasks.reduce((s, t) => s + t.minutes, 0);
    expect(board.minutesPlanned).toBe(sum);
    expect(board.minutesDone).toBeLessThanOrEqual(board.minutesPlanned);
  });
});

describe("a weak answer waits before it reopens the topic", () => {
  const asked = TOPICS.find((t) => t.pyq > 0)!;
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };
  const attempt = (marks: number, at: string, extra = {}) => ({
    ...on.attempt(asked.id, marks, 40, 35, extra),
    at,
  });

  it("says the answer was weak straight away", () => {
    const d = build([attempt(8, daysAgo(0))]);
    expect(answerVerdict(d, asked.id)).toBe("rework");
  });

  it("but does not put it back in the queue the same day", () => {
    const d = build([attempt(8, daysAgo(0))]);
    expect(needsRework(d, asked.id)).toBe(false);
    expect(queue(d).some((t) => t.id === asked.id && !isAtDepth(d, t))).toBe(true);
  });

  it("reopens it once the cooling-off period has passed", () => {
    const d = build([attempt(8, daysAgo(REWORK_COOLDOWN_DAYS + 1))]);
    expect(needsRework(d, asked.id)).toBe(true);
  });

  it("names the day it is coming back, rather than hiding it", () => {
    const d = build([attempt(8, daysAgo(0))]);
    const due = reworkDueOn(d, asked.id)!;
    expect(due).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(reworkWaiting(d).some((r) => r.topic.id === asked.id)).toBe(true);
  });

  it("stops listing it as waiting once it is due", () => {
    const d = build([attempt(8, daysAgo(REWORK_COOLDOWN_DAYS + 1))]);
    expect(reworkWaiting(d).some((r) => r.topic.id === asked.id)).toBe(false);
  });

  it("refuses to act on a page the model could not read", () => {
    // Two out of forty from an unreadable photograph is a judgement about a
    // camera, not about sociology. It must not reopen a topic.
    const d = build([attempt(2, daysAgo(0), { legible: false })]);
    expect(answerVerdict(d, asked.id)).toBe("unread");
    expect(needsRework(d, asked.id)).toBe(false);
    expect(reworkDueOn(d, asked.id)).toBe(null);
  });

  it("still acts on a low score the model could read", () => {
    const d = build([attempt(2, daysAgo(REWORK_COOLDOWN_DAYS + 1), { legible: true })]);
    expect(answerVerdict(d, asked.id)).toBe("rework");
    expect(needsRework(d, asked.id)).toBe(true);
  });

  it("leaves a good answer alone", () => {
    const d = build([attempt(30, daysAgo(0))]);
    expect(answerVerdict(d, asked.id)).toBe("solid");
    expect(reworkDueOn(d, asked.id)).toBe(null);
  });
});
