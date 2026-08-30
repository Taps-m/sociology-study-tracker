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
  effectivePace,
  freshness,
  observedPace,
  options,
  progress,
  projection,
  requiredPace,
} from "./lib/planner";
import { exportJson, importJson, load, save } from "./lib/storage";
import { clearAdvice } from "./lib/ai";
import { C } from "./lib/theme";
import { quoteOfTheDay } from "./data/quotes";
import { Shell as AppShell } from "./app/Shell";
import { useRoute } from "./app/routes";
import { AskAI } from "./app/AskAI";
import { DashboardScreen } from "./modules/dashboard/DashboardScreen";
import { ChaptersScreen } from "./modules/chapters/ChaptersScreen";
import { PlanScreen } from "./modules/plan/PlanScreen";
import { RevisionDeck } from "./modules/revision/RevisionDeck";
import { RecentActivity } from "./modules/activity/RecentActivity";
import { TodayScreen } from "./modules/today/TodayScreen";
import { AnswerPractice } from "./modules/answers/AnswerPractice";
import { PyqExplorer } from "./modules/pyq/PyqExplorer";

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
          // Setup decides where you land, not whichever page you happened to
          // erase from. Without this the hash still points at Settings and the
          // first thing a new user sees is the reset button.
          go("dashboard");
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
    <AppShell route={route} go={go} name={d.settings.name?.trim() || undefined}>
      {route === "dashboard" && (
        <DashboardScreen d={d} go={go} onToggle={handlers.onToggle} />
      )}

      {route === "chapters" && <ChaptersScreen d={d} {...handlers} />}

      {route === "plan" && <PlanScreen d={d} />}

      {route === "today" && <TodayScreen d={d} go={go} {...handlers} />}

      {route === "pyq" && <PyqExplorer d={d} />}

      {route === "revision" && <RevisionDeck d={d} onRevise={onRevise} />}

      {route === "answers" && (
        <AnswerPractice
          d={d}
          onAttempt={(id, marks, outOf, minutes, detail) =>
            add(on.attempt(id, marks, outOf, minutes, detail))
          }
        />
      )}

      {route === "progress" && (
        <div className="grid" style={{ gap: 14 }}>
          <Telemetry d={d} />
          <RecentActivity events={events} add={add} />
        </div>
      )}

      {route === "settings" && (
        <div className="grid" style={{ gap: 14 }}>
          <Greeting d={d} onName={(name) => add(on.settings({ name }))} />
          <StartUnitControl d={d} onChange={(patch) => add(on.settings(patch))} />
          <PaceControl d={d} onChange={(patch) => add(on.settings(patch))} />
          <Backup events={events} setEvents={setEvents} />
        </div>
      )}

      <AskAI d={d} route={route} />
    </AppShell>
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
              fontSize: 15.5,
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
              fontSize: 14.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </form>
      )}

      <p style={{ fontSize: 13.5, color: C.muted, margin: "6px 0 16px" }}>
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
        <blockquote style={{ margin: 0, fontSize: 15.5, lineHeight: 1.65, color: C.text }}>
          {quote.text}
        </blockquote>
        <figcaption
          style={{
            fontFamily: C.mono,
            fontSize: 12.5,
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
        <span style={{ fontSize: 12.5, letterSpacing: "0.12em", color: C.muted }}>
          sociology · wbcs
        </span>
        <span style={{ fontSize: 14.5, color: C.accent }}>T-{days}d</span>
      </Row>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, margin: "20px 0 4px" }}>
        <span style={{ fontSize: 44, lineHeight: 1 }}>{p.percent}</span>
        <span style={{ fontSize: 16, color: C.muted, paddingBottom: 4 }}>%</span>
        <span style={{ fontSize: 12.5, color: C.muted, marginLeft: "auto", paddingBottom: 6 }}>
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

      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 18 }}>
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
              <span style={{ fontSize: 13.5 }}>{o.label}</span>
              <span style={{ fontSize: 13.5, color: C.accent, whiteSpace: "nowrap" }}>{o.outcome}</span>
            </Row>
          ))}
        </Section>
      )}
    </>
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




