import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { TOPICS } from "./data/syllabus";
import { on, project } from "./lib/events";
import type {
  CheckId,
  Derived,
  Level,
  Settings,
  StudyEvent,
  WindowMonths,
} from "./lib/events";
import {
  attemptStats,
  calibration,
  coreProgress,
  addMonths,
  daysLeft,
  LEVELS,
  skippedTopics,
  suggestedMonths,
  effectivePace,
  freshness,
  observedPace,
  options,
  progress,
  attemptTrends,
  projection,
  requiredPace,
  windowEnd,
} from "./lib/planner";
import {
  exportJson,
  importJson,
  load,
  loadAvatar,
  save,
  saveAvatar,
  sessionOpen,
  setSessionOpen,
} from "./lib/storage";
import { fileToAvatar } from "./lib/avatar";
import { useSync } from "./lib/useSync";
import { MIN_PASSPHRASE } from "./lib/sync";
import { clearAdvice } from "./lib/ai";
import { Badge } from "./app/Icon";
import { C } from "./lib/theme";
import { quoteOfTheDay } from "./data/quotes";
import { Shell as AppShell, Card } from "./app/Shell";
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
import { GuideScreen } from "./modules/guide/GuideScreen";

export default function App() {
  const [events, setEvents] = useState<StudyEvent[]>(() => load());
  const [signedIn, setSignedIn] = useState(sessionOpen);
  const [avatar, setAvatar] = useState<string | null>(loadAvatar);
  const sync = useSync(events, setEvents);
  const [route, go] = useRoute();
  useEffect(() => save(events), [events]);

  const d = useMemo(() => project(events), [events]);
  const add = (e: StudyEvent) => setEvents((prev) => [...prev, e]);

  const logOut = () => {
    setSessionOpen(false);
    setSignedIn(false);
  };
  const logIn = () => {
    setSessionOpen(true);
    setSignedIn(true);
  };

  if (!signedIn) {
    return <LockScreen name={d.settings?.name?.trim() || undefined} started={!!d.settings} onIn={logIn} />;
  }

  if (!d.settings) {
    return (
      <Setup
        onExit={logOut}
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
    onNote: (topicId: string, text: string) => add(on.note(topicId, text)),
  };

  const onRevise = (topicId: string) => add(on.check(topicId, "revised"));

  return (
    <AppShell
      route={route}
      go={go}
      name={d.settings.name?.trim() || undefined}
      avatar={avatar}
      onLogout={logOut}
    >
      {route === "dashboard" && (
        <DashboardScreen d={d} go={go} onToggle={handlers.onToggle} />
      )}

      {route === "chapters" && <ChaptersScreen d={d} {...handlers} />}

      {route === "plan" && <PlanScreen d={d} />}

      {route === "today" && <TodayScreen d={d} go={go} {...handlers} />}

      {route === "pyq" && <PyqExplorer d={d} />}

      {route === "revision" && <RevisionDeck d={d} onRevise={onRevise} />}

      {route === "guide" && <GuideScreen go={go} />}

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
          <WritingTrend d={d} />
          <RecentActivity events={events} add={add} />
        </div>
      )}

      {route === "settings" && (
        <div className="grid" style={{ gap: 14 }}>
          <Greeting d={d} onName={(name) => add(on.settings({ name }))} />
          <AvatarControl
            avatar={avatar}
            onChange={(next) => {
              saveAvatar(next);
              setAvatar(next);
            }}
          />
          <StartUnitControl d={d} onChange={(patch) => add(on.settings(patch))} />
          <PaceControl d={d} onChange={(patch) => add(on.settings(patch))} />
          <SyncControl sync={sync} />
          <Backup
            events={events}
            setEvents={setEvents}
            onErase={() => {
              saveAvatar(null);
              setAvatar(null);
              // Erasing locally while a copy sits on the server would restore
              // everything on the next sync, which is the opposite of what the
              // button says it does.
              void sync.disconnect(true);
            }}
          />
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

/**
 * Where writing a topic twice actually moved the mark.
 *
 * Percentage complete says how much of the syllabus has been touched, which is
 * a measure of effort. This is the only place in the app that measures whether
 * the effort worked: same topic, written again, higher or not. Topics written
 * once are left out — one mark is a fact, not a trend — and the ones that went
 * backwards are shown as plainly as the ones that went up, because a topic
 * that got worse on the second attempt is the most useful row on the screen.
 */
function WritingTrend({ d }: { d: Derived }) {
  const trends = attemptTrends(d);
  if (trends.length === 0) return null;

  return (
    <Card title="Written more than once">
      <div style={{ display: "grid", gap: 2 }}>
        {trends.map((t) => {
          const topic = TOPICS.find((x) => x.id === t.topicId);
          if (!topic) return null;
          const up = t.change > 0;
          const flat = t.change === 0;
          return (
            <div
              key={t.topicId}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 10,
                padding: "7px 0",
                borderBottom: `1px solid ${C.hair}`,
              }}
            >
              <span style={{ fontSize: 14, color: C.text, flex: 1, minWidth: 0 }}>
                {topic.name}
              </span>
              <span className="num" style={{ fontSize: 13, color: C.muted, flexShrink: 0 }}>
                {t.marks.join(" → ")} / 40
              </span>
              <span
                className="num"
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  flexShrink: 0,
                  minWidth: 34,
                  textAlign: "right",
                  color: up ? "var(--good)" : flat ? C.muted : C.warn,
                }}
              >
                {flat ? "±0" : `${up ? "+" : ""}${t.change}`}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
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
  const days = daysLeft(settings);
  const targetPct = Math.round(settings.targetCoverage * 100);

  return (
    <>
      <Row>
        <span style={{ fontSize: 12.5, letterSpacing: "0.12em", color: C.muted }}>
          sociology · wbcs
        </span>
        <span style={{ fontSize: 14.5, color: C.accent }}>
          {days === null ? "no window set" : `${days}d left`}
        </span>
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
  const end = windowEnd(s);
  const left = daysLeft(s);
  const skipped = skippedTopics(d);
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
      <Note>{s.weeklyHours} hours a week</Note>

      <div style={{ fontSize: 12.5, color: C.muted, letterSpacing: "0.08em", marginTop: 20 }}>
        Where you are starting from
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {LEVELS.map((l) => {
          const on = (s.level ?? "guided") === l.id;
          return (
            <button
              key={l.id}
              onClick={() => onChange({ level: l.id })}
              aria-pressed={on}
              title={l.blurb}
              style={{
                flex: "1 1 140px",
                minHeight: 40,
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: C.sans,
                fontSize: 14,
                fontWeight: on ? 600 : 400,
                background: on ? C.accent : C.surface,
                color: on ? C.surface : C.text,
                border: `1px solid ${on ? C.accent : C.line}`,
              }}
            >
              {l.label}
            </button>
          );
        })}
      </div>
      <Note>
        {LEVELS.find((l) => l.id === (s.level ?? "guided"))!.blurb}{" "}
        {skipped.length === 0
          ? "At this setting every topic is still in the plan."
          : `At this setting ${skipped.length} of ${TOPICS.length} topics fall outside the plan — they remain visible in Chapters, but nothing counts them.`}{" "}
        Changing this never unchecks anything you have already completed.
      </Note>

      <div style={{ fontSize: 12.5, color: C.muted, letterSpacing: "0.08em", marginTop: 20 }}>
        How long the plan runs
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        {([4, 5, 6] as WindowMonths[]).map((m) => (
          <button
            key={m}
            onClick={() =>
              onChange({
                startDate: s.startDate ?? new Date().toISOString().slice(0, 10),
                windowMonths: m,
              })
            }
            aria-pressed={s.windowMonths === m}
            style={{
              flex: 1,
              minHeight: 40,
              borderRadius: 8,
              cursor: "pointer",
              fontFamily: C.sans,
              fontSize: 14.5,
              fontWeight: s.windowMonths === m ? 600 : 400,
              background: s.windowMonths === m ? C.accent : C.surface,
              color: s.windowMonths === m ? C.surface : C.text,
              border: `1px solid ${s.windowMonths === m ? C.accent : C.line}`,
            }}
          >
            {m} months
          </button>
        ))}
      </div>
      <Note>
        {end === null
          ? "No preparation window set."
          : left === 0
            ? `This run ended on ${end}. Pick a length to start another.`
            : `Started ${s.startDate ?? "earlier"}, ends ${end} — ${left} days left. Extending the plan does not reset anything you have already covered.`}
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
  onErase,
}: {
  events: StudyEvent[];
  setEvents: (e: StudyEvent[]) => void;
  /** Everything kept outside the log that an erase should also take. */
  onErase: () => void;
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
                // The photo lives outside the log, so clearing the log alone
                // would leave a face on a tracker with nobody in it.
                onErase();
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

function Setup({
  onDone,
  onExit,
}: {
  onDone: (s: Settings, known: string[]) => void;
  onExit: () => void;
}) {
  const [name, setName] = useState("");
  const [startUnit, setStartUnit] = useState("");
  /**
   * Null until it is chosen, not "guided" until it is changed.
   *
   * A default nobody saw is not an answer, and this one sets the depth of every
   * topic and the length of the whole plan. The same goes for the hours: the
   * slider used to sit at twelve, and twelve against a candidate whose real
   * figure is seven is the difference between the screen saying 95% of the
   * syllabus and the truth being 66%. A confident projection built on a number
   * the reader never agreed to is worse than no projection.
   *
   * The two preferences below keep their defaults — a target of 80% and
   * "highest-yield first" are defensible for anyone, and are opinions rather
   * than facts about a person.
   */
  const [level, setLevel] = useState<Level | null>(null);
  const [hoursSet, setHoursSet] = useState(false);
  /**
   * Not asked separately. Someone setting up has no way to know whether four
   * months is enough for them — that is the question they came here to have
   * answered — so the category answers it, and Settings can lengthen the run
   * later, once there is a pace on record to judge it against.
   */
  /** What the page previews before a choice is made. Never what is saved. */
  const shownLevel: Level = level ?? "guided";
  const months: WindowMonths = suggestedMonths(shownLevel);
  const [hours, setHours] = useState(12);
  const [target, setTarget] = useState(80);
  const [targetSet, setTargetSet] = useState(false);
  const [known, setKnown] = useState<string[]>([]);

  /**
   * What is still unanswered, in the order it is asked.
   *
   * Only what cannot be guessed. The level sets the depth of every topic and
   * the length of the plan; the hours drive every figure on the next screen,
   * and twelve against a real seven is the difference between announcing 95% of
   * the syllabus and the truth being 66%.
   *
   * A name is not one of these. It greets you and fills the avatar, and nothing
   * else — forcing one out of an app whose lock screen says there is no account
   * to make would be theatre. Nor is the coverage target: 80% is a defensible
   * opinion for anybody, which is what a default is for.
   *
   * All four are still marked as the four that shape the plan, because they do.
   * Only the two the button actually refuses to proceed without say Required —
   * a label the button does not enforce teaches the reader that the labels are
   * decoration, and every honest one afterwards pays for it.
   */
  const missing = [
    level === null ? "where you are starting from" : null,
    !hoursSet ? "how many hours a week you have" : null,
  ].filter(Boolean) as string[];
  const ready = missing.length === 0;
  // Folded away by default. Most people setting this up have studied none of
  // it, and eighteen unit chips were the longest thing on the page for a
  // question whose usual answer is "no".
  const [showKnown, setShowKnown] = useState(false);

  const papers = [1, 2].map((paper) => ({
    paper,
    units: [...new Set(TOPICS.filter((t) => t.paper === paper).map((t) => t.unit))],
  }));

  const startDate = new Date().toISOString().slice(0, 10);
  const endDate = addMonths(startDate, months);
  const readable = new Date(`${endDate}T00:00:00`).toLocaleDateString("en-GB", {
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
      <div className="setup-split leaves" style={{ fontFamily: C.sans, position: "relative", zIndex: 1 }}>
        <header className="setup-intro">
          <img
            src="/logo.png"
            alt="WBCS Sociology"
            width={172}
            height={172}
            style={{ display: "block", marginBottom: 22, maxWidth: "58%", height: "auto" }}
          />
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
          <h1 style={{ fontSize: 44, fontWeight: 700, margin: "12px 0 6px", letterSpacing: "-0.03em", lineHeight: 1.08 }}>
            Before we start
          </h1>
          <p style={{ fontSize: 19, color: C.text, margin: "0 0 4px", lineHeight: 1.35, fontWeight: 500 }}>
            Let&rsquo;s create your personalised study plan.
          </p>
          {/*
            Whose this is. It was on the lock screen and nowhere else, and this
            is the screen a new user actually spends time on.
          */}
          <div className="setup-by" style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.6 }}>
            <div>
              Designed and built by <strong style={{ color: C.text }}>Tapomoy</strong>
            </div>
            <div>for WBCS Sociology aspirants</div>
            <div style={{ marginTop: 7, opacity: 0.75 }}>
              Copyright © {new Date().getFullYear()} Tapomoy. All rights reserved.
            </div>
          </div>
        </header>

        {/*
          The questions, and the buttons that finish them, in one column.
          Without this wrapper the two-column grid puts the header in the
          first cell, the questions in the second, and then drops Start back
          into the first — under the emblem, in a column of its own.
        */}
        <div>
        <div className="q-list">
          <section className="q-card req">
            <Badge name="person" tint={0} />
            <span className="q-step" aria-hidden>1</span>
            <div className="q-body">
            <label
              htmlFor="setup-name"
              style={{ display: "block", fontSize: 15, fontWeight: 650, color: C.text }}
            >
              What should I call you?
            </label>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 11px" }}>
              It is only used to greet you. Nothing leaves this device.
            </p>
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
            </div>
          </section>

          {/*
            One dropdown, not three cards.

            The choice is made once, in a second, and then not looked at again —
            but as three full-width option cards it took a third of the page
            every time setup opened, and needed a fold to get out of the way. A
            select states the same three options, keeps the answer readable
            after it is given, and leaves this card the height of the one above.
          */}
          <section className="q-card req">
            <Badge name="pin" tint={1} />
            <span className="q-step" aria-hidden>2</span>
            <span className="q-req" style={{ position: "absolute", top: 14, right: 16 }}>Required</span>
            <div className="q-body">
              <label
                htmlFor="setup-level"
                style={{ display: "block", fontSize: 15, fontWeight: 650, color: C.text }}
              >
                Where are you starting from?
              </label>
              <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 11px", lineHeight: 1.5 }}>
                This sets the length of the plan, and how deeply it covers the topics WBCS rarely asks.
              </p>
              <select
                id="setup-level"
                value={level ?? ""}
                onChange={(e) => setLevel((e.target.value || null) as Level | null)}
                title="Sets the length of the plan, and how deeply it covers the rarely-asked topics"
                style={{
                  width: "100%",
                  minHeight: 42,
                  padding: "0 12px",
                  borderRadius: 8,
                  background: C.surface,
                  border: `1px solid ${C.line}`,
                  color: level === null ? C.muted : C.text,
                  fontFamily: C.sans,
                  fontSize: 15.5,
                }}
              >
                <option value="">Select your current stage</option>
                {LEVELS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label} — {l.months} months
                  </option>
                ))}
              </select>
              {level !== null && (
                <p style={{ fontSize: 12.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.5 }}>
                  {LEVELS.find((l) => l.id === level)?.blurb}{" "}
                  Ends <span style={{ color: C.accent }}>{readable}</span>.
                </p>
              )}
            </div>
          </section>

          <div className="setup-pair">
          <Field
            icon="clock"
            tint={2}
            step={3}
            required
            label="Hours a week for sociology"
            help="How much time can you realistically give it?"
            value={hoursSet ? hours : null}
            unit="h / week"
            ticks={["1", "10", "20", "30", "40"]}
            sub={`about ${(hours / 7).toFixed(1)} hours a day`}
          >
            <input
              type="range"
              min={1}
              max={40}
              value={hours}
              onChange={(e) => {
                setHours(+e.target.value);
                setHoursSet(true);
              }}
              style={{ "--fill": `${((hours - 1) / 39) * 100}%` } as React.CSSProperties}
              aria-label="Hours a week"
            />
          </Field>

          <Field
            icon="bars"
            tint={3}
            step={4}
            label="How much of the syllabus are you aiming to cover?"
            help="The target this plan is built to reach."
            value={targetSet ? target : null}
            unit="%"
            ticks={["50%", "60%", "70%", "80%", "90%", "100%"]}
            sub="the rest stays visible as optional"
          >
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={target}
              onChange={(e) => {
                setTarget(+e.target.value);
                setTargetSet(true);
              }}
              style={{ "--fill": `${((target - 50) / 50) * 100}%` } as React.CSSProperties}
              aria-label="Target coverage"
            />
          </Field>
          </div>

          <section className="q-card opt">
            <Badge name="book" tint={2} />
            <span className="q-step" aria-hidden>5</span>
            <span className="q-req" style={{ position: "absolute", top: 14, right: 16 }}>Optional</span>
            <div className="q-body">
            <button
              onClick={() => setShowKnown(!showKnown)}
              aria-expanded={showKnown}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
                padding: 0,
                border: "none",
                background: "transparent",
                color: C.text,
                font: "inherit",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span>
                <span style={{ fontSize: 15, fontWeight: 650, display: "block" }}>
                  Already know any of this?
                </span>
                <span
                  style={{ fontSize: 13, color: C.muted, display: "block", marginTop: 3 }}
                >
                  {known.length === 0
                    ? "Optional — leave it if you are starting from zero."
                    : `${known.length} ${known.length === 1 ? "unit" : "units"} ticked.`}
                </span>
              </span>
              <span
                aria-hidden
                style={{
                  color: C.muted,
                  fontSize: 13,
                  flex: "0 0 auto",
                  transform: showKnown ? "rotate(180deg)" : "none",
                  transition: "transform .15s",
                }}
              >
                ▾
              </span>
            </button>

            {showKnown && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                  Tick the units you have studied before. They start part-complete instead of at
                  zero.
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
                            onClick={() =>
                              setKnown(isOn ? known.filter((k) => k !== u) : [...known, u])
                            }
                            aria-pressed={isOn}
                            style={{
                              fontFamily: C.sans,
                              fontSize: 13.5,
                              padding: "8px 12px",
                              minHeight: 36,
                              borderRadius: 999,
                              cursor: "pointer",
                              background: isOn ? C.accentSoft : "transparent",
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
              </div>
            )}
            </div>
          </section>

          <section className="q-card opt">
            <Badge name="compass" tint={3} />
            <span className="q-step" aria-hidden>6</span>
            <span className="q-req" style={{ position: "absolute", top: 14, right: 16 }}>Optional</span>
            <div className="q-body">
            <label
              htmlFor="setup-start"
              style={{ display: "block", fontSize: 15, fontWeight: 650, color: C.text }}
            >
              Where would you like to start?
            </label>
            <p style={{ fontSize: 13, color: C.muted, margin: "2px 0 11px", lineHeight: 1.6 }}>
              Pick a unit to begin with, or let the app lead with the highest-yield topics. You can
              change it later, and it stops applying once that unit is done.
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
            </div>
          </section>

          {/*
            The projection waits for the numbers it is a projection of.

            This card said "95% of the syllabus at this pace" from a slider
            nobody had touched. Twelve hours a week was my guess; for a
            candidate whose real figure is seven the honest answer is 66%, and a
            confident wrong number on the first screen is worse than no number —
            it is the one thing on the page a reader would actually act on.
          */}
          {ready && (
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
          )}
        </div>

        <button
          disabled={!ready}
          title={ready ? "Build the plan" : `Still needed: ${missing.join(" and ")}`}
          onClick={() => onDone(
              {
                name: name.trim() || undefined,
                startUnit: startUnit || undefined,
                startDate,
                windowMonths: months,
                level: level ?? "guided",
                weeklyHours: hours,
                targetCoverage: target / 100,
              },
              known,
            )}
          style={{
            width: "100%",
            minHeight: 50,
            marginTop: 18,
            background: ready ? C.accent : C.raised,
            border: "none",
            borderRadius: 8,
            color: ready ? C.accentInk : C.muted,
            fontFamily: C.sans,
            fontSize: 15.5,
            fontWeight: 600,
            cursor: ready ? "pointer" : "not-allowed",
          }}
        >
          Start my plan
          <span aria-hidden style={{ marginLeft: 9 }}>→</span>
        </button>

        {/*
          What is still wanted, named. A greyed-out button with no explanation
          is the most frustrating control there is: it refuses and does not say
          why, and the reader is left hunting the page for what they missed.
        */}
        {!ready && (
          <p
            style={{
              fontSize: 13,
              color: C.warn,
              textAlign: "center",
              margin: "10px 0 0",
              lineHeight: 1.6,
            }}
          >
            Two things first — {missing.join(", and ")}. Both change the plan enough that
            guessing them for you would make every figure on the next screen wrong.
          </p>
        )}

        <button
          onClick={onExit}
          style={{
            display: "block",
            margin: "14px auto 0",
            background: "none",
            border: "none",
            color: C.muted,
            fontFamily: C.sans,
            fontSize: 13.5,
            textDecoration: "underline",
            textUnderlineOffset: 3,
            cursor: "pointer",
          }}
        >
          Not now — log out
        </button>

        </div>
      </div>
    </Shell>
  );
}

/**
 * Who made this, and the copyright line.
 *
 * Both were on every screen except the one a new user actually opens first.
 * Setup does not use the app shell — it has no rail and no footer — so it fell
 * through the gap, and the front door of the product carried no attribution at
 * all. Shared between Setup and the lock screen so the two cannot drift.
 */
function Byline() {
  return (
    <footer
      style={{
        marginTop: 28,
        paddingTop: 18,
        borderTop: `1px solid ${C.line}`,
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.7 }}>
        Designed and built by{" "}
        <span style={{ color: C.text, fontWeight: 600 }}>Tapomoy</span>
        <br />
        <span style={{ fontSize: 12.5 }}>
          for candidates preparing Sociology for the WBCS Main examination
        </span>
      </p>
      <p style={{ fontSize: 12, color: C.muted, margin: "12px 0 0" }}>
        Copyright © {new Date().getFullYear()} Tapomoy. All rights reserved.
      </p>
    </footer>
  );
}

/**
 * Sync between devices.
 *
 * The screen has to carry one honest sentence that most sync settings do not:
 * that the pass-phrase cannot be recovered. There is no account and no reset
 * link, by design — the server holds ciphertext it cannot read, which is only
 * true because nobody there has the key.
 */
function SyncControl({ sync }: { sync: ReturnType<typeof useSync> }) {
  const [draft, setDraft] = useState("");
  const [showing, setShowing] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const { state } = sync;

  if (!sync.connected) {
    return (
      <Section title="Study on more than one device">
        <Note>
          Your record lives in this browser, so a phone and a laptop each keep their own.
          Choose a pass-phrase here, enter the same one on your other device, and the two
          logs merge — everything you have done on either, in one place.
        </Note>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <input
            type={showing ? "text" : "password"}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`A pass-phrase, at least ${MIN_PASSPHRASE} characters`}
            aria-label="Sync pass-phrase"
            autoComplete="off"
            style={{
              flex: "1 1 240px",
              minHeight: 42,
              padding: "0 12px",
              borderRadius: 8,
              background: C.surface,
              border: `1px solid ${C.line}`,
              color: C.text,
              fontFamily: C.sans,
              fontSize: 15,
            }}
          />
          <button onClick={() => setShowing(!showing)} style={btn}>
            {showing ? "Hide" : "Show"}
          </button>
          <button
            onClick={() => sync.connect(draft.trim())}
            disabled={draft.trim().length < MIN_PASSPHRASE}
            style={{
              ...btn,
              background: draft.trim().length >= MIN_PASSPHRASE ? C.accent : "transparent",
              color: draft.trim().length >= MIN_PASSPHRASE ? C.surface : C.muted,
              borderColor: draft.trim().length >= MIN_PASSPHRASE ? C.accent : C.line,
              fontWeight: 600,
            }}
          >
            Turn on sync
          </button>
        </div>

        <Note>
          Use a phrase of a few real words — three or four you will not forget. It never
          leaves this device: it is stretched into a key here, and only encrypted data is
          sent. Nobody running the server can read your log, which also means{" "}
          <strong>nobody can recover the phrase for you</strong>. Write it down.
        </Note>
        {state.status === "error" && <Note>{state.message}</Note>}
      </Section>
    );
  }

  return (
    <Section title="Study on more than one device">
      <Note>
        {state.status === "syncing"
          ? "Syncing…"
          : state.status === "connecting"
            ? "Unlocking…"
            : state.status === "error"
              ? state.message
              : state.message ||
                (state.lastSyncedAt
                  ? `Up to date. Last synced ${new Date(state.lastSyncedAt).toLocaleTimeString()}.`
                  : "Sync is on.")}
      </Note>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={sync.syncNow} disabled={state.status === "syncing"} style={btn}>
          Sync now
        </button>
        {confirmOff ? (
          <>
            <button
              onClick={() => {
                void sync.disconnect(true);
                setConfirmOff(false);
              }}
              style={{ ...btn, color: "#dc2626", borderColor: "#dc2626" }}
            >
              Turn off and delete the synced copy
            </button>
            <button onClick={() => setConfirmOff(false)} style={btn}>
              Keep syncing
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmOff(true)} style={btn}>
            Turn off sync
          </button>
        )}
      </div>

      <Note>
        Turning it off removes the encrypted copy from the server. Nothing on this device is
        touched, and your other device keeps whatever it already has.
      </Note>
    </Section>
  );
}

/**
 * The profile photo.
 *
 * Kept out of the event log — see saveAvatar — so it is the one setting that
 * does not append an event. It is resized to a small square in the browser
 * before it is stored, because a phone photograph would eat the whole storage
 * quota the log needs.
 */
function AvatarControl({
  avatar,
  onChange,
}: {
  avatar: string | null;
  onChange: (next: string | null) => void;
}) {
  const [error, setError] = useState("");

  return (
    <Section title="Photo">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4 }}>
        <div
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 56,
            height: 56,
            flex: "0 0 auto",
            borderRadius: "50%",
            overflow: "hidden",
            background: avatar ? "transparent" : C.panel,
            border: `1px solid ${C.line}`,
            color: C.muted,
            fontSize: 20,
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "☺"
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label
            style={{
              ...btn,
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
            }}
          >
            {avatar ? "Change" : "Choose a photo"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setError("");
                try {
                  onChange(await fileToAvatar(file));
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not read that image.");
                }
              }}
            />
          </label>
          {avatar && (
            <button onClick={() => onChange(null)} style={btn}>
              Remove
            </button>
          )}
        </div>
      </div>

      <Note>
        {error
          ? error
          : "Optional, and it shows only in the top bar. It is squared off and shrunk here in the browser, then kept apart from your study log — so it never travels in an export and never counts against the room your record needs."}
      </Note>
    </Section>
  );
}

