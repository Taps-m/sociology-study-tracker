import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TOPICS } from "./data/syllabus";
import { on, project } from "./lib/events";
import type { CheckId, Derived, Settings, StudyEvent } from "./lib/events";
import {
  attemptStats,
  calibration,
  coreProgress,
  daysUntil,
  dueForRevision,
  effectivePace,
  freshness,
  isOptional,
  observedPace,
  options,
  packWeeks,
  progress,
  projection,
  requiredPace,
} from "./lib/planner";
import { exportJson, importJson, load, save } from "./lib/storage";
import { C } from "./lib/theme";
import { TopicRow } from "./components/TopicRow";
import { quoteOfTheDay } from "./data/quotes";
import { Shell as AppShell, Card, NotBuiltYet } from "./app/Shell";
import { useRoute } from "./app/routes";
import { DashboardScreen } from "./modules/dashboard/DashboardScreen";
import { ChaptersScreen } from "./modules/chapters/ChaptersScreen";

export default function App() {
  const [events, setEvents] = useState<StudyEvent[]>(() => load());
  const [route, go] = useRoute();
  useEffect(() => save(events), [events]);

  const d = useMemo(() => project(events), [events]);
  const add = (e: StudyEvent) => setEvents((prev) => [...prev, e]);

  if (!d.settings) {
    return (
      <Setup
        onDone={(settings, known) => {
          const batch: StudyEvent[] = [on.settings(settings)];
          for (const unit of known) {
            for (const t of TOPICS.filter((x) => x.unit === unit)) {
              batch.push(on.check(t.id, "read", { prior: true }));
            }
          }
          setEvents(batch);
        }}
      />
    );
  }

  const handlers = {
    onToggle: (topicId: string, check: CheckId) =>
      add(d.checks[topicId]?.[check] ? on.uncheck(topicId, check) : on.check(topicId, check)),
    onLogTime: (topicId: string, check: CheckId, minutes: number) =>
      add(on.check(topicId, check, { minutes })),
    onMarkPrior: (topicId: string, check: CheckId) =>
      add(on.check(topicId, check, { prior: true })),
    onAttempt: (topicId: string, marks: number, outOf: number, minutes: number) =>
      add(on.attempt(topicId, marks, outOf, minutes)),
  };

  const onRevise = (topicId: string) => add(on.check(topicId, "revised"));

  return (
    <AppShell route={route} go={go}>
      {route === "dashboard" && <DashboardScreen d={d} go={go} />}

      {route === "chapters" && <ChaptersScreen d={d} {...handlers} />}

      {route === "plan" && <PlanScreen d={d} />}

      {route === "today" && (
        <div className="grid" style={{ gap: 14 }}>
          <ThisWeek d={d} {...handlers} />
        </div>
      )}

      {route === "revision" && (
        <div className="grid" style={{ gap: 14 }}>
          <DueForRevision d={d} onRevise={onRevise} />
        </div>
      )}

      {route === "answers" && <AnswersScreen d={d} />}

      {route === "progress" && (
        <div className="grid" style={{ gap: 14 }}>
          <Telemetry d={d} />
        </div>
      )}

      {route === "settings" && (
        <div className="grid" style={{ gap: 14 }}>
          <Greeting d={d} onName={(name) => add(on.settings({ name }))} />
          <PaceControl d={d} onChange={(patch) => add(on.settings(patch))} />
          <Backup events={events} setEvents={setEvents} />
        </div>
      )}

      {route === "pyq" && (
        <NotBuiltYet
          label="PYQ Explorer"
          needs={[
            "The text of the 91 tagged questions. syllabus.ts stores only how many times each topic was asked, not what was asked.",
            "Ten years rather than six — 2014-2017 and 2024-2026 are still missing.",
          ]}
        />
      )}

      {route === "flashcards" && (
        <NotBuiltYet
          label="Flashcards"
          needs={[
            "Cards for 85 topics. The screen is an afternoon; the cards are the work.",
            "A decision on whether they are written by hand or generated once and committed.",
          ]}
        />
      )}

      {route === "notes" && (
        <NotBuiltYet
          label="My Notes"
          needs={[
            "A per-topic note store. The event log can carry it, so this is small.",
            "A decision on plain text or rich text before anything is stored.",
          ]}
        />
      )}

      {route === "mindmaps" && (
        <NotBuiltYet
          label="Mind Maps"
          needs={[
            "A diagram per unit. Nineteen units, drawn by hand or authored as data.",
            "This is the most expensive module in the design and the least urgent.",
          ]}
        />
      )}
    </AppShell>
  );
}

