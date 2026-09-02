# Answer scripts read, and what came out of them

The skeleton in `api/ai.js` (the `structure` task) is not invented. It is taken
from real answer booklets. This file records which ones have been read, so a
later session adds to the finding rather than starting again — and so a claim in
the prompt can be traced back to the page it came from.

The scripts live in `answer copy/`, which is **git-ignored on purpose**: they are
other people's work and this repository is public.

## Read so far

| Script | Rank | Kind | Weight |
|---|---|---|---|
| Animesh Pradhan, 2 (two booklets) | AIR 2 | UPSC mains booklet | Highest — real booklet, real marks behind it |
| Abhinav Siwach | AIR 12 | Answer set, 10-markers | Medium |
| Rajeshwari, Test 07 | AIR 2 | LevelUp IAS test series | Medium — graded by a test series, not UPSC |
| Geetika Arora, Tests 01 and 04 | AIR 22 | LevelUp IAS test series | Medium |
| Aayushi Bansal, Test 04 | AIR 7 | LevelUp IAS test series, Paper II | Medium |

Plus a transcript of Sandesh Jain (AIR 161, 176 in Paper I) describing his method
in his own words. Useful, and less reliable than the pages: what people say they
do and what the page shows them doing are not the same, and where they differed
the pages won.

## What all five scripts do

**Mark the question before writing.** The command word boxed or highlighted, the
object underlined, on the printed paper. Aayushi rewrites the whole question at
the top of her answer by hand first. Five seconds, and it is the mechanical
reason these answers stay on the demand while others drift onto the topic.

**Open without a definition.** Two to four lines, no heading, already carrying
the shape of what follows. Three moves seen: a contrast that states the thesis
("Unlike the western world…", "Ghurye's Indology came as a reaction to Western
Indology"), an unpacking of the question's own terms so the body is divided
before it begins, or a flat factual anchor naming the Act.

**One signpost line**, underlined, restating the demand as a heading before any
content.

**Blocks, never paragraphs.** A two-to-four word keyword, then a dash or colon,
then two or three lines of mechanism. The keyword is the point itself.

**Unequal depth.** This is the one nobody says out loud. "Excluded from
government schemes, for being in the creamier layer" is an entire block in a
Rank 2 answer: one line, no thinker, no development. The depth goes to the two
or three blocks carrying the argument.

**One pivot sentence** turns a two-part question rather than starting again:
"But the failure of these provisions in full letter and spirit is the cause of
tribal uprising —".

**Thinkers budgeted.** One 10-mark answer has none at all. A 20-marker has four
to six across the page, each doing one job, inside a block and never as one.

**Specifics do more work than thinkers.** 42% of the displaced, women's
participation at ~20%, POSCO, PESA 1996, IITs/NITs/AIIMS, the Baiga of West
Bengal. A hard specific in most blocks.

**Examples flagged and attached.** Written "(e.g.)" against the point they
demonstrate, never floating free.

**Diagrams where a list would be slower.** A boxed label with an arrow branching
into numbered points; a vertical spine down the margin joining a group; a
labelled triangle for a three-fold classification.

**A close that takes a position**, never a summary. Two-sided ("while the labour
codes intend to minimise class divisions, poor implementation can widen
inequality"), forward-looking with a thinker, or — on a question about
limitations — concessive: "thus, despite limitations, positivists provided a
concrete shape to sociology as a discipline." A criticism question still wants a
position at the end.

**Vocabulary in brackets.** A technical term dropped in parentheses after a
point — "(Diffusionism)" — signals command of the concept without spending a
sentence on it.

## The method, stated as rules the prompt actually carries

A coaching method Tapan uses (Sandeep Jain's sequence, with Nishat Sir's
principle that scholars and criticism should not be forced) was held against
these prompts on 2 September 2026. Three things it names were missing, and the
evidence for two of them was already in this file:

**What, then why, then how.** It was in the first version of the blueprint,
taken from the 176-in-Paper-I transcript, and was lost when the structure was
rebuilt from the scripts. A block that only says what a thing is has stopped at
the first of the three and reads like a definition.

**A thinker only where he does work.** This file already recorded that thinkers
are budgeted and that one 10-mark answer cites nobody at all. The prompt did not
carry it, and worse, the model answer's schema gave every block a `thinker`
field — a slot on every block is an invitation to fill every block, and no
wording fixes a shape that asks for it. The field now describes itself as
usually empty.

**Criticism only where it is demanded.** Nothing had said so. "Critically
examine", "evaluate" and "comment on" ask for it; "discuss", "examine",
"describe" and "analyse" do not, and a limitations paragraph bolted onto them
answers a question nobody set.

Two more were weakly stated and are now explicit: subheadings restate the
demand rather than naming the topic, and an example must prove the claim of the
block it sits under rather than illustrate the topic in general — if it would
sit equally well under any other block, it is decoration.

These live in `METHOD_RULES` in `api/ai.js` and are carried by the structure,
model and cheatsheet prompts alike.

## Still not observed

**A 40-mark answer.** Every script read is 10 marks, 20 marks, or a 150-word
note. WBCS is 40 marks in about 35 minutes, so the prompt scales the shape to
six to eight blocks by reasoning, not from evidence. This is the largest
remaining hole.

**A WBCS script.** Everything here is UPSC. The methodology transfers; the
length and the examiner's taste may not.

**Marks per question.** None of the copies carries the evaluator's marks against
individual answers, so there is no evidence here about what separates 22 from 30
on the same question — only about what a good answer looks like.

## Adding to this

Drop new copies into `answer copy/`. They can be large: render them down on the
machine rather than moving them whole.

    cd "answer copy"
    pdfinfo "New Script.pdf" | head -3
    pdftoppm -jpeg -jpegopt quality=70 -r 100 -f 1 -l 12 "New Script.pdf" _sample/new

Then read the sample images, and delete `_sample/` afterwards. Update the table
above and, where a script shows something new, the `structure` prompt in
`api/ai.js` — with a note here saying which script it came from.
