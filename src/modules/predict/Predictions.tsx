import { useMemo, useState } from "react";
import type { Derived } from "../../lib/events";
import { BACKTEST, chances, type Chance } from "../../lib/predict";
import { completionOf } from "../../lib/planner";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import { Icon } from "../../app/Icon";

/**
 * What the record says is likely, and how far it can be trusted.
 *
 * A prototype. The model is real — partial pooling, fitted from the corpus,
 * backtested eight years one-ahead — but nothing here is validated on a year
 * nobody has seen, because the 2024 paper is not published. That is stated on
 * the screen rather than buried, and the bottom of the list is deliberately
 * ugly to read as advice: the one thing this must never do is talk a candidate
 * out of a chapter that turns up.
 */

type Scope = "all" | "A" | "B";

const SCOPES: { id: Scope; label: string; why: string }[] = [
  { id: "all", label: "Whole paper", why: "every question, both groups" },
  { id: "A", label: "Group A", why: "5 offered, you answer 3" },
  { id: "B", label: "Group B", why: "3 offered, you answer 2 — the tight one" },
];

function Row({ c, d, scope }: { c: Chance; d: Derived; scope: Scope }) {
  const done = Math.round(completionOf(d, c.topic.id) * 100);
  const seen = scope === "B" ? c.inB : scope === "A" ? c.inA : c.asked;
  const band = c.p >= 0.35 ? C.accent : c.p >= 0.15 ? C.warn : C.muted;
  return (
    <div style={{ padding: "9px 0", borderBottom: `1px solid ${C.hair}` }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="num" style={{ fontSize: 16, fontWeight: 700, color: band, flex: "0 0 46px" }}>
          {Math.round(c.p * 100)}%
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 14, lineHeight: 1.35 }}>
          {c.topic.name.split(" — ")[0]}
          <span style={{ color: C.muted, fontSize: 12.5 }}>
            {" "}
            · {c.topic.unit}
          </span>
        </span>
        <span className="num" style={{ fontSize: 12, color: C.muted, flex: "0 0 auto" }}>
          {seen}/{c.of} yrs
        </span>
      </div>

      {/*
        The bar is the interval, not the number. A chapter with one appearance
        gets a long bar and a chapter with nine gets a short one, so the width
        of what the model does not know is the first thing seen.
      */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 5 }}>
        <span
          style={{
            flex: 1,
            height: 7,
            borderRadius: 4,
            background: "var(--line)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              left: `${c.lo * 100}%`,
              width: `${(c.hi - c.lo) * 100}%`,
              top: 0,
              bottom: 0,
              borderRadius: 4,
              background: band,
              opacity: 0.35,
            }}
          />
          <span
            style={{
              position: "absolute",
              left: `calc(${c.p * 100}% - 1px)`,
              top: -2,
              bottom: -2,
              width: 2,
              background: band,
            }}
          />
        </span>
        <span className="num" style={{ fontSize: 11.5, color: C.muted, flex: "0 0 74px" }}>
          {Math.round(c.lo * 100)}–{Math.round(c.hi * 100)}%
        </span>
        <span
          className="num"
          style={{ fontSize: 11.5, flex: "0 0 58px", textAlign: "right", color: done >= 60 ? "var(--good)" : C.muted }}
        >
          {done}% read
        </span>
      </div>
    </div>
  );
}

export function Predictions({ d }: { d: Derived }) {
  const [scope, setScope] = useState<Scope>("all");
  const [showTail, setShowTail] = useState(false);
  const list = useMemo(() => chances(scope === "all" ? undefined : scope), [scope]);
  const head = list.slice(0, 20);
  const tail = list.slice(20);

  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card icon="trend" title="What the record says is likely">
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          Fourteen years, 224 questions, 85 chapters. Each chapter's rate is pulled
          toward its unit's by an amount the data chooses — because most chapters
          have one or two appearances, and one appearance cannot tell a real
          pattern from a coincidence.
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
          <strong>Prediction only, and the bottom of this list is the weak end.</strong>{" "}
          Chapters the model put under 8% still turned up 36% of the time in testing.
          A low number here means <em>rarely asked</em>. It never means safe to skip.
        </p>
      </Card>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {SCOPES.map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            title={s.why}
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
        title={scope === "B" ? "Most likely in Group B" : scope === "A" ? "Most likely in Group A" : "Most likely, whole paper"}
        icon="target"
      >
        {scope === "B" && (
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 10px", lineHeight: 1.65 }}>
            Group B offers three questions and you answer two, so there is almost
            nowhere to hide. In Paper I this group is a third Research Methods and
            a fifth science-and-society — and Research Methods appears in Group B
            and nowhere else.
          </p>
        )}
        {head.map((c) => (
          <Row key={c.topic.id} c={c} d={d} scope={scope} />
        ))}
        <button
          onClick={() => setShowTail((v) => !v)}
          style={{
            marginTop: 12,
            minHeight: 40,
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

      {/*
        The scoreboard, on the screen rather than in a commit message. A model
        that will not say how it did when it was tested is asking to be believed
        rather than checked.
      */}
      <Card icon="bars" title="How it did when it was tested">
        <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 11px", lineHeight: 1.7 }}>
          {BACKTEST.years} one-year-ahead predictions, each trained only on the years
          before it. Brier score — lower is better, and 0 would be perfect.
        </p>
        {[
          ["assume every chapter equally likely", BACKTEST.brier.flat, false],
          ["count past questions", BACKTEST.brier.count, false],
          ["a small neural network", BACKTEST.brier.network, false],
          ["this model", BACKTEST.brier.pooled, true],
        ].map(([label, v, best]) => (
          <div
            key={label as string}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13.5,
              padding: "5px 0",
              color: best ? C.text : C.muted,
              fontWeight: best ? 650 : 400,
            }}
          >
            <span>{label as string}</span>
            <span className="num">{(v as number).toFixed(3)}</span>
          </div>
        ))}
        <p style={{ fontSize: 12.5, color: C.muted, margin: "11px 0 0", lineHeight: 1.7 }}>
          Counting past questions scored worse than assuming nothing, and its log
          loss was <span className="num">{BACKTEST.logLoss.count.toFixed(2)}</span> against{" "}
          <span className="num">{BACKTEST.logLoss.pooled.toFixed(2)}</span> here — that is
          what happens when a model says 0% and the chapter turns up. The network was
          worse still: 1,190 chapter-years and about 200 positives cannot support it.
        </p>
        <p
          style={{
            fontSize: 12.5,
            color: C.muted,
            margin: "11px 0 0",
            lineHeight: 1.7,
            display: "flex",
            gap: 8,
          }}
        >
          <span style={{ color: C.warn, flexShrink: 0 }}>
            <Icon name="bulb" size={15} />
          </span>
          <span>
            All of it is validated on splits of the same fourteen years. The 2024 paper
            is not published anywhere findable, so no genuinely unseen year has ever
            tested this. Treat it as provisional until one does.
          </span>
        </p>
      </Card>
    </div>
  );
}
