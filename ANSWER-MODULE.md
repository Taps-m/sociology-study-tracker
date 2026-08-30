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

**4. Evaluate (optional).** If the answer was typed, the AI returns the five
criterion scores and one concrete rewrite of the weakest part. About ₹1 per
answer, under the existing daily cap. If it was written on paper, the attempt is
recorded with the self-mark alone and still counts everywhere below.

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

## Open questions

1. **Paper or typed?** Paper is how the exam works and how most candidates
   practise, but only typed answers can be scored by the AI. Support both, or
   push towards typing for the feedback?
2. **Is self-marking compulsory before the AI score is revealed?** Compulsory
   makes the calibration data complete; optional makes the module lighter to use.
3. **What threshold should send a topic back into the queue, and to what depth?**
4. **Do we store the answer text?** It makes later comparison possible and the
   event log much larger.
