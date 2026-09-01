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

/** Output ceilings, per task. See the note where this is used. */
const TOKEN_BUDGET = {
  critique: 2048,
  guidance: 2048,
  insight: 2048,
  doubt: 2048,
  evaluate: 3072,
  structure: 8192,
  // A full 900-1100 word answer, plus the model's thinking before it.
  model: 16384,
};

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const MONTHLY_CAP = Number(process.env.MONTHLY_CAP || 800);
const MAX_BODY_BYTES = 24 * 1024;
// An answer arrives as a photograph or a PDF of handwriting, so this task alone
// needs room. The client resizes first; this is the ceiling, not the target.
const MAX_EVAL_BODY_BYTES = 14 * 1024 * 1024;
/** Sides of handwriting one answer may run to. */
const MAX_PAGES = 8;
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
it. It may run to several pages: the images that follow are the pages of one
single answer, in the order they were written. Read them as one continuous
piece of writing before marking, and never treat a page as a separate answer.
The question, and anything else known about the attempt:
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

    case "model":
      return `${SYSTEM}

Write a full 40-mark WBCS answer to this question, as a model the candidate
will adapt rather than copy:
${json}

STAY INSIDE THE SYLLABUS. The context carries syllabusTopics: every topic this
paper can examine, with its id. Every concept, thinker and debate you use must
belong to one of them. Do not reach for a fashionable idea from outside the
list because it would impress — in the hall it earns nothing, and a candidate
who learns it from you has spent time on something that cannot be asked. List
in usedTopics the ids you actually drew on, and use nothing you cannot name.

WRITE IT THE WAY THE SCRIPTS DO. The same skeleton as the structure task: an
opening of two to four lines that carries the shape of what follows and is not
a textbook definition; a signpost line restating the demand; labelled blocks of
keyword-then-mechanism rather than paragraphs; a pivot sentence where the
question has two halves; a close that takes a position. Blocks are deliberately
unequal — the obvious one gets a line, the ones carrying the argument get four.

MARK IT UP. In every part, list under "underline" the exact phrases from that
part's own text that should be underlined in the answer booklet: the technical
terms, the named Acts, the figures. Give the phrase exactly as it appears in
the text or it cannot be marked. Two to five per part, not every other word —
underlining everything is the same as underlining nothing.

DRAW ONE THING. Where a branch diagram would carry a group faster than prose,
give it: a label and three to five items. Where prose is genuinely better,
return an empty diagram rather than forcing one.

If the context carries "diagram", the skeleton has already prescribed one and
the candidate has already been told to draw it. Draw that one. Keep its label
and its items unless one of them is plainly wrong for the answer you have
written, and if you do change it, change it because the answer moved — not to
show a different idea. A model answer whose diagram contradicts the skeleton it
came from teaches the candidate to trust neither.

SOURCES — THESE THREE BOOKS AND NOTHING ELSE. The context carries "books": the
exact chapters of Sangwan's Essential Sociology, Haralambos and Heald's Themes
and Perspectives and Shankar Rao's Principles of Sociology that cover this
topic. Those three are the candidate's entire shelf. Take the sociology from
what is in them — their thinkers, concepts, classifications and debates. Do not
import a school, a framework or a named study from outside them, and do not
cite a book, paper, report or website the candidate does not have: a reference
they cannot open is one they cannot check, and an unverifiable one is worse
than none. Indian facts, Acts, schemes, Census and survey figures are the
exception — those are the exam's own general-studies ground and are expected.
If "books" is empty, say so in one line and build the answer only from the
syllabus topics, without inventing a citation to fill the hole.

PLAIN EXAM ENGLISH. Write the way a well-prepared candidate writes under time,
not the way a journal article reads. Short sentences. Ordinary words for the
joining and the explaining — "shows", "leads to", "breaks down", not
"elucidates", "engenders", "problematises". Keep every technical term, every
thinker and every concept: those are what earn the marks, and the sociological
vocabulary is the content, not the decoration. Simplify the sentences around
them, never the substance. Do not shorten anything to make it plainer — under
pressure a candidate needs it graspable at first reading and complete.

MARK WHAT IS COMPULSORY. Against each part say whether it is "core" — the
demand is not met without it, and leaving it out costs marks — or "yours",
meaning the idea must appear but the example, the phrasing and the illustration
should be the candidate's own. Most examples are "yours". The definition, the
distinction the question actually asks for, and the position taken at the close
are "core". Be honest about which is which: marking everything core tells
nobody anything.

LENGTH. Forty marks, about thirty-five minutes of writing: aim at 900 to 1100
words across all parts. This is roughly triple a UPSC 250-word answer; do not
write a compressed one.

Reply with JSON and nothing else, in exactly this shape:

{"parts":[{"kind":"opening","keyword":"","text":"<the actual sentences>","underline":["<exact phrase>"],"must":"core"},
          {"kind":"signpost","keyword":"","text":"...","underline":[],"must":"core"},
          {"kind":"block","keyword":"<2-4 words>","text":"...","underline":["..."],"thinker":"<or empty>","specific":"<or empty>","must":"core|yours"},
          {"kind":"pivot","keyword":"","text":"...","underline":[],"must":"core"},
          {"kind":"close","keyword":"","text":"...","underline":["..."],"must":"core"}],
 "diagram":{"label":"<what it shows, or empty>","items":[{"name":"...","note":"..."}]},
 "usedTopics":["<syllabus topic id>"],
 "words":0}

No praise, no preamble, no prose outside the JSON.`;

    case "structure":
      return `${SYSTEM}

Build the skeleton of an answer to this question:
${json}

The shape below is not invented. It is taken from the answer booklets of a
candidate who placed 2nd, read alongside a 176-in-Paper-I candidate's own
account of his method. Follow it.

BEFORE WRITING, MARK THE QUESTION. Every one of these scripts has the question
paper itself annotated: the command word boxed, the object underlined. It takes
five seconds and it is why their answers stay on the demand while other people
drift. Say what to box and what to underline.

THE OPENING — two to four lines, no heading, and it must already contain the
seed of the structure that follows. Three openings do this; a textbook
definition for its own sake does not, and wastes the most valuable lines on
the page.
  contrast   "Unlike the western world, the middle class in India did not
             emerge out of economy and trade, but out of profession and
             administration, which today forms a non-homogeneous and
             expanding social class." — states the thesis and pre-announces
             the property the second half will exploit.
  unpack     Take the question's own terms and say what each contains, so the
             body is already divided before it begins.
  anchor     Name the Act, the codes, the scheme and what they do. Factual,
             no thinker.

THE SIGNPOST — one line restating the demand as a heading before the body
begins. "Emerging issues faced by the middle class —". It costs five seconds
and tells the examiner you read the question.

THE BLOCKS — the body is labelled blocks, a) b) c), never prose paragraphs.
Each block is: a two-to-four word keyword, then a dash, then two or three
lines of mechanism. The keyword is the point itself, not a topic heading.
Parallel in form, varied in content — spread them across economic, social,
political, cultural and technological rather than five of one kind.

NOT EVERY BLOCK IS EQUAL. This is where candidates waste time. A point that is
obvious gets one line and no thinker — "Excluded from government schemes, for
being in the creamier layer" is a whole block in a 2nd-rank answer. Spend the
depth on the two or three blocks carrying the argument. Mark each block full
or brief and mean it.

THE PIVOT — where the question has two parts, one line turns the answer
instead of starting again: "But the failure of these provisions in full letter
and spirit is the cause of tribal uprising —". Give the sentence.

THINKERS ARE BUDGETED. A 10-mark answer may have none at all. A 20-mark
answer had four to six across the whole page, each doing exactly one job,
inside a block and never as the block. More thinkers is not a better answer.

SPECIFICS CARRY MORE THAN THINKERS DO. A number, a named Act, a scheme, a
company, an institution: 42% of the displaced, women's participation at ~20%,
POSCO, PESA 1996, IITs/NITs/AIIMS, the Baiga of West Bengal. Put a hard
specific in most blocks. Prefer West Bengal and Indian instances.

A DIAGRAM WHERE A LIST WOULD BE SLOWER. These candidates draw: a boxed label
with an arrow branching into three numbered points, a vertical spine down the
margin joining a group, a labelled triangle for a three-fold classification.
Seconds to draw, and it makes the structure visible before a word is read.

Give the diagram itself, not a description of one — a label and three to five
named items, so the candidate can copy it onto the page without deciding
anything. Where prose genuinely beats a diagram, return an empty label and an
empty items list and say why in "insteadOfDiagram".

AND THEN BE CONSISTENT ABOUT IT. If you return no diagram, no line in "minutes"
may mention one. Budgeting three minutes for a diagram you did not give sends a
candidate looking for something that is not on the page, and it is the sort of
small incoherence that makes them stop trusting the rest.

VOCABULARY IN BRACKETS. A technical term dropped in parentheses after a point
— "(Diffusionism)", "(decomposition of class)" — shows command of the concept
without spending a sentence on it. Cheap marks; use them where they fit.

EXAMPLES ARE FLAGGED AND ATTACHED. They write "(e.g.)" against the point it
belongs to, never as a free-floating sentence. An example must sit inside a
block and demonstrate that block's claim.

THE CLOSE — one or two lines, never a summary of what was just written.
Either two-sided ("while the labour codes intend to minimise class divisions,
poor implementation can widen inequality"), or concessive, which is the move
for a question about limitations or criticism ("thus, despite these
limitations, positivists gave sociology its concrete shape as a discipline"),
or forward-looking with a thinker, or an explicit answer to the demand. A
question asking for criticism still wants a position at the end, not a verdict
of total failure.

SOURCES — THESE THREE BOOKS AND NOTHING ELSE. The context carries "books": the
exact chapters of Sangwan's Essential Sociology, Haralambos and Heald's Themes
and Perspectives and Shankar Rao's Principles of Sociology that cover this
topic. Those three are the candidate's entire shelf. Take the sociology from
what is in them — their thinkers, concepts, classifications and debates. Do not
import a school, a framework or a named study from outside them, and do not
cite a book, paper, report or website the candidate does not have: a reference
they cannot open is one they cannot check, and an unverifiable one is worse
than none. Indian facts, Acts, schemes, Census and survey figures are the
exception — those are the exam's own general-studies ground and are expected.
If "books" is empty, say so in one line and build the answer only from the
syllabus topics, without inventing a citation to fill the hole.

PLAIN EXAM ENGLISH. Write the way a well-prepared candidate writes under time,
not the way a journal article reads. Short sentences. Ordinary words for the
joining and the explaining — "shows", "leads to", "breaks down", not
"elucidates", "engenders", "problematises". Keep every technical term, every
thinker and every concept: those are what earn the marks, and the sociological
vocabulary is the content, not the decoration. Simplify the sentences around
them, never the substance. Do not shorten anything to make it plainer — under
pressure a candidate needs it graspable at first reading and complete.

MARK WHAT IS COMPULSORY. Against each part say whether it is "core" — the
demand is not met without it, and leaving it out costs marks — or "yours",
meaning the idea must appear but the example, the phrasing and the illustration
should be the candidate's own. Most examples are "yours". The definition, the
distinction the question actually asks for, and the position taken at the close
are "core". Be honest about which is which: marking everything core tells
nobody anything.

LENGTH. This is WBCS: 40 marks in about 35 minutes, so roughly one and a half
to two times the 20-mark UPSC answer this shape comes from. That means six to
eight blocks and fuller mechanisms — the same skeleton, not a different one.

Reply with JSON and nothing else, in exactly this shape:

{"demand":{"commandWords":["..."],"parts":["<each thing the question obliges>"],
           "trap":"<how candidates lose marks on this question>"},
 "markUp":{"box":["<the command word to box on the question paper>"],"underline":["<the objects to underline>"]},
 "skeleton":"<the organising principle the command word calls for — periodisation, typology, consequence blocks, thinker-mapping, significance blocks>",
 "opening":{"type":"contrast|unpack|anchor","text":"<the actual opening lines, written out>"},
 "signpost":"<the heading line>",
 "blocks":[{"keyword":"<2-4 words>","mechanism":"<2-3 lines>",
            "thinker":"<name, or empty>","specific":"<number, Act, place, case, or empty>",
            "depth":"full|brief"}],
 "pivot":"<the turning sentence, or empty if the question has one part>",
 "diagram":{"label":"<what it shows, or empty>","items":[{"name":"...","note":"..."}]},
 "insteadOfDiagram":"<one line, only when there is no diagram>",
 "close":{"type":"two-sided|concessive|forward|answers-demand","text":"<the actual closing lines>"},
 "minutes":[{"section":"<name>","minutes":0}]}

The minutes must total about 35. Write the opening, pivot and close as real
sentences the candidate could put on the page, not descriptions of them. No
praise, no prose outside the JSON.`;

    default:
      return null;
  }
}

