import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyEvent } from "./events";
import { loadSyncPhrase, saveSyncPhrase } from "./storage";
import { deriveKeys, forgetRemote, syncNow, type SyncKeys } from "./sync";

/**
 * Keeping two devices in step, without getting in the way.
 *
 * The rules that matter here are about *when* to sync, and they exist because
 * the failure modes are unequal. Losing an hour of study because a phone
 * overwrote a laptop is unforgivable; syncing one time too many costs nothing.
 * So: pull-merge-push on open, and push again a few seconds after you stop
 * making changes. Never push without pulling first.
 *
 * The pass-phrase is kept on the device so this can run without asking. That is
 * a real trade — anyone with your unlocked laptop can read your study log — but
 * they could read it anyway, since the log itself is sitting in the same
 * browser. What the pass-phrase protects is the copy on the server, and that
 * protection is unaffected.
 */

export type SyncStatus = "off" | "connecting" | "syncing" | "idle" | "error";

export interface SyncState {
  status: SyncStatus;
  /** Plain words for the Settings screen. Never a stack trace. */
  message: string;
  lastSyncedAt: string | null;
}

const PUSH_DEBOUNCE_MS = 4000;

export function useSync(events: StudyEvent[], setEvents: (e: StudyEvent[]) => void) {
  const [phrase, setPhrase] = useState<string | null>(loadSyncPhrase);
  const [keys, setKeys] = useState<SyncKeys | null>(null);
  const [state, setState] = useState<SyncState>({
    status: phrase ? "connecting" : "off",
    message: "",
    lastSyncedAt: null,
  });

  // What the server is known to hold. Compared before pushing so that merely
  // opening the app on three devices does not write three times.
  const syncedCount = useRef<number>(-1);
  const running = useRef(false);
  // Read inside the debounce without making the timer depend on every keystroke
  // of the log — otherwise each change restarts the effect rather than the timer.
  const latest = useRef(events);
  latest.current = events;

  useEffect(() => {
    let cancelled = false;
    if (!phrase) {
      setKeys(null);
      setState({ status: "off", message: "", lastSyncedAt: null });
      return;
    }
    setState((s) => ({ ...s, status: "connecting", message: "" }));
    deriveKeys(phrase)
      .then((k) => {
        if (!cancelled) setKeys(k);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setKeys(null);
        setState({
          status: "error",
          message: e instanceof Error ? e.message : "Could not use that pass-phrase.",
          lastSyncedAt: null,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [phrase]);

  const run = useCallback(
    async (why: "open" | "change" | "manual") => {
      if (!keys || running.current) return;
      running.current = true;
      setState((s) => ({ ...s, status: "syncing", message: "" }));

      const before = latest.current;
      const result = await syncNow(keys, before);
      running.current = false;

      if (!result.ok) {
        setState((s) => ({ ...s, status: "error", message: result.error }));
        return;
      }

      syncedCount.current = result.events.length;
      if (result.events.length !== before.length) setEvents(result.events);

      setState({
        status: "idle",
        lastSyncedAt: new Date().toISOString(),
        message:
          result.pulled > 0
            ? `Brought in ${result.pulled} ${result.pulled === 1 ? "entry" : "entries"} from your other device.`
            : why === "manual"
              ? "Already up to date."
              : "",
      });
    },
    [keys, setEvents],
  );

  // On open: pull before anything else, so a device that has been closed for a
  // week does not push its stale view over the one you actually used.
  useEffect(() => {
    if (keys) void run("open");
  }, [keys, run]);

  // After changes settle. The count guard means the setEvents that a pull
  // itself causes does not bounce straight back into another sync.
  useEffect(() => {
    if (!keys || events.length === syncedCount.current) return;
    const t = setTimeout(() => void run("change"), PUSH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [events, keys, run]);

  const connect = useCallback((next: string) => {
    saveSyncPhrase(next);
    setPhrase(next);
    syncedCount.current = -1;
  }, []);

  const disconnect = useCallback(
    async (alsoForgetRemote: boolean) => {
      if (alsoForgetRemote && keys) await forgetRemote(keys);
      saveSyncPhrase(null);
      setPhrase(null);
      setKeys(null);
      syncedCount.current = -1;
    },
    [keys],
  );

  return {
    state,
    connected: Boolean(phrase),
    syncNow: () => void run("manual"),
    connect,
    disconnect,
  };
}
