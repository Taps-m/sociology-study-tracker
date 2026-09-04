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
import { Icon } from "../../app/Icon";
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
      <header
        className="dash-full"
        style={{ padding: "2px 2px 0", display: "flex", alignItems: "flex-start", gap: 12 }}
      >
        {/*
          The one place the name is worth having.

          It is collected in setup, described there as "only used to greet you",
          and then was not used to greet anyone — the heading read "Good
          afternoon." to a field the app had asked for and ignored.
        */}
        <span style={{ color: "var(--accent)", marginTop: 4, flex: "0 0 auto" }}>
          <Icon name="sprout" size={26} />
        </span>
        <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
          {greeting}
          {settings.name ? `, ${settings.name}` : ""}.
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
        </div>
      </header>

      {/*
        What you did, before anything the app has to say about it.

        Everything below this card is computed from the log: tonight's drill is
        aimed at whatever the record says keeps going wrong, and today's list is
        what the record says is left. An evening that was studied and not
        recorded makes both of them answer the wrong question — so the app asks
        before it advises, at the top, across the width, where it cannot be
        mistaken for one more thing to read.
      */}
      <div className="dash-full">
        <StudiedToday d={d} onToggle={onToggle} />
      </div>

      {/*
        Two columns, both of which carry something.

        The dashboard was one tall column of four cards beside a single short
        one, so most of a wide screen sat permanently blank below "Today's
        focus" while everything else was squeezed into half the width for no
        reason.

        Left is the long view: the block you write tonight, and the wheel that
        says how far the whole thing has got. Right is today — what is on the list, what
        you have just finished, how the week reads, and a line worth carrying
        out of the app. Two columns of roughly equal height, which is the only
        reason the old one looked broken.
      */}
      <div className="grid" style={{ gap: 13, minWidth: 0 }}>
        <TonightsDrill d={d} />

        <Card
          title="Overall progress"
          icon="trend"
        action={
          <span
            style={{
              fontSize: 12.5,
              fontWeight: 600,
              color: STANDING_COLOUR[standing],
              background: "var(--raised)",
              border: `1px solid ${STANDING_COLOUR[standing]}`,
              borderRadius: 999,
              padding: "3px 10px",
              whiteSpace: "nowrap",
            }}
          >
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

      <div className="grid" style={{ gap: 13, minWidth: 0 }}>
        <TodaysFocus d={d} go={go} onToggle={onToggle} />

        <WeeklyReview d={d} />

        <section
          className="card"
          style={{ padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}
        >
          <span style={{ color: C.accent, opacity: 0.55, flex: "0 0 auto", marginTop: 1 }}>
            <Icon name="quote" size={22} />
          </span>
          <div style={{ minWidth: 0 }}>
            <blockquote
              style={{ margin: 0, fontSize: 14.5, lineHeight: 1.65, fontStyle: "italic" }}
            >
              “{quote.text}”
            </blockquote>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>
              — {quote.who} · {quote.where}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