function PlanScreen({ d }: { d: Derived }) {
  const weeks = packWeeks(d, 8);
  if (weeks.length === 0) {
    return <Card title="Study plan">Nothing to schedule yet.</Card>;
  }
  return (
    <div className="grid" style={{ gap: 12 }}>
      {weeks.map((w) => (
        <Card
          key={w.weekIndex}
          title={w.weekIndex === 0 ? "This week" : `Week ${w.weekIndex + 1}`}
          action={
            <span className="num" style={{ fontSize: 12, color: C.muted }}>
              {w.totalHours} h
            </span>
          }
        >
          {w.topics.length === 0 && w.revisions.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Clear.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.9 }}>
              {w.topics.map((t) => (
                <li key={t.id}>{t.name}</li>
              ))}
              {w.revisions.map((r) => (
                <li key={`r-${r.topic.id}`} style={{ color: C.warn }}>
                  Revise: {r.topic.name}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
      <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
        Only this week is fixed. Every week after it is recomputed from what is
        actually left each time you open the app, so falling behind reshapes the
        plan instead of breaking it.
      </p>
    </div>
  );
}

function AnswersScreen({ d }: { d: Derived }) {
  const s = attemptStats(d);
  return (
    <div className="grid" style={{ gap: 14 }}>
      <Card title="Answer practice">
        {s.total === 0 ? (
          <p style={{ fontSize: 13.5, color: C.muted, margin: 0, lineHeight: 1.7 }}>
            No answers written yet — and that is the thing the exam actually scores.
            Attempts are logged per topic: open a topic in Chapters and record the
            marks and the minutes it took.
          </p>
        ) : (
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div className="num" style={{ fontSize: 28 }}>
                {s.total}
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>answers written</div>
            </div>
            <div>
              <div className="num" style={{ fontSize: 28, color: C.accent }}>
                {s.averagePercent}%
              </div>
              <div style={{ fontSize: 12, color: C.muted }}>average score</div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Greeting({ d, onName }: { d: Derived; onName: (name: string) => void }) {
  const [draft, setDraft] = useState("");
  const name = d.settings?.name?.trim();
  const quote = quoteOfTheDay();
  const hour = new Date().getHours();
  const partOfDay = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header style={{ fontFamily: C.sans, marginBottom: 22 }}>
      {name ? (
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
          {partOfDay}, {name}.
        </h1>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) onName(draft.trim());
          }}
          style={{ display: "flex", gap: 8, marginBottom: 4 }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What should I call you?"
            aria-label="Your name"
            maxLength={40}
            style={{
              flex: 1,
              minHeight: 40,
              padding: "0 12px",
              borderRadius: 8,
              background: C.panel,
              border: `1px solid ${C.line}`,
              color: C.text,
              fontFamily: C.sans,
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            style={{
              minHeight: 40,
              padding: "0 16px",
              borderRadius: 8,
              border: "none",
              background: C.accent,
              color: C.surface,
              fontFamily: C.sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </form>
      )}

      <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 16px" }}>
        Welcome back to your sociology tracker.
      </p>

      <figure
        style={{
          margin: 0,
          padding: "14px 16px",
          background: C.panel,
          border: `1px solid ${C.line}`,
          borderLeft: `3px solid ${C.accent}`,
          borderRadius: 10,
        }}
      >
        <blockquote style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: C.text }}>
          {quote.text}
        </blockquote>
        <figcaption
          style={{
            fontFamily: C.mono,
            fontSize: 11,
            color: C.muted,
            marginTop: 10,
            letterSpacing: "0.04em",
          }}
        >
          {quote.who} · {quote.where}
        </figcaption>
      </figure>
    </header>
  );
}

function Telemetry({ d }: { d: Derived }) {
  const settings = d.settings as Settings;
  const p = progress(d);
  const core = coreProgress(d);
  const proj = projection(d);
  const need = requiredPace(d);
  const measured = observedPace(d);
  const answers = attemptStats(d);
  const fresh = freshness(d);
  const days = daysUntil(settings.examDate);
  const targetPct = Math.round(settings.targetCoverage * 100);

  return (
    <>
      <Row>
        <span style={{ fontSize: 11, letterSpacing: "0.12em", color: C.muted }}>
          sociology · wbcs
        </span>
        <span style={{ fontSize: 13, color: C.accent }}>T-{days}d</span>
      </Row>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, margin: "20px 0 4px" }}>
        <span style={{ fontSize: 44, lineHeight: 1 }}>{p.percent}</span>
        <span style={{ fontSize: 15, color: C.muted, paddingBottom: 4 }}>%</span>
        <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto", paddingBottom: 6 }}>
          {p.doneHours} h done · target {targetPct}%
        </span>
      </div>

      <div style={{ position: "relative", margin: "14px 0 8px" }}>
        <div style={{ display: "flex", gap: 2 }}>
          <div style={{ flex: Math.max(0.001, p.percent), height: 6, background: C.accent, borderRadius: 1 }} />
          <div style={{ flex: Math.max(0.001, 100 - p.percent), height: 6, background: C.dim, borderRadius: 1 }} />
        </div>
        <div
          title={`target ${targetPct}%`}
          style={{ position: "absolute", left: `${targetPct}%`, top: -3, width: 1, height: 12, background: C.warn }}
        />
      </div>

      <div style={{ fontSize: 11, color: C.muted, marginBottom: 18 }}>
        {core.topicsComplete} of {core.topicCount} topics at planned depth ·{" "}
        {TOPICS.length - core.topicCount} skipped
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1,
          background: C.line,
          border: `1px solid ${C.line}`,
          borderRadius: 6,
          overflow: "hidden",
        }}
      >
        <Cell label="Planned" value={settings.weeklyHours} unit="h/wk" />
        <Cell
          label="Actual"
          value={measured ?? "—"}
          unit={measured === null ? "" : "h/wk"}
          warn={measured !== null && measured < settings.weeklyHours}
        />
        <Cell label="Needed" value={need} unit="h/wk" warn={need > effectivePace(d)} />
        <Cell label="Projected" value={proj.ofSyllabus} unit="% of syllabus" warn={proj.margin < 0} />
        <Cell label="Answers" value={answers.perWeek} unit="a week" warn={answers.perWeek < 1} />
        <Cell
          label="Fresh"
          value={fresh.percent ?? "—"}
          unit={fresh.percent === null ? "" : "%"}
          warn={fresh.percent !== null && fresh.percent < 70}
        />
        <Cell
          label="Scoring"
          value={answers.averagePercent ?? "—"}
          unit={answers.averagePercent === null ? "" : "%"}
        />
      </div>

      <CalibrationNote d={d} />

      {options(d).length > 0 && (
        <Section title="Three ways to close the gap">
          {options(d).map((o) => (
            <Row key={o.label} pad>
              <span style={{ fontSize: 12 }}>{o.label}</span>
              <span style={{ fontSize: 12, color: C.accent, whiteSpace: "nowrap" }}>{o.outcome}</span>
            </Row>
          ))}
        </Section>
      )}
    </>
  );
}

function DueForRevision({ d, onRevise }: { d: Derived; onRevise: (id: string) => void }) {
  const due = dueForRevision(d).slice(0, 8);
  if (due.length === 0) return null;

  return (
    <Section title={`${due.length} due for revision`}>
      {due.map(({ topic, overdueDays, count }) => (
        <Row key={topic.id} pad>
          <span style={{ fontSize: 12, lineHeight: 1.45 }}>
            {topic.name}
            <span style={{ fontSize: 11, color: C.warn, marginLeft: 8, whiteSpace: "nowrap" }}>
              {overdueDays}d overdue
            </span>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 8 }}>
              revised {count}×
            </span>
          </span>
          <button
            onClick={() => onRevise(topic.id)}
            style={{
              font: "inherit",
              fontSize: 11,
              padding: "8px 12px",
              minHeight: 36,
              borderRadius: 4,
              cursor: "pointer",
              background: "transparent",
              color: C.accent,
              border: `1px solid ${C.accent}`,
              whiteSpace: "nowrap",
            }}
          >
            Revised
          </button>
        </Row>
      ))}
      <Note>
        Next interval widens each time: 7 days, then 21, 45, 90. Coverage never falls for missing
        these — only freshness does.
      </Note>
    </Section>
  );
}

function CalibrationNote({ d }: { d: Derived }) {
  const cal = calibration(d);
  const answers = attemptStats(d);

  if (!cal.ready) {
    return (
      <Note>
        Hour estimates are still mine. Log time on {5 - cal.samples} more checks and the app starts
        using your own pace.
        {answers.total === 0 && " No answers written yet — that is what the exam scores."}
      </Note>
    );
  }
  const pct = Math.round(Math.abs(cal.factor - 1) * 100);
  return (
    <Note>
      {cal.factor > 1.05
        ? `Topics take you about ${pct}% longer than my estimates, so every hour here is scaled up.`
        : cal.factor < 0.95
          ? `You get through topics about ${pct}% faster than my estimates, so the hours are scaled down.`
          : "Your pace matches my estimates closely."}{" "}
      Based on {cal.samples} logged sessions.
    </Note>
  );
}

type Handlers = {
  onToggle: (id: string, c: CheckId) => void;
  onLogTime: (id: string, c: CheckId, m: number) => void;
  onMarkPrior: (id: string, c: CheckId) => void;
  onAttempt: (id: string, marks: number, outOf: number, minutes: number) => void;
};

function ThisWeek({ d, ...h }: { d: Derived } & Handlers) {
  const week = packWeeks(d, 1)[0];
  if (!week || (week.topics.length === 0 && week.revisions.length === 0)) {
    return <Note>Nothing left in the queue. Every topic is at its planned depth.</Note>;
  }
  const title =
    week.revisionHours > 0
      ? `${week.topics.length} topics · ${week.hours} h new · ${week.revisionHours} h revision`
      : `${week.topics.length} topics · ${week.hours} hours`;
  return (
    <Section title={title}>
      {week.topics.map((t) => (
        <TopicRow key={t.id} topic={t} d={d} {...h} optional={isOptional(d, t.id)} />
      ))}
      {week.revisionHours > 0 && (
        <Note>
          {week.revisions.length} revisions fall due this week, booked at {week.revisionHours} of
          your {week.totalHours} planned hours. Revision is taken out of the week before new
          topics, so a backlog slows new coverage instead of being quietly ignored.
        </Note>
      )}
    </Section>
  );
}


function PaceControl({
  d,
  onChange,
}: {
  d: Derived;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const s = d.settings as Settings;
  return (
    <Section title="Hours a week you can give">
      <input
        type="range"
        min={1}
        max={40}
        value={s.weeklyHours}
        onChange={(e) => onChange({ weeklyHours: +e.target.value })}
        style={{ width: "100%", accentColor: C.accent, marginTop: 10 }}
      />
      <Note>
        {s.weeklyHours} hours a week · exam on {s.examDate}
      </Note>

      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", marginTop: 20 }}>
        How much of the syllabus you are aiming for
      </div>
      <input
        type="range"
        min={50}
        max={100}
        step={5}
        value={Math.round(s.targetCoverage * 100)}
        onChange={(e) => onChange({ targetCoverage: +e.target.value / 100 })}
        style={{ width: "100%", accentColor: C.accent, marginTop: 10 }}
      />
      <Note>
        {Math.round(s.targetCoverage * 100)}% target. Depth per topic comes from how often it was
        asked between 2018 and 2023, blended with its unit's record. This plan works out at{" "}
        {coreProgress(d).shareOfSyllabus}% of the full syllabus.
      </Note>
    </Section>
  );
}

function Backup({
  events,
  setEvents,
}: {
  events: StudyEvent[];
  setEvents: (e: StudyEvent[]) => void;
}) {
  const [message, setMessage] = useState("");

  function download() {
    const blob = new Blob([exportJson(events)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sociology-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Saved to your downloads.");
  }

  function upload(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = importJson(String(reader.result));
      if (!parsed) return setMessage("That file could not be read.");
      setEvents(parsed);
      setMessage("Restored.");
    };
    reader.readAsText(file);
  }

  const btn = {
    font: "inherit",
    fontSize: 12,
    padding: "10px 14px",
    minHeight: 44,
    borderRadius: 4,
    cursor: "pointer",
    background: "transparent",
    color: C.text,
    border: `1px solid ${C.line}`,
  } as const;

  return (
    <Section title="Backup">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button onClick={download} style={btn}>
          Download a copy
        </button>
        <label style={{ ...btn, display: "inline-flex", alignItems: "center" }}>
          Restore from file
          <input
            type="file"
            accept="application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>
      <Note>
        {message ||
          `${events.length} events stored in this browser only. Clearing site data erases them.`}
      </Note>
    </Section>
  );
}

function Setup({ onDone }: { onDone: (s: Settings, known: string[]) => void }) {
  const [name, setName] = useState("");
  const [months, setMonths] = useState(5);
  const [hours, setHours] = useState(12);
  const [target, setTarget] = useState(80);
  const [known, setKnown] = useState<string[]>([]);

  const papers = [1, 2].map((paper) => ({
    paper,
    units: [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))],
  }));

  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + months);
  const examDate = targetDate.toISOString().slice(0, 10);
  const readable = targetDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalHours = TOPICS.reduce((s, t) => s + t.estHours, 0);
  const reachable = Math.min(100, Math.round(((hours * months * 4.345) / totalHours) * 100));
  const meetsTarget = reachable >= target;
  const weeklyNeeded = Math.ceil((totalHours * (target / 100)) / (months * 4.345));

  return (
    <Shell align="flex-start">
      <div style={{ maxWidth: 560, width: "100%", fontFamily: C.sans }}>
        <header style={{ marginBottom: 24 }}>
          <div
            style={{
              fontFamily: C.mono,
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: C.muted,
            }}
          >
            sociology · wbcs
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, margin: "10px 0 6px", letterSpacing: "-0.01em" }}>
            Before we start
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Four questions. All of it can be changed later.
          </p>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          <section style={panelStyle}>
            <label
              htmlFor="setup-name"
              style={{ display: "block", fontSize: 13, color: C.text, marginBottom: 10 }}
            >
              What should I call you?
            </label>
            <input
              id="setup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={40}
              style={{
                width: "100%",
                minHeight: 42,
                padding: "0 12px",
                borderRadius: 8,
                background: C.surface,
                border: `1px solid ${C.line}`,
                color: C.text,
                fontFamily: C.sans,
                fontSize: 14,
              }}
            />
          </section>

          <Field label="How long until your exam?" value={months} unit={months === 1 ? "month" : "months"} sub={readable}>
            <input
              type="range"
              min={1}
              max={24}
              value={months}
              onChange={(e) => setMonths(+e.target.value)}
              aria-label="Months until exam"
            />
          </Field>

          <Field label="Hours a week for sociology" value={hours} unit="h / week" sub={`about ${(hours / 7).toFixed(1)} hours a day`}>
            <input
              type="range"
              min={1}
              max={40}
              value={hours}
              onChange={(e) => setHours(+e.target.value)}
              aria-label="Hours a week"
            />
          </Field>

          <Field label="How much of the syllabus are you aiming to cover?" value={target} unit="%" sub="the rest stays visible as optional">
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={target}
              onChange={(e) => setTarget(+e.target.value)}
              aria-label="Target coverage"
            />
          </Field>

          <section style={panelStyle}>
            <div style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>
              Already know any of this?
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
              Tick the units you have studied before. They start part-complete instead of at zero.
            </div>

            {papers.map(({ paper, units }) => (
              <div key={paper} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 10,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: C.muted,
                    marginBottom: 8,
                  }}
                >
                  Paper {paper === 1 ? "I" : "II"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {units.map((u) => {
                    const isOn = known.includes(u);
                    return (
                      <button
                        key={u}
                        onClick={() => setKnown(isOn ? known.filter((k) => k !== u) : [...known, u])}
                        aria-pressed={isOn}
                        style={{
                          fontFamily: C.sans,
                          fontSize: 12,
                          padding: "8px 12px",
                          minHeight: 36,
                          borderRadius: 999,
                          cursor: "pointer",
                          background: isOn ? "rgba(95, 211, 243, 0.12)" : "transparent",
                          color: isOn ? C.accent : C.muted,
                          border: `1px solid ${isOn ? C.accent : C.line}`,
                        }}
                      >
                        {isOn ? "✓ " : ""}
                        {u}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 11, color: C.muted }}>
              {known.length === 0 ? "Nothing ticked — starting from zero." : `${known.length} ticked.`}
            </div>
          </section>

          <section
            style={{
              ...panelStyle,
              borderLeft: `3px solid ${meetsTarget ? C.accent : C.warn}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span
                style={{
                  fontFamily: C.mono,
                  fontSize: 34,
                  lineHeight: 1,
                  color: meetsTarget ? C.accent : C.warn,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {reachable}%
              </span>
              <span style={{ fontSize: 13, color: C.muted }}>of the syllabus at this pace</span>
            </div>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7, margin: "10px 0 0" }}>
              {meetsTarget
                ? `That clears your ${target}% target with room to spare.`
                : `That falls short of your ${target}% target. Reaching it needs about ${weeklyNeeded} hours a week — or a longer run-up. You can also leave it and close the gap later.`}
            </p>
          </section>
        </div>

        <button
          onClick={() => onDone(
              { name: name.trim() || undefined, examDate, weeklyHours: hours, targetCoverage: target / 100 },
              known,
            )}
          style={{
            width: "100%",
            minHeight: 50,
            marginTop: 18,
            background: C.accent,
            border: "none",
            borderRadius: 8,
            color: C.surface,
            fontFamily: C.sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Start
        </button>
      </div>
    </Shell>
  );
}

const panelStyle = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "16px 18px",
} as const;

function Field({
  label,
  value,
  unit,
  sub,
  children,
}: {
  label: string;
  value: number;
  unit: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section style={panelStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <span style={{ fontSize: 13, color: C.text, lineHeight: 1.4 }}>{label}</span>
        <span style={{ whiteSpace: "nowrap" }}>
          <span
            style={{
              fontFamily: C.mono,
              fontSize: 26,
              color: C.accent,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 5 }}>{unit}</span>
        </span>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
      {sub && (
        <div style={{ fontFamily: C.mono, fontSize: 11, color: C.muted, marginTop: 8 }}>{sub}</div>
      )}
    </section>
  );
}

function Shell({ children, align = "center" }: { children: ReactNode; align?: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: C.surface,
        color: C.text,
        fontFamily: C.mono,
        display: "flex",
        justifyContent: "center",
        alignItems: align,
        padding: "28px 16px 64px",
      }}
    >
      {children}
    </main>
  );
}




function Cell({ label, value, unit, warn }: { label: string; value: number | string; unit: string; warn?: boolean }) {
  return (
    <div style={{ background: C.panel, padding: 10 }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 19, marginTop: 3, color: warn ? C.warn : C.text }}>
        {value}
        <span style={{ fontSize: 11, color: C.muted }}> {unit}</span>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 22, borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
      <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.08em", marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ children, pad }: { children: ReactNode; pad?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: pad ? "9px 0" : 0,
        borderBottom: pad ? `1px solid ${C.hair}` : undefined,
      }}
    >
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>{children}</div>;
}
