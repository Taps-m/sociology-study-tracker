/**
 * The event log is the only thing that is ever stored.
 * Every number in the app is folded from these events at render time.
 * Nothing derived is persisted, so a fold can be changed without a migration.
 */

export type SubjectId = "sociology";
export const DEFAULT_SUBJECT: SubjectId = "sociology";

export type CheckId = "read" | "notes" | "pyq" | "revised";

export interface Settings {
  examDate: string;
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
  | (EventBase & {
      type: "attempt";
      topicId: string;
      marks: number;
      outOf: number;
      minutes: number;
    })
  | (EventBase & { type: "settings"; patch: Partial<Settings> });

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
  attempt(topicId: string, marks: number, outOf: number, minutes: number): StudyEvent {
    return { ...base(), type: "attempt", topicId, marks, outOf, minutes };
  },
  settings(patch: Partial<Settings>): StudyEvent {
    return { ...base(), type: "settings", patch };
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

export interface AttemptRecord {
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
}

export const EMPTY_DERIVED: Derived = {
  settings: null,
  checks: {},
  revisions: {},
  time: [],
  attempts: [],
};

/** Fold the log into everything the screens need. The only projection. */
export function project(events: StudyEvent[]): Derived {
  const d: Derived = { settings: null, checks: {}, revisions: {}, time: [], attempts: [] };

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
        });
        break;
    }
  }

  return d;
}
