import { useMemo, useState } from "react";
import type { Derived } from "../../lib/events";
import { chances, type Chance } from "../../lib/predict";
import { completionOf } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { Icon } from "../../app/Icon";

/**
 * What the record says is likely — for a candidate, not a statistician.
 *
 * The first version of this screen showed a credible interval as a floating bar
 * and a table of Brier scores. Both are correct and neither is readable by the
 * person who has to act on them. A number nobody understands is not honesty, it
 * is decoration that happens to be true.
 *
 * So the model is unchanged and the language is not. A probability is said as
 * "about 1 year in 2"; the evidence behind it is said as "asked in 10 of the
 * last 14 years", which is a count anybody can check; and how sure the model is
 * comes out as "solid record" or "thin record" rather than as an interval
 * width. The arithmetic behind that is in predict.ts and stays there.
 */

type Scope = "all" | "A" | "B";

const SCOPES: { id: Scope; label: string; why: string }[] = [
  { id: "all", label: "Whole paper", why: "everything, both groups" },
  { id: "A", label: "Group A", why: "5 asked, you answer 3" },
  { id: "B", label: "Group B", why: "3 asked, you answer 2" },
];

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
  if (p >= 0.18) return { word: "Now and then", odds, colour: C.warn };
  return { word: "Rare", odds, colour: C.muted };
}

function Row({ c, d, scope }: { c: Chance; d: Derived; scope: Scope }) {
  const b = band(c.p);
  const read = Math.round(completionOf(d, c.topic.id) * 100);
  const seen = scope === "B" ? c.inB : scope === "A" ? c.inA : c.asked;
  // A wide interval is the model saying it is guessing. Say that in words.
  const thin = c.hi - c.lo > 0.3 || c.asked <= 1;

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.hair}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14.5, fontWeight: 650, flex: "1 1 240px", minWidth: 0 }}>
          {c.topic.name.split(" — ")[0]}
        </span>
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

      {/* One plain bar: how likely. Nothing floating, nothing to decode. */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "var(--line)",
          overflow: "hidden",
          marginTop: 7,
        }}
      >
        <div style={{ width: `${c.p * 100}%`, height: "100%", background: b.colour }} />
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

export function Predictions({ d }: { d: Derived }) {
  const [scope, setScope] = useState<Scope>("all");
  const [showTail, setShowTail] = useState(false);
  const [showMaths, setShowMaths] = useState(false);
  const list = useMemo(() => chances(scope === "all" ? undefined : scope), [scope]);
  const head = list.slice(0, 20);
  const tail = list.slice(20);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card icon="trend" title="What is likely to come">
        <p style={{ fontSize: 14.5, margin: 0, lineHeight: 1.7 }}>
          Every chapter, ordered by how often WBCS has asked it — worked out from
          all 224 questions of the last fourteen years.
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
          <strong>This is a guide, not a forecast.</strong> Chapters at the bottom of
          this list still turned up about a third of the time when we tested it.
          "Rare" means rarely asked. It does not mean safe to leave out.
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

      <Card
        icon="target"
        title={
          scope === "B"
            ? "Group B — where you have the least choice"
            : scope === "A"
              ? "Group A"
              : "Whole paper"
        }
      >
        {scope === "B" && (
          <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.7 }}>
            Group B asks three questions and you must answer two. In Paper I, a third
            of them are on research methods — a topic that never appears in Group A at
            all. Miss it and there is nowhere else to go.
          </p>
        )}
        {head.map((c) => (
          <Row key={c.topic.id} c={c} d={d} scope={scope} />
        ))}
        <button
          onClick={() => setShowTail((v) => !v)}
          style={{
            marginTop: 14,
            minHeight: 42,
            padding: "0 14px",
            borderRadius: 8,
            font: "inherit",
            fontSize: 13.5,
            cursor: "pointer",
            background: "transparent",
            color: C.accent,
            border: `1px solid ${C.line}`,
          }}
        >
          {showTail ? "Hide the rest" : `Show the other ${tail.length} chapters`}
        </button>
        {showTail && (
          <div style={{ marginTop: 10 }}>
            {tail.map((c) => (
              <Row key={c.topic.id} c={c} d={d} scope={scope} />
            ))}
          </div>
        )}
      </Card>

      <Card icon="bulb" title="How much to trust this">
        <p style={{ fontSize: 14, margin: 0, lineHeight: 1.75 }}>
          We tested it the fair way: hide a year, work out the ranking from the years
          before it only, then look at what actually came. Done eight times over.
        </p>
        <ul style={{ fontSize: 14, lineHeight: 1.8, margin: "10px 0 0", paddingLeft: 20 }}>
          <li>
            The top 20 chapters held about <strong>4 in 10</strong> of what was actually
            asked that year. Useful for ordering your work — not a shortlist to revise
            and nothing else.
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
            <p style={{ margin: "9px 0 0", display: "flex", gap: 8 }}>
              <span style={{ color: C.warn, flexShrink: 0 }}>
                <Icon name="bulb" size={15} />
              </span>
              <span>
                "Thin record" on a row means the 80% credible interval is wider than 30
                points, or the chapter has been asked at most once.
              </span>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
