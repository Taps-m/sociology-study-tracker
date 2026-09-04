import { TOPICS, type Topic } from "./syllabus";

/**
 * The ideas inside a chapter, one tick each.
 *
 * A chapter is not a unit of work. "Karl Marx" is six hours and four separate
 * ideas, and an evening spent on class struggle alone could be recorded only as
 * all of Marx or none of him — so a six-hour chapter sat at zero for a
 * fortnight while the plan went on recommending what had already been read.
 * These are what an evening actually finishes.
 *
 * WHERE THESE COME FROM, AND WHY IT MATTERS
 *
 * Every keyword below is taken from one of three sources that already exist in
 * this repository, never invented:
 *
 *   1. The syllabus wording itself. WBCS names what a chapter contains —
 *      "Karl Marx — historical materialism, mode of production, alienation,
 *      class struggle" is the Commission's own list, and the app was throwing
 *      it away at the em dash.
 *   2. The unit briefs in briefs.ts, whose flow stages were written against the
 *      standard texts and are already committed content.
 *   3. The 152 real questions in pyq.ts. What WBCS actually asks about a
 *      chapter is the best evidence of what the chapter contains, and it is the
 *      same source the weightage is counted from.
 *
 * A keyword that could not be traced to one of those three is not here. An
 * invented sub-topic costs the same as an invented chapter number: an hour of
 * looking for something that is not in the book.
 *
 * NOT EVERY CHAPTER HAS THESE, AND THAT IS NOT A BUG. Most of the eighty-five
 * are a single idea — "Types of human groups", "Emergence of Sociology" — and
 * decompose into nothing useful. Those keep the whole-chapter tick they always
 * had. Splitting a two-hour chapter into four checkboxes would turn reading
 * into data entry, which is the failure this is meant to prevent.
 *
 * VERIFY BEFORE RELYING. These are drafted from the sources above and have not
 * been checked line by line against Sangwan, Haralambos and Rao. Correct
 * anything that does not match your own text — the strings are what the event
 * log stores, so change them here rather than working around them.
 */
export const KEYWORDS: Record<string, string[]> = {
  // Paper I - Foundations
  // Source: briefs.ts "1|Foundations" flow stages, which follow the standard
  // account of modernity, social change, and the emergence of the discipline.
  p1u1t1: [
    "Feudal order and its breakdown",
    "Enlightenment and the Scientific Revolution",
    "Commercial and Industrial Revolution",
    "French Revolution",
    "Urbanisation and capitalism",
  ],
  p1u1t2: [
    "Comte and positivism",
    "Why a new discipline was needed",
    "Founding concerns: order and progress",
  ],
  p1u1t3: [
    "Sociology and history",
    "Sociology and economics",
    "Sociology and political science",
    "Sociology and anthropology",
    "Sociology and psychology",
  ],
  p1u1t4: [
    "Common sense as unexamined belief",
    "Evidence and method against intuition",
    "The sociological imagination",
  ],

  // Paper I - Pathfinders
  // Source: the syllabus's own em-dash lists, which name each thinker's
  // concepts. These are the Commission's wording, not a summary of it.
  p1u2t1: ["historical materialism", "mode of production", "alienation", "class struggle"],
  p1u2t2: ["social fact", "collective consciousness", "solidarity", "suicide", "religion"],
  p1u2t3: ["social action", "ideal types", "authority", "bureaucracy", "Protestant ethic"],
  p1u2t4: [
    "formal sociology",
    "forms and types",
    "subjective and objective culture",
    "money",
    "metropolis",
  ],
  p1u2t5: ["social system", "four problems", "pattern variables"],
  p1u2t6: [
    "latent and manifest functions",
    "dysfunction",
    "conformity",
    "deviance",
    "reference groups",
  ],

  // Paper I - Social System
  // Source: the syllabus wording, split only where it names two or more
  // distinct ideas. The one-idea chapters in this unit are deliberately absent.
  p1u3t1: ["equilibrium", "status", "role"],
  p1u3t2: ["culture", "heredity", "environment"],
  p1u3t3: ["social control", "conformity", "deviance"],
  p1u3t7: ["power", "authority", "legitimacy"],
  p1u3t8: ["solidarity", "conflict", "magic", "science", "morality"],
  p1u3t9: ["production", "distribution", "exchange", "consumption"],

  // Paper I - Stratification
  // Source: the syllabus wording, and the 2015 and 2016 questions in pyq.ts on
  // the working class, the under class, poverty and deprivation.
  p1u4t1: ["equality", "inequality", "hierarchy", "exclusion", "poverty and deprivation"],
  p1u4t2: [
    "open and closed systems",
    "types of mobility",
    "sources of mobility",
    "consequences of mobility",
  ],

  // Paper I - Research Methods
  // Source: the syllabus wording, extended with the method names the Paper I
  // notes give their own headings to in chapter 3 (pp. 55-81).
  p1u9t1: ["quantitative research", "qualitative research", "positivism", "the interpretative approach"],
  p1u9t2: ["social survey", "questionnaires", "interviews", "case studies", "life histories"],
  p1u9t3: [
    "participant observation",
    "non-participant observation",
    "sampling",
    "non-representative sampling",
  ],

  // Paper I - Economy and Society
  // Source: the syllabus's own em-dash list, and the headings of the notes'
  // chapter 6 (pp. 232-248).
  p1u5t1: ["slave", "feudal", "industrial", "post-industrial"],
  p1u5t2: ["formal organisation of work", "informal organisation of work"],

  // Paper I - Politics and Society
  // Source: the syllabus's own lists, corroborated by the Quick Overview on
  // p. 251 of the notes, which names the same set.
  p1u6t1: ["power elite", "bureaucracy", "pressure groups", "political parties"],
  p1u6t2: ["nation-state", "citizenship", "democracy", "civil society", "ideology"],
  p1u6t3: ["protest", "agitation", "social movements", "collective action", "revolution"],

  // Paper I - Religion and Society
  // Source: the syllabus wording for the compound chapter, and the section
  // headings of the notes' chapter 8 (pp. 294-320).
  p1u7t5: ["magic", "religion", "morality", "science"],

  // Paper I - Social and Cultural Change
  // Source: the syllabus wording. Only where it names more than one idea.
  p1u10t1: ["development", "dependency"],
  p1u10t4: ["science", "technology", "social change"],
  p1u10t5: ["dominant culture", "celebrity culture"],
};

/**
 * The ideas inside a chapter, or nothing where it has none.
 *
 * Prefers the authored list, then the syllabus's own em-dash wording, so a
 * chapter that has not been written up here still decomposes if the Commission
 * named its parts. Returns an empty array for a chapter that is one idea, which
 * every caller must treat as "tick the whole thing" rather than as a gap.
 */
export function keywordsFor(topic: Topic): string[] {
  const authored = KEYWORDS[topic.id];
  if (authored && authored.length > 1) return authored;
  const tail = topic.name.split(" — ")[1];
  if (!tail) return [];
  const parts = tail
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [];
}

/** How many chapters have been broken up, for the screen that says so. */
export function keywordCoverage(): { chapters: number; of: number; keywords: number } {
  let chapters = 0;
  let keywords = 0;
  for (const t of TOPICS) {
    const k = keywordsFor(t);
    if (k.length > 0) {
      chapters++;
      keywords += k.length;
    }
  }
  return { chapters, of: TOPICS.length, keywords };
}