function StartUnitControl({
  d,
  onChange,
}: {
  d: Derived;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const s = d.settings as Settings;
  const papers = [1, 2].map((paper) => ({
    paper,
    units: [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))],
  }));

  return (
    <Section title="Where to start">
      <select
        value={s.startUnit ?? ""}
        onChange={(e) => onChange({ startUnit: e.target.value || undefined })}
        aria-label="Unit to work through first"
        style={{
          width: "100%",
          minHeight: 42,
          padding: "0 10px",
          borderRadius: 8,
          background: C.surface,
          border: `1px solid ${C.line}`,
          color: C.text,
          fontFamily: C.sans,
          fontSize: 14.5,
        }}
      >
        <option value="">Highest-yield topics first (recommended)</option>
        {papers.map(({ paper, units }) => (
          <optgroup key={paper} label={`Paper ${paper === 1 ? "I" : "II"}`}>
            {units.map((u) => (
              <option key={`${paper}|${u}`} value={u}>
                {u}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <Note>
        {s.startUnit
          ? `${s.startUnit} leads the queue until it is finished, then ordering returns to yield.`
          : "The queue leads with whatever has been asked most since 2018."}
      </Note>
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

      <div style={{ fontSize: 12.5, color: C.muted, letterSpacing: "0.08em", marginTop: 20 }}>
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

/**
 * What is actually stored, in plain English.
 *
 * "1 events" was worse than useless: it is also exactly what a fresh setup
 * leaves behind, so it could not distinguish "erased and set up again" from
 * "erase did nothing" — which is precisely the question anyone reads this line
 * to answer.
 */
function describeStore(events: StudyEvent[]): string {
  const checks = events.filter((e) => e.type === "check").length;
  const undone = events.filter((e) => e.type === "uncheck").length;
  const answers = events.filter((e) => e.type === "attempt").length;

  if (checks === 0 && answers === 0) {
    return "Nothing recorded yet — only your settings. Stored in this browser alone.";
  }

  const parts = [
    `${checks} ${checks === 1 ? "check" : "checks"}`,
    answers > 0 ? `${answers} ${answers === 1 ? "answer" : "answers"}` : null,
    undone > 0 ? `${undone} undone` : null,
  ].filter(Boolean);

  return `${parts.join(", ")}. Stored in this browser alone — clearing site data erases it.`;
}

function Backup({
  events,
  setEvents,
}: {
  events: StudyEvent[];
  setEvents: (e: StudyEvent[]) => void;
}) {
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

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
    fontSize: 13.5,
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
      <Note>{message || describeStore(events)}</Note>

      <div style={{ marginTop: 22, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 14.5, fontWeight: 600, marginBottom: 6 }}>Start over</div>
        <Note>
          Erases every check, every logged session and every answer, and returns
          you to the setup questions. There is no undo — download a copy first if
          there is anything here worth keeping.
        </Note>

        {confirming ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button
              onClick={() => {
                setEvents([]);
                // The AI answers were reasoned from figures that no longer exist.
                clearAdvice();
                setConfirming(false);
                setMessage("");
              }}
              style={{ ...btn, color: "#dc2626", borderColor: "#dc2626" }}
            >
              Yes, erase everything
            </button>
            <button onClick={() => setConfirming(false)} style={btn}>
              Keep my data
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            style={{ ...btn, marginTop: 12, color: "#dc2626", borderColor: C.line }}
          >
            Erase everything and start over
          </button>
        )}
      </div>

    </Section>
  );
}

function Setup({ onDone }: { onDone: (s: Settings, known: string[]) => void }) {
  const [name, setName] = useState("");
  const [startUnit, setStartUnit] = useState("");
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
              fontSize: 12.5,
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
          <p style={{ fontSize: 14.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            Four questions. All of it can be changed later.
          </p>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          <section style={panelStyle}>
            <label
              htmlFor="setup-name"
              style={{ display: "block", fontSize: 14.5, color: C.text, marginBottom: 10 }}
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
                fontSize: 15.5,
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
            <div style={{ fontSize: 14.5, color: C.text, marginBottom: 4 }}>
              Already know any of this?
            </div>
            <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
              Tick the units you have studied before. They start part-complete instead of at zero.
            </div>

            {papers.map(({ paper, units }) => (
              <div key={paper} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontFamily: C.mono,
                    fontSize: 12,
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
                          fontSize: 13.5,
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
            <div style={{ fontSize: 12.5, color: C.muted }}>
              {known.length === 0 ? "Nothing ticked — starting from zero." : `${known.length} ticked.`}
            </div>
          </section>

          <section style={panelStyle}>
            <label
              htmlFor="setup-start"
              style={{ display: "block", fontSize: 14.5, color: C.text, marginBottom: 6 }}
            >
              Where would you like to start?
            </label>
            <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 12px", lineHeight: 1.6 }}>
              Not everyone begins at the beginning. Pick a unit to work through
              first, or leave it and the app will lead with the highest-yield
              topics. Either way you can change it later, and it stops applying
              once that unit is done.
            </p>
            <select
              id="setup-start"
              value={startUnit}
              onChange={(e) => setStartUnit(e.target.value)}
              style={{
                width: "100%",
                minHeight: 42,
                padding: "0 10px",
                borderRadius: 8,
                background: C.surface,
                border: `1px solid ${C.line}`,
                color: C.text,
                fontFamily: C.sans,
                fontSize: 14.5,
              }}
            >
              <option value="">Highest-yield topics first (recommended)</option>
              {papers.map(({ paper, units }) => (
                <optgroup key={paper} label={`Paper ${paper === 1 ? "I" : "II"}`}>
                  {units.map((u) => (
                    <option key={`${paper}|${u}`} value={u}>
                      {u}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
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
              <span style={{ fontSize: 14.5, color: C.muted }}>of the syllabus at this pace</span>
            </div>
            <p style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.7, margin: "10px 0 0" }}>
              {meetsTarget
                ? `That clears your ${target}% target with room to spare.`
                : `That falls short of your ${target}% target. Reaching it needs about ${weeklyNeeded} hours a week — or a longer run-up. You can also leave it and close the gap later.`}
            </p>
          </section>
        </div>

        <button
          onClick={() => onDone(
              {
                name: name.trim() || undefined,
                startUnit: startUnit || undefined,
                examDate,
                weeklyHours: hours,
                targetCoverage: target / 100,
              },
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
            fontSize: 15.5,
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
        <span style={{ fontSize: 14.5, color: C.text, lineHeight: 1.4 }}>{label}</span>
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
          <span style={{ fontSize: 13.5, color: C.muted, marginLeft: 5 }}>{unit}</span>
        </span>
      </div>
      <div style={{ marginTop: 10 }}>{children}</div>
      {sub && (
        <div style={{ fontFamily: C.mono, fontSize: 12.5, color: C.muted, marginTop: 8 }}>{sub}</div>
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
      <div style={{ fontSize: 12.5, color: C.muted, letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 19, marginTop: 3, color: warn ? C.warn : C.text }}>
        {value}
        <span style={{ fontSize: 12.5, color: C.muted }}> {unit}</span>
      </div>
    </div>
  );
}

/**
 * Every legacy screen builds out of this, so it is the one place that decides
 * whether Today, Revision, Progress and Settings look like the rest of the app.
 * It is now the same card the modules use.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card" style={{ padding: 18, marginTop: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>{title}</h2>
      {children}
    </section>
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
  return <div style={{ fontSize: 12.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>{children}</div>;
}
