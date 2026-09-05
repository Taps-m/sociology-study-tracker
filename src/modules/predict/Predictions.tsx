import { useMemo, useState } from "react";
import type { Derived } from "../../lib/events";
import {
  chances,
  tiers,
  TIER_FACTS,
  type Chance,
  type TierId,
} from "../../lib/predict";
import { completionOf } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";

/**
 * What the record predicts — for a candidate, not a statistician.
 *
 * The first version of this screen showed a credible interval as a floating bar
 * and a table of Brier scores. Both are correct and neither is readable by the
 * person who has to act on them. A number nobody understands is not honesty, it
 * is decoration that happens to be true.
 *
 * The second version listed all eighty-five chapters in one run, which is
 * accurate and unusable: a ranked list that long invites the reader to treat
 * chapter 12 as meaningfully above chapter 15, when the intervals say it is
 * not. Chapters 23, 24 and 25 read 26% each, to the point.
 *
 * So the ranking is grouped where the evidence actually divides — once, at
 * chapter 16 — and the screen says outright that the order inside the second
 * group is not evidence. The arithmetic is in predict.ts and stays there.
 */

type Scope = "all" | "A" | "B";

const SCOPES: { id: Scope; label: string; why: string }[] = [
  { id: "all", label: "Whole paper", why: "everything, both groups" },
  { id: "A", label: "Group A", why: "5 asked, you answer 3" },
  { id: "B", label: "Group B", why: "3 asked, you answer 2" },
];

const TIER_COPY: Record<
  TierId,
  { name: string; why: string; figure: string; unit: string; range: string; rangeWhy: string }
> = {
  high: {
    name: "High yield",
    why: `16 chapters — 19% of the syllabus — returning ${(
      TIER_FACTS.yield.high / TIER_FACTS.yield.standard
    ).toFixed(1)} times the marks per chapter of anything below.`,
    figure: `${Math.round(TIER_FACTS.share.high)}%`,
    unit: "of a typical paper",
    range: `${TIER_FACTS.range.high[0]}–${TIER_FACTS.range.high[1]}%`,
    rangeWhy: `in each of the last ${TIER_FACTS.years} years`,
  },
  standard: {
    name: "Standard yield",
    why: "The chapters the model cannot separate from one another. The order inside this group is not evidence.",
    figure: `${Math.round(TIER_FACTS.share.standard)}%`,
    unit: "of a typical paper",
    range: `${TIER_FACTS.range.standard[0]}–${TIER_FACTS.range.standard[1]}%`,
    rangeWhy: `in each of the last ${TIER_FACTS.years} years`,
  },
  never: {
    name: "No recorded appearance",
    why: "Never asked between 2010 and 2023. That is a fact about the record, not a prediction about the next paper.",
    figure: "0",
    unit: "questions in 14 years",
    range: "",
    rangeWhy: "",
  },
};

/**
 * Plain words for a probability, and the odds said the way people say them.
 *
 * The odds come only from 1/p, never from the band. An earlier version said
 * "about every other year" above 45% and "about 1 year in N" below it, which
 * put 46% and 42% on adjacent rows saying the same thing in two different
 * ways — the reader has to work out they are equivalent, which is exactly the
 * work this screen exists to remove.
 */
function band(p: number): { word: string; odds: string; colour: string } {
  const inN = Math.max(2, Math.round(1 / Math.max(p, 0.02)));
  const odds = inN === 2 ? "about every other year" : `about 1 year in ${inN}`;
  if (p >= 0.45) return { word: "Very likely", odds, colour: "var(--good)" };
  if (p >= 0.3) return { word: "Likely", odds, colour: C.accent };
  if (p >= 0.18) return { word: "Occasional", odds, colour: C.warn };
  return { word: "Uncommon", odds, colour: C.muted };
}

