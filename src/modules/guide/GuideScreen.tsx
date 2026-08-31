import { useState } from "react";
import { C } from "../../lib/theme";
import { Card } from "../../app/Shell";
import type { RouteId } from "../../app/routes";

/**
 * The guide, for someone opening this for the first time.
 *
 * Every picture is a screenshot of this app taken from the real build with a
 * demo log in it, not a drawing. That is deliberate: a guide made of mockups
 * stops matching the app the first time a screen changes and nobody notices
 * until a new user is confused by it.
 *
 * It is written to be read in order, once, in about five minutes — and then
 * never again. Anything a person needs on the tenth visit belongs on the screen
 * that needs it, not in here.
 */

interface Step {
  id: string;
  title: string;
  /** One line under the heading. The point of the screen, not its contents. */
  lead: string;
  shot?: string;
  /** Numbered to match the pink rings burned into the screenshot. */
  callouts?: string[];
  body?: string[];
  go?: RouteId;
  goLabel?: string;
}

const STEPS: Step[] = [
  {
    id: "setup",
    title: "1 · Setting up",
    lead: "Four questions, once. Everything here can be changed later in Settings.",
    shot: "01-setup",
    callouts: [
      "Where you are starting from. This is the only question that changes the plan itself.",
      "Each option carries its own length — six months if sociology is new to you, five if you have an overview, four if you have studied it before. Pick honestly rather than ambitiously; a four-month run you cannot keep is worse than a six-month one you can.",
    ],
    body: [
      "There is no exam date anywhere in this app, on purpose. WBCS runs every year, so a plan anchored to one date resets to zero if you miss it. You commit to a window instead, and a round that does not end in a pass leaves you further ahead for the next one.",
      "You are also asked how many hours a week you can really give, and how much of the syllabus you are aiming at. Both are honest inputs, not targets to impress anyone with — every projection in the app is computed from them.",
    ],
  },
  {
    id: "dashboard",
    title: "2 · The dashboard",
    lead: "Where you are, in the fewest numbers that tell the truth.",
    shot: "02-dashboard",
    callouts: [
      "Days left in your window, not days until an exam.",
      "Today's focus — what to do now. Everything else on this screen is context.",
    ],
    body: [
      "Overall progress is measured against the depth each topic needs, not against a flat count of topics. A heavily-asked topic read but not written up is not the same as one finished, and the bars say so.",
      "The word beside it — on track, close, slipping — is arithmetic, not encouragement. It goes amber when your measured pace will not finish what you have committed to, and it will not congratulate you for a plan you have not started.",
    ],
    go: "dashboard",
    goLabel: "Open the dashboard",
  },
  {
    id: "today",
    title: "3 · Today's study",
    lead: "One day's share of the week, chosen for you.",
    shot: "03-today",
    body: [
      "The queue leads with whatever WBCS has asked most since 2018, blended with how often the unit around it is examined — so a topic never asked but sitting in a heavily examined unit still gets promoted.",
      "Revision that has come due is mixed in rather than left to the end, because a topic you read six weeks ago and never revisited is worth less than the same topic revised once.",
    ],
    go: "today",
    goLabel: "Open today's study",
  },
  {
    id: "chapters",
    title: "4 · Chapters, and where to read",
    lead: "The whole syllabus, and a chapter reference under every topic.",
    shot: "04-chapters",
    callouts: [
      "Where to read this. Seventy of the eighty-five topics name a specific NCERT chapter and link the official PDF — free, and enough to start on.",
      "Your own note, folded away until you want it.",
    ],
    body: [
      "Four ticks make a topic complete: material read, notes and Q&A, PYQs covered, revised. They are weighted, so reading is most of it and revision is the rest — ticking all four on a topic you skimmed helps nobody.",
      "Fifteen topics say “Not in NCERT — this one needs Essential Sociology.” That is honest rather than unhelpful: school sociology stops at Weber, so Simmel, Parsons and Merton genuinely are not there, and nor are religion and science, welfare programmes for women, addiction or old age. All seven of those have been asked at least twice in the papers on record.",
    ],
    go: "chapters",
    goLabel: "Open chapters",
  },
  {
    id: "notes",
    title: "5 · Notes in your own words",
    lead: "Written where you study, searchable everywhere.",
    shot: "08-notes",
    body: [
      "Notes are added on the topic row — the “add a note” line under any topic. They collect on this screen, where you can search across all of them at once, which is the thing a topic row cannot do.",
      "Plain text on purpose. What matters is your phrasing of a concept and an example you can actually deploy in an answer, not formatting.",
    ],
    go: "notes",
    goLabel: "Open my notes",
  },
  {
    id: "revision",
    title: "6 · Revision that comes round on its own",
    lead: "Seven days, then twenty-one, then forty-five, then ninety.",
    shot: "05-revision-front",
    body: [
      "A topic joins the deck once you have read it and returns on widening intervals. Missing a revision costs you freshness, never coverage — the app will not take away work you have done.",
    ],
  },
  {
    id: "revision-back",
    title: "     …and checks you against yourself",
    lead: "Turn the card and your own note is on the back.",
    shot: "06-revision-back",
    body: [
      "This is the part worth using properly. Revising against your own sentences, written weeks earlier, tells you something a printed summary cannot: whether what you understood then is still there now.",
    ],
    go: "revision",
    goLabel: "Open quick revision",
  },
  {
    id: "answers",
    title: "7 · Answer practice",
    lead: "Written by hand, on paper, photographed.",
    shot: "07-answers",
    body: [
      "WBCS gives you three hours for five answers of forty marks each — roughly thirty-five minutes an answer, and far longer than a UPSC 250-word answer. The timer here matches that.",
      "Answers are written on paper and photographed rather than typed, because paper is what the exam is and typing invites copying.",
      "Marking yourself first is optional but worth doing: the gap between what you thought and what you scored is the most useful number in the app. Below fifty percent puts the topic back in the queue; between fifty and sixty-five flags it without reopening it.",
    ],
    go: "answers",
    goLabel: "Open answer practice",
  },
  {
    id: "pyq",
    title: "8 · What has actually been asked",
    lead: "Ninety-six WBCS questions, 2018 to 2023, mapped to topics.",
    shot: "09-pyq",
    body: [
      "Every question is tagged to the topics it touches, which is where the yield weighting comes from. You can read a topic's history before you study it, which is usually the fastest way to work out what an answer is expected to contain.",
    ],
    go: "pyq",
    goLabel: "Open the PYQ explorer",
  },
  {
    id: "progress",
    title: "9 · Progress, and the AI",
    lead: "Interpretation of your figures — never a decision about them.",
    shot: "10-progress",
    body: [
      "Every number in this app is computed from your own log. The AI is handed those numbers and forbidden from inventing any; it interprets, and the planner decides. If it says you are behind, it has to cite the figures that make you behind.",
      "The Ask AI button sits on every screen for a question of your own. Answer evaluation reads a photographed page, shows you what it read back first so a misreading is visible, and returns five scores rather than prose.",
    ],
    go: "progress",
    goLabel: "Open progress",
  },
  {
    id: "settings",
    title: "10 · Settings, backup, and your data",
    lead: "It is all on this device, and it is all yours.",
    shot: "11-settings",
    body: [
      "Nothing you write leaves your browser. There is no account and no server holding your record — which also means clearing site data erases it, so use the backup button now and then and keep the file somewhere.",
      "Logging out closes the screen and deletes nothing. “Erase everything” is the only button that deletes, and it says so.",
    ],
    go: "settings",
    goLabel: "Open settings",
  },
];

