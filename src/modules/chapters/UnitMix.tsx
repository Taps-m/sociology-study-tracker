import { TOPICS } from "../../data/syllabus";
import { unitShare } from "../../data/weightage";
import { C } from "../../lib/theme";

/**
 * Where the marks actually are, in one picture.
 *
 * A column of percentages is read; a pie is seen. The figures are the same ones
 * on the unit rows, counted from the real WBCS papers of the last ten years —
 * not from a coaching slide, though it is worth noting a UPSC coaching slide
 * puts the theorists at 26% and this puts them at 27.5%, arrived at separately.
 *
 * Five slices and an "Others". Ten slices in ten colours is a legend nobody
 * reads and a set of hues nobody can tell apart; the tail folded into one slice
 * is the difference between a chart that informs and a chart that decorates.
 */

const SLICES = 5;
const R = 78;

interface Slice {
  unit: string;
  pct: number;
  color: string;
}

function slices(paper: 1 | 2): Slice[] {
  const units = [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))]
    .map((unit) => ({ unit, pct: unitShare(paper, unit) }))
    .sort((a, b) => b.pct - a.pct);

  const top = units.slice(0, SLICES);
  const rest = units.slice(SLICES);
  const out: Slice[] = top.map((u, i) => ({ ...u, color: `var(--slice-${i})` }));
  const tail = rest.reduce((a, u) => a + u.pct, 0);
  if (tail > 0.05) {
    out.push({ unit: `Everything else (${rest.length} units)`, pct: tail, color: "var(--slice-5)" });
  }
  return out;
}

/** One wedge, from a start angle to an end angle, clockwise from twelve. */
function wedge(from: number, to: number): string {
  const pt = (a: number) => {
    const rad = ((a - 90) * Math.PI) / 180;
    return [R + R * Math.cos(rad), R + R * Math.sin(rad)];
  };
  const [x1, y1] = pt(from);
  const [x2, y2] = pt(to);
  // A single slice covering the whole circle cannot be drawn as one arc.
  if (to - from >= 359.999) {
    return `M ${R} ${R - R} A ${R} ${R} 0 1 1 ${R - 0.01} ${R - R} Z`;
  }
  return `M ${R} ${R} L ${x1} ${y1} A ${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2} Z`;
}

export function UnitMix({ paper }: { paper: 1 | 2 }) {
  const data = slices(paper);
  if (data.length === 0) return null;

  let angle = 0;
  const drawn = data.map((s) => {
    const from = angle;
    angle += (s.pct / 100) * 360;
    return { ...s, from, to: angle, mid: (from + angle) / 2 };
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 22,
        flexWrap: "wrap",
        padding: "16px 18px",
        marginBottom: 12,
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
      }}
    >
      <svg
        width={R * 2}
        height={R * 2}
        viewBox={`0 0 ${R * 2} ${R * 2}`}
        role="img"
        aria-label={`Share of Paper ${paper === 1 ? "I" : "II"} questions by unit: ${drawn
          .map((s) => `${s.unit} ${Math.round(s.pct)}%`)
          .join(", ")}`}
        style={{ flexShrink: 0 }}
      >
        {drawn.map((s) => (
          <path
            key={s.unit}
            d={wedge(s.from, s.to)}
            fill={s.color}
            /* A hairline in the surface colour so neighbouring wedges separate. */
            stroke={C.panel}
            strokeWidth={2}
          />
        ))}
        {drawn
          .filter((s) => s.pct >= 8)
          .map((s) => {
            const rad = ((s.mid - 90) * Math.PI) / 180;
            return (
              <text
                key={s.unit}
                x={R + R * 0.62 * Math.cos(rad)}
                y={R + R * 0.62 * Math.sin(rad)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                /*
                  White on a wedge, with a dark outline drawn behind it. The
                  dark theme lifts every slice colour a step, and white on a
                  pale blue wedge is unreadable — the outline means the label
                  holds up on any of the six in either theme.
                */
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: C.mono,
                  stroke: "rgba(0,0,0,0.38)",
                  strokeWidth: 2.5,
                  paintOrder: "stroke",
                }}
              >
                {Math.round(s.pct)}%
              </text>
            );
          })}
      </svg>

      <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 7, flex: 1, minWidth: 190 }}>
        {drawn.map((s) => (
          <li key={s.unit} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5 }}>
            <span
              aria-hidden
              style={{
                width: 11,
                height: 11,
                borderRadius: 3,
                background: s.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, minWidth: 0, color: C.text }}>{s.unit}</span>
            <span className="num" style={{ color: C.muted, fontWeight: 600 }}>
              {Math.round(s.pct)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
