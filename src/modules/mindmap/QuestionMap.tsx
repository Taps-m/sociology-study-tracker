import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AnswerStructure } from "../../lib/ai";
import { C } from "../../lib/theme";

/**
 * One question's answer, as a branching map with every level on screen at once.
 *
 * Not a second way to read the skeleton. The skeleton is read top to bottom and
 * teaches the order of an answer; the map is looked at, and teaches its shape —
 * which branch is heavy, which thinker hangs off which idea, where the one
 * example lives. Those are different questions and the second is the one asked
 * at revision time, three weeks after the chapter.
 *
 * Nothing here calls the model. Every node comes out of the AnswerStructure the
 * blueprint already generated and cached for this question, so the map costs a
 * render and appears instantly on any question already opened.
 *
 * Long prose is clipped on purpose. A map with an opening paragraph in it is a
 * page with boxes drawn round it — the full text is one tab away, and the job
 * here is to be readable at a glance from across the room.
 */

type Cat = "demand" | "shape" | "concept" | "thinker" | "example" | "caution";

/**
 * Six categories, six hues, fixed for good.
 *
 * The colours mean the same thing on every map ever drawn, which is the only
 * reason colour-coding beats labelling: by the fifth map the eye finds the red
 * box without reading it. Mid-light hues, because a filled box carries dark ink
 * and has to hold up on both the dark surface and the light one.
 */
const CAT: Record<Cat, { colour: string; label: string }> = {
  demand: { colour: "#e8a93a", label: "What it asks" },
  shape: { colour: "#7fa88e", label: "Shape of the answer" },
  concept: { colour: "#63a6c8", label: "Concept" },
  thinker: { colour: "#a08cd8", label: "Thinker" },
  example: { colour: "#4e9b6f", label: "Indian example" },
  caution: { colour: "#c1443c", label: "Trap / criticism" },
};

/** Filled leaves: the two that must be seen without being read. */
const SOLID_LEAF: Partial<Record<Cat, { fill: string; ink: string }>> = {
  example: { fill: "#4e9b6f", ink: "#f2fff7" },
  caution: { fill: "#c1443c", ink: "#fff2ee" },
};

export interface MapNode {
  name: string;
  cat?: Cat;
  children?: MapNode[];
}

interface Laid extends MapNode {
  children?: Laid[];
  depth: number;
  x: number;
  y: number;
  w: number;
  h: number;
  lines: string[];
  colour: string;
  leaf: boolean;
}

const COL_W = [156, 190, 214, 232, 232];
const CHARS = [18, 23, 27, 31, 31];
const ROW_GAP = 9;
const COL_GAP = 46;
const LINE_H = 15;

const at = <T,>(a: T[], i: number): T => a[Math.min(i, a.length - 1)]!;

function colX(depth: number): number {
  let x = 20;
  for (let d = 0; d < depth; d++) x += at(COL_W, d) + COL_GAP;
  return x;
}

/** Greedy wrap. Words longer than the line are left long rather than cut. */
function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    if (cur && `${cur} ${word}`.length > maxChars) {
      lines.push(cur);
      cur = word;
    } else {
      cur = cur ? `${cur} ${word}` : word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length > 0 ? lines : [text];
}

/**
 * Place every node, then hang each parent off the middle of its children.
 *
 * One downward cursor over the leaves gives every leaf its own row, so nothing
 * overlaps however lopsided the tree is; a parent then centres on the span of
 * what it carries, which is what makes a branch read as one thing.
 */
