/**
 * The only component that ever sees the API key.
 *
 * PLAN.md §7: the browser posts a task name and a context object; this builds the
 * prompt, calls the model, and returns JSON. The key is an environment variable
 * on Vercel and never enters the repo or the client bundle.
 *
 * Environment:
 *   GEMINI_API_KEY   required
 *   GEMINI_MODEL     optional. Defaults to gemini-3.6-flash. Google retires ids
 *                    without warning — gemini-2.5-flash was refused with a 404
 *                    naming its replacement — so keep the env var authoritative
 *                    and read the 404 when a call starts failing: it says what to
 *                    move to.
 *   ALLOWED_ORIGIN   optional, e.g. https://tracker.example.com
 *   MONTHLY_CAP      optional, default 800 requests
 *   KV_REST_API_URL,   injected by the Upstash Redis marketplace integration.
 *   KV_REST_API_TOKEN  Also accepted under their UPSTASH_REDIS_REST_* names.
 *
 * Billing is enabled on this project (paid Tier 1), so every call costs money and
 * the repo is public. The limits below are what stands between a discovered
 * endpoint and a surprise invoice.
 *
 * The counters live in Redis when it is configured, because serverless instances
 * do not share memory: an in-memory cap resets on every cold start, which means
 * a caller who waits for one gets a fresh allowance. Vercel KV itself no longer
 * exists — Vercel moved those stores to Upstash in December 2024 — and Upstash
 * speaks HTTP, so this talks to it with fetch rather than a dependency.
 *
 * With no Redis configured it falls back to the in-memory counters, which still
 * stop a runaway client loop but not a determined one. The fallback is loud in
 * the health check rather than silent, so a missing integration cannot be
 * mistaken for a working cap.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const MONTHLY_CAP = Number(process.env.MONTHLY_CAP || 800);
const MAX_BODY_BYTES = 24 * 1024;
// An answer arrives as a photograph or a PDF of handwriting, so this task alone
// needs room. The client resizes first; this is the ceiling, not the target.
const MAX_EVAL_BODY_BYTES = 6 * 1024 * 1024;
const PER_DEVICE_PER_HOUR = 20;
const EVAL_PER_DEVICE_PER_DAY = 8;

/**
 * Find the Redis credentials whatever they ended up being called.
 *
 * The Vercel marketplace installer offers a "custom prefix" for the variables
 * it injects, and providers have renamed them before — KV_REST_API_* under
 * Vercel KV, UPSTASH_REDIS_REST_* under Upstash's own naming. Matching two
 * hard-coded names means a dropdown nobody thinks about silently turns the
 * durable cap back into the in-memory one, which is the failure this whole
 * thing exists to prevent and the failure least likely to be noticed.
 *
 * So: take any pair of variables ending _REST_API_URL and _REST_API_TOKEN that
 * share a prefix. The known names are tried first so behaviour does not change
 * for a store that is already wired up.
 */
function findRedisCredentials(env) {
  const known = [
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ];
  for (const [u, t] of known) {
    if (env[u] && env[t]) return { url: env[u], token: env[t], via: u };
  }

  for (const key of Object.keys(env)) {
    if (!key.endsWith("_REST_API_URL") || !env[key]) continue;
    const tokenKey = `${key.slice(0, -"_URL".length)}_TOKEN`;
    if (env[tokenKey]) return { url: env[key], token: env[tokenKey], via: key };
  }
  return { url: "", token: "", via: null };
}

const CREDS = findRedisCredentials(process.env);
const REDIS_URL = CREDS.url;
const REDIS_TOKEN = CREDS.token;
export const REDIS_CONFIGURED = Boolean(REDIS_URL && REDIS_TOKEN);

const hits = { month: currentMonth(), total: 0, devices: new Map() };

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** UTC hour and day stamps. Windows are fixed buckets, not sliding. */
function currentHour() {
  return new Date().toISOString().slice(0, 13);
}
function currentDay() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * One round trip, several commands. Upstash returns an array of results in the
 * order given; a failure anywhere returns null and the caller falls back.
 */
