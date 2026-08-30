# Sociology study tracker — build plan

A study tracker for WBCS Sociology optional. This file is the settled context: read it before
changing anything. Current build progress lives in `build-tracker.html`.

**State: 8 of 10 steps done.** Deployed, working, tested.

---

## 1. Design rules

1. **One tap per action.** Logging must be almost free, or it stops happening.
2. **The user never replans.** The plan is derived from the log, not maintained by hand.
3. **Honest numbers.** Never round in the student's favour. A plan that can't be met says so.
4. **Coverage never falls.** Work done stays done. Only freshness decays.
5. **Works with the network off.** Progress, planning and projections run on the device.
   A server exists only to hold an API key, and only for step 10.
6. **Numbers deterministic, judgement generative.** The planner computes; a model may interpret.
   No AI call ever decides a schedule, a percentage or a date.
7. **Runs on a cheap phone.** Budget Android, 2G, an old browser in a library.

---

## 2. Stack

| Layer | Choice |
|---|---|
| Build | Vite + React 19 + TypeScript |
| Styling | Inline styles from `lib/theme.ts` (no Tailwind in the end) |
| State | `useState` over an event array; `useMemo` projection |
| Storage | localStorage behind `lib/storage.ts` |
| Tests | Vitest — `npx vitest run` |
| Hosting | Vercel, auto-deploy from GitHub `main` |
| Repo | github.com/Taps-m/sociology-study-tracker (public) |

No backend folder. The app is static files. Step 10 adds one serverless function.

---

## 2a. Visual direction

Mission-control: dark surface, fixed grid, monospace numerals, one accent, no decoration.
Every number is real and carries a unit. Do not fake liveness.

Surface `#0A0E12` · panel `#11171D` · hairline `#1E2831` · text `#E6EDF3` · muted `#7D8B99` ·
accent `#5FD3F3` · off-target `#F2A93B`. Dark only. 44px targets, visible focus.

**Words are plain English, not telemetry jargon.** The student has no technical background.

---

## 3. Data model — event log

`src/lib/events.ts`. The log is the only thing stored:

```ts
{ version: 2, events: StudyEvent[] }
```

Event types: `check` (topic, check id, optional minutes, optional prior flag), `uncheck`,
`attempt` (marks, outOf, minutes), `settings` (partial patch).

Every event carries `subject`, currently always `"sociology"`, so other papers are a data
addition rather than a refactor.

`project(events)` folds the log into `Derived` — settings, current checks, revision history,
time log, attempts. **Nothing derived is ever persisted.** Changing a calculation needs no
migration. `storage.ts` migrates the old v1 state-map save automatically.

### Four checks per topic
`read` 0.40 · `notes` 0.25 · `pyq` 0.20 · `revised` 0.15. Independent, not sequential.
Cumulative weights double as depth levels.

---

## 4. Planner — `src/lib/planner.ts`, all pure

- **PYQ scoring** — 60% the topic's own count 2018–23, 40% its unit average. Bands: ≥1.5 high,
  ≥0.7 medium, else low. Distribution: 25 / 30 / 30.
- **Depth** — high-yield topics get all four checks, rare ones a read. The ambition slider
  (50–100%) shifts the whole table. At 80% the plan is ~202h of 274h.
- **Calibration** — logged minutes versus estimates give one global multiplier, clamped 0.4–3,
  applied to every hour figure. Needs 5 samples.
- **Pace** — measured from the last 21 days of real work. Prior knowledge never counts.
- **Options** — three arithmetic ways to close a gap: more minutes a day, shallower on low-yield
  topics, or a later date. Consequences, not advice.
- **Revision** — intervals 7, 21, 45, 90 days, widening each pass. Only topics revised at least
  once enter the cycle. Freshness falls when revision slips; **coverage never does**.
- **Attempts** — answers per week and average score, alongside the reading numbers.

21 tests in `planner.test.ts`. Run them before committing.

---

## 5. Data

- `data/syllabus.ts` — 85 topics from the WBCS syllabus, with unit, hours, PYQ count.
- `data/questions.ts` — 95 questions, 2018–2023, each tagged to a topic. `points` and
  `structure` are empty and waiting. **Year labels for 2019–22 are inferred from source order —
  verify against an official paper.**

---

## 6. Screens

One screen. Telemetry grid, due-for-revision panel, two tabs (this week / full syllabus),
pace and ambition controls, backup.

---

## 7. What is left

**Step 9 — theme ordering.** A 16-week map groups all 85 topics into taught themes (Marx and
Durkheim together, then Weber/Simmel/Parsons/Merton, and so on). It should drive the queue order;
yield should drive only the depth within each theme. The current queue sorts by yield alone and
jumps between papers. The map is a sequence, not a schedule — themes run 0.7 to 2.4 weeks at
12h/wk, so let the packer allocate calendar weeks from real pace.

**Step 10 — AI critique.** Blocked on two decisions:
- **A monthly spend figure.** Quotas derive from it. Not chosen.
- **Where the proxy runs.** Hosting moved to Vercel, so the earlier PHP plan is void. Either a
  Vercel serverless function (paid plan) or a PHP file on separate cPanel hosting with CORS.

**Answer writing — designed, not built.** From the sources: underline keywords, derive the
demand, then introduction / body / conclusion. Balance both sides on opinion questions.
30 minutes per 40-mark answer. Watch for "with special reference to West Bengal".
Gate the model answer behind an attempt. Most checking is string matching against a point
list — no AI needed. Point lists must be authored, not copied from coaching material.

---

## 8. Open decisions

1. Relative hour estimates are still mine; calibration fixes only the global scale.
2. Reading doesn't decay, only revision does. Arguably wrong.
3. Fixed revision intervals, not adapted to recall quality.
4. localStorage only. Export exists; sync would need accounts.
5. Whether never-asked topics should be droppable entirely.
6. Nothing brings the student back on a day they don't study.

---

## 9. Working with Claude Code

Open with: read `PLAN.md`, we are at step 9, don't redesign what's settled. Run `npx vitest run`
before and after any planner change. When a step completes, flip its status in
`build-tracker.html` and commit.
