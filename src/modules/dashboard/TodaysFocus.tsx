import type { CheckId, Derived } from "../../lib/events";
import { dailyBudget, todaysTasks } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import type { RouteId } from "../../app/routes";

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
  const tasks = todaysTasks(d);
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
