import { describe, expect, it } from "vitest";
import { TOPICS } from "../data/syllabus";
import { on, project } from "./events";
import type { Settings, StudyEvent } from "./events";
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
  rubricAverages,
  selfMarkGap,
  CHECKS,
  blindSpots,
  groupBAtRisk,
  questionsForTopic,
  questionsForUnit,
  attemptsOnQuestion,
  unitExposure,
  windowEnd,
  windowLabel,
  LEVELS,
  skippedTopics,
  ON_RAMP,
  onRampActive,
  nextOnRamp,
  suggestedMonths,
  DEPTHS,
} from "./planner";
import { PYQS } from "../data/pyq";

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

  it("promotes only a handful of never-asked topics", () => {
    const promoted = TOPICS.filter((t) => t.pyq === 0 && bandOf(t) > 1);
    expect(promoted.length).toBeLessThan(5);
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

  it("puts a finished topic back in the queue when its answer was weak", () => {
    const done = atDepth(highYield);
    expect(queue(done).some((t) => t.id === highYield.id)).toBe(false);

    const weak = atDepth(highYield, [on.attempt(highYield.id, 15, 40, 40)]);
    expect(needsRework(weak, highYield.id)).toBe(true);
    expect(queue(weak).some((t) => t.id === highYield.id)).toBe(true);
  });

  it("leaves a finished topic alone when the answer was good", () => {
    const strong = atDepth(highYield, [on.attempt(highYield.id, 34, 40, 33)]);
    expect(queue(strong).some((t) => t.id === highYield.id)).toBe(false);
  });

  it("averages each criterion only over the answers that were scored", () => {
    const d = build([
      on.attempt(highYield.id, 30, 40, 35, {
        scores: { structure: 8, content: 6, thinkers: 4, examples: 7, demand: 5 },
      }),
      on.attempt(highYield.id, 20, 40, 35),
    ]);
    const byKey = Object.fromEntries(rubricAverages(d).map((r) => [r.key, r]));
    expect(byKey.thinkers!.average).toBe(4);
    expect(byKey.thinkers!.scored).toBe(1);
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
  it("holds twelve complete papers", () => {
    expect(PYQS).toHaveLength(96);
    expect(PYQS.filter((q) => q.group === "A")).toHaveLength(60);
    expect(PYQS.filter((q) => q.group === "B")).toHaveLength(36);
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
