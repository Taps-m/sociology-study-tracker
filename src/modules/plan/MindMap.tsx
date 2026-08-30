import { useState } from "react";
import type { UnitBrief } from "../../data/briefs";
import { C } from "../../lib/theme";

/**
 * The unit mind map: traditional state → what changed → what broke → what was
 * needed → what emerged. Laid out as a row that scrolls on a narrow screen
 * rather than reflowing, because the left-to-right reading order is the point.
 */
export function MindMap({ brief }: { brief: UnitBrief }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div>
      <div
        style={{
          background: "var(--rail)",
          color: "var(--rail-text)",
          borderRadius: 10,
          padding: "10px 16px",
          fontSize: 15,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {brief.headline}
      </div>

      <p style={{ fontSize: 13, color: C.muted, margin: "10px 0 0", textAlign: "center" }}>
        Four steps, left to right. Tap any one for the detail.
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          overflowX: "auto",
          padding: "12px 0 6px",
        }}
      >
        {brief.flow.map((stage, i) => {
          const isOpen = open === stage.title;
          return (
            <div key={stage.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => setOpen(isOpen ? null : stage.title)}
                aria-expanded={isOpen}
                className="stage"
                style={{
                  flex: "0 0 196px",
                  minWidth: 196,
                  textAlign: "left",
                  font: "inherit",
                  cursor: "pointer",
                  background: `var(--tint-${stage.tint})`,
                  border: `1px solid var(--tint-${stage.tint}-line)`,
                  borderRadius: 10,
                  padding: "12px 13px",
                  color: C.text,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                    {i + 1}. {stage.title}
                  </h3>
                  <span aria-hidden style={{ color: C.muted, fontSize: 13 }}>
                    {isOpen ? "−" : "+"}
                  </span>
                </div>

                <p style={{ fontSize: 13.5, lineHeight: 1.65, margin: "8px 0 0", color: C.text }}>
                  {stage.summary}
                </p>

                {isOpen && (
                  <ul
                    className="reveal"
                    style={{ margin: "10px 0 0", paddingLeft: 15, fontSize: 13.5, lineHeight: 1.75 }}
                  >
                    {stage.items.map((it) => (
                      <li key={it}>{it}</li>
                    ))}
                  </ul>
                )}
              </button>

              {i < brief.flow.length - 1 && (
                <span aria-hidden style={{ color: C.accent, fontSize: 18, flex: "0 0 auto" }}>
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: "center", color: C.accent, fontSize: 18, lineHeight: 1 }} aria-hidden>
        ↓
      </div>

      <div
        style={{
          marginTop: 8,
          background: "var(--tint-0)",
          border: "1px solid var(--tint-0-line)",
          borderRadius: 10,
          padding: "13px 18px",
          textAlign: "center",
        }}
      >
        <strong style={{ fontSize: 15.5 }}>{brief.conclusion.title}</strong>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{brief.conclusion.caption}</div>
      </div>
    </div>
  );
}

export function Takeaways({ items }: { items: string[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 3);

  return (
    <>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {shown.map((t) => (
          <li
            key={t}
            style={{ display: "flex", gap: 9, padding: "7px 0", fontSize: 14, lineHeight: 1.6 }}
          >
            <span aria-hidden style={{ color: "var(--good)", flex: "0 0 auto" }}>
              ✓
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {items.length > 3 && (
        <button
          onClick={() => setAll(!all)}
          style={{
            marginTop: 8,
            border: "none",
            background: "transparent",
            color: C.accent,
            font: "inherit",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
            minHeight: 32,
          }}
        >
          {all ? "Show fewer" : `${items.length - 3} more`}
        </button>
      )}
    </>
  );
}
