import type { UnitBrief } from "../../data/briefs";
import { C } from "../../lib/theme";

/**
 * The unit mind map: traditional state → what changed → what broke → what was
 * needed → what emerged. Laid out as a row that scrolls on a narrow screen
 * rather than reflowing, because the left-to-right reading order is the point.
 */
export function MindMap({ brief }: { brief: UnitBrief }) {
  return (
    <div>
      <div
        style={{
          background: "var(--rail)",
          color: "var(--rail-text)",
          borderRadius: 10,
          padding: "12px 18px",
          fontSize: 16,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {brief.headline}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 8,
          overflowX: "auto",
          padding: "16px 0 6px",
        }}
      >
        {brief.flow.map((stage, i) => (
          <div key={stage.title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <section
              style={{
                flex: "0 0 190px",
                minWidth: 190,
                alignSelf: "stretch",
                background: `var(--tint-${stage.tint})`,
                border: `1px solid var(--tint-${stage.tint}-line)`,
                borderRadius: 10,
                padding: "12px 13px",
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 9px", lineHeight: 1.35 }}>
                {stage.title}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 15, fontSize: 13, lineHeight: 1.65 }}>
                {stage.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </section>

            {i < brief.flow.length - 1 && (
              <span aria-hidden style={{ color: C.accent, fontSize: 20, flex: "0 0 auto" }}>
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", color: C.accent, fontSize: 20, lineHeight: 1 }} aria-hidden>
        ↓
      </div>

      <div
        style={{
          marginTop: 8,
          background: "var(--tint-0)",
          border: `1px solid var(--tint-0-line)`,
          borderRadius: 10,
          padding: "14px 18px",
          textAlign: "center",
        }}
      >
        <strong style={{ fontSize: 16 }}>{brief.conclusion.title}</strong>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 5 }}>
          {brief.conclusion.caption}
        </div>
      </div>
    </div>
  );
}

export function Takeaways({ items }: { items: string[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
      {items.map((t) => (
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
  );
}
