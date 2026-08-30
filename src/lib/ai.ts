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

export type AiTask = "critique" | "guidance" | "evaluate" | "insight" | "doubt";

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
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((r) =>
    canvas.toBlob(r, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("could not prepare the image");
  return { mimeType: "image/jpeg", data: await asBase64(blob) };
}

/** Ask for a page to be read and scored. Returns null if the reply was not usable. */
export async function evaluate(
  context: unknown,
  file: Upload,
): Promise<{ result: Evaluation | null; error: string | null }> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task: "evaluate", context, file, deviceId: deviceId() }),
    });

    const payload = (await res.json().catch(() => ({}))) as {
      body?: string;
      error?: string;
      detail?: string;
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
    const parsed = JSON.parse(text) as Evaluation;
    if (!parsed?.scores) return { result: null, error: "the reply was not a score" };
    return { result: parsed, error: null };
  } catch {
    return { result: null, error: "could not read the reply" };
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
