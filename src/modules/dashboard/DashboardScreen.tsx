import { useEffect, useState } from "react";
import { quoteOfTheDay } from "../../data/quotes";
import { TOPICS } from "../../data/syllabus";
import type { CheckId, Derived, Settings } from "../../lib/events";
import {
  CHECKS,
  daysLeft,
  windowLabel,
  hoursFor,
  progress,
  standingOf,
  streak,
  type Standing,
} from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import type { RouteId } from "../../app/routes";
import { WeeklyReview } from "./WeeklyReview";
import { TodaysFocus } from "./TodaysFocus";
import { TonightsDrill } from "../drill/TonightsDrill";
import { StudiedToday } from "./StudiedToday";

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

const STANDING_COLOUR: Record<Standing, string> = {
  none: "var(--muted)",
  ahead: "var(--good)",
  close: "var(--warn)",
  behind: "#dc2626",
};

const STANDING_WORD: Record<Standing, string> = {
  none: "not started",
  ahead: "keeping up",
  close: "slipping",
  behind: "behind",
};

function Ring({ percent, colour }: { percent: number; colour: string }) {
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
        stroke={colour}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${(shown / 100) * circumference} ${circumference}`}
        transform="rotate(-90 55 55)"
        style={{
          transition:
            "stroke-dasharray 900ms cubic-bezier(0.22, 1, 0.36, 1), stroke 400ms ease",
        }}
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

function Bar({ percent, colour }: { percent: number; colour: string }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
      <div
        style={{
          width: `${percent}%`,
          height: "100%",
          background: colour,
          borderRadius: 3,
          transition: "width 700ms cubic-bezier(0.22, 1, 0.36, 1), background 400ms ease",
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
  const standing = standingOf(d, p.percent);
  const quote = quoteOfTheDay();
  const run = streak(d);
  const days = daysLeft(settings);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="dash">
      <header className="dash-full" style={{ padding: "2px 2px 0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
          {greeting}.
        </h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "6px 0 0" }}>
          {days === null ? (
            "No preparation window set"
          ) : days === 0 ? (
            <>Your {windowLabel(settings)} has finished</>
          ) : (
            <>
              <span className="num">{days}</span> {days === 1 ? "day" : "days"} left in your{" "}
              {windowLabel(settings)}
            </>
          )}{" · "}
          {run.current > 0 ? (
            <span className="num">{run.current}-day streak</span>
          ) : (
            "no streak yet"
          )}
        </p>
      </header>

      {/*
        Two columns, both of which carry something.

        The dashboard was one tall column of four cards beside a single short
        one, so most of a wide screen sat permanently blank below "Today's
        focus" while everything else was squeezed into half the width for no
        reason.

        Split by what the card asks of you rather than by what it is about. The
        left column is where you write something — tonight's block, and what you
        studied today. The right is where you read and tick: the checklist, the
        weekly reading, the wheel. That keeps a cursor on one side of the screen
        and keeps both columns roughly the same height, which is the only reason
        the old layout looked broken.
      */}
      <div className="grid" style={{ gap: 13, minWidth: 0 }}>
        <TonightsDrill d={d} />

        <StudiedToday d={d} onToggle={onToggle} />

        <section className="card" style={{ padding: 14, borderLeft: `3px solid ${C.accent}` }}>
          <blockquote style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, fontStyle: "italic" }}>
            “{quote.text}”
          </blockquote>
          <div style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, marginTop: 8 }}>
            {quote.who} · {quote.where}
          </div>
        </section>
      </div>

      <div className="grid" style={{ gap: 13, minWidth: 0 }}>
        <TodaysFocus d={d} go={go} onToggle={onToggle} />

        <WeeklyReview d={d} />

        <Card
        title="Overall progress"
        action={
          <span style={{ fontSize: 13, color: STANDING_COLOUR[standing], fontWeight: 600 }}>
            {STANDING_WORD[standing]}
          </span>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Ring percent={p.percent} colour={STANDING_COLOUR[standing]} />
          <div style={{ flex: 1, minWidth: 220 }}>
            {CHECKS.map((c) => {
              const pct = checkPercent(d, c.id);
              const s = standingOf(d, pct);
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
                  <Bar percent={pct} colour={STANDING_COLOUR[s]} />
                </div>
              );
            })}
          </div>
        </div>
        </Card>

      </div>
    </div>
  );
}
