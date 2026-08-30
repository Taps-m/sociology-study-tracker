# Answer Practice — design

Draft for discussion. No code yet.

## The premise

AI feedback on an answer is a commodity: any chat window does it, free, today.
What no chat window has is **your record** — every answer you have written, scored
the same way, timed, and cross-referenced against a syllabus and six years of real
questions.

So the rule this module is built on:

> **Every AI call must return a structured score, never prose.**

The moment feedback is a paragraph, it is something you could have got elsewhere,
and it cannot be compared with last week's. A number can be compared. A trend can
be acted on.

The AI reads the dial. The tracker is the dial.

## Anti-goals

Stated first, because the temptations are strong and each one would make the
module worse:

- **It never writes an answer for you.** Not a model answer, not an outline, not
  "here is how I would open". The one AI use that actively damages preparation is
  the one that produces the thing you were supposed to produce.
- **It is not a chat window.** Doubts have their own place (Ask AI). This module
  scores and records.
- **It does not teach content.** Reading is reading. This measures output.

## The rubric

Five criteria, ten marks each, the same five every time. Fixed wording, stored
with each attempt, so a score from week 20 is comparable with week 2.

| # | Criterion | What earns the marks |
|---|---|---|
| 1 | **Structure** | An introduction that frames rather than repeats the question; body paragraphs that follow one another; a conclusion that actually answers |
| 2 | **Sociological content** | Concepts and theory doing the work, not general-studies commentary |
| 3 | **Thinkers** | Named, correctly attributed, and *used* — not name-dropped |
| 4 | **Indian examples** | Concrete, relevant, and placed where they carry an argument |
| 5 | **Demand** | Answers what was actually asked. "Critically examine" is not "describe" |

Criterion 5 is where most marks are quietly lost and it is missing from most
generic rubrics. It stays.

Scores are stored per criterion, out of 10. The headline mark is the sum,
reported out of 50 and scaled to 40 for comparison with the paper.

## The flow

Four states, one screen.

**1. Pick.** The tracker offers a real question from the 91 in the corpus,
drawn from a topic you are due on or have never attempted. You can also paste
your own. It records which question, and whether it was Group A or Group B.

**2. Write.** A timer counts up against 35:00 — the real budget for a 40-mark
answer when five must be written in 180 minutes. Most candidates write on paper;
that must stay supported. Typing is optional and only matters for step 4.

**3. Self-mark.** Before any AI sees it, you predict your own mark out of 40 and
name the one thing you think was weakest. This is not ceremony: the gap between
your estimate and the score is itself a finding, and a candidate who
over-rates themselves by eight marks has learned something worth knowing before
exam day rather than after it.

**4. Evaluate (optional).** Photograph the page. The model reads images, so a
handwritten answer is scored against the same rubric as a typed one: five
criterion scores and one concrete rewrite of the weakest part. Roughly ₹1–2 per
answer, under the existing daily cap. Skipping this still records the attempt
with the self-mark, and it counts everywhere below.

## What the record then makes possible

None of this is available from a chat window, and all of it is arithmetic over
attempts already stored.

- **Per-criterion trend.** "Structure has moved 4 → 7 over twelve answers.
  Thinkers has not moved."
- **Timing trend.** "You average 47 minutes against a 35-minute budget. At that
  rate you finish four answers, not five."
- **Calibration.** Self-mark against scored mark over time. Closing that gap is
  its own skill.
- **Strength by topic.** "Durkheim 81%, Weber 62%." Marks are a far better signal
  than a checkbox, and they are already in the event log, unused.
- **Blind spots — the important one.** Cross the attempts against the corpus:
  Group B is fed almost entirely by Methods, Social Problems, Religion and
  Science & Technology, and two of three Group B questions must be answered. A
  candidate who has never written from those units is unprepared for a whole
  section, and the tracker can say so months early.

## Feeding back into the plan

A topic answered at 55% should not be treated as finished because its boxes are
ticked. Proposal: an attempt below a threshold pushes the topic back into the
queue at revision depth, exactly as the decay cycle does.

This is the strongest argument for the module. Right now the planner knows only
what you have *read*. Marks are the only signal in the app that measures what
the exam measures.

## Settled: paper, photographed

Answers are written by hand. Not as a concession to habit — because a keyboard
allows copy and paste, and an answer you can paste is not an answer you can
write in a hall. The constraint is the point.

The phone camera closes the gap the decision would otherwise open. The model
reads images, so the page is photographed and scored against the same rubric.
Nothing is lost except the ability to cheat yourself.

Three things this forces, none of them large:

- **Resize before upload.** A phone photo is several megabytes; a page of
  handwriting is legible at about 1200px wide. Resize on the client, send JPEG.
- **Raise the payload ceiling for this task only.** The proxy caps a request at
  24KB, which is right for a context object and hopeless for an image. Raise it
  for `evaluate`, leave the others alone, and keep the existing daily limit —
  which was already stricter for evaluation, because it is the one task with
  unbounded input.
- **Never store the image.** Scores go in the event log; the photograph does
  not. The log is loaded on every start and read on every calculation, and
  putting pages of JPEG in it would ruin the thing the whole app depends on.
  The paper is the archive. That is what paper is for.

**Known limit, worth saying out loud:** the model will misread some handwriting.
A score built on a misreading is worse than no score, so an evaluation should
show what it read back — or at least flag low confidence — and the self-mark
stays the figure of record when the two disagree wildly.

## Open questions

1. ~~Paper or typed?~~ **Settled: paper, photographed.**
2. **Is self-marking compulsory before the AI score is revealed?** Compulsory
   makes the calibration data complete; optional makes the module lighter to use.
3. **What threshold should send a topic back into the queue, and to what depth?**
4. **Do we store the answer text?** It makes later comparison possible and the
   event log much larger.
