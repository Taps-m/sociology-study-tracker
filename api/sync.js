/**
 * Cross-device sync, for a server that is not trusted with the data.
 *
 * This endpoint stores one opaque string per sync id and hands it back. It
 * cannot read a study log, because what arrives is AES-GCM ciphertext whose key
 * was derived in the browser from a pass-phrase that is never transmitted. Read
 * the whole of this file and you learn nothing about anyone's preparation —
 * which is the point, given the repository is public.
 *
 * What it therefore has to defend is narrower than usual: not confidentiality,
 * which the encryption already handles, but capacity and cost. Someone who
 * guessed a sync id could overwrite that record, so ids are 256 bits derived
 * through 310,000 rounds of PBKDF2 and the client refuses short pass-phrases.
 *
 * Environment: the same Redis the AI proxy uses. With none configured this
 * refuses honestly rather than pretending to sync into memory that a cold start
 * will discard — a sync that silently forgets is worse than no sync at all.
 */

const MAX_BLOB_BYTES = 1024 * 1024;
const PUSH_PER_ID_PER_HOUR = 120;
const PULL_PER_ID_PER_HOUR = 240;
/** Long enough to survive a gap between study sessions; not forever. */
const TTL_SECONDS = 180 * 24 * 3600;

function findRedisCredentials(env) {
  const known = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ];
  for (const [u, t] of known) {
    if (env[u] && env[t]) return { url: env[u], token: env[t] };
  }
  for (const key of Object.keys(env)) {
    if (!key.endsWith("_REST_API_URL") || !env[key]) continue;
    const tokenKey = `${key.slice(0, -"_URL".length)}_TOKEN`;
    if (env[tokenKey]) return { url: env[key], token: env[tokenKey] };
  }
  return { url: "", token: "" };
}

const CREDS = findRedisCredentials(process.env);
const CONFIGURED = Boolean(CREDS.url && CREDS.token);

async function redis(commands) {
  if (!CONFIGURED) return null;
  try {
    const r = await fetch(`${CREDS.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CREDS.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    const out = await r.json();
    return Array.isArray(out) ? out.map((x) => x?.result) : null;
  } catch {
    return null;
  }
}

/** Exactly 64 hex characters, and nothing that could reach outside its key. */
function validId(id) {
  return typeof id === "string" && /^[0-9a-f]{64}$/.test(id);
}

async function withinRate(id, op) {
  const key = `sync:rate:${op}:${id}:${new Date().toISOString().slice(0, 13)}`;
  const out = await redis([
    ["INCR", key],
    ["EXPIRE", key, 7200],
  ]);
  if (!out) return false;
  const limit = op === "push" ? PUSH_PER_ID_PER_HOUR : PULL_PER_ID_PER_HOUR;
  return Number(out[0]) <= limit;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method === "GET") {
    return res.status(200).json({ ok: true, available: CONFIGURED });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // A browser always sends Origin on a cross-origin POST; curl sends none.
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && origin !== allowed) {
    return res.status(403).json({ error: "origin not allowed" });
  }

  if (!CONFIGURED) {
    return res.status(503).json({
      error: "Sync is not set up on this deployment yet.",
    });
  }

  const { op, id, blob } = req.body || {};
  if (!validId(id)) return res.status(400).json({ error: "bad sync id" });

  if (op === "pull") {
    if (!(await withinRate(id, "pull"))) {
      return res.status(429).json({ error: "too many sync requests this hour" });
    }
    const out = await redis([["GET", `sync:blob:${id}`]]);
    if (!out) return res.status(503).json({ error: "sync store unreachable" });
    return res.status(200).json({ blob: out[0] ?? null });
  }

  if (op === "push") {
    if (typeof blob !== "string") return res.status(400).json({ error: "blob required" });
    if (blob.length > MAX_BLOB_BYTES) {
      return res.status(413).json({
        error: "That study log is too large to sync. Export a backup instead.",
      });
    }
    if (!(await withinRate(id, "push"))) {
      return res.status(429).json({ error: "too many sync requests this hour" });
    }

    // An empty blob means disconnect: drop it rather than storing nothing under
    // a key that then lingers for six months.
    const out =
      blob === ""
        ? await redis([["DEL", `sync:blob:${id}`]])
        : await redis([["SET", `sync:blob:${id}`, blob, "EX", TTL_SECONDS]]);

    if (!out) return res.status(503).json({ error: "sync store unreachable" });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "unknown op" });
}
