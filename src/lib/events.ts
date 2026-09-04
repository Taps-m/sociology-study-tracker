/**
 * The event log is the only thing that is ever stored.
 * Every number in the app is folded from these events at render time.
 * Nothing derived is persisted, so a fold can be changed without a migration.
 */

export type SubjectId = "sociology";
export const DEFAULT_SUBJECT: SubjectId = "sociology";

export type CheckId = "read" | "notes" | "pyq" | "revised";

/** 4, 5 or 6 months. Shorter does not work; longer stops being a plan. */
export type WindowMonths = 4 | 5 | 6;

/**
 * Where you are starting from. Not a badge — it sets how long the run is
 * suggested to be and how deep the low-yield end of the syllabus starts,
 * and both of those stay editable afterwards.
 */
export type Level = "beginner" | "guided" | "pro";

export interface Settings {
  /** The day this round of preparation began. YYYY-MM-DD. */
  startDate?: string;
  /** How long you are committing to. */
  windowMonths?: WindowMonths;
  /**
   * How much sociology you brought with you. Optional: saves written before
   * this existed are treated as "guided", the middle setting.
   */
  level?: Level;
  /** What to call you on the first screen. Optional: older saves predate it. */
  name?: string;
  /**
   * A unit to work through first. Not everyone starts at the beginning: a
   * returning candidate may be halfway, or want to open on their weakest area.
   * Optional, and it expires on its own — once the unit is at depth its topics
   * leave the queue and normal ordering resumes.
   */
  startUnit?: string;
  /**
   * Legacy. The tracker measured a countdown to a fixed date before it measured
   * a window; saves from that period still carry one, and windowEnd() falls
   * back to it so they keep working.
   */
  examDate?: string;
  weeklyHours: number;
  targetCoverage: number;
}

interface EventBase {
  id: string;
  at: string;
  subject: SubjectId;
}

export type StudyEvent =
  | (EventBase & {
      type: "check";
      topicId: string;
      check: CheckId;
      /** Time spent, if the student told us. */
      minutes?: number;
      /** Knowledge they already had; counts as done, not as work done now. */
      prior?: boolean;
    })
  | (EventBase & { type: "uncheck"; topicId: string; check: CheckId })
  | (EventBase &
      AttemptDetail & {
        type: "attempt";
        topicId: string;
        marks: number;
        outOf: number;
        minutes: number;
      })
  | (EventBase & { type: "settings"; patch: Partial<Settings> })
  /**
   * A note on a topic, in the candidate's own words.
   *
   * Plain text, deliberately. A rich editor would mean a dependency, a
   * serialisation format and a migration the first time it changes; none of
   * that helps anyone remember what Merton meant by a latent function. Empty
   * text deletes the note, so there is no second event type for that.
   */
  | (EventBase & { type: "note"; topicId: string; text: string });

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function base(): EventBase {
  return { id: newId(), at: new Date().toISOString(), subject: DEFAULT_SUBJECT };
}

export const on = {
  check(topicId: string, check: CheckId, opts: { minutes?: number; prior?: boolean } = {}): StudyEvent {
    return { ...base(), type: "check", topicId, check, ...opts };
  },
  uncheck(topicId: string, check: CheckId): StudyEvent {
    return { ...base(), type: "uncheck", topicId, check };
  },
  attempt(
    topicId: string,
    marks: number,
    outOf: number,
    minutes: number,
    detail: AttemptDetail = {},
  ): StudyEvent {
    return { ...base(), type: "attempt", topicId, marks, outOf, minutes, ...detail };
  },
  settings(patch: Partial<Settings>): StudyEvent {
    return { ...base(), type: "settings", patch };
  },
  note(topicId: string, text: string): StudyEvent {
    return { ...base(), type: "note", topicId, text };
  },
};

export interface CheckRecord {
  at: string;
  prior: boolean;
}

export interface TimeRecord {
  at: string;
  topicId: string;
  check: CheckId;
  minutes: number;
}

/**
 * The five criteria. Fixed wording, so scores stay comparable.
 *
 * Marked out of 8 each, because five eights are the forty the paper is marked
 * out of and a rubric that quietly adds up to a different number than the exam
 * is a rubric nobody can read. Attempts recorded before that change carry no
 * rubricOutOf and were marked out of 10; anything averaging across the two
 * normalises first.
 */
export interface RubricScores {
  structure: number;
  content: number;
  thinkers: number;
  examples: number;
  demand: number;
}

export interface AttemptDetail {
  /** What the candidate thought before any score was revealed. Optional. */
  selfMark?: number;
  /** The question answered, where it came from the corpus or was pasted. */
  questionText?: string;
  group?: "A" | "B";
  scores?: RubricScores;
  /** What each criterion was marked out of. Absent on attempts from before the
   * rubric moved to eights; those were tens. */
  rubricOutOf?: number;
  /** The opening of what the model read back, so a misreading is visible. */
  readBack?: string;
  /**
   * False when the page could not be read with confidence.
   *
   * A score built on a misreading is not a score, and it must not be allowed to
   * reopen a topic or drag an average down. Recorded so the verdict can refuse
   * to act on it.
   */
  legible?: boolean;
}

export interface AttemptRecord extends AttemptDetail {
  at: string;
  topicId: string;
  marks: number;
  outOf: number;
  minutes: number;
}

export interface Derived {
  settings: Settings | null;
  /** Latest state of each check on each topic. */
  checks: Record<string, Partial<Record<CheckId, CheckRecord>>>;
  /** Every time a topic was revised, oldest first. Enables decay later. */
  revisions: Record<string, string[]>;
  time: TimeRecord[];
  attempts: AttemptRecord[];
  /** The latest note on each topic. Earlier versions stay in the log. */
  notes: Record<string, NoteRecord>;
}

export interface NoteRecord {
  text: string;
  at: string;
}

export const EMPTY_DERIVED: Derived = {
  settings: null,
  checks: {},
  revisions: {},
  time: [],
  attempts: [],
  notes: {},
};

/** Fold the log into everything the screens need. The only projection. */
export function project(events: StudyEvent[]): Derived {
  const d: Derived = {
    settings: null,
    checks: {},
    revisions: {},
    time: [],
    attempts: [],
    notes: {},
  };

  for (const e of events) {
    switch (e.type) {
      case "settings":
        d.settings = { ...(d.settings ?? ({} as Settings)), ...e.patch };
        break;

      case "check": {
        d.checks[e.topicId] = {
          ...(d.checks[e.topicId] ?? {}),
          [e.check]: { at: e.at, prior: Boolean(e.prior) },
        };
        if (e.check === "revised") {
          d.revisions[e.topicId] = [...(d.revisions[e.topicId] ?? []), e.at];
        }
        if (typeof e.minutes === "number") {
          d.time.push({ at: e.at, topicId: e.topicId, check: e.check, minutes: e.minutes });
        }
        break;
      }

      case "uncheck": {
        const current = { ...(d.checks[e.topicId] ?? {}) };
        delete current[e.check];
        d.checks[e.topicId] = current;
        break;
      }

      case "attempt":
        d.attempts.push({
          at: e.at,
          topicId: e.topicId,
          marks: e.marks,
          outOf: e.outOf,
          minutes: e.minutes,
          selfMark: e.selfMark,
          questionText: e.questionText,
          group: e.group,
          scores: e.scores,
          rubricOutOf: e.rubricOutOf,
          readBack: e.readBack,
          legible: e.legible,
        });
        break;

      case "note": {
        const text = e.text.trim();
        if (text) d.notes[e.topicId] = { text, at: e.at };
        else delete d.notes[e.topicId];
        break;
      }
    }
  }

  return d;
}
