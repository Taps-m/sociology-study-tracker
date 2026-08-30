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
/** Today's share of the weekly commitment, in minutes. */
export function dailyBudget(d: Derived): number {
  return Math.max(20, Math.round(((d.settings?.weeklyHours ?? 7) / 7) * 60));
}

/**
 * Fills a day, not a week. Items are added until the next one would overrun
 * today's share of the weekly hours — one always gets through, however long, so
 * the card is never empty while work remains.
 */
function tasksFor(d: Derived, budget: number, limit = 5): Task[] {
  const out: Task[] = [];
  let used = 0;
  const fits = (m: number) => out.length === 0 || used + m <= budget;

  for (const r of revisionQueue(d).slice(0, 2)) {
    const minutes = Math.max(10, Math.round(r.hours * 60));
    if (!fits(minutes)) break;
    out.push({
      id: `${r.topic.id}:revised`,
      topic: r.topic,
      check: "revised",
      label: `Revise: ${r.topic.name}`,
      minutes,
    });
    used += minutes;
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
      const minutes = Math.max(10, Math.round(hoursFor(d, topic) * c.weight * 60));
      if (!fits(minutes)) return out;
      out.push({
        id: `${topic.id}:${c.id}`,
        topic,
        check: c.id,
        label: `${c.label}: ${topic.name}`,
        minutes,
      });
      used += minutes;
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
  const budget = dailyBudget(d);
  const tasks = tasksFor(d, budget);
  const total = tasks.reduce((s, t) => s + t.minutes, 0);

  return (
    <Card
      title="Today's focus"
      action={
        <span className="num" style={{ fontSize: 13, color: C.muted }}>
          {total} of {budget} min
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
                  padding: "8px 8px",
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

      <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
        Today's share of your {d.settings?.weeklyHours ?? 0} hours a week. The rest
        of the week's work is under Study Plan.
      </p>

      <button
        onClick={() => go("today")}
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: 12,
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
