import { useState } from "react";
import { TOPICS } from "../../data/syllabus";
import type { CheckId, Derived } from "../../lib/events";
import { bandOf, completionOf, depthFor,  isOptional } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { TopicRow } from "../../components/TopicRow";
import { briefFor } from "../../data/briefs";
import { MindMap, Takeaways } from "../plan/MindMap";
import { unitEmphasis, unitShare, unitShareLabel } from "../../data/weightage";
import { UnitMix } from "./UnitMix";
import { PrepareCards } from "../topics/PrepareCards";

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

  const papers = ([1, 2] as const).map((paper) => ({
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
              fontSize: 15,
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
                  fontSize: 14,
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
        <p style={{ fontSize: 13.5, color: C.muted, margin: "12px 0 0" }}>
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
                fontSize: 12.5,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: C.muted,
                margin: "6px 0 0",
              }}
            >
              Paper {paper === 1 ? "I" : "II"}
            </h2>

            <UnitMix paper={paper} />
            {paper === 1 && <PrepareCards />}

            {units.map(({ unit, topics, all }) => {
              const key = `${paper}|${unit}`;
              const isOpen = open === key;
              const done = all.filter((t) => completionOf(d, t.id) >= depthFor(d, t)).length;
              /*
                What this unit is worth, not what it will cost. The hours that
                used to sit here were a total of remaining work — "31h" against
                Pathfinders — which reads as a mountain, and they were computed
                from my own estimates of how long each topic takes rather than
                from anything measured. The share of the paper comes from the
                real questions and points a candidate at a unit rather than
                warning them off it.
              */
              const shareLabel = unitShareLabel(paper, unit);
              const emphasis = unitEmphasis(paper, unit);

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
                      fontSize: 15.5,
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>{unit}</span>
                    <span
                      className="num"
                      style={{
                        fontSize: 13,
                        color: C.muted,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {done}/{all.length}
                    </span>

                    {/*
                      The share of the paper, carrying its own label.
                      Sitting bare beside "0/6" it read as a progress figure —
                      "0/6 · 28%" looks like 28% done, which is the opposite of
                      what it means. It is also the most useful number on this
                      screen, and it was set at the same weight as everything
                      else in the corner of the row, so nobody saw it.
                    */}
                    {shareLabel && (
                      <span
                        title={`${unitShare(paper, unit).toFixed(1)}% of the questions asked in Paper ${paper === 1 ? "I" : "II"} over the last ten years came from this unit.`}
                        style={{
                          flexShrink: 0,
                          marginLeft: 10,
                          padding: "3px 10px",
                          borderRadius: 999,
                          whiteSpace: "nowrap",
                          fontSize: emphasis === "heavy" ? 13.5 : 12.5,
                          fontWeight: emphasis === "heavy" ? 700 : 600,
                          background: emphasis === "heavy" ? C.accentSoft : C.raised,
                          color: emphasis === "heavy" ? C.accent : C.muted,
                          border: `1px solid ${emphasis === "heavy" ? C.accent : C.line}`,
                          opacity: emphasis === "quiet" ? 0.75 : 1,
                        }}
                      >
                        <span className="num">{shareLabel}</span> of paper
                      </span>
                    )}
                    <span aria-hidden style={{ color: C.muted }}>
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${C.line}`, padding: "4px 12px 8px" }}>
                      <UnitBriefPanel paper={paper} unit={unit} />
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

/**
 * A unit's map and takeaways, where they have been written. Folded away by
 * default: the topic list is what most visits are for, and the map is what a
 * first visit or a revision pass wants.
 */
function UnitBriefPanel({ paper, unit }: { paper: number; unit: string }) {
  const [open, setOpen] = useState(false);
  const brief = briefFor(paper, unit);
  if (!brief) return null;

  return (
    <div style={{ padding: "10px 0 4px" }}>
      <button
        onClick={() => setOpen(!open)}
          title="Show or hide the topics in this unit."
        aria-expanded={open}
        style={{
          minHeight: 40,
          padding: "0 14px",
          borderRadius: 999,
          cursor: "pointer",
          font: "inherit",
          fontSize: 14,
          fontWeight: 600,
          border: `1px solid ${C.accent}`,
          background: open ? C.accentSoft : "transparent",
          color: C.accent,
        }}
      >
        {open ? "Hide the map" : "Show the map for this unit"}
      </button>

      {open && (
        <div className="fade-in" style={{ marginTop: 14 }}>
          <MindMap brief={brief} />
          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "18px 0 8px" }}>Key takeaways</h3>
          <Takeaways items={brief.takeaways} />
        </div>
      )}
    </div>
  );
}
