import { useState } from "react";
import type { Derived, Settings } from "../../lib/events";
import type { Topic } from "../../data/syllabus";
import { completionOf, depthFor, hoursFor, packWeeks, type WeekPlan } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { briefFor } from "../../data/briefs";
import { MindMap, Takeaways } from "./MindMap";
import { ask } from "../../lib/ai";
import { effectivePace, progress, requiredPace } from "../../lib/planner";

const BASE_TABS = ["Thinkers", "PYQ focus", "Insight"] as const;
type Tab = "Mind map" | "Overview" | (typeof BASE_TABS)[number];

/** The unit that most of a week's hours belong to — what the week is "about". */
function focusOf(week: WeekPlan, d: Derived): string {
  const byUnit = new Map<string, number>();
  for (const t of week.topics) byUnit.set(t.unit, (byUnit.get(t.unit) ?? 0) + hoursFor(d, t));
  let best = "";
  let most = -1;
  for (const [unit, h] of byUnit) if (h > most) [best, most] = [unit, h];
  return best || "Revision";
}

function WeekCard({
  week,
  d,
  active,
  onClick,
}: {
  week: WeekPlan;
  d: Derived;
  active: boolean;
  onClick: () => void;
}) {
  const done = week.topics.filter((t) => completionOf(d, t.id) >= depthFor(d, t)).length;
  const tasks = week.topics.length + week.revisions.length;

  return (
    <button
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      style={{
        flex: "0 0 172px",
        textAlign: "left",
        padding: 12,
        borderRadius: 11,
        cursor: "pointer",
        font: "inherit",
        background: active ? "var(--accent-soft)" : C.panel,
        border: `1px solid ${active ? C.accent : C.line}`,
        color: C.text,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 15 }}>
          {week.weekIndex === 0 ? "This week" : `Week ${week.weekIndex + 1}`}
        </strong>
        {active && (
          <span
            style={{
              fontSize: 11.5,
              padding: "3px 8px",
              borderRadius: 999,
              background: C.accent,
              color: C.accentInk,
            }}
          >
            In progress
          </span>
        )}
      </div>

      <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.45, minHeight: 34 }}>
        {focusOf(week, d)}
      </div>

      <div
        style={{
          height: 5,
          borderRadius: 3,
          background: "var(--line)",
          overflow: "hidden",
          marginTop: 10,
        }}
      >
        <div
          style={{
            width: tasks === 0 ? "0%" : `${(done / tasks) * 100}%`,
            height: "100%",
            background: C.accent,
          }}
        />
      </div>
      <div className="num" style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
        {done} / {tasks} tasks · {week.totalHours} h
      </div>
    </button>
  );
}

