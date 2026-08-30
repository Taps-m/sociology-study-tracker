import { useEffect, useState } from "react";
import { quoteOfTheDay } from "../../data/quotes";
import { TOPICS } from "../../data/syllabus";
import type { CheckId, Derived, Settings } from "../../lib/events";
import { CHECKS, daysUntil, hoursFor, progress, streak } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import type { RouteId } from "../../app/routes";
import { WeeklyReview } from "./WeeklyReview";
import { TodaysFocus } from "./TodaysFocus";

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
  // Draw from empty on mount, so the figure arrives rather than being there.
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
      <text x="55" y="52" textAnchor="middle" className="num" fontSize="22" fill="var(--text)">
        {percent}%
      </text>
      <text x="55" y="68" textAnchor="middle" fontSize="9" fill="var(--muted)">
        complete
      </text>
    </svg>
  );
}

function Bar({ percent }: { percent: number }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: C.accent,
          borderRadius: 3,
          transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}

/**
 * One column, four cards, in the order you would use them: what to do now, how
 * the week is going, how far along you are, and something worth reading.
 *
 * Everything else that was here has gone. The stat tiles either never changed
 * (syllabus size, coverage target) or repeated a card below them, and two cards
 * said the same thing twice — the ring and "syllabus coverage", the pace
 * paragraph and the weekly review.
 */
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
  const quote = quoteOfTheDay();
  const run = streak(d);
  const days = daysUntil(settings.examDate);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = settings.name?.trim();

  return (
    <div className="grid" style={{ gap: 14, maxWidth: 760 }}>
      <header style={{ padding: "4px 2px 2px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
          {name ? `${greeting}, ${name}.` : greeting}
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "6px 0 0" }}>
          <span className="num">{days}</span> days until your exam ·{" "}
          {run.current > 0 ? (
            <span className="num">{run.current}-day streak</span>
          ) : (
            "no streak yet"
          )}
        </p>
      </header>

      <TodaysFocus d={d} go={go} onToggle={onToggle} />

      <WeeklyReview d={d} />

      <Card title="Overall progress">
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Ring percent={p.percent} />
          <div style={{ flex: 1, minWidth: 220 }}>
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
                  <Bar percent={pct} />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <section className="card" style={{ padding: 16, borderLeft: `3px solid ${C.accent}` }}>
        <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.7, fontStyle: "italic" }}>
          “{quote.text}”
        </blockquote>
        <div style={{ fontFamily: C.mono, fontSize: 12.5, color: C.muted, marginTop: 10 }}>
          {quote.who} · {quote.where}
        </div>
      </section>
    </div>
  );
}
