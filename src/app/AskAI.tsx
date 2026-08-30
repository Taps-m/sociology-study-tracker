import { useState } from "react";
import type { Derived, Settings } from "../lib/events";
import { effectivePace, progress, requiredPace } from "../lib/planner";
import { ask } from "../lib/ai";
import { C } from "../lib/theme";
import type { RouteId } from "./routes";

/**
 * Ask a question, scoped to the subject.
 *
 * PLAN.md §7 3c: keep it bound to the syllabus so it does not drift into general
 * chat. The prompt is told to answer the part that belongs to Sociology and say
 * plainly when the rest does not — which is cheaper and more honest than
 * refusing outright.
 */
export function AskAI({ d, route }: { d: Derived; route: RouteId }) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settings = d.settings as Settings;
  const basis = {
    percent: progress(d).percent,
    pace: effectivePace(d),
    requiredPace: requiredPace(d),
  };

  async function send() {
    if (!question.trim() || busy) return;
    setBusy(true);
    setError(null);
    const res = await ask(`doubt:${Date.now()}`, "doubt", {
      question: question.trim(),
      screen: route,
      coveragePercent: basis.percent,
      targetPercent: Math.round(settings.targetCoverage * 100),
    }, basis);
    setAnswer(res.advice?.body ?? null);
    setError(res.error);
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 40,
          minHeight: 48,
          padding: "0 20px",
          borderRadius: 999,
          border: "none",
          background: C.accent,
          color: C.accentInk,
          font: "inherit",
          fontSize: 14.5,
          fontWeight: 600,
          boxShadow: "0 6px 20px rgba(16, 27, 61, 0.25)",
          cursor: "pointer",
        }}
      >
        Ask AI
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Ask a question"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 40,
        width: "min(420px, calc(100vw - 32px))",
        maxHeight: "min(70vh, 620px)",
        overflowY: "auto",
        padding: 16,
        borderRadius: 14,
        background: C.panel,
        border: `1px solid ${C.line}`,
        boxShadow: "0 10px 40px rgba(16, 27, 61, 0.22)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 15 }}>Ask about sociology</strong>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          style={{
            border: "none",
            background: "transparent",
            color: C.muted,
            font: "inherit",
            fontSize: 20,
            cursor: "pointer",
            minHeight: 36,
            minWidth: 36,
          }}
        >
          ×
        </button>
      </div>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. How is Durkheim's anomie different from Merton's?"
        rows={3}
        maxLength={600}
        style={{
          width: "100%",
          marginTop: 12,
          padding: 11,
          borderRadius: 9,
          border: `1px solid ${C.line}`,
          background: C.raised,
          color: C.text,
          font: "inherit",
          fontSize: 14.5,
          resize: "vertical",
        }}
      />

      <button
        onClick={send}
        disabled={busy || !question.trim()}
        style={{
          width: "100%",
          minHeight: 42,
          marginTop: 10,
          borderRadius: 9,
          border: "none",
          background: busy || !question.trim() ? C.line : C.accent,
          color: busy || !question.trim() ? C.muted : C.accentInk,
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          cursor: busy || !question.trim() ? "default" : "pointer",
        }}
      >
        {busy ? "Thinking…" : "Ask"}
      </button>

      {answer && (
        <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: "14px 0 0", whiteSpace: "pre-wrap" }}>
          {answer}
        </p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: C.warn, margin: "12px 0 0", lineHeight: 1.6 }}>
          Could not reach the model ({error}).
        </p>
      )}

      <p style={{ fontSize: 12, color: C.muted, margin: "14px 0 0", lineHeight: 1.6 }}>
        Answers are generated and can be wrong. Check anything you intend to write
        in the exam against your own texts.
      </p>
    </div>
  );
}