/**
 * What you see after logging out.
 *
 * There is no password, because there is no account: everything lives in this
 * browser. Logging out closes the screen so the next person to pick up the
 * laptop does not land in your dashboard. Nothing has been deleted, and the
 * button below says so rather than making you find out.
 */
function LockScreen({
  name,
  started,
  onIn,
}: {
  name?: string;
  started: boolean;
  onIn: () => void;
}) {
  return (
    <Shell>
      <div style={{ maxWidth: 420, width: "100%", fontFamily: C.sans, textAlign: "center" }}>
        {/*
          The full emblem, on the screen a new user meets first.
          Masked to its disc so the corners are transparent — the original was a
          circle on a white square, which on the dark theme is a white box with
          a picture in it. The drawn mark still does the small sizes, where 512
          pixels of tree, globe and colonnade turn to mush.
        */}
        <img
          src="/logo.png"
          alt="WBCS Sociology — understand society, write better"
          width={168}
          height={168}
          style={{ display: "block", margin: "0 auto 16px", maxWidth: "62%", height: "auto" }}
        />

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

        <h1 style={{ fontSize: 23, fontWeight: 600, margin: "14px 0 8px", letterSpacing: "-0.01em" }}>
          {/*
            The emblem above already carries a motto. A second, different one
            directly beneath it reads as two products sharing a screen, so this
            says what the thing is instead of competing with it. The rail keeps
            "Understand society. Write better." — there is no emblem there to
            argue with.
          */}
          {started
            ? `Welcome back${name ? `, ${name}` : ""}.`
            : "Your WBCS Sociology optional, tracked properly."}
        </h1>

        <p style={{ fontSize: 14.5, color: C.muted, margin: "0 0 22px", lineHeight: 1.65 }}>
          {started
            ? "You are logged out, not erased. Every check, answer and hour you have logged is still on this device, exactly where you left it."
            : "Everything stays on this device. There is no account to make and no password to lose."}
        </p>

        <button
          onClick={onIn}
          style={{
            width: "100%",
            minHeight: 50,
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
          {started ? "Carry on" : "Set up"}
        </button>

        <Byline />
      </div>
    </Shell>
  );
}

/** The plain secondary button. Shared by Backup and the photo control. */
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

const panelStyle = {
  background: C.panel,
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "16px 18px",
} as const;


function Field({
  label,
  help,
  value,
  unit,
  sub,
  icon,
  tint,
  step,
  required,
  ticks,
  children,
}: {
  label: string;
  /** One line saying what the question is actually asking for. */
  help?: string;
  /** Null while the control has never been touched: a default is not a reading. */
  value: number | null;
  unit: string;
  sub?: string;
  icon: string;
  tint: number;
  /** Where this sits in the list of six. Sequence, not status. */
  step: number;
  /** True only where Start is actually refused without it. */
  required?: boolean;
  /** The scale under the track: its ends and a few marks between. */
  ticks?: string[];
  children: ReactNode;
}) {
  return (
    <section className={`q-card${required ? " req" : ""}`}>
      <span className="q-step" aria-hidden>
        {step}
      </span>
      {required && (
        <span className="q-req" style={{ position: "absolute", top: 14, right: 16 }}>
          Required
        </span>
      )}
      <Badge name={icon} tint={tint} />
      <div className="q-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 650, color: C.text, lineHeight: 1.35 }}>
              {label}
            </span>
            {help && (
              <span style={{ display: "block", fontSize: 13, color: C.muted, marginTop: 2 }}>
                {help}
              </span>
            )}
          </span>
          <span style={{ whiteSpace: "nowrap" }}>
            <span
              style={{
                fontFamily: C.mono,
                fontSize: 30,
                fontWeight: 700,
                color: C.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {value}
            </span>
            <span style={{ fontSize: 13.5, color: C.muted, marginLeft: 5 }}>{unit}</span>
          </span>
        </div>

        <div style={{ marginTop: 12 }}>{children}</div>

        {/* The scale, so a number has something to be big or small against. */}
        {ticks && (
          <div className="q-ticks">
            {ticks.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}

        {sub && (
          <div style={{ textAlign: "right" }}>
            <span className="q-note">{sub}</span>
          </div>
        )}
      </div>
    </section>
  );
}

function Shell({ children, align = "center" }: { children: ReactNode; align?: string }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        /*
         * The page, not the panel.
         *
         * Setup painted its whole background in --surface, the same white the
         * cards are, so the cards had nothing to sit on and the warm page
         * colour never appeared on the one screen that shows it off.
         */
        background: C.page,
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
