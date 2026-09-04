/**
 * The small marks on the setup cards.
 *
 * Drawn here rather than pulled from an icon package: eight glyphs is not worth
 * a dependency, and a stroked SVG follows the text colour it is given, so each
 * one tints with its own disc and needs no second asset for the dark theme.
 *
 * All on a 24 box, all 1.75 stroke, so they sit at the same visual weight —
 * mixed weights are what make a set of icons look assembled rather than drawn.
 */
const PATHS: Record<string, string> = {
  person: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0 M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2",
  bars: "M4 20V10 M10 20V4 M16 20v-7 M22 20h-20",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z",
  compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M16.2 7.8l-2.9 6.4-6.4 2.9 2.9-6.4 6.4-2.9z",
  target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12 M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
  trophy: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6 M18 9h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21 1.18.54 2.03 2.03 2.03 3.79 M18 2H6v7a6 6 0 0 0 12 0V2z",

  /*
   * The navigation and the card headings.
   *
   * The rail was drawn in typographic glyphs — ◎ ▤ ✎ ↻ ◫ ◐ ◈ ▲ — which are not
   * icons but whatever each font happens to have at that code point: different
   * weights, different baselines, and different shapes on Windows and on a
   * phone. These are one stroke weight on one grid, so a column of ten reads as
   * a set. Same 24-unit box as the four above; anything added here should be.
   */
  home: "M3 10.5 12 3l9 7.5 M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5 M9.5 21v-6h5v6",
  layers: "M4 6.5h11 M4 12h16 M4 17.5h8 M18 5v4 M20 7h-4",
  pencil: "M4 20h4L20 8a2.83 2.83 0 0 0-4-4L4 16v4z M14.5 5.5l4 4",
  refresh: "M21 12a9 9 0 1 1-2.64-6.36 M21 3v6h-6",
  calendar: "M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M4 10h16 M8 3v4 M16 3v4",
  half: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 2v20a10 10 0 0 0 0-20z",
  diamond: "M12 2.5 21.5 12 12 21.5 2.5 12z",
  trend: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  question: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M9.2 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3 M12 17.5h.01",
  gear: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7 M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.35.4.64.73.83H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  quote: "M9.5 6.5C6.5 8 5 10.5 5 14v3.5h5.5V12H8c0-2 .5-3.4 2.5-4.3z M19 6.5c-3 1.5-4.5 4-4.5 7.5v3.5H20V12h-2.5c0-2 .5-3.4 2.5-4.3z",
  play: "M6 4.5 20 12 6 19.5z",
  bulb: "M9 18h6 M10 21.5h4 M12 2.5a6 6 0 0 0-3.5 10.9c.6.45 1 1.15 1 1.9v.7h5v-.7c0-.75.4-1.45 1-1.9A6 6 0 0 0 12 2.5z",
  tick: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M8 12.2l2.8 2.8L16 9.5",
  sprout: "M12 21v-8 M12 13C12 8.6 8.4 5 4 5c0 4.4 3.6 8 8 8z M12 13c0-3.3 2.7-6 6-6 0 3.3-2.7 6-6 6z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16 M21 21l-4.3-4.3",
};

export function Icon({ name, size = 20 }: { name: keyof typeof PATHS | string; size?: number }) {
  const d = PATHS[name] ?? PATHS.person!;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ display: "block" }}
    >
      {d.split(" M").map((seg, i) => (
        <path key={i} d={i === 0 ? seg : `M${seg}`} />
      ))}
    </svg>
  );
}

/**
 * The disc a mark sits in.
 *
 * Four tints, rotating, so no two neighbouring cards wear the same one. They
 * are not carrying meaning — nobody should have to learn that amber means a
 * dropdown — they are there so a column of eight cards has eight faces instead
 * of one repeated eight times.
 */
export const BADGE_TINTS = [
  { bg: "var(--tint-3)", fg: "var(--good)" },
  { bg: "var(--tint-1)", fg: "var(--slice-0)" },
  { bg: "var(--tint-0)", fg: "var(--warn)" },
  { bg: "var(--tint-2)", fg: "var(--slice-3)" },
] as const;

export function Badge({ name, tint }: { name: string; tint: number }) {
  const t = BADGE_TINTS[tint % BADGE_TINTS.length]!;
  return (
    <span className="q-badge" style={{ background: t.bg, color: t.fg }}>
      <Icon name={name} />
    </span>
  );
}
