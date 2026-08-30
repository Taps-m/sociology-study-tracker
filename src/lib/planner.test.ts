import { describe, expect, it } from "vitest";
import { TOPICS } from "../data/syllabus";
import { on, project } from "./events";
import type { StudyEvent } from "./events";
import {
  attemptStats,
  bandOf,
  calibration,
  coreProgress,
  daysUntil,
  depthFor,
  dueForRevision,
  freshness,
  intervalFor,
  observedPace,
  progress,
  queue,
  revisionState,
} from "./planner";

const settings = on.settings({
  examDate: "2027-01-01",
  weeklyHours: 10,
  targetCoverage: 0.8,
});

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
  it("never goes negative after the exam", () => {
    expect(daysUntil("2020-01-01")).toBe(0);
  });
});
