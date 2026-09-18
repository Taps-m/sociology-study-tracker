/**
 * The client half of the AI layer.
 *
 * Two rules from PLAN.md shape everything here:
 *
 * 1. The model never decides a number. Everything it is shown was computed by
 *    the planner first, and the advice is stored with the figures it reasoned
 *    from so it can be marked stale when they drift.
 * 2. Never show a broken button. With no network, no quota or a failed call,
 *    the last saved advice is shown with its date and its basis — "from 12 Aug,
 *    when you were at 11.4 h/wk" — because the numbers on screen are useful on
 *    their own.
 */

export type AiTask =
  | "critique"
  | "evaluate"
  | "insight"
  | "doubt"
  | "structure"
  | "model";

/** The figures an answer was reasoned from, so drift can be detected later. */
export interface AdviceBasis {
  percent: number;
  pace: number;
  requiredPace: number;
}

export interface Advice {
  task: AiTask;
  generatedAt: string;
  basis: AdviceBasis;
  body: string;
}

const DEVICE_KEY = "wbcs.device";
const ADVICE_KEY = "wbcs.advice";

/** A per-device id so the proxy can rate-limit without knowing who you are. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function readAll(): Record<string, Advice> {
  try {
    return JSON.parse(localStorage.getItem(ADVICE_KEY) || "{}") as Record<string, Advice>;
  } catch {
    return {};
  }
}

export function loadAdvice(key: string): Advice | null {
  return readAll()[key] ?? null;
}

function saveAdvice(key: string, advice: Advice) {
  try {
    localStorage.setItem(ADVICE_KEY, JSON.stringify({ ...readAll(), [key]: advice }));
  } catch {
    /* storage full or blocked; the advice is still returned to the caller */
  }
}

/** Forget every cached answer. Used when the event log is erased. */
export function clearAdvice() {
  try {
    localStorage.removeItem(ADVICE_KEY);
  } catch {
    /* nothing stored, nothing to clear */
  }
}

/**
 * Materially different from the figures this advice was based on?
 * Five points of coverage or two hours a week is enough to make it misleading.
 */
export function isStale(a: Advice, now: AdviceBasis): boolean {
  return (
    Math.abs(a.basis.percent - now.percent) >= 5 ||
    Math.abs(a.basis.pace - now.pace) >= 2 ||
    Math.abs(a.basis.requiredPace - now.requiredPace) >= 2
  );
}

export interface AskResult {
  advice: Advice | null;
  /** Set when the call failed. The caller shows the cached advice instead. */
  error: string | null;
}

export interface Upload {
  mimeType: string;
  /** base64, no data: prefix. */
  data: string;
}

export interface Evaluation {
  readBack: string;
  legible: boolean;
  scores: {
    structure: number;
    content: number;
    thinkers: number;
    examples: number;
    demand: number;
  };
  /**
   * What the answer already does, named before what it lacks.
   *
   * A first attempt marked as five simultaneous failures is a first attempt
   * that has no successor, and the app is worth nothing to someone who stops
   * after one. May be empty when the marker genuinely found nothing.
   */
  working?: string;
  weakest: string;
  rewrite: string;
}

/**
 * A photograph of a page is several megabytes; a page of handwriting is legible
 * at about 1400px wide. Resizing in the browser keeps the upload small and the
 * cost down. PDFs are sent as they are — they are already compressed, and
 * re-rendering one in the browser would need a PDF library we do not want.
 */
/**
 * How many pages one answer may run to.
 *
 * Forty marks in thirty-five minutes is three to five sides of handwriting, so
 * a single photograph was never going to be the whole answer. Eight leaves room
 * for a long one and still keeps the request inside the proxy's ceiling.
 */
export const MAX_PAGES = 8;

/**
 * Pages are resized harder than a single page was.
 *
 * One page at 1400px was comfortable; five of them would not fit in a request.
 * 1200px still reads handwriting reliably — the model needs to make out words,
 * not admire the paper — and at quality 0.72 a typical page lands near 200 kB,
 * so five pages is about a megabyte.
 */
