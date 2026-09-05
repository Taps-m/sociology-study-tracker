import type { Derived } from "./events";

/**
 * What keeps going wrong, from the record rather than from one bad night.
 *
 * A single score is noise. Three scores with the same hole in them is a
 * diagnosis, and nothing else in the app can make that call because nothing
 * else has the record.
 *
 * This file once also carried a fifteen-minute drill built on that diagnosis —
 * a past question, aimed at the weakest criterion, answered in one block. It
 * was removed. The reason it existed was that nothing else here is finishable
 * on a short evening, and "What did you study today?" now does that job with
 * two words and a tap; and it needed three marked answers before it could aim
 * at anything, so in the state most people are actually in it picked a
 * criterion by default and a question by hashing the date. A drill aimed at
 * nothing is a third answer box on a screen that already has two.
 *
 * What survives is the part that was doing the work: `confirmedWeakness` briefs
 * the model-answer writer, so last time's gap is still this time's brief, and
 * `DRILL` names the criteria for Answer Blueprint.
 */

export type Dimension = "structure" | "content" | "thinkers" | "examples" | "demand";

export const DIMENSIONS: Dimension[] = ["structure", "content", "thinkers", "examples", "demand"];

/** What each dimension is, and the five-minute exercise that drills it. */
export const DRILL: Record<Dimension, { name: string; ask: string; hint: string }> = {
  structure: {
    name: "Structure",
    ask: "Write only the opening of this answer. Two to four lines.",
    hint: "No definition. It should already carry the shape of what would follow.",
  },
  content: {
    name: "Content",
    ask: "Write one block: a two-to-four word keyword, then three lines of mechanism.",
    hint: "The keyword is the point itself, not a heading over the point.",
  },
  thinkers: {
    name: "Thinkers",
    ask: "Name the two thinkers you would use here, and what each one does for this question.",
    hint: "One job each. More thinkers is not a better answer.",
  },
  examples: {
    name: "Specifics",
    ask: "Write one block that names a real Act, figure, case or place.",
    hint: "A specific does more work than a thinker. Vague is worth nothing.",
  },
  demand: {
    name: "The demand",
    ask: "Do not answer it. List what this question obliges you to do.",
    hint: "Command word first, then each separate thing it asks for.",
  },
};

export interface Weakness {
  dimension: Dimension;
  /** How many of the scored attempts had this as their lowest. */
  times: number;
  /** How many attempts were looked at. */
  of: number;
}

/**
 * The hole that keeps reappearing.
 *
 * Only the last handful of attempts count — a weakness fixed three months ago
 * is not a weakness, and drilling it would be the app failing to notice that
 * someone got better.
 */
export function recurringWeakness(d: Derived, window = 6): Weakness | null {
  const scored = d.attempts.filter((a) => a.scores && a.legible !== false).slice(-window);
  if (scored.length < 2) return null;

  const tally: Record<string, number> = {};
  for (const a of scored) {
    const s = a.scores!;
    let worst: Dimension = "structure";
    for (const dim of DIMENSIONS) {
      if ((s[dim] ?? 99) < (s[worst] ?? 99)) worst = dim;
    }
    tally[worst] = (tally[worst] ?? 0) + 1;
  }
  const [dimension, times] = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]!;
  return { dimension: dimension as Dimension, times, of: scored.length };
}

/**
 * The same weakness, but only when it has earned the word.
 *
 * One low criterion is an event: it may be the candidate, or it may be that
 * question, or a marker misreading a page. It becomes a diagnosis when it is
 * the lowest in a clear majority of at least three attempts — and only then is
 * it worth pointing an hour of study, or a model's brief, at.
 *
 * Everything downstream should ask for this rather than recurringWeakness when
 * it is about to make a claim about the candidate rather than about a page.
 */
export function confirmedWeakness(d: Derived, window = 6): Weakness | null {
  const w = recurringWeakness(d, window);
  if (!w) return null;
  return w.of >= 3 && w.times * 2 > w.of ? w : null;
}