function layout(node: MapNode, depth: number, cursor: { y: number }, inherited: string): Laid {
  const colour = node.cat ? CAT[node.cat].colour : inherited;
  const w = at(COL_W, depth);
  const lines = wrap(node.name, at(CHARS, depth));
  const h = lines.length * LINE_H + 16;
  const kids = node.children ?? [];

  if (kids.length === 0) {
    const y = cursor.y + h / 2;
    cursor.y += h + ROW_GAP;
    return { ...node, depth, x: colX(depth), y, w, h, lines, colour, leaf: true, children: [] };
  }

  const children = kids.map((k) => layout(k, depth + 1, cursor, colour));
  const y = (children[0]!.y + children[children.length - 1]!.y) / 2;
  return { ...node, depth, x: colX(depth), y, w, h, lines, colour, leaf: false, children };
}

function extent(n: Laid): number {
  return Math.max(n.x + n.w, ...(n.children ?? []).map(extent));
}

function flatten(n: Laid, out: Laid[] = []): Laid[] {
  out.push(n);
  for (const c of n.children ?? []) flatten(c, out);
  return out;
}

/** "…" rather than a box of prose. The full text lives in the skeleton view. */
function clip(text: string, max: number): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The question's structure, turned into a tree.
 *
 * The blocks sit at the top level rather than under a "body" node, because they
 * are the answer — the frame is scaffolding and belongs in one branch, not
 * spread across four.
 */
export function treeFromStructure(structure: AnswerStructure, question: string): MapNode {
  const children: MapNode[] = [];

  const demandKids: MapNode[] = [
    ...(structure.demand?.commandWords ?? []).map((w) => ({ name: `“${w}”` })),
    ...(structure.demand?.parts ?? []).map((p) => ({ name: clip(p, 70) })),
  ];
  if (structure.demand?.trap) {
    demandKids.push({ name: clip(structure.demand.trap, 80), cat: "caution" });
  }
  if (demandKids.length > 0) {
    children.push({ name: "What it asks", cat: "demand", children: demandKids });
  }

  const shapeKids: MapNode[] = [];
  if (structure.skeleton) shapeKids.push({ name: clip(structure.skeleton, 70) });
  if (structure.opening?.text) {
    shapeKids.push({
      name: `Open — ${structure.opening.type || "set it up"}`,
      children: [{ name: clip(structure.opening.text, 90) }],
    });
  }
  if (structure.signpost) {
    shapeKids.push({ name: "Signpost", children: [{ name: clip(structure.signpost, 90) }] });
  }
  if (structure.pivot) {
    shapeKids.push({ name: "Pivot", children: [{ name: clip(structure.pivot, 90) }] });
  }
  if (structure.close?.text) {
    shapeKids.push({
      name: `Close — ${structure.close.type || "take a position"}`,
      children: [{ name: clip(structure.close.text, 90) }],
    });
  }
  if (shapeKids.length > 0) {
    children.push({ name: "Shape of the answer", cat: "shape", children: shapeKids });
  }

  for (const b of structure.blocks ?? []) {
    const kids: MapNode[] = [];
    if (b.mechanism) kids.push({ name: clip(b.mechanism, 100) });
    if (b.thinker) kids.push({ name: b.thinker, cat: "thinker" });
    if (b.specific) kids.push({ name: clip(b.specific, 70), cat: "example" });
    children.push({
      name: b.keyword + (b.depth === "brief" ? " (brief)" : ""),
      cat: "concept",
      children: kids,
    });
  }

  if (structure.diagram?.label && structure.diagram.items.length > 0) {
    children.push({
      name: `Draw — ${structure.diagram.label}`,
      cat: "shape",
      children: structure.diagram.items.map((i) => ({
        name: i.note ? `${i.name} — ${clip(i.note, 40)}` : i.name,
      })),
    });
  }

  return { name: clip(question, 90), cat: "demand", children };
}

