import { useState } from "react";
import type { Derived, Settings } from "../../lib/events";
import type { Topic } from "../../data/syllabus";
import { completionOf, depthFor, hoursFor, packWeeks, type WeekPlan } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

const TABS = ["Overview", "Key concepts", "Thinkers", "PYQ focus", "Practice"] as const;
type Tab = (typeof TABS)[number];

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
        flex: "0 0 210px",
        textAlign: "left",
        padding: 14,
        borderRadius: 12,
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

      <div style={{ fontSize: 13.5, color: C.muted, marginTop: 8, lineHeight: 1.5, minHeight: 40 }}>
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
  const [tab, setTab] = useState<Tab>("Overview");
  const settings = d.settings as Settings;

  if (weeks.length === 0) {
    return <Card title="Study plan">Nothing to schedule yet.</Card>;
  }

  const week = weeks[Math.min(selected, weeks.length - 1)]!;
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
                setTab("Overview");
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
            {TABS.map((x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                aria-pressed={tab === x}
                style={{
                  minHeight: 36,
                  padding: "0 13px",
                  borderRadius: 999,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 13.5,
                  border: `1px solid ${tab === x ? C.accent : C.line}`,
                  background: tab === x ? C.accentSoft : "transparent",
                  color: tab === x ? C.accent : C.muted,
                }}
              >
                {x}
              </button>
            ))}
          </div>

          {tab === "Overview" && (
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
            </>
          )}

          {tab === "Key concepts" && <TopicList topics={week.topics} d={d} note={(t) => t.unit} />}

          {tab === "Thinkers" && (
            <TopicList
              topics={thinkers}
              d={d}
              note={(t) => `${t.pyq}× asked`}
            />
          )}

          {tab === "PYQ focus" && (
            <>
              <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
                How often each of this week's topics was asked in WBCS Main between
                2018 and 2023.
              </p>
              <TopicList topics={byPyq} d={d} note={(t) => `${t.pyq}×`} />
            </>
          )}

          {tab === "Practice" && (
            <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.75 }}>
              Write one 40-mark answer from this week's topics, timed at 35 minutes,
              then record the marks in Answer Practice. Written answers are the only
              thing the exam actually scores.
            </p>
          )}
        </Card>

        <div className="grid" style={{ gap: 14 }}>
          <Card title="This week in numbers">
            <TopicList
              topics={byPyq.slice(0, 5)}
              d={d}
              note={(t) => `${t.pyq}× · ${hoursFor(d, t)} h`}
            />
          </Card>

          {thinkers.length > 0 && (
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