async function redis(commands) {
  if (!REDIS_CONFIGURED) return null;
  try {
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return null;
    const out = await r.json();
    return Array.isArray(out) ? out.map((x) => x?.result) : null;
  } catch {
    return null;
  }
}

/**
 * Count first, then judge.
 *
 * Reading a counter and incrementing it separately lets two simultaneous calls
 * both read the old value and both pass, which is exactly what a runaway client
 * loop does. INCR returns the value after the increment, so the number a caller
 * is judged on is the one their own call created. A refused call still spends
 * its slot — deliberately: failing closed is the safe direction when the thing
 * being protected is a card.
 *
 * EXPIRE rides along in the same pipeline. It is set on every call rather than
 * only on creation, which costs nothing and means a key can never outlive its
 * window because one write lost a race.
 */
async function allowInRedis(deviceId, task) {
  const monthKey = `ai:m:${currentMonth()}`;
  const hourKey = `ai:h:${deviceId}:${currentHour()}`;
  const dayKey = `ai:e:${deviceId}:${currentDay()}`;

  const isEval = task === "evaluate";
  const commands = [
    ["INCR", monthKey],
    ["EXPIRE", monthKey, 40 * 86400],
    ["INCR", hourKey],
    ["EXPIRE", hourKey, 7200],
  ];
  if (isEval) {
    commands.push(["INCR", dayKey], ["EXPIRE", dayKey, 26 * 3600]);
  }

  const out = await redis(commands);
  if (!out) return undefined; // store unreachable; caller decides

  const month = Number(out[0]);
  const hour = Number(out[2]);
  const evals = isEval ? Number(out[4]) : 0;

  if (month > MONTHLY_CAP) return "monthly cap reached";
  if (hour > PER_DEVICE_PER_HOUR) return "too many requests this hour";
  if (isEval && evals > EVAL_PER_DEVICE_PER_DAY) {
    return "daily limit for answer evaluation reached";
  }
  return null;
}

function rollover() {
  if (hits.month !== currentMonth()) {
    hits.month = currentMonth();
    hits.total = 0;
    hits.devices.clear();
  }
}

/** The fallback. Holds within one warm instance and no further. */
function allowInMemory(deviceId, task) {
  rollover();
  if (hits.total >= MONTHLY_CAP) return "monthly cap reached";

  const now = Date.now();
  const d = hits.devices.get(deviceId) || { calls: [], evals: [] };
  d.calls = d.calls.filter((t) => now - t < 3600_000);
  d.evals = d.evals.filter((t) => now - t < 86_400_000);

  if (d.calls.length >= PER_DEVICE_PER_HOUR) return "too many requests this hour";
  if (task === "evaluate" && d.evals.length >= EVAL_PER_DEVICE_PER_DAY) {
    return "daily limit for answer evaluation reached";
  }

  d.calls.push(now);
  if (task === "evaluate") d.evals.push(now);
  hits.devices.set(deviceId, d);
  hits.total += 1;
  return null;
}

export async function allow(deviceId, task) {
  const verdict = await allowInRedis(deviceId, task);
  if (verdict !== undefined) return verdict;
  return allowInMemory(deviceId, task);
}

/**
 * Prompts. Every one of them is handed the numbers the planner computed and
 * forbidden from inventing any — PLAN.md §7. A critique that says "you are
 * behind" is useless; one that cites 11.4 against 18.2 required is checkable.
 */
const SYSTEM = `You are helping one candidate prepare Sociology as an optional
subject for the WBCS (West Bengal Civil Service) Main examination. Not UPSC.

The WBCS format: two papers, three hours and 200 marks each. Eight questions per
paper; the candidate answers five — three of five in Group A, two of three in
Group B. Every question is 40 marks, so answers are long: roughly 35 minutes and
substantially more than a UPSC 250-word answer. Never advise UPSC word limits.

Hard rules:
- Every number you use must come from the context given to you. Invent no
  figures, dates, percentages or rankings.
- If projectionIsBasedOnMeasuredWork is false, the projection rests on hours the
  candidate said they would do, not hours they have done. Say so; do not
  congratulate anyone for a plan they have not started.
- If the context does not support a claim, say so instead of guessing.
- Be specific and brief. No encouragement, no filler, no restating the question.
- British spelling.`;

