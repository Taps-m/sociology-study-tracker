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
const METHOD_RULES = `
LAST TIME'S GAP IS THIS TIME'S BRIEF. Where the context carries "lostLastTime",
this candidate has already written this question or this topic and been marked,
and those are the criteria that cost them the most marks — with "adviceLastTime"
being what they were told to do about it. This is not background. Whatever you
produce must visibly supply the thing that was missing: if they lost marks on
thinkers, the thinkers are named here and given a job; if on examples, the Act,
the figure, the place are written out rather than left as "give an example". Put
those parts first among equals and make them the fullest, and do not let a
second general point crowd out the specific one they have already proved they
will not think of unaided. Say nothing about their past marks — they can see
those; just make sure the gap is filled.

WHAT, THEN WHY, THEN HOW. Inside a block that carries argument, move through the
three: what the thing is, why it happens or matters, how it works out in
practice. Not as headings — as the movement of the three lines. A block that
only says what something is has stopped at the first of the three and reads like
a definition, which is where most answers lose their marks.

SUBHEADINGS COME FROM THE DEMAND, NOT THE TOPIC, AND THEY COUNT. The signpost
and any section headings restate what the question obliges. A heading naming the
topic tells the examiner you know the topic; a heading naming the demand tells
him you read the question.

Where a heading introduces a set, put the number in it: "Four structural causes
of old-age dependency", not "Causes of old-age dependency". The number tells the
examiner what is coming and commits you to delivering it, which is why it reads
as planned rather than as whatever occurred to you. Only where the number is
real — a heading promising five and delivering three is worse than one that
promised nothing.

ATTRIBUTE, DO NOT ASSERT. An opinion in your own voice is a candidate's opinion.
The same point carried by a named source is evidence: "the 2011 Census records",
"the National Policy on Older Persons holds", "as Tibbitts defines it". Prefer
the attributed form wherever a source genuinely says it.

The guard, and it is absolute: name only committees, reports, commissions,
surveys and scholars that appear in the notes or the books you were given, or
that you are certain of. Never invent a report number, a commission's number, a
year or a page to make a sentence sound authoritative. A fabricated "Law
Commission 267th Report" is worse than the plain sentence it replaced — it will
be repeated in an exam hall by someone who cannot check it.

A THINKER ONLY WHERE HE DOES WORK. Most blocks have none, and that is correct —
one real answer at ten marks cites nobody at all. Name a thinker only where the
block cannot make its point without him, and where you can say in the same
breath what he is for. A forced scholar is worse than no scholar: it costs a
line, it shows the answer was assembled rather than argued, and every examiner
has read a hundred of them. Never reach for a name to fill the field.

CRITICISM LIVES IN THE BODY, AND ONLY WHERE IT IS DEMANDED. It is not a step of
its own — the core body is written as per the demand, so criticism belongs in it
when the demand asks and nowhere at all when it does not. "Critically examine",
"evaluate" and "comment on" ask for it. "Discuss", "examine", "describe" and
"analyse" do not, and a limitations paragraph bolted onto them answers a
question nobody set while spending the minutes the real demand needed. When the
command word does ask, criticism is part of the argument, not an appendix.

THE DEMAND IS WHERE THE MARKS ARE LOST. Ninety per cent of candidates fail at
the first step, not the seventh: they answer the topic rather than the question.
Before anything else, name the task the command word sets and the key words that
fix its scope, and let every later part serve that. An answer that is excellent
about the topic and silent on the demand is a bad answer.

KEEP THE INTRODUCTION SHORT AND RELEVANT. Define precisely, set the context, name
a thinker only if one genuinely belongs there, and stop. An introduction that
runs long has spent the body's minutes proving nothing.

CLOSE THE LOOP. The conclusion answers the question directly and briefly — an
overall assessment, a way forward, a balanced view, or the contemporary
relevance. It never introduces a new argument and never trails off.

AN EXAMPLE HAS TO PROVE THE POINT IT SITS UNDER. Not illustrate the topic —
prove the claim of that particular block. If it would sit equally well under any
other block, it is decoration and it earns nothing. A named Act, a figure, a
case, a place, attached to the sentence it demonstrates.
`;

