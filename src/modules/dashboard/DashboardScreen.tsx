import { useEffect, useState } from "react";
import { TOPICS } from "../../data/syllabus";
import { quoteOfTheDay } from "../../data/quotes";
import type { CheckId, Derived, Settings } from "../../lib/events";
import {
  CHECKS,
  coreProgress,
  daysUntil,
  freshness,
  hoursFor,
  progress,
  projection,
  requiredPace,
  revisionLoad,
  streak,
} from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { WeeklyReview } from "./WeeklyReview";
import { TodaysFocus } from "./TodaysFocus";
import type { RouteId } from "../../app/routes";

/** Share of the syllabus, by hours, that has a given check ticked. */
function checkPercent(d: Derived, check: string) {
  let done = 0;
  let total = 0;
  for (const t of TOPICS) {
    const h = hoursFor(d, t);
    total += h;
    if (d.checks[t.id]?.[check as never]) done += h;
  }
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

function Ring({ percent }: { percent: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  // Draw from empty on mount. Real value, arriving — not invented liveness.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(percent));
    return () => cancelAnimationFrame(id);
  }, [percent]);
  return (
    <svg viewBox="0 0 110 110" width={110} height={110} role="img" aria-label={`${percent}% complete`}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
      <circle
        cx="55"
        cy="55"
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
        transform="rotate(-90 55 55)"
        style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <text
        x="55"
        y="52"
        textAnchor="middle"
        className="num"
        fontSize="22"
        fill="var(--text)"
      >
        {percent}%
      </text>
      <text x="55" y="68" textAnchor="middle" fontSize="9" fill="var(--muted)">
        complete
      </text>
    </svg>
  );
}

function Tile({
  value,
  unit,
  label,
  tint = 1,
  strong = false,
}: {
  value: string | number;
  unit?: string;
  label: string;
  tint?: 0 | 1 | 2 | 3;
  strong?: boolean;
}) {
  return (
    <div
      className="card stage"
      style={{
        padding: "15px 16px",
        background: `var(--tint-${tint})`,
        borderColor: `var(--tint-${tint}-line)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <span
          className="num"
          style={{ fontSize: strong ? 30 : 25, color: C.text, fontWeight: 600 }}
        >
          {value}
        </span>
        {unit && <span style={{ fontSize: 13.5, color: C.muted }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Bar({ percent, tint }: { percent: number; tint: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: tint,
          borderRadius: 3,
          transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

export function DashboardScreen({
  d,
  go,
  onToggle,
}: {
  d: Derived;
  go: (r: RouteId) => void;
  onToggle: (topicId: string, check: CheckId) => void;
}) {
  const settings = d.settings as Settings;
  const p = progress(d);
  const core = coreProgress(d);
  const proj = projection(d);
  const need = requiredPace(d);
  const quote = quoteOfTheDay();
  const fresh = freshness(d);
  const backlog = revisionLoad(d);
  const days = daysUntil(settings.examDate);
  const run = streak(d);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = settings.name?.trim();

  return (
    <div className="grid grid-main">
      <div className="grid" style={{ gap: 14, minWidth: 0 }}>
        <section
          className="card"
          style={{
            padding: "22px 24px",
            background: "linear-gradient(135deg, var(--rail) 0%, var(--rail-2) 100%)",
            border: "1px solid var(--rail-line)",
            color: "var(--rail-text)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
            {name ? `${greeting}, ${name}.` : "Crack WBCS Sociology"}
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 15, color: "var(--rail-muted)" }}>
            Concept-driven · PYQ-focused · Answer-oriented
          </p>
        </section>

        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <Tile value={days} unit="days" label="Until your exam" tint={0} strong />
          <Tile
            value={run.current}
            unit={run.current === 1 ? "day" : "days"}
            label={run.today ? "Streak — today counted" : "Streak — nothing yet today"}
            tint={run.current > 0 ? 3 : 2}
            strong
          />
          <Tile value={core.topicCount} label="Topics in your plan" tint={1} />
          <Tile
            value={Math.round(settings.targetCoverage * 100)}
            unit="%"
            label="Coverage target"
            tint={1}
          />
        </div>

        <WeeklyReview d={d} />

        <Card title="Where the time is going">
          <p style={{ fontSize: 15, lineHeight: 1.8, margin: 0, color: C.text }}>
            You need <strong className="num">{need}</strong> hours a week to reach{" "}
            {Math.round(settings.targetCoverage * 100)}% by exam day.{" "}
            {proj.feasible ? (
              <span style={{ color: C.good }}>Your current pace gets there.</span>
            ) : (
              <span style={{ color: C.warn }}>
                Your current pace lands at {proj.percent}%.
              </span>
            )}
          </p>
          {backlog > 0 && (
            <p style={{ fontSize: 14, color: C.muted, margin: "10px 0 0", lineHeight: 1.7 }}>
              {backlog} hours of revision are overdue. Those hours come out of the week
              before new topics, so the backlog slows new coverage rather than being ignored.
            </p>
          )}
        </Card>
      </div>

      <div className="grid" style={{ gap: 14, minWidth: 0 }}>
        <TodaysFocus d={d} go={go} onToggle={onToggle} />

        <Card title="Overall progress">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Ring percent={p.percent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {CHECKS.map((c) => {
                const pct = checkPercent(d, c.id);
                return (
                  <div key={c.id} style={{ padding: "6px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 14,
                        color: C.muted,
                        marginBottom: 5,
                      }}
                    >
                      <span>{c.label}</span>
                      <span className="num" style={{ color: C.text }}>
                        {pct}%
                      </span>
                    </div>
                    <Bar percent={pct} tint={C.accent} />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <Card title="Syllabus coverage">
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: "var(--line)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${core.percent}%`,
                height: "100%",
                background: C.accent,
                borderRadius: 4,
              }}
            />
          </div>
          <p style={{ fontSize: 14, color: C.muted, margin: "10px 0 0" }}>
            <span className="num">{core.topicsComplete}</span> of{" "}
            <span className="num">{core.topicCount}</span> planned topics at depth
            {fresh.percent !== null && ` · ${fresh.percent}% of revision still fresh`}
          </p>
        </Card>

        <section
          className="card"
          style={{ padding: 16, borderLeft: `3px solid ${C.accent}` }}
        >
          <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.7, fontStyle: "italic" }}>
            “{quote.text}”
          </blockquote>
          <div style={{ fontFamily: C.mono, fontSize: 12.5, color: C.muted, marginTop: 10 }}>
            {quote.who} · {quote.where}
          </div>
        </section>
      </div>
    </div>
  );
}