function buildPrompt(task, context) {
  const json = JSON.stringify(context, null, 2);
  switch (task) {
    case "critique":
      return `${SYSTEM}

Here are this candidate's real figures:
${json}

Write at most 120 words. Say what the numbers show, name the single most
useful change to make this week, and cite the figures you relied on. If the
pace is adequate, say so plainly rather than manufacturing a concern.`;

    case "guidance":
      return `${SYSTEM}

Topic:
${json}

Write study guidance for this one topic, at most 160 words, in four labelled
parts:
HOW IT IS ASKED - what the past-paper record suggests, using only the counts given.
MUST CONTAIN - what a 40-mark answer has to include to score.
THINKERS - who to cite by name, and for what.
TRAP - the most common way candidates lose marks here.`;

    case "insight":
      return `${SYSTEM}

The topics scheduled for one week, with how often each was asked in WBCS Main
between 2018 and 2023:
${json}

At most 130 words. Say what connects these topics, which one to open first and
why, and the one link between them an examiner is most likely to reward. Use the
ask-counts given; do not invent any.`;

    case "doubt":
      return `${SYSTEM}

The candidate is studying this, and has asked a question about it:
${json}

Answer the question in at most 180 words, at the standard a 40-mark WBCS answer
would need. Stay on this topic: if the question wanders away from it, answer the
part that belongs to the syllabus and say plainly that the rest is outside it.
Name the thinkers involved. Do not invent statistics, dates or case law.`;

    case "evaluate":
      return `${SYSTEM}

The candidate has written a 40-mark answer by hand and photographed or scanned
it. The question, and anything else known about the attempt:
${json}

Read the page. Then mark it against these five criteria, each out of 10:

structure  - an introduction that frames rather than repeats, body paragraphs
             that follow one another, a conclusion that answers
content    - sociological concepts and theory doing the work, not
             general-studies commentary
thinkers   - named, correctly attributed, and used rather than name-dropped
examples   - Indian examples, concrete and placed where they carry an argument
demand     - answers what was actually asked; "critically examine" is not
             "describe"

Reply with JSON and nothing else, in exactly this shape:

{"readBack":"<the first 200 characters of the answer as you read it>",
 "legible":true,
 "scores":{"structure":0,"content":0,"thinkers":0,"examples":0,"demand":0},
 "weakest":"<which criterion>",
 "rewrite":"<one concrete rewrite of the weakest part, at most 60 words>"}

Set legible to false if the handwriting cannot be read with confidence; a score
built on a misreading is worse than no score. No praise anywhere.`;

    case "structure":
      return `${SYSTEM}

Build the skeleton of a 40-mark WBCS answer to this question:
${json}

The method below is not yours to improvise on. It is how a candidate who
scored 176 in Paper I says he wrote, and the five faults it corrects are the
five he says most candidates make.

1. DEMAND ABOVE EVERYTHING. Most answers fail here: the candidate knows the
   topic, and writes five remembered points without answering what was asked.
   Break the question into the separate things it actually demands. A question
   that says "define, then set out types, then distinguish with examples" is
   three demands, and an answer that does two of them is capped however good
   the sociology is. Name the command word and say what it obliges.

2. FLOW IS WHAT / WHY / HOW. Not a list of features. What it is, why it comes
   about, how it works out — each joined to the next by a contextual statement
   short enough to be remembered and written under time. Give the actual
   sentence, not a description of one.

3. EXAMPLES CARRY THE MARKS, and they must be diverse or the answer reads
   monotonous. Give one contemporary Indian example in each of economic,
   social, political and technological, and say in a clause what each one
   demonstrates — an example named and not explained earns nothing. Prefer
   West Bengal and Indian instances.

4. THINKERS ARE SUBORDINATE. More thinkers does not mean a better answer, and
   chasing them is how candidates stop answering the question. Name only those
   who do real work, and say where each belongs — usually in brackets beside a
   claim already made.

5. THE COUNTER IS ARGUED, NOT LISTED. Where the question asks how far, or to
   critically examine, do not reach for a roll-call of critics. Argue from
   substance — what has changed in society that the theory does not capture.
   Thinkers may close it, in brackets.

Length: this is WBCS, not UPSC. Forty marks, about thirty-five minutes, so
roughly three times a UPSC 250-word answer — there is room for a real argument
arc, and an answer written to UPSC length will look thin.

Reply with JSON and nothing else, in exactly this shape:

{"demand":{"commandWords":["<the command word or words>"],
           "parts":["<each separate thing the question obliges you to do>"],
           "trap":"<the specific way candidates lose marks on this question>"},
 "arc":[{"stage":"What","move":"<what this section establishes>",
         "contextualStatement":"<the sentence that carries the reader into the next>"},
        {"stage":"Why","move":"...","contextualStatement":"..."},
        {"stage":"How","move":"...","contextualStatement":"..."}],
 "examples":{"economic":"<example — what it demonstrates>",
             "social":"...","political":"...","technological":"..."},
 "counter":["<a substantive limit, argued from what has changed>"],
 "thinkers":[{"name":"<thinker>","use":"<the one claim they support>","where":"<which section>"}],
 "budget":[{"section":"<name>","minutes":0}]}

The budget must total about 35 minutes. No praise, no preamble, no prose
outside the JSON.`;

    default:
      return null;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();

  // A health check, so a missing Redis integration is visible rather than
  // discovered on an invoice. It reports configuration, never a key or a count.
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      model: MODEL,
      monthlyCap: MONTHLY_CAP,
      durableLimits: REDIS_CONFIGURED,
      // The variable name only — never the value.
      limitsVia: CREDS.via,
      originLocked: Boolean(process.env.ALLOWED_ORIGIN),
      note: REDIS_CONFIGURED
        ? "Limits are counted in Redis and survive cold starts."
        : "No Redis configured — limits are per-instance and reset on a cold start.",
    });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  // A browser always sends Origin on a cross-origin POST; curl sends none. The
  // earlier check skipped the test when Origin was absent, so anything that was
  // not a browser walked straight past it. With ALLOWED_ORIGIN set, a missing
  // Origin is now refused too.
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && origin !== allowed) {
    return res.status(403).json({ error: "origin not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });

  const { task, context, deviceId, file } = req.body || {};

  const raw = JSON.stringify(req.body || {});
  const ceiling = task === "evaluate" ? MAX_EVAL_BODY_BYTES : MAX_BODY_BYTES;
  if (raw.length > ceiling) {
    return res.status(413).json({ error: "payload too large" });
  }
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId required" });
  }

  const prompt = buildPrompt(task, context);
  if (!prompt) return res.status(400).json({ error: "unknown task" });

  const denied = await allow(deviceId, task);
  if (denied) return res.status(429).json({ error: denied });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                // A photograph or PDF of the handwritten page, when there is one.
                ...(file?.data && file?.mimeType
                  ? [{ inline_data: { mime_type: file.mimeType, data: file.data } }]
                  : []),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            // Generous on purpose. Newer models spend part of this budget
            // thinking before they write, so a ceiling sized for the visible
            // answer truncates it mid-sentence. The cap is not a charge — only
            // tokens actually produced are billed, and the prompts ask for
            // short answers.
            maxOutputTokens: 2048,
          },
        }),
      },
    );

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "model call failed", detail: detail.slice(0, 400) });
    }

    const data = await r.json();
    const candidate = data?.candidates?.[0];
    const body = candidate?.content?.parts?.[0]?.text;

    if (!body) {
      // A model that spent its whole budget thinking returns no text at all.
      return res.status(502).json({
        error: "empty response from model",
        detail: candidate?.finishReason ? `finishReason: ${candidate.finishReason}` : undefined,
      });
    }

    return res.status(200).json({
      body,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      // MAX_TOKENS here means the answer was cut short, not that it failed.
      truncated: candidate?.finishReason === "MAX_TOKENS",
    });
  } catch (e) {
    return res.status(502).json({ error: "model call failed", detail: String(e).slice(0, 200) });
  }
}
