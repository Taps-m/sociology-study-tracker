import { describe, expect, it } from "vitest";
import { TOPICS } from "../data/syllabus";
import { on, project } from "./events";
import type { Settings, StudyEvent } from "./events";
import { confirmedWeakness, recurringWeakness } from "./drill";

const settings = on.settings({
  startDate: "2026-09-01",
  windowMonths: 4,
  weeklyHours: 10,
  targetCoverage: 0.8,
} satisfies Settings);

const topic = TOPICS[0]!;

function build(events: StudyEvent[]) {
  return project([settings, ...events]);
}

/** An answer whose lowest criterion is `low`, everything else comfortable. */
function answer(low: "structure" | "content" | "thinkers" | "examples" | "demand") {
  const scores = { structure: 6, content: 6, thinkers: 6, examples: 6, demand: 6 };
  scores[low] = 2;
  return on.attempt(topic.id, 26, 40, 35, { rubricOutOf: 8, scores });
}

/*
 * The gate between "you had a bad answer" and "this is what you are like".
 *
 * Everything downstream of confirmedWeakness spends the candidate's time: it
 * points the drill, and it briefs the model that writes the skeleton. Getting
 * it wrong in the permissive direction sends someone to spend an hour fixing a
 * hole that one question happened to expose.
 */
describe("confirmedWeakness", () => {
  it("says nothing at all on a single answer", () => {
    expect(recurringWeakness(build([answer("thinkers")]))).toBeNull();
    expect(confirmedWeakness(build([answer("thinkers")]))).toBeNull();
  });

  it("does not promote two answers to a diagnosis", () => {
    const d = build([answer("thinkers"), answer("thinkers")]);
    // recurringWeakness will report it — it is the loose reading, used where
    // guessing wrong is cheap.
    expect(recurringWeakness(d)?.dimension).toBe("thinkers");
    // The strict one waits for a third.
    expect(confirmedWeakness(d)).toBeNull();
  });

  it("confirms a criterion that is lowest in a majority of three or more", () => {
    const d = build([answer("thinkers"), answer("thinkers"), answer("examples")]);
    const w = confirmedWeakness(d)!;
    expect(w.dimension).toBe("thinkers");
    expect(w.times).toBe(2);
    expect(w.of).toBe(3);
  });

  it("refuses a plurality that is not a majority", () => {
    // Two of five is the most common and still says nothing: three different
    // criteria have been lowest, which is what a candidate who is simply
    // inconsistent looks like.
    const d = build([
      answer("thinkers"),
      answer("thinkers"),
      answer("examples"),
      answer("structure"),
      answer("demand"),
    ]);
    expect(recurringWeakness(d)?.dimension).toBe("thinkers");
    expect(confirmedWeakness(d)).toBeNull();
  });

  it("forgets a weakness that has stopped happening", () => {
    // Six-answer window. Thinkers was the problem and has not been for a while;
    // drilling it now would be the app failing to notice someone got better.
    const d = build([
      answer("thinkers"),
      answer("thinkers"),
      answer("thinkers"),
      answer("examples"),
      answer("examples"),
      answer("examples"),
      answer("examples"),
    ]);
    expect(confirmedWeakness(d)?.dimension).toBe("examples");
  });

  it("ignores answers the marker could not read", () => {
    const illegible = { ...answer("thinkers"), legible: false } as StudyEvent;
    const d = build([illegible, illegible, illegible, answer("examples")]);
    // Only one legible attempt is left, which is not enough for either reading.
    expect(confirmedWeakness(d)).toBeNull();
  });
});
