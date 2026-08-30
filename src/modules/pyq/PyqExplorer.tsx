import { useState } from "react";
import { PYQS, PYQ_YEARS } from "../../data/pyq";
import { TOPICS } from "../../data/syllabus";
import type { Derived } from "../../lib/events";
import { blindSpots, groupBAtRisk, unitExposure } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

const NAMES = new Map(TOPICS.map((t) => [t.id, t.name]));

export function PyqExplorer({ d }: { d: Derived }) {
  const [year, setYear] = useState<number | "all">("all");
  const [group, setGroup] = useState<"A" | "B" | "all">("all");
  const [query, setQuery] = useState("");

  const spots = blindSpots(d);
  const atRisk = groupBAtRisk(d);
  const exposure = unitExposure(d).sort((a, b) => b.askedA + b.askedB - (a.askedA + a.askedB));

  const shown = PYQS.filter(
    (q) =>
      (year === "all" || q.year === year) &&
      (group === "all" || q.group === group) &&
      (query === "" ||
        `${q.text} ${q.topicIds.map((i) => NAMES.get(i) ?? "").join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase())),
  );

  const chip = (on: boolean) => ({
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 999,
    cursor: "pointer",
    font: "inherit",
    fontSize: 13.5,
    border: `1px solid ${on ? C.accent : C.line}`,
    background: on ? C.accentSoft : "transparent",
    color: on ? C.accent : C.muted,
  });

  return (
    <div className="grid" style={{ gap: 13 }}>
      <Card
        title="Where you are exposed"
        action={
          <span className="num" style={{ fontSize: 13, color: atRisk > 0 ? C.warn : "var(--good)" }}>
            {atRisk} Group B questions
          </span>
        }
      >
        <p style={{ fontSize: 14.5, lineHeight: 1.75, margin: "0 0 12px" }}>
          Group A sets five questions and you answer three. Group B sets{" "}
          <strong>three and you answer two</strong> — almost no choice. These units
          supplied Group B questions between 2018 and 2023, and you have never
          written an answer from any of them.
        </p>

        {spots.length === 0 ? (
          <p style={{ fontSize: 14.5, color: "var(--good)", margin: 0 }}>
            Nothing outstanding — you have written from every unit that feeds Group B.
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {spots.map((u) => (
              <li
                key={`${u.paper}|${u.unit}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 14,
                  padding: "9px 0",
                  borderBottom: `1px solid ${C.hair}`,
                  fontSize: 14.5,
                }}
              >
                <span>
                  {u.unit}{" "}
                  <span style={{ fontSize: 12.5, color: C.muted }}>
                    · Paper {u.paper === 1 ? "I" : "II"} · {u.studied}/{u.topics} topics at depth
                  </span>
                </span>
                <span className="num" style={{ color: C.warn, whiteSpace: "nowrap" }}>
                  {u.askedB} in B
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="What each unit has asked">
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {exposure.map((u) => {
            const total = u.askedA + u.askedB;
            return (
              <li
                key={`${u.paper}|${u.unit}`}
                style={{ padding: "8px 0", borderBottom: `1px solid ${C.hair}` }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                  <span>{u.unit}</span>
                  <span className="num" style={{ color: C.muted, whiteSpace: "nowrap" }}>
                    {u.askedA} A · {u.askedB} B
                  </span>
                </div>
                <div style={{ display: "flex", gap: 3, marginTop: 6, height: 6 }}>
                  {total === 0 ? (
                    <div style={{ flex: 1, background: "var(--line)", borderRadius: 3 }} />
                  ) : (
                    <>
                      <div style={{ flex: u.askedA || 0.001, background: C.accent, borderRadius: 3 }} />
                      <div style={{ flex: u.askedB || 0.001, background: "var(--warn)", borderRadius: 3 }} />
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <p style={{ fontSize: 12.5, color: C.muted, margin: "12px 0 0" }}>
          Blue is Group A, amber is Group B.
        </p>
      </Card>

      <Card title={`${shown.length} of ${PYQS.length} questions`}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button onClick={() => setYear("all")} style={chip(year === "all")}>
            All years
          </button>
          {PYQ_YEARS.map((y) => (
            <button key={y} onClick={() => setYear(y)} style={chip(year === y)}>
              {y}
            </button>
          ))}
          <span style={{ width: 12 }} />
          {(["all", "A", "B"] as const).map((g) => (
            <button key={g} onClick={() => setGroup(g)} style={chip(group === g)}>
              {g === "all" ? "Both groups" : `Group ${g}`}
            </button>
          ))}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the questions…"
          style={{
            width: "100%",
            minHeight: 40,
            padding: "0 12px",
            marginBottom: 14,
            borderRadius: 8,
            border: `1px solid ${C.line}`,
            background: C.raised,
            color: C.text,
            font: "inherit",
            fontSize: 14,
          }}
        />

        {shown.map((q) => (
          <article
            key={`${q.year}-${q.paper}-${q.number}`}
            style={{ padding: "12px 0", borderTop: `1px solid ${C.hair}` }}
          >
            <div
              className="num"
              style={{ fontSize: 12.5, color: C.muted, marginBottom: 5 }}
            >
              {q.year} · Paper {q.paper === 1 ? "I" : "II"} · Group {q.group} · Q{q.number} ·{" "}
              {q.marks} marks
            </div>
            <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.7 }}>{q.text}</p>
            <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {q.topicIds.map((id) => (
                <span
                  key={id}
                  style={{
                    fontSize: 12,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: C.accentSoft,
                    color: C.accent,
                  }}
                >
                  {NAMES.get(id) ?? id}
                </span>
              ))}
              {q.topicIds.length === 0 && (
                <span style={{ fontSize: 12.5, color: C.muted }}>
                  Fits no single topic{q.note ? ` — ${q.note}` : ""}
                </span>
              )}
            </div>
          </article>
        ))}
      </Card>
    </div>
  );
}
