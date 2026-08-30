import type { CheckId, Derived } from "../../lib/events";
import type { Topic } from "../../data/syllabus";
import {
  CHECKS,
  depthFor,
  hoursFor,
  isChecked,
  packWeeks,
  revisionQueue,
} from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import type { RouteId } from "../../app/routes";

interface Task {
  id: string;
  topic: Topic;
  check: CheckId;
  label: string;
  minutes: number;
}

/**
 * Today's list, derived rather than authored.
 *
 * For each topic this week, the next check it still needs — read, then notes,
 * then PYQs, then revision — stopping at the depth the planner set for it.
 * Overdue revision comes first, because it decays whether or not it is listed.
 *
 * Ticking a box writes the same event as ticking it anywhere else, so the
 * percentages, the pace and the week plan all move with it. Nothing here is a
 * separate to-do list that can drift out of step with the rest of the app.
 */
function tasksFor(d: Derived, limit = 5): Task[] {
  const out: Task[] = [];

  for (const r of revisionQueue(d).slice(0, 2)) {
    out.push({
      id: `${r.topic.id}:revised`,
      topic: r.topic,
      check: "revised",
      label: `Revise: ${r.topic.name}`,
      minutes: Math.max(10, Math.round(r.hours * 60)),
    });
  }

  const week = packWeeks(d, 1)[0];
  for (const topic of week?.topics ?? []) {
    if (out.length >= limit) break;
    const target = depthFor(d, topic);
    let cumulative = 0;
    for (const c of CHECKS) {
      cumulative += c.weight;
      if (cumulative > target + 0.001) break;
      if (isChecked(d, topic.id, c.id)) continue;
      out.push({
        id: `${topic.id}:${c.id}`,
        topic,
        check: c.id,
        label: `${c.label}: ${topic.name}`,
        minutes: Math.max(10, Math.round(hoursFor(d, topic) * c.weight * 60)),
      });
      break;
    }
  }

  return out.slice(0, limit);
}

export function TodaysFocus({
  d,
  go,
  onToggle,
}: {
  d: Derived;
  go: (r: RouteId) => void;
  onToggle: (topicId: string, check: CheckId) => void;
}) {
  const tasks = tasksFor(d);
  const total = tasks.reduce((s, t) => s + t.minutes, 0);

  return (
    <Card
      title="Today's focus"
      action={
        <span className="num" style={{ fontSize: 13, color: C.muted }}>
          {total} min
        </span>
      }
    >
      {tasks.length === 0 ? (
        <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          Nothing outstanding. Every topic in this week's plan is at the depth it
          was planned for.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {tasks.map((t) => (
            <li key={t.id}>
              <label
                className="stage"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  padding: "10px 8px",
                  margin: "0 -8px",
                  borderRadius: 9,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => onToggle(t.topic.id, t.check)}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: C.accent, flex: "0 0 auto" }}
                />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>{t.label}</span>
                  <span
                    className="num"
                    style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 3 }}
                  >
                    about {t.minutes} min
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => go("today")}
        style={{
          width: "100%",
          minHeight: 46,
          marginTop: 14,
          borderRadius: 9,
          border: "none",
          background: C.accent,
          color: C.accentInk,
          font: "inherit",
          fontSize: 14.5,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Start today's study
      </button>
    </Card>
  );
}
