import type { StudyEvent } from "./events";
import { DEFAULT_SUBJECT, newId } from "./events";

/**
 * The only file that knows where data lives.
 * Backed by localStorage today; swap these bodies for IndexedDB or a server
 * later without touching anything else.
 */

const KEY = "sociology-tracker-v2";
const LEGACY_KEY = "sociology-tracker-v1";
const SESSION_KEY = "sociology-tracker-session";

/**
 * Whether the app is open for use, kept deliberately apart from the log.
 *
 * There are no accounts here — everything is on this device. Logging out closes
 * the screen and nothing else: it writes no event, deletes no work, and the
 * next sign-in folds the same log it always did. Erasing is a different button
 * that says what it does.
 */
export function sessionOpen(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) !== "closed";
  } catch {
    return true;
  }
}

const AVATAR_KEY = "sociology-tracker-avatar";
const SYNC_PHRASE_KEY = "sociology-tracker-sync-phrase";

/**
 * The sync pass-phrase, kept on this device so syncing can run without asking
 * for it on every visit.
 *
 * It sits beside the log rather than protecting it: anyone who can read this
 * key can already read the study log in the same browser. What the phrase
 * protects is the copy held on the server, and keeping it here does not weaken
 * that. It is deliberately not in the event log — it is a credential, it has no
 * history worth keeping, and it must never travel in an export.
 */
export function loadSyncPhrase(): string | null {
  try {
    return localStorage.getItem(SYNC_PHRASE_KEY);
  } catch {
    return null;
  }
}

export function saveSyncPhrase(phrase: string | null): void {
  try {
    if (phrase) localStorage.setItem(SYNC_PHRASE_KEY, phrase);
    else localStorage.removeItem(SYNC_PHRASE_KEY);
  } catch {
    // Sync will simply ask again next time.
  }
}

/**
 * The profile photo, kept out of the event log on purpose.
 *
 * The log is append-only and every settings change appends a whole patch. Put
 * an image in there and each rename copies it again, so a log that should be a
 * few kilobytes after a year becomes megabytes, and every export carries them.
 * A photo is also not a study event: it has no history worth keeping and no
 * effect on any number the planner computes. So it lives in its own key, as a
 * small square data URL, and is simply overwritten.
 */
export function loadAvatar(): string | null {
  try {
    return localStorage.getItem(AVATAR_KEY);
  } catch {
    return null;
  }
}

export function saveAvatar(dataUrl: string | null): void {
  try {
    if (dataUrl) localStorage.setItem(AVATAR_KEY, dataUrl);
    else localStorage.removeItem(AVATAR_KEY);
  } catch {
    // Quota or private mode. The initials still work.
  }
}

export function setSessionOpen(open: boolean): void {
  try {
    if (open) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, "closed");
  } catch {
    // Nothing to do. Worst case the app forgets you logged out.
  }
}

export function load(): StudyEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version: number; events: StudyEvent[] };
      if (parsed.version === 2 && Array.isArray(parsed.events)) return parsed.events;
    }
    return migrateLegacy();
  } catch {
    return [];
  }
}

export function save(events: StudyEvent[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, events }));
  } catch {
    // Storage full or blocked. The app keeps working in memory.
  }
}

export function exportJson(events: StudyEvent[]): string {
  return JSON.stringify({ version: 2, events }, null, 2);
}

export function importJson(text: string): StudyEvent[] | null {
  try {
    const parsed = JSON.parse(text) as { version: number; events: StudyEvent[] };
    if (parsed.version !== 2 || !Array.isArray(parsed.events)) return null;
    return parsed.events;
  } catch {
    return null;
  }
}

/** Turn the old current-state save into a log, so nothing is lost. */
function migrateLegacy(): StudyEvent[] {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return [];

  try {
    const old = JSON.parse(raw) as {
      settings?: { examDate: string; weeklyHours: number; targetCoverage?: number };
      checks?: Record<string, Record<string, string>>;
      timeLog?: { date: string; topicId: string; check: string; minutes: number }[];
    };

    const events: StudyEvent[] = [];
    const stamp = (date: string) => new Date(`${date}T09:00:00`).toISOString();

    if (old.settings) {
      events.push({
        id: newId(),
        at: new Date(0).toISOString(),
        subject: DEFAULT_SUBJECT,
        type: "settings",
        patch: {
          examDate: old.settings.examDate,
          weeklyHours: old.settings.weeklyHours,
          targetCoverage: old.settings.targetCoverage ?? 1,
        },
      });
    }

    const minutesFor = (topicId: string, check: string) =>
      old.timeLog?.find((t) => t.topicId === topicId && t.check === check)?.minutes;

    for (const [topicId, checks] of Object.entries(old.checks ?? {})) {
      for (const [check, when] of Object.entries(checks)) {
        const prior = when === "prior";
        events.push({
          id: newId(),
          at: prior ? new Date(0).toISOString() : stamp(when),
          subject: DEFAULT_SUBJECT,
          type: "check",
          topicId,
          check: check as StudyEvent extends { check: infer C } ? C : never,
          prior,
          minutes: prior ? undefined : minutesFor(topicId, check),
        } as StudyEvent);
      }
    }

    events.sort((a, b) => a.at.localeCompare(b.at));
    save(events);
    return events;
  } catch {
    return [];
  }
}