const SOURCES_RULE = `THE NOTES COME FIRST, WHERE THEY ARE THERE. If the context carries "notes",
that is the candidate's own study material — the exact pages they revise from,
sent verbatim, with "notesCitation" naming the section and pages.

Build the answer out of it. Its scholars, its definitions, its classifications
and its framing take precedence over anything you would otherwise have reached
for, even where your own version is broader or more current. The reason is not
that the notes are better sociology: it is that this is what the candidate has
read, will revise again the night before, and can check. An answer naming a
scholar their notes name is one they can defend; one built from material they
have never seen is one they must take on trust and cannot revise from.

Use the names the notes use. Where the notes define a term, define it their way.
Where they give a classification, follow it rather than substituting a tidier
one. You may add an Indian fact, an Act or a figure the notes do not carry —
that is the exam's general-studies ground — but do not import a rival framework
or an outside scholar to improve on what is there.

Where the notes are thin on something the question needs, say so in that part
rather than papering over it, and fall back to the books below for that part
only. Where "notes" is absent, everything below is the whole rule.

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
syllabus topics, without inventing a citation to fill the hole.`;

const TOKEN_BUDGET = {
  critique: 2048,
  insight: 2048,
  doubt: 2048,
  evaluate: 3072, cheatsheet: 4096, drill: 1536,
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

Read the page. Then mark it against these five criteria, each out of 8. Five
eights are the forty this paper is marked out of, so the five scores you give
ARE the mark — there is no conversion afterwards and nothing is scaled. A
criterion the answer handles fully is 8; one it does not touch at all is 0.

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
 "outOf":8,
 "working":"<the one thing this answer already does, at most 25 words>",
 "weakest":"<which criterion>",
 "rewrite":"<one concrete rewrite of the weakest part, at most 60 words>"}

Set legible to false if the handwriting cannot be read with confidence; a score
built on a misreading is worse than no score.

SAY WHAT IS THERE BEFORE WHAT IS MISSING. "working" names something the
candidate actually did — a thinker used rather than named, a paragraph that
followed from the one before it, a conclusion that took a position. Quote or
point at the part of their answer you mean. It is not encouragement and not a
compliment: it is the first true thing about the script, and a marker who
cannot find one has not read carefully enough. Only if the page is genuinely
blank of merit may it be an empty string.

CALIBRATE TO HOW FAR THEY HAVE COME. The context carries answersWrittenSoFar.
Under three, this is someone finding out what a 40-mark answer is: the scores
stay honest, but "rewrite" fixes the single thing that would gain the most
marks and says nothing about the other four. A first-time candidate handed
five simultaneous faults writes no second answer, and the app's whole value is
the second answer. From the fourth onwards, mark as a full examiner would.

