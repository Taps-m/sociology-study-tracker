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
  | "guidance"
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

/** A branch diagram: one label, and the items hanging off it. */
export interface Diagram {
  label: string;
  items: { name: string; note: string }[];
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
export interface ModelAnswerPart {
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
  diagram: Diagram;
  usedTopics: string[];
  words: number;
  /** Ids the model claimed that are not in the syllabus. Shown, never hidden. */
  offSyllabus?: string[];
}

const MODEL_KEY = "wbcs.models.v2";

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

export function cachedModelAnswer(question: string): ModelAnswer | null {
  return modelCache()[questionKey(question)] ?? null;
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
}

export async function modelAnswer(
  question: string,
  context: unknown,
  syllabusIds: string[],
): Promise<{ result: ModelAnswer | null; error: string | null }> {
  const key = questionKey(question);
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

    try {
      localStorage.setItem(MODEL_KEY, JSON.stringify({ ...modelCache(), [key]: parsed }));
    } catch {
      // Full or blocked; it will be fetched again next time.
    }
    return { result: parsed, error: null };
  }
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