export function QuestionMap({ tree }: { tree: MapNode }) {
  const [zoom, setZoom] = useState(1);
  const box = useRef<HTMLDivElement | null>(null);

  const root = layout(tree, 0, { y: 0 }, CAT.demand.colour);
  const nodes = flatten(root);
  const width = extent(root) + 30;
  const height = Math.max(...nodes.map((n) => n.y + n.h / 2)) + 20;

  const fit = useCallback(() => {
    const avail = (box.current?.clientWidth ?? width) - 4;
    setZoom(Math.max(0.35, Math.min(1, avail / width)));
  }, [width]);

  // Fit on first paint and on resize, so a map opens showing all of itself
  // rather than showing the root and leaving the rest to be discovered.
  useLayoutEffect(fit, [fit]);
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const cats = [...new Set(nodes.map((n) => n.cat).filter(Boolean))] as Cat[];

  const btn: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: `1px solid ${C.line}`,
    background: C.raised,
    color: C.text,
    font: "inherit",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.15))} aria-label="Zoom out" style={btn}>
          −
        </button>
        <span
          className="num"
          style={{ fontSize: 12.5, color: C.muted, minWidth: 46, textAlign: "center" }}
        >
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} aria-label="Zoom in" style={btn}>
          +
        </button>
        <button onClick={fit} style={{ ...btn, width: "auto", padding: "0 12px", fontSize: 13.5 }}>
          Fit
        </button>
      </div>

      <div
        ref={box}
        style={{
          background: C.raised,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          overflow: "auto",
          maxHeight: "72vh",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width * zoom}
          height={height * zoom}
          role="img"
          aria-label={`Mind map of this answer: ${nodes.length} nodes`}
          style={{ display: "block" }}
        >
          {/* Connectors first, so every box sits on top of its own strokes. */}
          {nodes.flatMap((n) =>
            (n.children ?? []).map((c) => {
              const x1 = n.x + n.w;
              const mx = (x1 + c.x) / 2;
              return (
                <path
                  key={`${n.x}-${n.y}-${c.x}-${c.y}`}
                  d={`M${x1},${n.y} C${mx},${n.y} ${mx},${c.y} ${c.x},${c.y}`}
                  stroke={c.colour}
                  strokeWidth={2}
                  fill="none"
                  opacity={0.6}
                />
              );
            }),
          )}

          {nodes.map((n) => {
            const solid = n.leaf && n.cat ? SOLID_LEAF[n.cat] : undefined;
            const filled = n.depth <= 1 || Boolean(solid);
            const fill = solid ? solid.fill : n.depth <= 1 ? n.colour : "var(--raised)";
            const ink = solid ? solid.ink : n.depth <= 1 ? "#1a1208" : "var(--text)";
            const stroke = filled ? "none" : n.colour;
            return (
              <g key={`${n.x}-${n.y}-${n.name}`}>
                <rect
                  x={n.x}
                  y={n.y - n.h / 2}
                  width={n.w}
                  height={n.h}
                  rx={8}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={filled ? 0 : 1.4}
                  strokeDasharray={!filled && n.leaf ? "4,3" : undefined}
                />
                {n.lines.map((line, i) => (
                  <text
                    key={i}
                    x={n.x + n.w / 2}
                    y={n.y - ((n.lines.length - 1) * LINE_H) / 2 + i * LINE_H + 1}
                    textAnchor="middle"
                    fontFamily={C.sans}
                    fontSize={n.depth === 0 ? 14 : n.depth === 1 ? 12.5 : 11.3}
                    fontWeight={n.depth <= 1 ? 700 : n.leaf ? 400 : 600}
                    fill={ink}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.6 }}>
        Scroll or pinch to move around; <span className="num">+</span> and{" "}
        <span className="num">−</span> zoom, Fit puts the whole thing back on screen. Every level
        is drawn — nothing is hidden behind a click.
      </p>

      <div
        style={{
          display: "flex",
          gap: 14,
          flexWrap: "wrap",
          marginTop: 10,
          fontSize: 12,
          color: C.muted,
        }}
      >
        {cats.map((c) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: CAT[c].colour,
                display: "inline-block",
              }}
            />
            {CAT[c].label}
          </span>
        ))}
      </div>
    </div>
  );
}