export function GuideScreen({ go }: { go: (r: RouteId) => void }) {
  const [zoom, setZoom] = useState<string | null>(null);

  return (
    <div className="grid" style={{ gap: 14, maxWidth: 880 }}>
      <Card>
        <h1 style={{ fontSize: 21, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
          How this works
        </h1>
        <p style={{ fontSize: 14.5, color: C.muted, margin: "8px 0 0", lineHeight: 1.7 }}>
          Ten screens, about five minutes. Every picture below is a screenshot of this app with
          a sample record in it — so what you see here is what you will get, not an illustration
          of it. Tap any picture to see it full size.
        </p>
      </Card>

      {STEPS.map((s) => (
        <Card key={s.id}>
          <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
            {s.title}
          </h2>
          <p style={{ fontSize: 14, color: C.muted, margin: "5px 0 0", lineHeight: 1.6 }}>
            {s.lead}
          </p>

          {s.shot && (
            <button
              onClick={() => setZoom(s.shot!)}
              aria-label="View this screenshot full size"
              style={{
                display: "block",
                width: "100%",
                marginTop: 13,
                padding: 0,
                border: `1px solid ${C.line}`,
                borderRadius: 10,
                overflow: "hidden",
                background: C.panel,
                cursor: "zoom-in",
                lineHeight: 0,
              }}
            >
              <img
                src={`/guide/${s.shot}.webp`}
                alt={s.title}
                loading="lazy"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </button>
          )}

          {s.callouts && (
            <ol style={{ margin: "13px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {s.callouts.map((c, i) => (
                <li
                  key={c}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    marginBottom: 9,
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      flex: "0 0 auto",
                      width: 21,
                      height: 21,
                      marginTop: 1,
                      borderRadius: "50%",
                      background: "#e0245e",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ol>
          )}

          {s.body?.map((p) => (
            <p key={p} style={{ fontSize: 14, margin: "11px 0 0", lineHeight: 1.75 }}>
              {p}
            </p>
          ))}

          {s.go && (
            <button
              onClick={() => go(s.go!)}
              style={{
                marginTop: 14,
                minHeight: 40,
                padding: "0 15px",
                borderRadius: 8,
                border: `1px solid ${C.line}`,
                background: "transparent",
                color: C.accent,
                font: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.goLabel} →
            </button>
          )}
        </Card>
      ))}

      <Card>
        <h2 style={{ fontSize: 16.5, fontWeight: 700, margin: 0 }}>That is the whole thing</h2>
        <p style={{ fontSize: 14, margin: "9px 0 0", lineHeight: 1.75 }}>
          The habit that makes it work is small: open Today, do the topics, tick what you did,
          write a note in your own words, and write one answer a week on paper. The app keeps
          the record; the record is what tells you the truth in month four.
        </p>
        <p style={{ fontSize: 13.5, color: C.muted, margin: "12px 0 0", lineHeight: 1.7 }}>
          Built by Tapomoy.
        </p>
      </Card>

      {zoom && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot, full size"
          onClick={() => setZoom(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(8, 11, 15, 0.86)",
            overflow: "auto",
            padding: 18,
            cursor: "zoom-out",
          }}
        >
          <img
            src={`/guide/${zoom}.webp`}
            alt=""
            style={{
              display: "block",
              width: "100%",
              maxWidth: 1400,
              margin: "0 auto",
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </div>
  );
}
