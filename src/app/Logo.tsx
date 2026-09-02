/**
 * The mark.
 *
 * Sociology is the study of what holds between people, so the mark is exactly
 * that and nothing else: three individuals, the ties between them, and the
 * circle they are inside. A book or a graduation cap would have said "study
 * app" and said nothing at all about the subject.
 *
 * One node is filled — the individual whose position in the structure is the
 * thing being studied, and the person using this. Which is Durkheim's whole
 * argument in a shape: you cannot explain the filled dot without the lines.
 *
 * Drawn rather than fetched, so it costs nothing, scales anywhere and follows
 * the theme. It stays legible down to about sixteen pixels because it is three
 * dots and a ring, and that is the whole point of it being three dots and a
 * ring.
 */
export function Logo({
  size = 40,
  tone = "var(--accent)",
  title = "WBCS Sociology",
}: {
  size?: number;
  /** Overridden on the dark rail, where the accent is too quiet. */
  tone?: string;
  title?: string;
}) {
  // An equilateral triangle inside a 100-box, sitting a little high so the
  // shape reads as balanced rather than as bottom-heavy.
  const nodes = [
    { x: 50, y: 26 },
    { x: 26, y: 68 },
    { x: 74, y: 68 },
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="50" cy="50" r="43" fill="none" stroke={tone} strokeWidth="5" opacity="0.28" />
      <g stroke={tone} strokeWidth="5" strokeLinecap="round" opacity="0.75">
        <line x1={nodes[0]!.x} y1={nodes[0]!.y} x2={nodes[1]!.x} y2={nodes[1]!.y} />
        <line x1={nodes[0]!.x} y1={nodes[0]!.y} x2={nodes[2]!.x} y2={nodes[2]!.y} />
        <line x1={nodes[1]!.x} y1={nodes[1]!.y} x2={nodes[2]!.x} y2={nodes[2]!.y} />
      </g>
      <circle cx={nodes[0]!.x} cy={nodes[0]!.y} r="12" fill={tone} />
      <circle cx={nodes[1]!.x} cy={nodes[1]!.y} r="9.5" fill="var(--page)" stroke={tone} strokeWidth="5" />
      <circle cx={nodes[2]!.x} cy={nodes[2]!.y} r="9.5" fill="var(--page)" stroke={tone} strokeWidth="5" />
    </svg>
  );
}
