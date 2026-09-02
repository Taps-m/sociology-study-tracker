import type { Derived } from "./events";
import { TOPICS, type Topic } from "../data/syllabus";
import { PYQS, type PastQuestion } from "../data/pyq";

/**
 * Fifteen minutes that ends in a tick.
 *
 * The two things that make someone stop are that nothing is finishable in one
 * sitting, and that a bad score teaches nothing. They are the same problem. The
 * units of work in this app are "read a sixty-seven page chapter" and "write a
 * forty-mark answer, photograph it, wait" — and on a Tuesday with half an hour
 * neither can be started, so the app gets closed.
 *
 * But the atomic unit of an answer is not an answer, it is a block: a two-to-
 * four word keyword, a dash, three lines of mechanism, one hard specific. That
 * is what the topper scripts are made of and it takes five minutes to write.
 *
 * And a single score is noise. Three scores with the same hole in them is a
 * diagnosis — so the drill is not a random exercise, it is pointed at whatever
 * the record says keeps going wrong. Nothing else can do that, because nothing
 * else has the record.
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

export interface Drill {
  topic: Topic;
  question: PastQuestion;
  dimension: Dimension;
  weakness: Weakness | null;
}

/**
 * Tonight's drill: a real past question on a topic already touched, aimed at
 * whatever keeps going wrong.
 *
 * Deliberately drawn from topics already started rather than from the queue.
 * A drill is not new learning, it is the second half of learning — and being
 * asked to write a block on something never read is the kind of thing that
 * makes someone close the app rather than open it.
 */
export function tonightsDrill(d: Derived, seed = new Date().toISOString().slice(0, 10)): Drill | null {
  const weakness = recurringWeakness(d);
  const dimension = weakness?.dimension ?? "content";

  const started = new Set(
    TOPICS.filter((t) => Object.keys(d.checks[t.id] ?? {}).length > 0).map((t) => t.id),
  );
  const pool = PYQS.filter((q) => q.topicIds.some((id) => started.has(id)));
  const usable = pool.length > 0 ? pool : PYQS.filter((q) => q.topicIds.length > 0);
  if (usable.length === 0) return null;

  // Stable for the day, so the drill does not change under you on a re-render,
  // and different tomorrow without any state to store.
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const question = usable[h % usable.length]!;
  const topic = TOPICS.find((t) => question.topicIds.includes(t.id)) ?? TOPICS[0]!;

  return { topic, question, dimension, weakness };
}

/**
 * Whether tonight's is done. Kept out of the event log on purpose for now:
 * the log is the durable record of study, and a five-minute drill has not
 * earned a place in it until the shape has settled.
 */
const DONE_KEY = "wbcs.drillDone.v1";

export function drillDoneToday(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === new Date().toISOString().slice(0, 10);
  } catch {
    return false;
  }
}

export function markDrillDone() {
  try {
    localStorage.setItem(DONE_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    // Blocked storage. The tick is cosmetic; nothing else depends on it.
  }
}
