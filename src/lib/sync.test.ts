import { describe, expect, it } from "vitest";
import { on } from "./events";
import type { StudyEvent } from "./events";
import { decryptLog, deriveKeys, encryptLog, hasNews, mergeLogs, MIN_PASSPHRASE } from "./sync";

const PHRASE = "dooars tea garden 1855";

/** Events made at a controlled time, so ordering is testable. */
function ev(id: string, at: string): StudyEvent {
  return { ...on.check("p1u2t1", "read"), id, at };
}

describe("merging two logs", () => {
  it("takes the union and puts it in time order", () => {
    const laptop = [ev("a", "2026-08-01T09:00:00Z"), ev("c", "2026-08-03T09:00:00Z")];
    const phone = [ev("b", "2026-08-02T09:00:00Z")];
    expect(mergeLogs(laptop, phone).map((e) => e.id)).toEqual(["a", "b", "c"]);
  });

  it("gives the same answer whichever device merges", () => {
    const laptop = [ev("a", "2026-08-01T09:00:00Z"), ev("c", "2026-08-03T09:00:00Z")];
    const phone = [ev("b", "2026-08-02T09:00:00Z"), ev("d", "2026-08-04T09:00:00Z")];
    expect(mergeLogs(laptop, phone)).toEqual(mergeLogs(phone, laptop));
  });

  it("is idempotent — syncing twice changes nothing", () => {
    const a = [ev("a", "2026-08-01T09:00:00Z")];
    const b = [ev("b", "2026-08-02T09:00:00Z")];
    const once = mergeLogs(a, b);
    expect(mergeLogs(once, b)).toEqual(once);
    expect(mergeLogs(once, once)).toEqual(once);
  });

  it("never duplicates an event both devices already have", () => {
    const shared = ev("same", "2026-08-01T09:00:00Z");
    const merged = mergeLogs([shared, ev("a", "2026-08-02T09:00:00Z")], [shared]);
    expect(merged).toHaveLength(2);
  });

  it("breaks ties on identical timestamps the same way every time", () => {
    // Without this, two phones could fold the same log into different figures.
    const t = "2026-08-01T09:00:00Z";
    const one = mergeLogs([ev("z", t)], [ev("a", t)]);
    const two = mergeLogs([ev("a", t)], [ev("z", t)]);
    expect(one.map((e) => e.id)).toEqual(["a", "z"]);
    expect(two.map((e) => e.id)).toEqual(["a", "z"]);
  });

  it("keeps an empty side harmless", () => {
    const a = [ev("a", "2026-08-01T09:00:00Z")];
    expect(mergeLogs(a, [])).toEqual(a);
    expect(mergeLogs([], a)).toEqual(a);
    expect(mergeLogs([], [])).toEqual([]);
  });

  it("reports whether the other device had anything new", () => {
    const local = [ev("a", "2026-08-01T09:00:00Z")];
    expect(hasNews(local, mergeLogs(local, []))).toBe(false);
    expect(hasNews(local, mergeLogs(local, [ev("b", "2026-08-02T09:00:00Z")]))).toBe(true);
  });
});

describe("keys derived from a pass-phrase", () => {
  it("gives the same id on every device, every time", async () => {
    const a = await deriveKeys(PHRASE);
    const b = await deriveKeys(PHRASE);
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("ignores surrounding space, so a stray keystroke does not orphan a device", async () => {
    expect((await deriveKeys(`  ${PHRASE}  `)).id).toBe((await deriveKeys(PHRASE)).id);
  });

  it("gives a different id for a different phrase", async () => {
    const a = await deriveKeys(PHRASE);
    const b = await deriveKeys(`${PHRASE}!`);
    expect(a.id).not.toBe(b.id);
  });

  it("refuses a pass-phrase short enough to make the id guessable", async () => {
    await expect(deriveKeys("short")).rejects.toThrow(/at least/);
    await expect(deriveKeys("x".repeat(MIN_PASSPHRASE - 1))).rejects.toThrow();
    await expect(deriveKeys("x".repeat(MIN_PASSPHRASE))).resolves.toBeTruthy();
  });

  it("does not let the encryption key out of the browser", async () => {
    const { key } = await deriveKeys(PHRASE);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toThrow();
  });
});

describe("what actually travels", () => {
  it("round-trips a log", async () => {
    const { key } = await deriveKeys(PHRASE);
    const events = [ev("a", "2026-08-01T09:00:00Z"), ev("b", "2026-08-02T09:00:00Z")];
    expect(await decryptLog(key, await encryptLog(key, events))).toEqual(events);
  });

  it("carries no readable trace of the log", async () => {
    const { key } = await deriveKeys(PHRASE);
    const blob = await encryptLog(key, [ev("a", "2026-08-01T09:00:00Z")]);
    const plain = atob(blob);
    // The topic id and the event type are the two things a curious server
    // operator would look for first.
    expect(plain).not.toContain("p1u2t1");
    expect(plain).not.toContain("check");
  });

  it("uses a fresh IV, so the same log never encrypts to the same bytes", async () => {
    const { key } = await deriveKeys(PHRASE);
    const events = [ev("a", "2026-08-01T09:00:00Z")];
    expect(await encryptLog(key, events)).not.toBe(await encryptLog(key, events));
  });

  it("fails closed on the wrong pass-phrase rather than returning rubbish", async () => {
    const mine = await deriveKeys(PHRASE);
    const theirs = await deriveKeys("a completely different phrase");
    const blob = await encryptLog(mine.key, [ev("a", "2026-08-01T09:00:00Z")]);
    await expect(decryptLog(theirs.key, blob)).rejects.toThrow();
  });

  it("rejects a blob that has been tampered with in transit", async () => {
    const { key } = await deriveKeys(PHRASE);
    const blob = await encryptLog(key, [ev("a", "2026-08-01T09:00:00Z")]);
    const bytes = atob(blob);
    const flipped =
      bytes.slice(0, 20) + String.fromCharCode(bytes.charCodeAt(20) ^ 0x01) + bytes.slice(21);
    await expect(decryptLog(key, btoa(flipped))).rejects.toThrow();
  });
});