function Row({ c, d, scope, n }: { c: Chance; d: Derived; scope: Scope; n: number }) {
  const b = band(c.p);
  const read = Math.round(completionOf(d, c.topic.id) * 100);
  const seen = scope === "B" ? c.inB : scope === "A" ? c.inA : c.asked;
  // A wide interval is the model saying it is guessing. Say that in words.
  const thin = c.hi - c.lo > 0.3 || c.asked <= 1;
  // Only speaks where it carries information. On most chapters both groups have
  // asked it, and a pill on every row is furniture rather than a finding.
  const only =
    c.inA > 0 && c.inB === 0 ? "Group A only" : c.inB > 0 && c.inA === 0 ? "Group B only" : null;

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.hair}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.muted, flex: "0 0 auto" }}>
          {n}
        </span>
        <span style={{ fontSize: 14.5, fontWeight: 650, flex: "1 1 220px", minWidth: 0 }}>
          {c.topic.name.split(" — ")[0]}
        </span>
        {only && (
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              color: C.muted,
              background: C.raised,
              border: `1px solid ${C.line}`,
              borderRadius: 5,
              padding: "2px 7px",
              whiteSpace: "nowrap",
            }}
          >
            {only}
          </span>
        )}
        <span
          style={{
            fontSize: 12.5,
            fontWeight: 700,
            color: b.colour,
            border: `1px solid ${b.colour}`,
            borderRadius: 999,
            padding: "2px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {b.word}
        </span>
      </div>

      <div style={{ fontSize: 13.5, color: C.text, marginTop: 5 }}>
        Comes up <strong>{b.odds}</strong>
        <span style={{ color: C.muted }}>
          {" "}
          — asked in {seen} of the last {c.of} years
        </span>
      </div>

      {/*
        The estimate and the range it sits in, on one line.

        The pale band is the 80% credible interval and the dark line is the
        posterior mean. A bare fill would say 29% for Simmel and 27% for Scope
        with equal confidence, when one rests on two appearances and the other
        on five — the band is the only part of this that carries that.
      */}
      <div
        style={{
          position: "relative",
          height: 8,
          borderRadius: 4,
          background: C.line,
          marginTop: 8,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            height: "100%",
            borderRadius: 4,
            left: `${c.lo * 100}%`,
            width: `${(c.hi - c.lo) * 100}%`,
            background: "var(--accent-line)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -2,
            width: 3,
            height: 12,
            borderRadius: 2,
            marginLeft: -1.5,
            left: `${c.p * 100}%`,
            background: b.colour,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 12.5,
          color: C.muted,
          marginTop: 6,
        }}
      >
        <span>{c.topic.unit}</span>
        <span>
          {thin && <span style={{ color: C.warn }}>thin record — treat as a guess · </span>}
          you have read <span style={{ color: read >= 60 ? "var(--good)" : C.muted }}>{read}%</span>
        </span>
      </div>
    </div>
  );
}