export async function prepareUploads(files: File[]): Promise<Upload[]> {
  const chosen = files.slice(0, MAX_PAGES);
  return Promise.all(chosen.map((f) => prepareUpload(f)));
}

export async function prepareUpload(file: File): Promise<Upload> {
  const asBase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
      reader.onerror = () => reject(new Error("could not read the file"));
      reader.readAsDataURL(blob);
    });

  if (file.type === "application/pdf") {
    return { mimeType: "application/pdf", data: await asBase64(file) };
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", 0.72),
  );
  if (!blob) throw new Error("could not prepare the image");
  return { mimeType: "image/jpeg", data: await asBase64(blob) };
}

/** Ask for a page to be read and scored. Returns null if the reply was not usable. */
/**
 * The skeleton of an answer, built the way a candidate who scored 176 in Paper I
 * says he built his.
 *
 * Fixed slots, never prose: the demand broken into its separate obligations, a
 * What/Why/How arc with the contextual sentences that join it, one contemporary
 * example in each of four domains, a counter argued from substance, and
 * thinkers kept in their place. The shape is the teaching — a paragraph of
 * advice would be forgotten by the next question, a structure is reusable.
 */
/**
 * "core" means the demand is not met without it. "yours" means the idea has to
 * appear but the example and the phrasing should be the candidate's own — which
 * is most of the examples, and is the difference between using a model answer
 * and copying one.
 */
export type Obligation = "core" | "yours";

export interface StructureBlock {
  keyword: string;
  mechanism: string;
  thinker?: string;
  specific?: string;
  depth: "full" | "brief";
  must?: Obligation;
}

/**
 * A diagram to copy onto the page, in one of two shapes.
 *
 * "branch" is one label with items hanging off it — a classification, the
 * kinds of a thing, the factors behind it. "flow" is the same items read as
 * stages that lead to one another — a process, a causal chain, a sequence of
 * consequences. The distinction is not decoration: drawing a causal chain as a
 * branch diagram loses the very thing it was drawn to show, which is that each
 * stage follows from the one before it.
 *
 * Absent shape means branch, so every diagram written before this still draws.
 */
export interface Diagram {
  label: string;
  /**
   * Which of the five shapes the toppers' scripts actually use.
   *
   * Taken from Vision IAS's presentation deck, where each is a scan of a real
   * script: Aditya Srivastava (Rank 1, 2023) draws a linear chain of boxes for
   * a causal argument; Medha Anand (Rank 13) writes the central term in the
   * middle of the page and quarters the space around it into labelled groups;
   * the deck's other two are the pyramid and the two-column comparison.
   *
   * All five are drawable with a pen in ninety seconds — that is why they are
   * the ones that show up in scripts. The vocabulary is wider than branch and
   * flow, but the constraint has not moved.
   */
  shape?: "branch" | "flow" | "quadrant" | "pyramid" | "compare";
  items: {
    name: string;
    note: string;
    /** For quadrant and compare: what goes inside this group. */
    points?: string[];
  }[];
  /**
   * A comparison table's rows, where the shape is "compare".
   *
   * The column that makes a comparison worth drawing is the one on the left:
   * without a stated basis, two lists side by side are two lists, and the
   * reader has to work out for themselves what is being held against what.
   * `items[0]` and `items[1]` head the two columns; each row names the basis
   * and what each side says about it.
   */
  rows?: { basis: string; a: string; b: string }[];
}

