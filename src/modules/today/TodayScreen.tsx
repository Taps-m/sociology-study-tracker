import type { CheckId, Derived } from "../../lib/events";
import { isOptional, nextOnRamp, todaysBoard } from "../../lib/planner";
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
 *
 * It used to also re-render that same checklist a second time, verbatim,
 * below the ramp card — anyone arriving from Dashboard's "Today's focus"
 * (which already has the checkboxes) saw their own list again before
 * reaching anything this screen actually adds. What this screen is for is
 * the full per-topic controls — notes, readings, time, answer attempts —
 * that the Dashboard card doesn't have room for. The progress line stays,
 * folded into "Record what you do" instead of a duplicate list above it.
 */
export function TodayScreen({
  d,
  go,
  ...h
}: { d: Derived; go: (r: RouteId) => void } & Handlers) {
  const board = todaysBoard(d);
  const tasks = board.tasks;
  const ramp = nextOnRamp(d);

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
      {ramp && (
        // Why this unit and not the highest-yield one. A queue that silently
        // reorders itself looks arbitrary; a queue that says why it starts here
        // is a teacher.
        <Card>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 11.5,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            Starting here on purpose
          </div>
          <div style={{ fontSize: 15.5, fontWeight: 600, margin: "6px 0 4px" }}>{ramp.unit}</div>
          <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>{ramp.why}</p>
        </Card>
      )}

      <Card
        title="Record what you do"
        action={
          <span
            className="num"
            style={{
              fontSize: 13,
              color: board.done === board.total ? C.good : C.muted,
            }}
          >
            {board.done} of {board.total} done
          </span>
        }
      >
        <p style={{ fontSize: 12.5, color: C.muted, margin: "0 0 14px", lineHeight: 1.6 }}>
          <span className="num">{board.minutesPlanned}</span> min planned against a budget of{" "}
          <span className="num">{board.budget}</span>. The checks below are the same log as
          Dashboard's — tick either place, both move. The rest of the week is under{" "}
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
        {topics.map((t) => (
          <TopicRow key={t.id} topic={t} d={d} {...h} optional={isOptional(d, t.id)} />
        ))}
      </Card>
    </div>
  );
}