/**
 * A model answer is a thousand words; the call that writes it is not quick.
 *
 * Vercel's default is generous, but leaving it implicit means the ceiling can
 * change under the project without anyone noticing, and what that looks like
 * from the browser is "Failed to fetch" — no status, no body, nothing to read.
 * Stated here so the limit is a decision rather than a default.
 */
export const config = { maxDuration: 300 };

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

  const { task, context, deviceId, file, files } = req.body || {};

  // One answer is three to five sides of handwriting, so an evaluation arrives
  // as several pages. `file` is still accepted: a browser can be running a
  // cached client from before this change, and refusing it would throw away a
  // page somebody has just written.
  const pages = (Array.isArray(files) ? files : file ? [file] : [])
    .filter((f) => f?.data && f?.mimeType)
    .slice(0, MAX_PAGES);

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

  /**
   * The long tasks answer down a heartbeat, not down a silence.
   *
   * Writing a full answer takes a minute or more, and for that whole minute the
   * old code sent the browser nothing at all. An idle HTTPS connection is
   * exactly what a phone network, a home router or a corporate proxy will quietly
   * close, and a closed connection reaches the page as `TypeError: Failed to
   * fetch` — the one error that carries no status and no body, so neither the
   * candidate nor this file can tell whether the model failed, the function was
   * cut off, or the network gave up. Vercel says the same thing in its own docs:
   * over HTTP/1.1 there is no protocol keep-alive, so stream something.
   *
   * So these two write newline-delimited JSON: a ping every few seconds while
   * the model works, then one final line carrying the real reply. Bytes keep
   * moving, nothing in between has an idle connection to reap, and the client
   * gets a progress signal for free.
   *
   * Opt-in, because a browser may still be running a cached copy of the client
   * from before this existed. Without `stream` the response is the plain JSON
   * object it has always been.
   */
  const streaming = req.body?.stream === true;
  let beat = null;

  if (streaming) {
    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    // Tell any proxy in front not to sit on the bytes and defeat the point.
    res.setHeader("X-Accel-Buffering", "no");
    res.write('{"ping":0}\n');
    beat = setInterval(() => {
      try {
        res.write('{"ping":1}\n');
      } catch {
        // The client has gone. The interval is cleared in reply().
      }
    }, 5000);
  }

  /** One reply, whichever channel this request asked for. */
  const reply = (status, obj) => {
    if (!streaming) return res.status(status).json(obj);
    if (beat) clearInterval(beat);
    res.write(JSON.stringify({ status, ...obj }) + "\n");
    return res.end();
  };

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
                // The pages of the answer, in the order they were written.
                ...pages.map((f) => ({
                  inline_data: { mime_type: f.mimeType, data: f.data },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            // Sized per task, because they are not the same size. A critique is
            // 120 words; an answer skeleton is a JSON object carrying eight
            // blocks, three written-out sentences and a time budget, and one
            // ceiling for both truncates the larger one mid-object — which then
            // fails to parse and reaches the candidate as "could not read the
            // reply", a message that says nothing to anyone.
            //
            // Newer models also spend part of this budget thinking before they
            // write, so the visible answer is not the whole cost. The cap is not
            // a charge: only tokens actually produced are billed.
            maxOutputTokens: TOKEN_BUDGET[task] ?? 2048,
          },
        }),
      },
    );

    if (!r.ok) {
      const detail = await r.text();
      return reply(502, { error: "model call failed", detail: detail.slice(0, 400) });
    }

    const data = await r.json();
    const candidate = data?.candidates?.[0];
    const body = candidate?.content?.parts?.[0]?.text;

    if (!body) {
      // A model that spent its whole budget thinking returns no text at all.
      return reply(502, {
        error: "empty response from model",
        detail: candidate?.finishReason ? `finishReason: ${candidate.finishReason}` : undefined,
      });
    }

    return reply(200, {
      body,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      // MAX_TOKENS here means the answer was cut short, not that it failed.
      truncated: candidate?.finishReason === "MAX_TOKENS",
    });
  } catch (e) {
    return reply(502, { error: "model call failed", detail: String(e).slice(0, 200) });
  }
}