export interface AnswerStructure {
  demand: { commandWords: string[]; parts: string[]; trap: string };
  /** What to box and underline on the question paper before writing a word. */
  markUp?: { box: string[]; underline: string[] };
  /** The organising principle the command word calls for. */
  skeleton: string;
  opening: { type: string; text: string };
  signpost: string;
  blocks: StructureBlock[];
  /** The one line that turns a two-part answer. Empty when there is one part. */
  pivot?: string;
  /**
   * The diagram to copy onto the page, in the same shape the model answer uses
   * so the two can be held against each other. It used to be a sentence
   * describing a diagram, which is not something anyone can draw, and which
   * nothing stopped the minutes budget from contradicting.
   */
  diagram?: Diagram;
  /** Why prose beats a diagram here. Present only when there is no diagram. */
  insteadOfDiagram?: string;
  close: { type: string; text: string };
  minutes: { section: string; minutes: number }[];
  /**
   * Which pages of the candidate's own notes this was built from, stamped when
   * it was built rather than worked out when it is read.
   *
   * Worked out at read time it would lie: it would report whatever the notes
   * cover now, on a skeleton written weeks ago before they were ever loaded.
   * Absent means the model had no pages — either none were loaded then, or this
   * topic has no section — and the screen says so rather than staying quiet,
   * because "no source shown" and "built from your notes" must not look alike.
   */
  notesFrom?: string;
}

/**
 * A full answer, written the way the scripts are written, for when the skeleton
 * is not enough and the page is still blank.
 *
 * Every part carries the phrases to underline, given verbatim from its own
 * text, so the marking up is reliable rather than a matter of hoping the model
 * emits the right markup. `usedTopics` is the model naming which syllabus
 * topics it drew on — it is checked, because an answer that wanders outside the
 * syllabus teaches a candidate something that cannot be asked.
 */
/**
 * The seven steps, as Sandesh Jain sets them out (AIR 161, 309 in Sociology).
 *
 * These were nearly his and not quite, which is the worst of both: the audit
 * carried a "structure" step he does not have, a "criticism" step he does not
 * have either, and no "define" or "core body" at all. Two parts of the app
 * therefore taught two different seven-step methods, and a method learned as
 * two methods is not learned.
 *
 * Criticism is gone as a step and that is deliberate rather than a loss: in his
 * model the core body is written "as per demand", so a question that says
 * "critically examine" gets criticism inside the body, and one that says
 * "describe" correctly gets none. Making it a step of its own invited the
 * bolted-on limitations paragraph that answers a question nobody set.
 */
export type MethodStep =
  | "demand"
  | "define"
  | "flow"
  | "coreBody"
  | "example"
  | "thinker"
  | "conclusion";

export interface ModelAnswerPart {
  /** Index into ModelAnswer.demands. Absent on answers written before sections. */
  serves?: number;
  kind: "opening" | "signpost" | "block" | "pivot" | "close";
  keyword: string;
  text: string;
  underline: string[];
  thinker?: string;
  specific?: string;
  must?: Obligation;
}

export interface ModelAnswer {
  parts: ModelAnswerPart[];
  /**
   * Where each step of the method landed in this answer.
   *
   * A legend, not a scorecard. Its job is not to grade the model answer — the
   * model answer is supposed to be right — but to show a candidate what to
   * check in their own, which is the only way a seven-step method becomes a
   * habit rather than a page read once.
   */
  method?: { step: MethodStep; state: "used" | "notNeeded"; where: string }[];
  /**
   * The separate things the question obliges, in the order to answer them.
   * One entry, or none, is the common case — most questions ask one thing.
   */
  demands?: { label: string; minutes: number }[];
  /** Whether those demands can be read apart, or run as one argument. */
  independent?: boolean;
  diagram: Diagram;
  /**
   * Datable Indian material to carry into the answer — an Act, a scheme, a
   * Census or survey figure, a committee report.
   *
   * Drafted by the model and therefore NOT to be trusted on sight: its
   * knowledge stops at a training cutoff, so "recent" from it can be a year
   * stale or simply wrong, and a confidently wrong figure in an answer booklet
   * costs more than no figure at all. Every one carries the year it belongs to
   * so it can be checked, and the screen says plainly that checking is the
   * candidate's job. These are a draft to correct, never a source.
   */
  examples?: { text: string; where: string; asOf?: string }[];
  usedTopics: string[];
  words: number;
  /** Ids the model claimed that are not in the syllabus. Shown, never hidden. */
  offSyllabus?: string[];
  /** The notes pages this was written from. See AnswerStructure.notesFrom. */
  notesFrom?: string;
}

