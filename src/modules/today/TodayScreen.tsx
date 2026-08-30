import type { CheckId, Derived } from "../../lib/events";
import { dailyBudget, isOptional, todaysTasks } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { TopicRow } from "../../components/TopicRow";
import type { RouteId } from "../../app/routes";

type Handlers = {
  onToggle: (id: string, c: CheckId) => void;
  onLogTime: (id: string, c: CheckId, m: number) => void;
  onMarkPrior: (id: string, c: CheckId) => void;
  onAttempt: (id: string, marks: number, outOf: number, minutes: number) => void;
};

/**
 * Today, with the full controls.
 *
 * This screen used to show the whole week under a heading that said today,
 * which contradicted the dashboard card two clicks away. Both now read
 * `todaysTasks`, so there is one answer to "what am I doing today" and the
 * week's remaining work lives where it belongs, under Study Plan.
 */
export function TodayScreen({
  d,
  go,
  ...h
}: { d: Derived; go: (r: RouteId) => void } & Handlers) {
  const tasks = todaysTasks(d);
  const budget = dailyBudget(d);
  const total = tasks.reduce((s, t) => s + t.minutes, 0);

  if (tasks.length === 0) {
    return (
      <Card title="Today">
        <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.75 }}>
          Nothing left for today. Every topic in this week's plan is at the depth
          it was planned for.
        </p>
      </Card>
    );
  }

  // One row per topic, even where a topic carries two of today's tasks.
  const topics = [...new Map(tasks.map((t) => [t.topic.id, t.topic])).values()];

  return (
    <div className="grid" style={{ gap: 13, maxWidth: 820 }}>
      <Card
        title={`${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} today`}
        action={
          <span className="num" style={{ fontSize: 13, color: C.muted }}>
            {total} of {budget} min
          </span>
        }
      >
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14.5, lineHeight: 1.9 }}>
          {tasks.map((t) => (
            <li key={t.id}>
              {t.label} <span className="num" style={{ color: C.muted }}>· {t.minutes} min</span>
            </li>
          ))}
        </ul>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
          Today's share of your {d.settings?.weeklyHours ?? 0} hours a week. The rest
          of the week is under{" "}
          <button
            onClick={() => go("plan")}
            style={{
              border: "none",
              background: "transparent",
              color: C.accent,
              font: "inherit",
              fontSize: 12.5,
              padding: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Study Plan
          </button>
          .
        </p>
      </Card>

      <Card title="Record what you do">
        {topics.map((t) => (
          <TopicRow key={t.id} topic={t} d={d} {...h} optional={isOptional(d, t.id)} />
        ))}
      </Card>
    </div>
  );
}