Never sarcasm, never "this is not sociology", never a verdict on the candidate
rather than the page. Address the writing, in the second person, plainly.`;

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

WRITE IT THE WAY THE SCRIPTS DO — PROSE FRAME, LABELLED BODY. The frame of the
answer is continuous prose and the body of it is labelled blocks, and the two
are written differently on purpose.

The frame — the opening, the pivot and the close — is written as connected
analytical paragraphs, three to five sentences each, in the register of a
serious essay. Sentences join to one another and carry an argument forward.
The opening carries the shape of what follows and is never a textbook
definition. The pivot turns the answer on its hinge and explains why it turns.
The close takes a position and defends it in a sentence. Nothing in the frame
is telegraphic and nothing in it is a fragment — these three are what makes the
script read as the work of someone who can write, and a reader decides that in
the first four lines.

The body blocks stay labelled, because that is what an examiner skims and what
earns the structure marks: a keyword, then the mechanism under it. But write
each block in full analytical sentences, not in note form. "Ascriptive status
fixes life chances at birth" is a sentence; "Ascription — birth, fixed, no
mobility" is a note, and notes lose marks a paragraph would have earned.
Blocks are deliberately unequal — the obvious one gets two sentences, the ones
carrying the argument get five.

The test for the whole thing: read it aloud. The frame should sound like an
argument being made. The blocks should sound like a well-informed person
explaining one idea at a time, never like a revision card being read out.

MARK IT UP, AND MARK THREE KINDS OF THING. In every part, list under "underline"
the exact phrases from that part's own text that should be underlined in the
answer booklet. Give each phrase exactly as it appears in the text or it cannot
be marked.

Aim at one of each kind rather than a count: the CONCEPT the part turns on
(a technical term, a named idea), the EVIDENCE that proves it (an Act, a figure,
a Census round, a committee, a scholar), and the CONSEQUENCE it lands on (the
impact word — "erodes", "displaces", "reproduces inequality"). Three marks of
three kinds tell an examiner skimming the page what the paragraph argued;
five marks on five nouns tell him nothing.

Two to five per part where the part carries that much, never every other word —
underlining everything is the same as underlining nothing.

DRAW ONE THING, IN THE RIGHT SHAPE. Where a diagram would carry something
faster than prose, give it: a label and three to five items, plus "shape".

Five shapes, and they are the five that appear in real topper scripts rather
than five a designer liked. Pick by what the content is:

  "flow"     — stages that lead to one another: a causal chain, a process, a
               sequence of consequences. Items go in the order they happen,
               because they are drawn as a chain of arrows and the order IS the
               argument. Aditya Srivastava, Rank 1, drew relative deprivation
               this way: threat to culture → feeling of deprivation → third-party
               framing → resentment and regionalism.
  "quadrant" — a central term with its dimensions grouped around it. The best
               shape for most sociology questions, because most of them ask for
               the dimensions of something. Medha Anand, Rank 13, wrote "factors
               affecting mental well-being" across the middle of the page and
               quartered the space into Social, Economic, Political and Others.
               Four groups is the shape at its best. Each item is a group: its
               "name" is the label — Social, Economic, Political, Cultural — and
               its "points" are the two to four things under it.
  "pyramid"  — levels that stack or rank: a hierarchy, stages of development,
               a base that supports what is above it. Items from base upward.
  "compare"  — two things held against each other. Exactly two items, whose
               "name" heads each column, plus "rows": one per basis of
               comparison, each giving that basis and what the two sides say
               about it. The basis column is the point of the table — ownership,
               mobility, sanction, unit of stratification. Without it, two lists
               sit side by side and the reader has to work out what is being
               compared. Traditional against modern, rural against urban,
               organised against unorganised.
  "branch"   — kinds or types of one thing, in no particular order, where none
               of the four above is truer. The plainest shape, and the last
               resort rather than the default.

BEFORE CHOOSING "branch", TRY TO EARN A QUADRANT. Where you have three to five
co-ordinate groups — dimensions of a problem, kinds of intervention, sets of
causes — ask whether each can carry two or three points beneath it. Almost
always it can: "social security" alone is a label, while "social security —
non-contributory pensions, IGNOAPS coverage gaps, indexation to inflation" is a
paragraph the candidate can write from. If each group can hold points, it is a
quadrant and the quadrant is the better answer, because the branch version
throws away everything below the label.

Use "branch" only when the items genuinely have nothing under them: a bare
classification where each kind is a single idea and expanding it would mean
inventing material. A branch diagram of four policy measures with one clause
each is the diagram you draw when you have not thought about the measures.

Choose by the content, never for variety. A causal chain drawn as branches
throws away the one thing it was drawn to show. Four co-ordinate dimensions
drawn as a flow claim a sequence that is not there, which is worse than no
diagram at all. Where prose genuinely beats all five, return an empty diagram.

All five are drawn with a pen in ninety seconds by a tired hand — that is why
they are the ones that turn up in scripts, and the limits below still hold
whichever you pick.

IT HAS TO BE DRAWABLE. This is copied onto paper with a pen, in about ninety
seconds, by someone with thirty-five minutes for the whole answer. So: the box
holds the subject in TWO TO FOUR WORDS — "Social Mobility", not "Classification
Framework of Social Mobility Systems and Types". Each branch name is FOUR WORDS
AT MOST and each note EIGHT AT MOST, because they are written along an arrow in
a hand that is already tired. Three to five branches; six is a list wearing a
diagram's clothes. If what you want to show cannot survive being cut to that,
it is not a diagram — return an empty one and let the prose carry it.

If the context carries "diagram", the skeleton has already prescribed one and
the candidate has already been told to draw it. Draw that one. Keep its label
and its items unless one of them is plainly wrong for the answer you have
written, and if you do change it, change it because the answer moved — not to
show a different idea. A model answer whose diagram contradicts the skeleton it
came from teaches the candidate to trust neither.

${METHOD_RULES}
THE NOTES COME FIRST, WHERE THEY ARE THERE. If the context carries "notes",
that is the candidate's own study material — the exact pages they revise from,
sent verbatim, with "notesCitation" naming the section and pages.

Build the answer out of it. Its scholars, its definitions, its classifications
and its framing take precedence over anything you would otherwise have reached
for, even where your own version is broader or more current. The reason is not
that the notes are better sociology: it is that this is what the candidate has
read, will revise again the night before, and can check. An answer naming a
scholar their notes name is one they can defend; one built from material they
have never seen is one they must take on trust and cannot revise from.

Use the names the notes use. Where the notes define a term, define it their way.
Where they give a classification, follow it rather than substituting a tidier
one. You may add an Indian fact, an Act or a figure the notes do not carry —
that is the exam's general-studies ground — but do not import a rival framework
or an outside scholar to improve on what is there.

Where the notes are thin on something the question needs, say so in that part
rather than papering over it, and fall back to the books below for that part
only. Where "notes" is absent, everything below is the whole rule.

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

ONE SECTION PER THING THE QUESTION ASKS. List in "demands" each separate thing
the question obliges — "the nature of it", "why it happened", "what should be
done" — three to eight words each, in the order they should be answered, with
the minutes each deserves out of the thirty-five. A question that asks one thing
gets one demand, and that is the common case; do not manufacture parts that are
not there.

Then tag every part with "serves": the index of the demand it answers. The
opening and the close serve the whole answer and take 0. A pivot takes the index
of the demand it turns TOWARD.

Say in "independent" whether the demands can be read separately or whether the
answer genuinely runs through them as one argument. Be honest: three facets of
one thing — nature, causes, remedies — are not independent, and saying they are
lets the reader carve up an argument that was meant to flow.

SHOW WHERE THE METHOD LANDED. Fill "method" with all seven steps, in order:
demand, define, flow, coreBody, example, thinker, conclusion. These are Sandesh
Jain's seven and the names are his — "define" is the definition and the setting
of context, "coreBody" is the sub-dimensions written as per the demand. For each, say
where it happened in the answer you just wrote — "the demand is unpacked in the
opening", "block c moves what to why to how" — in at most twelve words.

Two states only, and the second is not a failure. "used" means it is in the
answer. "notNeeded" means this question did not call for it, and then "where"
says why in the same breath: "no thinker — this is a policy question, not a
theoretical one", "the demand is comparative, so the movement is A against B
rather than what to why to how".

NOT ALL SEVEN FIT EVERY QUESTION, BUT THREE ALWAYS DO. Judge each on the
question in front of you rather than filling all seven to look complete — and
judge honestly in both directions:

  demand     — never absent. An answer that does not meet the demand has failed
               whatever else it does.
  coreBody   — never absent. It is the answer.
  conclusion — never absent. An answer that stops rather than closes loses the
               easiest marks on the page.
  define     — almost always present, sometimes a single line. Absent only where
               the question is wholly evaluative and a definition would delay it.
  flow       — a manner of writing rather than a section. "notNeeded" where the
               question's logic is comparative, or a straight enumeration, and
               forcing what-why-how onto it would distort the argument.
  example    — essential wherever the topic touches Indian society. "notNeeded"
               only for a purely theoretical demand, where a contemporary
               example would be decoration bolted to a concept.
  thinker    — value addition, not foundation, and the most often rightly
               absent. Never reach for a name to fill the field.

Never mark a step "used" that is not actually there, and never mark one
"notNeeded" to excuse having skipped it — the point of this list is that a
candidate can hold their own answer against it, and a list that lies teaches
them to tick boxes rather than to check.

CURRENT INDIAN MATERIAL, DATED AND CHECKABLE. Fill "examples" with two to four
pieces of datable Indian material this topic can carry into an answer: an Act
or amendment, a scheme, a Census or NSS or NFHS figure, a committee or
commission report, a landmark judgment. Each gets "text" — the fact itself,
one sentence, with its number or provision where it has one — "where", saying
which part of the answer it belongs in and what it proves there, and "asOf",
the year that fact belongs to.

Prefer things that are datable and citable over things that are merely topical:
an Act with a year, a Census figure with its round. Give the year in "asOf"
always. If you are not sure enough of a figure to date it, leave the example
out — a wrong figure written confidently into an answer booklet costs more than
no figure, and the candidate cannot tell which of yours are solid.

Say nothing about how recent these are. Your knowledge stops at a training
cutoff; the candidate is told on screen to verify every one of these against a
current source before it goes near an exam, and your job is to give them
material worth checking, not to certify it.

Reply with JSON and nothing else, in exactly this shape:

{"parts":[{"kind":"opening","serves":0,"keyword":"","text":"<the actual sentences>","underline":["<exact phrase>"],"must":"core"},
          {"kind":"signpost","serves":0,"keyword":"","text":"...","underline":[],"must":"core"},
          {"kind":"block","serves":0,"keyword":"<2-4 words>","text":"...","underline":["..."],"thinker":"<usually empty — only where he does work>","specific":"<or empty>","must":"core|yours"},
          {"kind":"pivot","serves":0,"keyword":"","text":"...","underline":[],"must":"core"},
          {"kind":"close","serves":0,"keyword":"","text":"...","underline":["..."],"must":"core"}],
 "method":[{"step":"demand|define|flow|coreBody|example|thinker|conclusion","state":"used|notNeeded","where":"<at most 12 words>"}],
 "demands":[{"label":"<3-8 words>","minutes":0}],
 "independent":true,
 "diagram":{"label":"<what it shows, or empty>","shape":"branch|flow|quadrant|pyramid|compare","items":[{"name":"<the group, stage or column>","note":"<short, for branch and flow>","points":["<for quadrant>"]}],"rows":[{"basis":"<what is being compared>","a":"<first column>","b":"<second column>"}]},
 "examples":[{"text":"<one sentence, with the number or provision>","where":"<which part it goes in and what it proves>","asOf":"<year>"}],
 "usedTopics":["<syllabus topic id>"],
 "words":0}

No praise, no preamble, no prose outside the JSON.`;

    case "cheatsheet":
      return `${SYSTEM}

Build a one-glance revision card for this topic:
${json}

WHAT THIS IS FOR. A candidate with an hour a day cannot read every chapter to
depth, and on a tired evening the choice is not between this card and the
chapter — it is between this card and nothing. So it must be the smallest thing
that still lets someone write a passable answer: the concepts they cannot skip,
the thinkers doing real work, the specifics that separate an answer from an
essay, and the one mistake everybody makes. Not a summary of the chapter. The
kit for an answer.

SEVERELY LIMITED. Four to six core terms, no more. Two to four thinkers. Two to
four specifics. If everything is on the card nothing is, and a card that takes
fifteen minutes to read has failed at the only job it has.

EVERY LINE IS SHORT ENOUGH TO BE READ AT A GLANCE. A term is one to four words
and its line is at most fifteen. A thinker's line says what he is FOR in this
topic — "the alienation argument", "the functional necessity case" — not a
biography. A specific is a named Act, a figure, a case, a place: something that
could be written into an answer as it stands.

THE TRAP. One line on what candidates get wrong here — the wrong definition, the
thinker applied to the wrong half of the question, the example that does not
actually demonstrate the point. This is the highest-value line on the card.

IT HAS TO BE DRAWABLE. The diagram is copied onto paper with a pen in about
ninety seconds: two to four words in the box, four words at most per branch,
eight at most per note, three to five branches. If the idea cannot survive being
cut to that it is not a diagram — return an empty one.

${METHOD_RULES}
${SOURCES_RULE}

Reply with JSON and nothing else, in exactly this shape:

{"must":[{"term":"<1-4 words>","line":"<what it means, at most 15 words>"}],
 "thinkers":[{"name":"...","for":"<what he is for here, at most 10 words>"}],
 "specifics":["<a named Act, figure, case or place>"],
 "diagram":{"label":"<2-4 words, or empty>","shape":"branch|flow|quadrant|pyramid|compare","items":[{"name":"...","note":"...","points":["<for quadrant and compare>"]}]},
 "trap":"<one line>",
 "askedAs":["<how this topic is typically worded in a question>"],
 "usedTopics":["<syllabus topic id>"]}

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

SAY WHICH SHAPE IT IS. "branch" when the items are the kinds, types, factors or
dimensions of the label — things standing alongside one another, listable in
any order. "flow" when they are stages leading to one another: a process, a
causal chain, a sequence of consequences. A flow's items must be given in the
order they happen, because they are drawn as a chain of arrows and the order is
the argument. Choose by what the content is: a causal chain drawn as branches
throws away the thing it was drawn to show, and four co-ordinate types drawn as
a chain claim a sequence that is not there.

IT HAS TO BE DRAWABLE. This is copied onto paper with a pen, in about ninety
seconds, by someone with thirty-five minutes for the whole answer. So: the box
holds the subject in TWO TO FOUR WORDS — "Social Mobility", not "Classification
Framework of Social Mobility Systems and Types". Each branch name is FOUR WORDS
AT MOST and each note EIGHT AT MOST, because they are written along an arrow in
a hand that is already tired. Three to five branches; six is a list wearing a
diagram's clothes. If what you want to show cannot survive being cut to that,
it is not a diagram — return an empty one and let the prose carry it.

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

THE CLOSE — one or two lines, never a summary of what was just written, and in
sociology it looks FORWARD. The discipline studies societies that are changing,
so a conclusion that only settles the past has stopped a step short: say where
this is heading, what it implies for policy or for the direction of the change,
or what would have to be true for the other outcome. That is the default and it
holds even for a criticism question — concessive is a shape, not an ending, and
"thus, despite these limitations, positivists gave sociology its concrete shape"
becomes an answer when it goes on to say what the discipline does with that now.

Take a position first, then face it forward. Two-sided ("while the labour codes
intend to minimise class divisions, poor implementation can widen inequality"),
concessive, or an explicit answer to the demand — any of those, then the step
ahead. A question asking for criticism still wants a position, not a verdict of
total failure, and never a prediction dressed as certainty: a direction with a
condition attached is sociology, a forecast is not.

${METHOD_RULES}
THE NOTES COME FIRST, WHERE THEY ARE THERE. If the context carries "notes",
that is the candidate's own study material — the exact pages they revise from,
sent verbatim, with "notesCitation" naming the section and pages.

Build the answer out of it. Its scholars, its definitions, its classifications
and its framing take precedence over anything you would otherwise have reached
for, even where your own version is broader or more current. The reason is not
that the notes are better sociology: it is that this is what the candidate has
read, will revise again the night before, and can check. An answer naming a
scholar their notes name is one they can defend; one built from material they
have never seen is one they must take on trust and cannot revise from.

Use the names the notes use. Where the notes define a term, define it their way.
Where they give a classification, follow it rather than substituting a tidier
one. You may add an Indian fact, an Act or a figure the notes do not carry —
that is the exam's general-studies ground — but do not import a rival framework
or an outside scholar to improve on what is there.

Where the notes are thin on something the question needs, say so in that part
rather than papering over it, and fall back to the books below for that part
only. Where "notes" is absent, everything below is the whole rule.

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
 "diagram":{"label":"<what it shows, or empty>","shape":"branch|flow|quadrant|pyramid|compare","items":[{"name":"<the group, stage or column>","note":"<short, for branch and flow>","points":["<for quadrant>"]}],"rows":[{"basis":"<what is being compared>","a":"<first column>","b":"<second column>"}]},
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

  const startedAt = Date.now();

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
      // How long the model itself took. The client keeps these so the app can
      // tell a candidate what the wait actually is instead of guessing at it —
      // the first guess said "a few seconds" and was out by an order of
      // magnitude, which is how a working feature gets read as a broken one.
      ms: Date.now() - startedAt,
      // MAX_TOKENS here means the answer was cut short, not that it failed.
      truncated: candidate?.finishReason === "MAX_TOKENS",
    });
  } catch (e) {
    return reply(502, { error: "model call failed", detail: String(e).slice(0, 200) });
  }
}