/*
 * v4: answers are written to a different brief — a prose opening, pivot and
 * close around labelled blocks, rather than blocks throughout — and carry
 * examples and a diagram shape that v3 answers have no field for. Bumping the
 * key retires the old ones rather than leaving a screen where some answers
 * read one way and some another, with nothing on the page to say why.
 */
const MODEL_KEY = "wbcs.models.v4";

const STRUCTURE_KEY = "wbcs.structures.v4";

/**
 * Kept out of the event log on purpose. It is not something the candidate did,
 * it costs nothing to fetch again, and a log that syncs between devices should
 * not carry model output that would grow it for every question ever asked.
 */
function structureCache(): Record<string, AnswerStructure> {
  try {
    return JSON.parse(localStorage.getItem(STRUCTURE_KEY) ?? "{}") as Record<
      string,
      AnswerStructure
    >;
  } catch {
    return {};
  }
}

/** A short stable key for a question, so the same one is never paid for twice. */
function questionKey(question: string): string {
  let h = 0;
  const text = question.trim().toLowerCase();
  for (let i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  return `q${(h >>> 0).toString(36)}`;
}

export function cachedStructure(question: string): AnswerStructure | null {
  return structureCache()[questionKey(question)] ?? null;
}

/**
 * Throw a skeleton away so the next open writes a new one.
 *
 * Needed the day the notes arrived: a skeleton cached before then was built
 * from what the model knew, and nothing on the screen distinguishes it from
 * one built out of the candidate's own pages. The map is drawn from the
 * skeleton too, so a stale one is stale twice.
 */
export function forgetStructure(question: string) {
  try {
    const all = structureCache();
    delete all[questionKey(question)];
    localStorage.setItem(STRUCTURE_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage: the skeleton stays. Nothing else breaks.
  }
}

/** The notes citation a request carried, if it carried one. */
function citationOf(context: unknown): string | undefined {
  const c = context as { notesCitation?: unknown } | null;
  return typeof c?.notesCitation === "string" ? c.notesCitation : undefined;
}

export async function answerStructure(
  question: string,
  context: unknown,
): Promise<{ result: AnswerStructure | null; error: string | null }> {
  const key = questionKey(question);
  const hit = structureCache()[key];
  if (hit) return { result: hit, error: null };

  {
    const { status, payload, error: reachError } = await askService(
      { task: "structure", context, deviceId: deviceId() },
      120_000,
    );
    if (reachError) return { result: null, error: reachError };
    if (status < 200 || status >= 300) {
      return {
        result: null,
        error: [payload.error ?? `request failed (${status})`, payload.detail]
          .filter(Boolean)
          .join(" — "),
      };
    }

    const text = (payload.body ?? "").replace(/^```(?:json)?|```$/gm, "").trim();

    let parsed: AnswerStructure;
    try {
      parsed = JSON.parse(text) as AnswerStructure;
    } catch {
      // Say which failure this is. The first version answered every one of them
      // with "could not read the reply", which told nobody anything — including
      // the person who wrote it.
      return {
        result: null,
        error: payload.truncated
          ? "The structure came back cut off — it was longer than the reply could hold. Try again; if it keeps happening the limit needs raising."
          : `The reply was not the JSON this expects. It began: ${text.slice(0, 120) || "(nothing)"}`,
      };
    }

    // Stamp what it was actually built from, before it is cached.
    parsed.notesFrom = citationOf(context);

    // An older reply, or an older cache, carried `diagram` as a sentence. Take
    // it as a label rather than letting a string reach a renderer expecting an
    // object — the cache key moved too, so this is belt and braces.
    const d = parsed.diagram as unknown;
    parsed.diagram =
      typeof d === "string"
        ? { label: d, items: [] }
        : d && typeof d === "object" && Array.isArray((d as Diagram).items)
          ? (d as Diagram)
          : { label: "", items: [] };

    // The budget may not bill for a diagram that was not given. The prompt says
    // so; this is what happens when it says so and does it anyway.
    if (!parsed.diagram.label && Array.isArray(parsed.minutes)) {
      const phantom = parsed.minutes.filter((m) => /diagram/i.test(m.section ?? ""));
      if (phantom.length > 0 && phantom.length < parsed.minutes.length) {
        const freed = phantom.reduce((a, m) => a + (m.minutes || 0), 0);
        parsed.minutes = parsed.minutes.filter((m) => !/diagram/i.test(m.section ?? ""));
        // Give the minutes back to the close rather than losing them: the total
        // still reads thirty-five, which is the only number that matters.
        const last = parsed.minutes[parsed.minutes.length - 1];
        if (last) last.minutes += freed;
      }
    }

    if (!parsed?.demand || !Array.isArray(parsed.blocks)) {
      return {
        result: null,
        error: "The reply parsed but was not a structure — no demand or no blocks in it.",
      };
    }

    try {
      localStorage.setItem(STRUCTURE_KEY, JSON.stringify({ ...structureCache(), [key]: parsed }));
    } catch {
      // Full or blocked. It will simply be fetched again next time.
    }
    return { result: parsed, error: null };
  }
}

function modelCache(): Record<string, ModelAnswer> {
  try {
    return JSON.parse(localStorage.getItem(MODEL_KEY) ?? "{}") as Record<string, ModelAnswer>;
  } catch {
    return {};
  }
}

/**
 * Which sources an answer was written from.
 *
 * "default" is the notes leading and Sangwan filling what they are thin on —
 * what nine questions in ten want. "sangwan" is the same question answered out
 * of the textbook alone, for the one in ten where it is worth seeing how a
 * fuller exposition handles it.
 *
 * Both are kept, because the second one costs a call and a comparison you can
 * only make once is not a comparison. The default keeps the bare key it always
 * had, so nothing already written is orphaned by this existing.
 */
export type AnswerSource = "default" | "sangwan";

function variantKey(question: string, source: AnswerSource): string {
  const k = questionKey(question);
  return source === "default" ? k : `${k}::${source}`;
}

export function cachedModelAnswer(
  question: string,
  source: AnswerSource = "default",
): ModelAnswer | null {
  return modelCache()[variantKey(question, source)] ?? null;
}

/**
 * Throw a kept answer away so the next ask writes a fresh one.
 *
 * There was no way to do this, which meant a poor answer was permanent: the
 * cache is what stops the same question being paid for twice, and it was also
 * what stopped anyone ever getting a second opinion. It is the same reason an
 * answer written before a prompt change can never show what the change does —
 * the old one is served forever.
 */
export function forgetModelAnswer(question: string, source: AnswerSource = "default") {
  try {
    const all = modelCache();
    delete all[variantKey(question, source)];
    localStorage.setItem(MODEL_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage: the answer stays. Nothing else breaks.
  }
}

/**
 * One POST to the answer service, for the calls that take a minute.
 *
 * Three things the plain `fetch` did not do. It asks the server to stream a
 * heartbeat, so the connection is never idle long enough for a phone network or
 * a proxy to close it — the closure is what reached the page as the useless
 * "Failed to fetch". It gives up on its own terms after a stated time, so a
 * request that will never land says so instead of hanging. And it turns the
 * three ways this can fail into three different sentences, because "Failed to
 * fetch" is the same words whether the model broke, the connection died or the
 * phone is simply offline, and a candidate cannot act on any of them.
 */
/**
 * How long a model answer actually takes, measured rather than assumed.
 *
 * The button used to say "a few seconds" under it. A thousand words is not a
 * few seconds, and a candidate who is told five and waits fifty concludes the
 * thing is broken and stops using it — which is worse than being told a minute
 * up front. So each completed call records its own duration and the app quotes
 * the median of the last few back. Until there are any, it says it does not
 * know yet, which is at least true.
 */
const TIMING_KEY = "wbcs.answerTimings.v1";
const TIMINGS_KEPT = 7;

function timings(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(TIMING_KEY) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((n): n is number => typeof n === "number" && n > 0) : [];
  } catch {
    return [];
  }
}

function recordTiming(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return;
  try {
    const next = [...timings(), Math.round(ms)].slice(-TIMINGS_KEPT);
    localStorage.setItem(TIMING_KEY, JSON.stringify(next));
  } catch {
    // Full or blocked. The estimate simply stays unknown.
  }
}

/** The median of what this device has seen, in seconds. Null until it knows. */
export function typicalAnswerSeconds(): number | null {
  const all = [...timings()].sort((a, b) => a - b);
  if (all.length === 0) return null;
  return Math.round(all[Math.floor(all.length / 2)]! / 1000);
}

export async function askService(
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ status: number; payload: Payload; error: string | null }> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true }),
      signal: abort.signal,
    });

    // A server old enough not to know about the heartbeat, or any error the
    // platform answered before the handler ran, is still ordinary JSON.
    const kind = res.headers.get("content-type") ?? "";
    if (!kind.includes("ndjson")) {
      const payload = (await res.json().catch(() => ({}))) as Payload;
      return { status: res.status, payload, error: null };
    }

    // Newline-delimited: pings while it works, then one line that is the reply.
    const text = await res.text();
    let last: Payload | null = null;
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t) continue;
      let obj: Payload;
      try {
        obj = JSON.parse(t) as Payload;
      } catch {
        continue;
      }
      if (obj.ping !== undefined) continue;
      last = obj;
    }
    if (!last) {
      return {
        status: 0,
        payload: {},
        error:
          "The connection closed before the answer arrived. It is usually the network rather than the answer — try again.",
      };
    }
    return { status: last.status ?? res.status, payload: last, error: null };
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return {
        status: 0,
        payload: {},
        error: `It took longer than ${Math.round(timeoutMs / 1000)} seconds and was given up on. Try again — a second attempt is usually faster.`,
      };
    }
    const offline = typeof navigator !== "undefined" && navigator.onLine === false;
    return {
      status: 0,
      payload: {},
      error: offline
        ? "You are offline. Everything else in the app still works; this one needs the network."
        : `Could not reach the answer service: ${e instanceof Error ? e.message : String(e)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** What a reply can carry, whichever channel it came down. */
interface Payload {
  status?: number;
  ping?: number;
  body?: string;
  error?: string;
  detail?: string;
  truncated?: boolean;
  ms?: number;
}

export async function modelAnswer(
  question: string,
  context: unknown,
  syllabusIds: string[],
  source: AnswerSource = "default",
): Promise<{ result: ModelAnswer | null; error: string | null }> {
  const key = variantKey(question, source);
  const hit = modelCache()[key];
  if (hit) return { result: hit, error: null };

  {
    // A full answer is about a thousand words. Three minutes is generous for
    // that and still short enough that a dead request does not hang the button.
    const { status, payload, error: reachError } = await askService(
      { task: "model", context, deviceId: deviceId() },
      180_000,
    );
    if (reachError) return { result: null, error: reachError };
    if (status < 200 || status >= 300) {
      return {
        result: null,
        error: [payload.error ?? `request failed (${status})`, payload.detail]
          .filter(Boolean)
          .join(" — "),
      };
    }

    const text = (payload.body ?? "").replace(/^```(?:json)?|```$/gm, "").trim();
    let parsed: ModelAnswer;
    try {
      parsed = JSON.parse(text) as ModelAnswer;
    } catch {
      return {
        result: null,
        error: payload.truncated
          ? "The answer came back cut off — it ran longer than the reply could hold. Try again."
          : `The reply was not the JSON this expects. It began: ${text.slice(0, 120) || "(nothing)"}`,
      };
    }
    if (!Array.isArray(parsed?.parts) || parsed.parts.length === 0) {
      return { result: null, error: "The reply parsed but carried no answer." };
    }

    // Check the syllabus claim rather than trusting it. A model answer that
    // strays outside the syllabus costs a candidate time on something that
    // cannot be asked, so where it happens the app says so on the page.
    const allowed = new Set(syllabusIds);
    parsed.offSyllabus = (parsed.usedTopics ?? []).filter((id) => !allowed.has(id));
    parsed.diagram = parsed.diagram ?? { label: "", items: [] };
    parsed.notesFrom = citationOf(context);

    // Sections are optional and must stay optional. An answer cached before
    // this existed has no demands and no serves, and renders flat — which is
    // also what a single-demand question should do, so the two cases collapse
    // into one and there is no cache to bump.
    if (!Array.isArray(parsed.method)) parsed.method = [];

    /*
     * An example with nothing to say where it goes is not usable in an answer,
     * and one the model would not date is one it is not sure of. Both are
     * dropped here rather than rendered with a hole in them.
     */
    parsed.examples = (Array.isArray(parsed.examples) ? parsed.examples : []).filter(
      (e) => e && typeof e.text === "string" && e.text.trim() && typeof e.where === "string",
    );

    if (!Array.isArray(parsed.demands)) parsed.demands = [];
    parsed.demands = parsed.demands.filter((x) => x && typeof x.label === "string" && x.label);
    const last = parsed.demands.length - 1;
    for (const part of parsed.parts) {
      const n = typeof part.serves === "number" ? Math.round(part.serves) : 0;
      part.serves = Math.min(Math.max(0, n), Math.max(0, last));
    }

    if (payload.ms) recordTiming(payload.ms);

    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify({ ...modelCache(), [key]: parsed }));
    } catch {
      // Full or blocked; it will be fetched again next time.
    }
    return { result: parsed, error: null };
  }
}

/**
 * A one-glance revision card for a topic.
 *
 * Deliberately the smallest thing that still lets someone write a passable
 * answer. On a tired evening the choice is not between this and the chapter,
 * it is between this and nothing — and for a candidate who already knows the
 * basics it is the main surface rather than the fallback, because what they
 * need is the answer kit, not the exposition.
 *
 * One per topic, so there are eighty-five of these in the world. Generated once
 * and kept, unlike a model answer, which is per question.
 */
export interface CheatSheet {
  must: { term: string; line: string }[];
  thinkers: { name: string; for: string }[];
  specifics: string[];
  diagram?: Diagram;
  trap: string;
  askedAs: string[];
  usedTopics?: string[];
  offSyllabus?: string[];
}

const CHEAT_KEY = "wbcs.cheats.v1";

function cheatCache(): Record<string, CheatSheet> {
  try {
    return JSON.parse(localStorage.getItem(CHEAT_KEY) ?? "{}") as Record<string, CheatSheet>;
  } catch {
    return {};
  }
}

export function cachedCheatSheet(topicId: string): CheatSheet | null {
  return cheatCache()[topicId] ?? null;
}

/** Every topic that already has a card. */
export function cheatSheetIds(): string[] {
  return Object.keys(cheatCache());
}

/**
 * Throw a card away so the next ask writes a fresh one.
 *
 * The same gap the model answers had: a card written under an older set of
 * method rules is served for ever, and a poor one can never be replaced.
 */
export function forgetCheatSheet(topicId: string) {
  try {
    const all = cheatCache();
    delete all[topicId];
    localStorage.setItem(CHEAT_KEY, JSON.stringify(all));
  } catch {
    // Blocked storage: the card stays. Nothing else breaks.
  }
}

export async function cheatSheet(
  topicId: string,
  context: unknown,
  syllabusIds: string[],
): Promise<{ result: CheatSheet | null; error: string | null }> {
  const hit = cheatCache()[topicId];
  if (hit) return { result: hit, error: null };

  const { status, payload, error: reachError } = await askService(
    { task: "cheatsheet", context, deviceId: deviceId() },
    90_000,
  );
  if (reachError) return { result: null, error: reachError };
  if (status < 200 || status >= 300) {
    return {
      result: null,
      error: [payload.error ?? `request failed (${status})`, payload.detail]
        .filter(Boolean)
        .join(" — "),
    };
  }

  const text = (payload.body ?? "").replace(/^```(?:json)?|```$/gm, "").trim();
  let parsed: CheatSheet;
  try {
    parsed = JSON.parse(text) as CheatSheet;
  } catch {
    return {
      result: null,
      error: payload.truncated
        ? "The card came back cut off. Try again."
        : `The reply was not the JSON this expects. It began: ${text.slice(0, 120) || "(nothing)"}`,
    };
  }
  if (!Array.isArray(parsed?.must) || parsed.must.length === 0) {
    return { result: null, error: "The reply parsed but carried no card." };
  }

  const d = parsed.diagram as unknown;
  parsed.diagram =
    d && typeof d === "object" && Array.isArray((d as Diagram).items)
      ? (d as Diagram)
      : { label: "", items: [] };

  const allowed = new Set(syllabusIds);
  parsed.offSyllabus = (parsed.usedTopics ?? []).filter((id) => !allowed.has(id));

  try {
    localStorage.setItem(CHEAT_KEY, JSON.stringify({ ...cheatCache(), [topicId]: parsed }));
  } catch {
    // Full or blocked; it will be fetched again next time.
  }
  return { result: parsed, error: null };
}

export async function evaluate(
  context: unknown,
  files: Upload[],
): Promise<{ result: Evaluation | null; error: string | null }> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `file` as well as `files`: a deployment can serve a cached client for a
      // while after the proxy updates, and an answer refused because the two
      // halves disagree about a field name is a page of handwriting wasted.
      body: JSON.stringify({
        task: "evaluate",
        context,
        files,
        file: files[0],
        deviceId: deviceId(),
      }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      body?: string;
      error?: string;
      detail?: string;
      truncated?: boolean;
    };

    if (!res.ok) {
      return {
        result: null,
        error: [payload.error ?? `request failed (${res.status})`, payload.detail]
          .filter(Boolean)
          .join(" — "),
      };
    }

    // The model was asked for JSON alone, but a stray fence is common enough
    // to be worth surviving.
    const text = (payload.body ?? "").replace(/^```(?:json)?|```$/gm, "").trim();
    try {
      const parsed = JSON.parse(text) as Evaluation;
      if (!parsed?.scores) {
        return { result: null, error: "The reply parsed but carried no scores." };
      }
      return { result: parsed, error: null };
    } catch {
      return {
        result: null,
        error: payload.truncated
          ? "The marking came back cut off. Try again — the pages may be more than one reply can carry."
          : `The reply was not the JSON this expects. It began: ${text.slice(0, 120) || "(nothing)"}`,
      };
    }
  } catch (e) {
    return {
      result: null,
      error: `Could not reach the marker: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export async function ask(
  key: string,
  task: AiTask,
  context: unknown,
  basis: AdviceBasis,
): Promise<AskResult> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, context, deviceId: deviceId() }),
    });

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        detail?: string;
      };
      // The proxy passes the model's own refusal through in `detail`. Showing it
      // is the difference between "it failed" and knowing which setting is wrong.
      const reason = [payload.error ?? `request failed (${res.status})`, payload.detail]
        .filter(Boolean)
        .join(" — ");
      return { advice: loadAdvice(key), error: reason };
    }

    const data = (await res.json()) as {
      body: string;
      generatedAt: string;
      truncated?: boolean;
    };
    const advice: Advice = { task, generatedAt: data.generatedAt, basis, body: data.body };
    saveAdvice(key, advice);
    return {
      advice,
      error: data.truncated ? "the answer was cut short — ask again" : null,
    };
  } catch {
    return { advice: loadAdvice(key), error: "no connection" };
  }
}

/** "12 August, when you were at 11.4 h/wk against 18.2 required" */
export function describeBasis(a: Advice): string {
  const when = new Date(a.generatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return `${when}, when you were at ${a.basis.percent}% and ${a.basis.pace} h/wk against ${a.basis.requiredPace} required`;
}
