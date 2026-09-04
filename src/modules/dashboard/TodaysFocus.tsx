import type { CheckId, Derived } from "../../lib/events";
import { todaysBoard } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { Icon } from "../../app/Icon";
import type { RouteId } from "../../app/routes";

/**
 * Today's list, and what ticking one is supposed to feel like.
 *
 * The first version removed a task the moment it was ticked, because the list
 * was computed from what remained. Doing the work made the row vanish, which
 * reads as deletion, not progress — you finish three things and the screen has
 * nothing to show for it.
 *
 * Now a finished item stays where it is and turns green with a mark against it.
 * That is the whole point of a checklist: the crossed-off half is the part that
 * tells you you are getting somewhere.
 */
export function TodaysFocus({
  d,
  go,
  onToggle,
}: {
  d: Derived;
  go: (r: RouteId) => void;
  onToggle: (topicId: string, check: CheckId) => void;
}) {
  const board = todaysBoard(d);
  const allDone = board.total > 0 && board.done === board.total;

  return (
    <Card
      title="Today's focus"
      icon="target"
      action={
        <span className="num" style={{ fontSize: 13, color: allDone ? C.good : C.muted }}>
          {board.done} of {board.total} done
        </span>
      }
    >
      {board.total === 0 ? (
        <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          Nothing outstanding. Every topic in this week's plan is at the depth it
          was planned for.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
          {board.tasks.map((t) => (
            <li key={t.id}>
              <label
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 11,
                  padding: "10px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  background: t.done ? C.goodSoft : C.surface,
                  border: `1px solid ${t.done ? C.good : C.line}`,
                  transition: "background 140ms ease, border-color 140ms ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(t.done)}
                  onChange={() => onToggle(t.topic.id, t.check)}
                  style={{
                    width: 18,
                    height: 18,
                    marginTop: 2,
                    accentColor: t.done ? C.good : C.accent,
                    flex: "0 0 auto",
                  }}
                />
                <span style={{ flex: 1, minWidth: 0, paddingRight: 44 }}>
                  <span
                    style={{
                      fontSize: 14.5,
                      lineHeight: 1.5,
                      color: t.done ? C.muted : C.text,
                      textDecoration: t.done ? "line-through" : "none",
                      textDecorationColor: C.good,
                    }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="num"
                    style={{ display: "block", fontSize: 12.5, color: C.muted, marginTop: 3 }}
                  >
                    about {t.minutes} min
                  </span>
                </span>

                {t.done && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: C.good,
                    }}
                  >
                    ✓ done
                  </span>
                )}
              </label>
            </li>
          ))}
        </ul>
      )}

      <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.6 }}>
        {allDone ? (
          <>
            That is today's share of your {d.settings?.weeklyHours ?? 0} hours a week
            finished — <span className="num">{board.minutesDone}</span> minutes logged.
            Anything further is ahead of plan.
          </>
        ) : (
          <>
            <span className="num">{board.minutesPlanned}</span> min planned today, against a
            budget of <span className="num">{board.budget}</span>. The rest of the week is
            under Study Plan.
          </>
        )}
      </p>

      <button
        onClick={() => go("today")}
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: 12,
          borderRadius: 9,
          border: "none",
          background: allDone ? C.good : C.accent,
          color: C.accentInk,
          font: "inherit",
          fontSize: 14.5,
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 9,
        }}
      >
        <Icon name={allDone ? "tick" : "play"} size={17} />
        {allDone ? "Review today's work" : board.done > 0 ? "Carry on" : "Start today's study"}
      </button>
    </Card>
  );
}