function TierBlock({
  id,
  chapters,
  rank,
  d,
  scope,
  open,
  onToggle,
}: {
  id: TierId;
  chapters: Chance[];
  rank: Map<string, number>;
  d: Derived;
  scope: Scope;
  open: boolean;
  onToggle: () => void;
}) {
  const t = TIER_COPY[id];
  const tone =
    id === "high"
      ? { bg: C.accent, fg: "#fff", border: C.accent, figure: C.accent }
      : id === "standard"
        ? { bg: C.accentSoft, fg: C.accent, border: "var(--accent-line)", figure: C.text }
        : { bg: C.raised, fg: C.muted, border: C.line, figure: C.muted };

  return (
    <section
      style={{
        background: C.panel,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          width: "100%",
          textAlign: "left",
          font: "inherit",
          cursor: "pointer",
          background: "transparent",
          border: 0,
          padding: "15px 16px",
        }}
      >
        <span
          style={{
            flex: "0 0 auto",
            width: 26,
            height: 26,
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            fontFamily: C.mono,
            fontSize: 12.5,
            fontWeight: 600,
            background: tone.bg,
            color: tone.fg,
            border: `1px solid ${tone.border}`,
          }}
        >
          {id === "high" ? 1 : id === "standard" ? 2 : 3}
        </span>

        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15, fontWeight: 650, color: C.text }}>
            {t.name}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 12.5,
              color: C.muted,
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            {id === "standard" ? `${chapters.length} chapters. ${t.why}` : t.why}
          </span>
        </span>

        <span style={{ flex: "0 0 auto", textAlign: "right" }}>
          <span
            style={{
              display: "block",
              fontSize: 24,
              fontWeight: 680,
              lineHeight: 1,
              color: tone.figure,
            }}
          >
            {t.figure}
          </span>
          <span style={{ display: "block", fontSize: 11.5, color: C.muted, marginTop: 4 }}>
            {t.unit}
          </span>
        </span>

        {t.range && (
          <span
            style={{
              flex: "0 0 auto",
              width: 116,
              textAlign: "right",
              paddingLeft: 14,
              borderLeft: `1px solid ${C.hair}`,
              fontFamily: C.mono,
              fontSize: 13,
              color: C.muted,
            }}
          >
            {t.range}
            <span
              style={{
                display: "block",
                fontFamily: C.sans,
                fontSize: 11,
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {t.rangeWhy}
            </span>
          </span>
        )}

        <span
          aria-hidden
          style={{
            flex: "0 0 auto",
            width: 9,
            height: 9,
            marginLeft: 4,
            borderRight: `1.8px solid ${C.muted}`,
            borderBottom: `1.8px solid ${C.muted}`,
            transform: open ? "rotate(-135deg)" : "rotate(45deg)",
          }}
        />
      </button>

      {open && (
        <div style={{ padding: "0 16px 8px", borderTop: `1px solid ${C.line}` }}>
          {chapters.map((c) => (
            <Row key={c.topic.id} c={c} d={d} scope={scope} n={rank.get(c.topic.id)! + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

export function Predictions({ d }: { d: Derived }) {
  const [scope, setScope] = useState<Scope>("all");
  const [open, setOpen] = useState<TierId | null>("high");
  const [showMaths, setShowMaths] = useState(false);

  const groups = useMemo(() => tiers(), []);
  // Row probabilities follow the scope; tier membership never does. The tiers
  // were backtested on the whole-paper ranking, and re-cutting them per group
  // would put a number on screen that was never tested.
  const scoped = useMemo(() => {
    if (scope === "all") return null;
    const m = new Map<string, Chance>();
    for (const c of chances(scope)) m.set(c.topic.id, c);
    return m;
  }, [scope]);
  const rank = useMemo(() => {
    const m = new Map<string, number>();
    let i = 0;
    for (const g of groups) for (const c of g.chapters) m.set(c.topic.id, i++);
    return m;
  }, [groups]);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card icon="trend" title="Question prediction">
        <p style={{ fontSize: 14.5, margin: 0, lineHeight: 1.7 }}>
          Every chapter's estimated chance of appearing in a given year, worked out from
          all 224 questions of the last fourteen years, and grouped where the evidence
          actually separates.
        </p>
        <p
          style={{
            fontSize: 13.5,
            lineHeight: 1.7,
            margin: "11px 0 0",
            padding: "10px 13px",
            borderRadius: 9,
            background: C.warnSoft,
            border: `1px solid ${C.warn}`,
          }}
        >
          <strong>Prediction only.</strong> The grouping sets the order you read in and
          the hours each chapter gets. It does not identify anything safe to leave out —
          the second group still supplied half to two-thirds of every paper we tested.
        </p>
      </Card>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            style={{
              flex: "1 1 150px",
              minHeight: 46,
              padding: "7px 13px",
              borderRadius: 9,
              textAlign: "left",
              font: "inherit",
              cursor: "pointer",
              background: scope === s.id ? C.accentSoft : "transparent",
              color: C.text,
              border: `1px solid ${scope === s.id ? C.accent : C.line}`,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: scope === s.id ? 650 : 500 }}>{s.label}</span>
            <span style={{ display: "block", fontSize: 12, color: C.muted, marginTop: 1 }}>
              {s.why}
            </span>
          </button>
        ))}
      </div>

      {scope === "B" && (
        <p
          style={{
            fontSize: 13.5,
            color: C.muted,
            margin: 0,
            lineHeight: 1.7,
            padding: "10px 13px",
            borderRadius: 9,
            background: C.raised,
            border: `1px solid ${C.line}`,
          }}
        >
          Group B asks three questions and you must answer two. In Paper I, a third of
          them are on research methods — a topic that never appears in Group A at all.
          Miss it and there is nowhere else to go.
        </p>
      )}

      {groups.map((g) => (
        <TierBlock
          key={g.id}
          id={g.id}
          chapters={
            scoped ? g.chapters.map((c) => scoped.get(c.topic.id) ?? c) : g.chapters
          }
          rank={rank}
          d={d}
          scope={scope}
          open={open === g.id}
          onToggle={() => setOpen((v) => (v === g.id ? null : g.id))}
        />
      ))}

      <Card icon="bulb" title="How much to trust this">
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.75 }}>
          Every percentage above is measured out of sample. For each of the last eight
          years the model was refitted on the years before it only, the groups redrawn
          from that fit, and the share of that year's questions recorded — so these are
          the returns the grouping would have delivered in advance, not in hindsight.
        </p>
        <ul style={{ fontSize: 14, lineHeight: 1.8, margin: "10px 0 0", paddingLeft: 20 }}>
          <li>
            Judged in hindsight the first group reads{" "}
            <strong>{TIER_FACTS.inSampleHigh}%</strong>; judged honestly it reads{" "}
            <strong>{Math.round(TIER_FACTS.share.high)}%</strong>. The difference is the
            group scoring itself against the questions it was drawn from.
          </li>
          <li>
            <strong>Only one division here is real.</strong> The cut at chapter 16 is a{" "}
            {TIER_FACTS.cutGap}-point gap. Below it the estimates fall by less than half a
            point apiece and the questions those chapters actually attracted are flat, so
            splitting the remainder into a middle and a bottom third would draw a line the
            evidence does not contain.
          </li>
          <li>
            Simply counting past questions does <strong>worse</strong> than treating every
            chapter as equally likely, because it says "never" about chapters that then
            turn up.
          </li>
          <li>
            The last exam was 2024 and its paper was never published, so nothing here has
            been checked against a year we had not already seen.
          </li>
        </ul>
        <button
          onClick={() => setShowMaths((v) => !v)}
          style={{
            marginTop: 12,
            minHeight: 38,
            padding: "0 12px",
            borderRadius: 8,
            font: "inherit",
            fontSize: 13,
            cursor: "pointer",
            background: "transparent",
            color: C.muted,
            border: `1px solid ${C.line}`,
          }}
        >
          {showMaths ? "Hide the technical detail" : "Show the technical detail"}
        </button>
        {showMaths && (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.75, marginTop: 11 }}>
            <p style={{ margin: 0 }}>
              Partial pooling: each chapter's rate is pulled toward its unit's, and each
              unit's toward the paper's, by a strength fitted from the corpus. Backtested
              over eight one-year-ahead splits, Brier score 0.168 against 0.171 for a flat
              rate, 0.178 for raw counting and 0.181 for a small neural network — 1,190
              chapter-years with about 200 positives cannot support that many parameters.
              Log loss 0.52 here against 0.83 for raw counting, which is the cost of
              saying 0% about something that happens.
            </p>
            <p style={{ margin: "9px 0 0" }}>
              The grouping is 1-D k-means over the 85 posterior means. It finds a{" "}
              {TIER_FACTS.cutGap}-point gap at chapter 16 and a 0.42-point gap for its
              second cut — the second is not a break, it is the algorithm being made to
              return three clusters in a region that contains one. Per-chapter yield is{" "}
              {TIER_FACTS.yield.high.toFixed(2)}% of the paper in the first group against{" "}
              {TIER_FACTS.yield.standard.toFixed(2)}% in the second. Equal thirds, for
              comparison, scores 1.70 against 1.04 — a bigger headline bought by diluting
              the top group.
            </p>
            <p style={{ margin: "9px 0 0" }}>
              "Thin record" on a row means the 80% credible interval is wider than 30
              points, or the chapter has been asked at most once.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
