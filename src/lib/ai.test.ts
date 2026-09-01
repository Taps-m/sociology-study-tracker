import { expect, it, afterEach } from "vitest";
import { askService } from "./ai";

/**
 * The transport, tested on its own.
 *
 * This is the layer that produced "Could not reach the answer service: Failed
 * to fetch" — one sentence covering a dropped connection, a timeout and being
 * offline, none of which the candidate could act on. It is also the layer that
 * has twice been changed and shipped without anyone confirming it worked. So
 * every branch of it is pinned here, with fetch replaced by something whose
 * behaviour the test chooses.
 */

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function ndjson(lines: string[]) {
  return new Response(lines.join("\n") + "\n", {
    status: 200,
    headers: { "content-type": "application/x-ndjson; charset=utf-8" },
  });
}

it("reads past the heartbeats to the line that is the answer", async () => {
  globalThis.fetch = (async () =>
    ndjson([
      '{"ping":0}',
      '{"ping":1}',
      '{"ping":1}',
      '{"status":200,"body":"{\\"parts\\":[]}"}',
    ])) as typeof fetch;

  const out = await askService({ task: "model" }, 5_000);
  expect(out.error).toBeNull();
  expect(out.status).toBe(200);
  expect(out.payload.body).toBe('{"parts":[]}');
});

it("carries the status from the final line, not from the 200 that opened it", async () => {
  globalThis.fetch = (async () =>
    ndjson(['{"ping":0}', '{"status":429,"error":"daily limit reached"}'])) as typeof fetch;

  const out = await askService({ task: "model" }, 5_000);
  expect(out.status).toBe(429);
  expect(out.payload.error).toBe("daily limit reached");
});

it("says the connection closed when only heartbeats arrived", async () => {
  globalThis.fetch = (async () => ndjson(['{"ping":0}', '{"ping":1}'])) as typeof fetch;

  const out = await askService({ task: "model" }, 5_000);
  expect(out.error).toMatch(/connection closed/i);
  expect(out.error).not.toMatch(/failed to fetch/i);
});

it("still understands a server that answers in plain JSON", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ error: "origin not allowed" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    })) as typeof fetch;

  const out = await askService({ task: "model" }, 5_000);
  expect(out.status).toBe(403);
  expect(out.payload.error).toBe("origin not allowed");
});

it("gives up on its own terms, and says how long it waited", async () => {
  globalThis.fetch = ((_u: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () =>
        reject(new DOMException("aborted", "AbortError")),
      );
    })) as unknown as typeof fetch;

  const out = await askService({ task: "model" }, 60);
  expect(out.error).toMatch(/longer than/i);
  expect(out.error).not.toMatch(/failed to fetch/i);
});

it("asks the server for the heartbeat", async () => {
  let sent: unknown = null;
  globalThis.fetch = (async (_u: string, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return ndjson(['{"status":200,"body":"{}"}']);
  }) as unknown as typeof fetch;

  await askService({ task: "structure" }, 5_000);
  expect((sent as { stream?: boolean }).stream).toBe(true);
});
