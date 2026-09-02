import { useState } from "react";
import type { Derived, Settings } from "../../lib/events";
import {
  coreProgress,
  effectivePace,
  observedPace,
  packWeeks,
  progress,
  projection,
  requiredPace,
  revisionLoad,
} from "../../lib/planner";
import { ask, describeBasis, isStale, loadAdvice, type Advice } from "../../lib/ai";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

const KEY = "critique";

/**
 * The weekly read on your own numbers.
 *
 * Everything the model sees was computed by the planner first — it interprets,
 * it never calculates. One call a week by design: it is the cheapest AI feature
 * and the highest signal, because it is the only one that sees the event log.
 */
export function WeeklyReview({ d }: { d: Derived }) {
  const settings = d.settings as Settings;
  const [advice, setAdvice] = useState<Advice | null>(() => loadAdvice(KEY));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const p = progress(d);
  const core = coreProgress(d);
  const proj = projection(d);
  const basis = {
    percent: p.percent,
    pace: effectivePace(d),
    requiredPace: requiredPace(d),
  };

  async function run() {
    setBusy(true);
    setError(null);
    const week = packWeeks(d, 1)[0];
    const result = await ask(KEY, "critique", {
      coveragePercent: p.percent,
      plannedCoveragePercent: core.percent,
      targetPercent: Math.round(settings.targetCoverage * 100),
      hoursPerWeekPlanned: settings.weeklyHours,
      hoursPerWeekMeasured: observedPace(d),
      hoursPerWeekRequired: basis.requiredPace,
      projectedPercentAtCurrentPace: proj.percent,
      projectionIsBasedOnMeasuredWork: proj.measured,
      overdueRevisionHours: revisionLoad(d),
      thisWeekNewHours: week?.hours ?? 0,
      thisWeekRevisionHours: week?.revisionHours ?? 0,
      topicsAtDepth: core.topicsComplete,
      topicsPlanned: core.topicCount,
    }, basis);
    setAdvice(result.advice);
    setError(result.error);
    setBusy(false);
  }

  const stale = advice ? isStale(advice, basis) : false;

  return (
    <Card
      title="This week's review"
      action={
        <button
          onClick={run}
          title="Read your last week back — what moved, what stalled, and what to do next."
          disabled={busy}
          style={{
            minHeight: 36,
            padding: "0 14px",
            borderRadius: 8,
            border: "none",
            background: busy ? C.line : C.accent,
            color: busy ? C.muted : C.accentInk,
            font: "inherit",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: busy ? "default" : "pointer",
          }}
        >
          {busy ? "Reading…" : advice ? "Refresh" : "Read my numbers"}
        </button>
      }
    >
      {advice ? (
        <>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
            {advice.body}
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
            {stale && (
              <strong style={{ color: C.warn }}>Your figures have moved since this. </strong>
            )}
            Based on {describeBasis(advice)}.
          </p>
        </>
      ) : (
        <p style={{ margin: 0, fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          Once a week, have the numbers read back to you. Nothing here decides a
          date or a percentage — the planner computes, this only interprets.
        </p>
      )}

      {error && (
        <p style={{ fontSize: 13, color: C.warn, margin: "12px 0 0", lineHeight: 1.6, wordBreak: "break-word" }}>
          Could not reach the model ({error}).
          {advice ? " Showing the last saved review above." : " Your figures on this page are unaffected."}
        </p>
      )}
    </Card>
  );
}
