import type { StudyEvent } from "./events";

/**
 * Sync across devices, without an account and without a server that can read
 * your record.
 *
 * The shape of it:
 *
 *   1. You choose a pass-phrase. It is never sent anywhere.
 *   2. PBKDF2 stretches it, then HKDF splits the result into two independent
 *      values: a sync id and an encryption key. The id is what the server
 *      stores your data under; the key never leaves the browser. Because they
 *      are separate HKDF expansions, holding the id tells you nothing about
 *      the key.
 *   3. The log is encrypted with AES-GCM here and posted as ciphertext. The
 *      server stores an opaque blob. It cannot read a single topic you have
 *      studied, and neither can anyone who reads the source of this repo.
 *
 * Merging is the part that is nearly free, and only because of a decision made
 * early: the log is append-only and every event carries its own id, so two
 * devices that were both used offline reconcile by taking the union and sorting
 * by time. There is no conflict to resolve and no version to choose between —
 * which is why this can be done without the usual sync machinery.
 *
 * What this is not: it is not protection against someone who learns your
 * pass-phrase, and it is not a backup. Keep using the export button.
 */

const ENC = new TextEncoder();
const DEC = new TextDecoder();

/**
 * Fixed, and public — it is in this file. A per-user salt would be better, but
 * there is no account to hang one on, and a salt's job here (stopping one
 * precomputed table from covering every user of every app) is done well enough
 * by a string nobody else uses. The pass-phrase length is what carries the
 * weight, which is why the UI insists on it.
 */
const SALT = ENC.encode("wbcs-sociology-tracker/sync/v1");

/**
 * OWASP's floor for PBKDF2-SHA256. It costs roughly a third of a second on a
 * mid-range phone, paid once when you connect rather than on every sync.
 */
const ITERATIONS = 310_000;

/** Shorter than this is not worth encrypting: the id becomes guessable. */
export const MIN_PASSPHRASE = 12;

export interface SyncKeys {
  /** 64 hex characters. The server's key for your blob, and nothing more. */
  id: string;
  key: CryptoKey;
}

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deriveKeys(passphrase: string): Promise<SyncKeys> {
  const normalised = passphrase.normalize("NFKC").trim();
  if (normalised.length < MIN_PASSPHRASE) {
    throw new Error(`Use at least ${MIN_PASSPHRASE} characters.`);
  }

  const base = await crypto.subtle.importKey("raw", ENC.encode(normalised), "PBKDF2", false, [
    "deriveBits",
  ]);
  const stretched = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: SALT, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    256,
  );

  // One stretch, two independent outputs. Deriving the id by hashing the key —
  // or by simply splitting the PBKDF2 output — would tie them together; HKDF
  // with different info labels does not.
  const prk = await crypto.subtle.importKey("raw", stretched, "HKDF", false, ["deriveBits", "deriveKey"]);

  const idBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info: ENC.encode("sync-id") },
    prk,
    256,
  );

  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: SALT, info: ENC.encode("sync-encryption") },
    prk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return { id: hex(idBits), key };
}

/** A fresh IV every time, prefixed to the ciphertext. Never reuse one. */
export async function encryptLog(key: CryptoKey, events: StudyEvent[]): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const body = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    ENC.encode(JSON.stringify({ version: 2, events })),
  );
  const packed = new Uint8Array(iv.length + body.byteLength);
  packed.set(iv, 0);
  packed.set(new Uint8Array(body), iv.length);
  let binary = "";
  for (const b of packed) binary += String.fromCharCode(b);
  return btoa(binary);
}

export async function decryptLog(key: CryptoKey, blob: string): Promise<StudyEvent[]> {
  const raw = atob(blob);
  const packed = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) packed[i] = raw.charCodeAt(i);

  // AES-GCM authenticates as well as encrypts, so a wrong pass-phrase or a
  // tampered blob throws here rather than returning plausible rubbish.
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: packed.slice(0, 12) },
    key,
    packed.slice(12),
  );
  const parsed = JSON.parse(DEC.decode(plain)) as { version: number; events: StudyEvent[] };
  if (parsed.version !== 2 || !Array.isArray(parsed.events)) {
    throw new Error("That sync record is in a format this version does not understand.");
  }
  return parsed.events;
}

/**
 * The union of two logs, oldest first.
 *
 * Order-independent and idempotent: merging in either direction, or twice,
 * gives the same result. Event ids break ties on identical timestamps so two
 * devices always fold the log into the same state — without that, the same two
 * logs could produce different progress figures on different phones.
 */
export function mergeLogs(a: StudyEvent[], b: StudyEvent[]): StudyEvent[] {
  const byId = new Map<string, StudyEvent>();
  for (const e of a) byId.set(e.id, e);
  for (const e of b) if (!byId.has(e.id)) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => x.at.localeCompare(y.at) || x.id.localeCompare(y.id));
}

/** True when the remote log holds something this device has not seen. */
export function hasNews(local: StudyEvent[], merged: StudyEvent[]): boolean {
  return merged.length !== local.length;
}

export type SyncOutcome =
  | { ok: true; events: StudyEvent[]; pulled: number; pushed: number }
  | { ok: false; error: string };

const ENDPOINT = "/api/sync";

async function call(op: "pull" | "push", id: string, blob?: string) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ op, id, blob }),
  });
  const data = (await res.json().catch(() => ({}))) as { blob?: string | null; error?: string };
  if (!res.ok) throw new Error(data.error || `Sync failed (${res.status}).`);
  return data;
}

/**
 * Pull, merge, push back — in that order, always.
 *
 * Pushing first would overwrite whatever the other device wrote while this one
 * was offline. Pulling first means the worst case is a sync that runs twice.
 */
export async function syncNow(keys: SyncKeys, local: StudyEvent[]): Promise<SyncOutcome> {
  try {
    const { blob } = await call("pull", keys.id);

    let remote: StudyEvent[] = [];
    if (blob) {
      try {
        remote = await decryptLog(keys.key, blob);
      } catch {
        return {
          ok: false,
          error:
            "Could not read the synced record. Usually this means a different pass-phrase was used on the other device — check it matches exactly.",
        };
      }
    }

    const merged = mergeLogs(local, remote);
    const pulled = merged.length - local.length;
    const pushed = merged.length - remote.length;

    // Nothing to say and nothing to send.
    if (pulled === 0 && pushed === 0) return { ok: true, events: merged, pulled: 0, pushed: 0 };

    await call("push", keys.id, await encryptLog(keys.key, merged));
    return { ok: true, events: merged, pulled, pushed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed." };
  }
}

/** Remove the record from the server. Used when disconnecting or erasing. */
export async function forgetRemote(keys: SyncKeys): Promise<void> {
  try {
    await call("push", keys.id, "");
  } catch {
    // Best effort. The blob expires on its own, and nothing local depends on it.
  }
}
