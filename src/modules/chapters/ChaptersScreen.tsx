import { useState } from "react";
import { TOPICS } from "../../data/syllabus";
import type { CheckId, Derived } from "../../lib/events";
import { bandOf, completionOf, depthFor, hoursFor, isOptional } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { TopicRow } from "../../components/TopicRow";

type Handlers = {
  onToggle: (id: string, c: CheckId) => void;
  onLogTime: (id: string, c: CheckId, m: number) => void;
  onMarkPrior: (id: string, c: CheckId) => void;
  onAttempt: (id: string, marks: number, outOf: number, minutes: number) => void;
};

type Filter = "all" | "open" | "untouched" | "high";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "open", label: "Started" },
  { id: "untouched", label: "Not started" },
  { id: "high", label: "High yield" },
];

export function ChaptersScreen({ d, ...h }: { d: Derived } & Handlers) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const match = (t: (typeof TOPICS)[number]) => {
    const done = completionOf(d, t.id);
    if (filter === "open" && (done === 0 || done >= depthFor(d, t))) return false;
    if (filter === "untouched" && done > 0) return false;
    if (filter === "high" && bandOf(t) < 3) return false;
    if (query && !`${t.name} ${t.unit}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  };

  const papers = [1, 2].map((paper) => ({
    paper,
    units: [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))]
      .map((unit) => ({
        unit,
        topics: TOPICS.filter((t) => t.paper === paper && t.unit === unit && match(t)),
        all: TOPICS.filter((t) => t.paper === paper && t.unit === unit),
      }))
      .filter((u) => u.topics.length > 0),
  }));

  const visible = papers.reduce((s, p) => s + p.units.reduce((n, u) => n + u.topics.length, 0), 0);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics…"
            aria-label="Search topics"
            style={{
              flex: "1 1 200px",
              minHeight: 40,
              padding: "0 12px",
              borderRadius: 8,
              border: `1px solid ${C.line}`,
              background: C.raised,
              color: C.text,
              font: "inherit",
              fontSize: 13.5,
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                style={{
                  minHeight: 36,
                  padding: "0 12px",
                  borderRadius: 999,
                  cursor: "pointer",
                  font: "inherit",
                  fontSize: 12.5,
                  border: `1px solid ${filter === f.id ? C.accent : C.line}`,
                  background: filter === f.id ? C.accentSoft : "transparent",
                  color: filter === f.id ? C.accent : C.muted,
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.muted, margin: "12px 0 0" }}>
          <span className="num">{visible}</span> of{" "}
          <span className="num">{TOPICS.length}</span> topics shown
        </p>
      </Card>

      {papers.map(({ paper, units }) =>
        units.length === 0 ? null : (
          <div key={paper} className="grid" style={{ gap: 10 }}>
            <h2
              style={{
                fontFamily: C.mono,
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.muted,
                margin: "6px 0 0",
              }}
            >
              Paper {paper === 1 ? "I" : "II"}
            </h2>

            {units.map(({ unit, topics, all }) => {
              const key = `${paper}|${unit}`;
              const isOpen = open === key;
              const done = all.filter((t) => completionOf(d, t.id) >= depthFor(d, t)).length;
              const hours = Math.round(all.reduce((s, t) => s + hoursFor(d, t), 0));

              return (
                <section key={key} className="card">
                  <button
                    onClick={() => setOpen(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      minHeight: 56,
                      padding: "0 16px",
                      border: "none",
                      background: "transparent",
                      color: C.text,
                      font: "inherit",
                      fontSize: 14,
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{unit}</span>
                    <span className="num" style={{ fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
                      {done}/{all.length} · {hours}h
                    </span>
                    <span aria-hidden style={{ color: C.muted }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.line}`, padding: "4px 12px 8px" }}>
                      {topics.map((t) => (
                        <TopicRow
                          key={t.id}
                          topic={t}
                          d={d}
                          {...h}
                          optional={isOptional(d, t.id)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ),
      )}
    </div>
  );
}
