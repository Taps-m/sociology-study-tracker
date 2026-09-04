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
