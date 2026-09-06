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
 *   3. The 224 real questions in pyq.ts. What WBCS actually asks about a
 *      chapter is the best evidence of what the chapter contains, and it is the
 *      same source the weightage is counted from.
 *   4. The section headings of the two Sociology Optional notes PDFs in
 *      `standard books/`. These are structured to the UPSC syllabus, not the
 *      WBCS one, so the mapping is many-to-many: chapter B5 on kinship answers
 *      three WBCS chapters by itself, while WBCS's own "Westernisation,
 *      Sanskritisation and secularisation" is scattered across three of theirs.
 *      Headings are taken as they stand where they fit. Where they do not, the
 *      syllabus word wins and the gap is stated: "Westernisation" is in the
 *      list below because WBCS names it, and the notes never use the word as a
 *      heading at all — worth knowing before you go looking for it.
 *
 * A keyword that could not be traced to one of those four is not here. An
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

  // ── Paper II · Introducing Indian Society ────────────────────────────────
  // Source: the section headings of the Paper 2 notes, chapters A1 and A2.
  p2u1t1: [
    "Defining modernity",
    "Features of modernity",
    "Modernisation of Indian tradition",
    "Little and great tradition",
    "Orthogenetic and heterogenetic change",
  ],
  p2u1t2: [
    "Indology and its assumptions",
    "Ghurye on caste",
    "Ghurye on tribe",
    "Ghurye on kinship, family and marriage",
    "Ghurye on religion and Indian sadhus",
    "Criticism of Indology",
  ],
  p2u1t3: [
    "Structural functionalism",
    "Radcliffe-Brown's perspective",
    "Srinivas on the Coorgs",
    "Sanskritisation",
    "Dominant caste",
    "Village studies",
  ],
  p2u1t4: [
    "Marxist sociology in India",
    "Desai on Indian nationalism",
    "Desai's five phases of nationalism",
    "Marxist perspective on modernity",
  ],
  p2u1t5: [
    "Who is a Dalit",
    "Ambedkar on India as a nation",
    "Ambedkar on democracy",
    "Constitutional morality",
    "Dalit movement",
  ],

  // ── Paper II · Major Social Groups ───────────────────────────────────────
  // Source: chapter B6 for the communities, B2 and B3 for caste and tribe.
  p2u2t1: [
    "Major religious communities",
    "Who is a minority",
    "Problems of religious minorities",
    "Protecting religious minorities",
  ],
  p2u2t3: [
    "Features of the caste system",
    "Origin of caste",
    "Perspectives on untouchability",
    "Defining a tribe",
    "Tribes in the Constitution",
    "Colonial policies and tribes",
  ],

  // ── Paper II · Major Institutions ────────────────────────────────────────
  // Source: chapter B5, which answers three WBCS chapters on its own, plus B6
  // for religion as an institution and C4 for political participation.
  p2u3t1: [
    "What is marriage",
    "Marital choices",
    "Endogamy and exogamy",
    "Forms of marriage",
    "Legal rationalisation of marriage",
    "Stability in marriage",
  ],
  p2u3t2: [
    "Lineage and descent",
    "Structural breakdown of the joint family",
    "The joint family persists",
    "Changes in family structure",
    "Single parent households",
  ],
  p2u3t3: [
    "Change in the division of labour",
    "Patriarchy and entitlements",
    "Social subordination and exclusion of women",
    "Transforming intimate relationships",
  ],
  p2u3t4: [
    "Democracy as practised in India",
    "Citizenship, rights and responsibility",
    "Active and passive participation",
    "Political parties and pressure groups",
    "Social and political elites",
  ],
  p2u3t5: [
    "Problems of religious minorities",
    "Communal riots and protection",
    "Uniform Civil Code",
    "Secular tone in politics",
  ],

  // ── Paper II · Social Inequality ─────────────────────────────────────────
  // Source: B2 and B4. p2u4t1 is deliberately absent: the notes cover poverty
  // and deprivation at length but have no section on the types of inequality
  // as such, and the syllabus names no parts, so it keeps its whole-chapter
  // tick rather than being given keywords that do not lead anywhere.
  p2u4t2: [
    "Features of the caste system",
    "Andre Beteille on caste and class",
    "Agrarian class structure",
    "Industrial class structure",
    "Middle classes in India",
  ],
  p2u4t3: [
    "Who is a Dalit",
    "Backward classes and Dalit movement",
    "Impact of reservation",
    "Mandal protests",
  ],
  p2u4t5: [
    "Occupations without caste considerations",
    "Caste clustering in occupations",
    "Impact of reservation",
    "Education and social change",
  ],

  // ── Paper II · Social Change in Modern India ─────────────────────────────
  // Source: C5 for the movements, C3 for industry and the city, C1 and C2 for
  // directed change. "Westernisation" is the syllabus's own word, not the
  // notes' — they carry Sanskritisation and secularisation but never use it as
  // a heading, which is worth knowing before you go looking for it.
  p2u5t1: [
    "Sanskritisation",
    "De-Sanskritisation",
    "Changing notions of purity and pollution",
    "Westernisation",
    "Secularisation",
  ],
  p2u5t2: [
    "Development planning and mixed economy",
    "Community development programme",
    "Phases of rural development",
    "Green revolution and social change",
  ],
  p2u5t3: [
    "Constitution, law and social change",
    "Law as an instrument of social change",
    "Social reforms",
  ],
  p2u5t4: [
    "Peasant and farmers movements",
    "Women's movement",
    "Backward classes and Dalit movement",
    "Environmental movements",
    "Ethnicity and identity movements",
  ],
  p2u5t5: [
    "Evolution of modern industry",
    "Growth of urban settlements",
    "Working class: structure and growth",
    "Trade unionism",
    "Informal sector and child labour",
    "Slums and deprivation in urban areas",
  ],
  p2u5t6: [
    "Political parties",
    "Pressure groups",
    "Social and political elites",
  ],

  // ── Paper II · Women and Children ────────────────────────────────────────
  // Source: C7. Only one of this unit's four chapters is in the notes at all.
  // The programmes for women and the child-welfare chapter are WBCS-only and
  // have no UPSC counterpart to draw on — see the note at the foot of this file.
  p2u6t2: [
    "Defining violence against women",
    "Forms of violence against women",
    "Honour killing",
  ],

  // ── Paper II · Globalisation and Ecology ─────────────────────────────────
  // Source: C7 for the crisis, C5 for the movements.
  p2u7t1: [
    "Sustainable development",
    "Ecological modernisation",
    "Environmental problems",
    "Development-induced displacement",
  ],
  p2u7t2: [
    "Environmental movements in India",
    "Displacement and protest movements",
    "Sustainable development",
    "Ecological modernisation",
  ],

  // ── Paper II · Social Problems ───────────────────────────────────────────
  // Source: C7 and C6. Four of this unit's nine chapters have no counterpart in
  // the notes: youth, drug addiction, juvenile delinquency, and old age beyond
  // C6's passing note on ageing. Child labour is carried by C3.
  p2u8t1: [
    "Poverty: causes",
    "Poverty: consequences",
    "Poverty, deprivation and inequality",
    "Poverty eradication programmes",
  ],
  p2u8t7: [
    "Population size, growth and composition",
    "Components of population growth",
    "Causes of a high birth rate",
    "Malthusian theory and its critics",
    "Population policy and family planning",
  ],
  p2u8t9: [
    "Defining violence against women",
    "Forms of violence against women",
    "Honour killing",
    "Communal riots",
  ],
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
