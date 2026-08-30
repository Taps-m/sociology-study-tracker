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
 *
 * Billing is enabled on this project (paid Tier 1), so every call costs money and
 * the repo is public. The limits below are what stands between a discovered
 * endpoint and a surprise invoice.
 *
 * Honest limitation: serverless instances do not share memory, so the counters
 * here hold only within a warm instance and reset on a cold start. They stop
 * casual abuse and runaway client loops, not a determined attacker. For a real
 * cap, move `hits` to Vercel KV or Upstash — the interface below is deliberately
 * small so that swap is a few lines.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const MONTHLY_CAP = Number(process.env.MONTHLY_CAP || 800);
const MAX_BODY_BYTES = 24 * 1024;
const PER_DEVICE_PER_HOUR = 20;
const EVAL_PER_DEVICE_PER_DAY = 8;

const hits = { month: currentMonth(), total: 0, devices: new Map() };

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function rollover() {
  if (hits.month !== currentMonth()) {
    hits.month = currentMonth();
    hits.total = 0;
    hits.devices.clear();
  }
}

function allow(deviceId, task) {
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

The candidate's answer, and the question it answers:
${json}

Mark it against these criteria, each out of 10: structure (introduction, body,
conclusion); sociological rather than general-studies content; thinkers cited by
name and correctly; Indian examples; and coverage of what the question actually
asked. Give a number for each with one line of justification, then one concrete
rewrite suggestion for the weakest part. No praise.`;

    default:
      return null;
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN;
  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: "origin not allowed" });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not set" });

  const raw = JSON.stringify(req.body || {});
  if (raw.length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "payload too large" });
  }

  const { task, context, deviceId } = req.body || {};
  if (!deviceId || typeof deviceId !== "string") {
    return res.status(400).json({ error: "deviceId required" });
  }

  const prompt = buildPrompt(task, context);
  if (!prompt) return res.status(400).json({ error: "unknown task" });

  const denied = allow(deviceId, task);
  if (denied) return res.status(429).json({ error: denied });

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
        }),
      },
    );

    if (!r.ok) {
      const detail = await r.text();
      return res.status(502).json({ error: "model call failed", detail: detail.slice(0, 400) });
    }

    const data = await r.json();
    const body = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!body) return res.status(502).json({ error: "empty response from model" });

    return res.status(200).json({ body, model: MODEL, generatedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: "model call failed", detail: String(e).slice(0, 200) });
  }
}