function TopicList({ topics, d, note }: { topics: Topic[]; d: Derived; note?: (t: Topic) => string }) {
  if (topics.length === 0) {
    return <p style={{ fontSize: 14.5, color: C.muted, margin: 0 }}>Nothing this week.</p>;
  }
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {topics.map((t) => (
        <li
          key={t.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            padding: "9px 0",
            borderBottom: `1px solid ${C.hair}`,
            fontSize: 14.5,
            lineHeight: 1.5,
          }}
        >
          <span>{t.name}</span>
          <span className="num" style={{ color: C.muted, whiteSpace: "nowrap" }}>
            {note ? note(t) : `${hoursFor(d, t)} h`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function PlanScreen({ d }: { d: Derived }) {
  const weeks = packWeeks(d, 8);
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<Tab>("Mind map");
  const settings = d.settings as Settings;

  if (weeks.length === 0) {
    return <Card title="Study plan">Nothing to schedule yet.</Card>;
  }

  const week = weeks[Math.min(selected, weeks.length - 1)]!;
  const focusUnit = focusOf(week, d);
  const focusPaper = week.topics.find((x) => x.unit === focusUnit)?.paper ?? 1;
  const brief = briefFor(focusPaper, focusUnit);
  const tabs: Tab[] = brief
    ? ["Mind map", "Overview", ...BASE_TABS]
    : ["Overview", ...BASE_TABS];
  // A unit without a brief has no Mind map tab, so the remembered tab may not
  // exist here. Fall back rather than rendering an empty panel.
  const active: Tab = tabs.includes(tab) ? tab : "Overview";
  const thinkers = week.topics.filter((t) => /pathfinder|thinker/i.test(t.unit));
  const byPyq = [...week.topics].sort((a, b) => b.pyq - a.pyq);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card
        title={`${weeks.length}-week plan`}
        action={
          <span style={{ fontSize: 13, color: C.muted }}>
            {settings.weeklyHours} h a week
          </span>
        }
      >
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {weeks.map((w, i) => (
            <WeekCard
              key={w.weekIndex}
              week={w}
              d={d}
              active={i === selected}
              onClick={() => {
                setSelected(i);
                setTab("Mind map");
              }}
            />
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
          Later weeks are not locked. They are recomputed from what is actually
          left every time you open the app, so falling behind reshapes the plan
          rather than breaking it.
        </p>
      </Card>

      <div className="grid grid-main">
        <Card
          title={`${week.weekIndex === 0 ? "This week" : `Week ${week.weekIndex + 1}`} at a glance`}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {tabs.map((x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                aria-pressed={active === x}
                style={{
                  minHeight: 36,
                  padding: "0 13px",
                  borderRadius: 999,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 13.5,
                  border: `1px solid ${active === x ? C.accent : C.line}`,
                  background: active === x ? C.accentSoft : "transparent",
                  color: active === x ? C.accent : C.muted,
                }}
              >
                {x}
              </button>
            ))}
          </div>

          <div key={active} className="fade-in">
            {active === "Mind map" && brief && <MindMap brief={brief} />}

          {active === "Overview" && (
            <>
              <p style={{ fontSize: 14.5, margin: "0 0 14px", lineHeight: 1.7 }}>
                Mostly <strong>{focusOf(week, d)}</strong>. {week.topics.length} topics
                and {week.revisions.length} revisions, {week.totalHours} hours in all.
              </p>
              <TopicList topics={week.topics} d={d} />
              {week.revisions.length > 0 && (
                <p style={{ fontSize: 13.5, color: C.warn, margin: "14px 0 0", lineHeight: 1.6 }}>
                  Plus {week.revisions.length} revisions falling due
                  ({week.revisionHours} h), booked before new work.
                </p>
              )}
              <p style={{ fontSize: 13.5, color: C.muted, margin: "14px 0 0", lineHeight: 1.7 }}>
                Write one 40-mark answer from these, timed at 35 minutes, and record
                the marks in Answer Practice. Written answers are the only thing the
                exam scores.
              </p>
            </>
          )}

          {active === "Thinkers" && (
            <TopicList
              topics={thinkers}
              d={d}
              note={(t) => `${t.pyq}× asked`}
            />
          )}

          {active === "PYQ focus" && (
            <>
              <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
                How often each of this week's topics was asked in WBCS Main between
                2018 and 2023.
              </p>
              <TopicList topics={byPyq} d={d} note={(t) => `${t.pyq}×`} />
            </>
          )}

            {active === "Insight" && <WeekInsight d={d} week={week} />}
          </div>

        </Card>

        <div className="grid" style={{ gap: 14 }}>
          {brief && (
            <Card title="Key takeaways">
              <Takeaways items={brief.takeaways} />
            </Card>
          )}

          {brief?.thinker && (
            <Card title="Main thinker this week">
              <strong style={{ fontSize: 16 }}>{brief.thinker.name}</strong>
              <span className="num" style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>
                {brief.thinker.life}
              </span>
              <ul style={{ margin: "10px 0 0", paddingLeft: 17, fontSize: 14, lineHeight: 1.7 }}>
                {brief.thinker.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Card>
          )}

          {!brief?.thinker && thinkers.length > 0 && (
            <Card title="Main thinker this week">
              <strong style={{ fontSize: 16 }}>{thinkers[0]!.name.split("—")[0]!.trim()}</strong>
              <p style={{ fontSize: 14, color: C.muted, margin: "8px 0 0", lineHeight: 1.7 }}>
                {thinkers[0]!.name.includes("—")
                  ? thinkers[0]!.name.split("—")[1]!.trim()
                  : thinkers[0]!.unit}
              </p>
              <p className="num" style={{ fontSize: 12.5, color: C.muted, margin: "10px 0 0" }}>
                asked {thinkers[0]!.pyq}× since 2018
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One read on the week's topics: what connects them, what to open first.
 * The ask-counts come from the repo; the model only interprets them.
 */
function WeekInsight({ d, week }: { d: Derived; week: WeekPlan }) {
  const [body, setBody] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    const res = await ask(
      `insight:${week.weekIndex}`,
      "insight",
      {
        topics: week.topics.map((t) => ({ name: t.name, unit: t.unit, askedSince2018: t.pyq })),
        revisionsDue: week.revisions.map((r) => r.topic.name),
      },
      {
        percent: progress(d).percent,
        pace: effectivePace(d),
        requiredPace: requiredPace(d),
      },
    );
    setBody(res.advice?.body ?? null);
    setError(res.error);
    setBusy(false);
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={busy}
        style={{
          minHeight: 40,
          padding: "0 16px",
          borderRadius: 9,
          border: "none",
          background: busy ? C.line : C.accent,
          color: busy ? C.muted : C.accentInk,
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? "default" : "pointer",
        }}
      >
        {busy ? "Reading…" : body ? "Read again" : "What connects this week?"}
      </button>

      {body && (
        <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: "14px 0 0", whiteSpace: "pre-wrap" }}>
          {body}
        </p>
      )}
      {error && (
        <p style={{ fontSize: 13, color: C.warn, margin: "12px 0 0" }}>
          Could not reach the model ({error}).
        </p>
      )}
    </div>
  );
}
