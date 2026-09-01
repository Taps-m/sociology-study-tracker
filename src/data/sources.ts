/**
 * Where to read each topic.
 *
 * Two paths, because most people start this exam owning nothing.
 *
 * The free path is the four NCERT sociology textbooks. They are downloadable
 * from ncert.nic.in at no cost, they are written for people with no background,
 * and between them they genuinely cover about two thirds of this syllabus.
 * Every chapter number below was checked against the official contents pages,
 * not against a coaching site's summary — a wrong chapter number costs an hour
 * of searching and is worse than no reference at all.
 *
 * The standard path — Sangwan, Haralambos and Shankar Rao — now lives in
 * ./standardBooks, built the same way from the contents pages of the copies
 * actually on the desk. The two files are meant to be read side by side: NCERT
 * to understand a topic the first time, the standard books to write a 40-mark
 * answer about it.
 *
 * Where neither covers a topic, both files say so. Neither invents a reference
 * to fill the gap.
 */

export type BookId = "ncert11a" | "ncert11b" | "ncert12a" | "ncert12b";

export interface Book {
  id: BookId;
  /** What the reading line calls it. Short enough to sit on a topic row. */
  short: string;
  title: string;
  klass: "XI" | "XII";
  /** ncert.nic.in filename stem; chapter n is `${stem}0${n}.pdf`. */
  stem: string;
  chapters: string[];
}

/** Verified against the official NCERT contents PDFs, August 2026. */
export const BOOKS: Book[] = [
  {
    id: "ncert11a",
    short: "NCERT XI — Introducing Sociology",
    title: "Introducing Sociology, Textbook for Class XI",
    klass: "XI",
    stem: "kesy1",
    chapters: [
      "Sociology and Society",
      "Terms, Concepts and Their Use in Sociology",
      "Understanding Social Institutions",
      "Culture and Socialisation",
      "Doing Sociology: Research Methods",
    ],
  },
  {
    id: "ncert11b",
    short: "NCERT XI — Understanding Society",
    title: "Understanding Society, Textbook for Class XI",
    klass: "XI",
    stem: "kesy2",
    chapters: [
      "Social Structure, Stratification and Social Processes in Society",
      "Social Change and Social Order in Rural and Urban Society",
      "Environment and Society",
      "Introducing Western Sociologists",
      "Indian Sociologists",
    ],
  },
  {
    id: "ncert12a",
    short: "NCERT XII — Indian Society",
    title: "Indian Society, Textbook in Sociology for Class XII",
    klass: "XII",
    stem: "lesy1",
    chapters: [
      "Introducing Indian Society",
      "The Demographic Structure of the Indian Society",
      "Social Institutions: Continuity and Change",
      "The Market as a Social Institution",
      "Patterns of Social Inequality and Exclusion",
      "The Challenges of Cultural Diversity",
    ],
  },
  {
    id: "ncert12b",
    short: "NCERT XII — Social Change and Development in India",
    title: "Social Change and Development in India, Textbook in Sociology for Class XII",
    klass: "XII",
    stem: "lesy2",
    chapters: [
      "Structural Change",
      "Cultural Change",
      "The Constitution and Social Change",
      "Change and Development in Rural Society",
      "Change and Development in Industrial Society",
      "Globalisation and Social Change",
      "Mass Media and Communications",
      "Social Movements",
    ],
  },
];

export function bookOf(id: BookId): Book {
  return BOOKS.find((b) => b.id === id)!;
}

/** The official PDF for one chapter. */
export function chapterUrl(id: BookId, chapter: number): string {
  const b = bookOf(id);
  return `https://ncert.nic.in/textbook/pdf/${b.stem}0${chapter}.pdf`;
}

export function chapterTitle(id: BookId, chapter: number): string {
  return bookOf(id).chapters[chapter - 1] ?? "";
}

/**
 * "covers" means the chapter is about this topic and reading it is the job.
 * "background" means it touches the topic usefully but will not finish it —
 * shown in a quieter voice so the difference is visible rather than implied.
 */
export type ReadingKind = "covers" | "background";

export interface Reading {
  book: BookId;
  chapter: number;
  kind: ReadingKind;
}

const c = (book: BookId, chapter: number): Reading => ({ book, chapter, kind: "covers" });
const bg = (book: BookId, chapter: number): Reading => ({ book, chapter, kind: "background" });

/**
 * Topic id to free reading. A topic absent from this map has no NCERT chapter
 * worth sending anyone to, which is a fact about NCERT rather than about the
 * topic: the classical theorists past Weber, most of the science-and-society
 * unit, and the specific social problems are all Sangwan's ground.
 */
export const NCERT_READINGS: Record<string, Reading[]> = {
  // Paper I — Foundations
  p1u1t1: [bg("ncert11a", 1)],
  p1u1t2: [c("ncert11a", 1)],
  p1u1t3: [c("ncert11a", 1)],
  p1u1t4: [c("ncert11a", 1)],

  // Paper I — Pathfinders. NCERT does Marx, Durkheim and Weber in one chapter
  // and stops there; Simmel, Parsons and Merton are not in school sociology.
  p1u2t1: [c("ncert11b", 4)],
  p1u2t2: [c("ncert11b", 4)],
  p1u2t3: [c("ncert11b", 4)],

  // Paper I — Social System
  p1u3t1: [c("ncert11a", 2)],
  p1u3t2: [c("ncert11a", 4)],
  p1u3t3: [c("ncert11a", 2)],
  p1u3t4: [c("ncert11b", 1)],
  p1u3t5: [c("ncert11a", 2)],
  p1u3t6: [c("ncert11a", 4)],
  p1u3t7: [bg("ncert11b", 4)],
  p1u3t8: [c("ncert11a", 3)],
  p1u3t9: [c("ncert12a", 4)],

  // Paper I — Stratification
  p1u4t1: [c("ncert11b", 1), bg("ncert12a", 5)],
  p1u4t2: [c("ncert11b", 1)],

  // Paper I — Economy and Society
  p1u5t1: [c("ncert12b", 5)],
  p1u5t2: [c("ncert12b", 5)],
  p1u5t3: [c("ncert12b", 5)],

  // Paper I — Politics and Society
  p1u6t1: [bg("ncert11a", 3)],
  p1u6t2: [c("ncert12b", 3)],
  p1u6t3: [c("ncert12b", 8)],

  // Paper I — Religion and Society
  p1u7t2: [c("ncert12b", 2)],
  p1u7t3: [bg("ncert12a", 6)],
  p1u7t4: [c("ncert12a", 6)],
  p1u7t5: [bg("ncert11a", 3)],

  // Paper I — Science and Technology. Only the consequences are in NCERT;
  // the ethos of science and its social control are not.
  p1u8t3: [bg("ncert12b", 6)],
  p1u8t4: [c("ncert12b", 5), bg("ncert12b", 1)],

  // Paper I — Research Methods. One chapter, and it is the right one.
  p1u9t1: [c("ncert11a", 5)],
  p1u9t2: [c("ncert11a", 5)],
  p1u9t3: [c("ncert11a", 5)],
  p1u9t4: [bg("ncert11a", 5)],

  // Paper I — Social and Cultural Change
  p1u10t1: [bg("ncert12b", 6), bg("ncert12b", 4)],
  p1u10t2: [c("ncert12b", 1), c("ncert12b", 2)],
  p1u10t3: [bg("ncert12a", 5)],
  p1u10t4: [c("ncert12b", 5), bg("ncert12b", 6)],
  p1u10t5: [c("ncert12b", 7)],

  // Paper II — Introducing Indian Society. NCERT is at its strongest here.
  p2u1t1: [c("ncert12a", 1)],
  p2u1t2: [c("ncert11b", 5)],
  p2u1t3: [c("ncert11b", 5)],
  p2u1t4: [c("ncert11b", 5)],
  p2u1t5: [bg("ncert12a", 5)],

  // Paper II — Major Social Groups
  p2u2t1: [c("ncert12a", 6)],
  p2u2t2: [c("ncert12a", 6)],
  p2u2t3: [c("ncert12a", 3), c("ncert12a", 5)],

  // Paper II — Major Institutions
  p2u3t1: [c("ncert12a", 3)],
  p2u3t2: [c("ncert12a", 3)],
  p2u3t3: [c("ncert12a", 5)],
  p2u3t4: [bg("ncert12b", 3)],
  p2u3t5: [c("ncert12a", 6)],
  p2u3t6: [c("ncert12a", 5)],

  // Paper II — Social Inequality
  p2u4t1: [c("ncert12a", 5)],
  p2u4t2: [c("ncert12a", 5), c("ncert12a", 3)],
  p2u4t3: [c("ncert12a", 5)],
  p2u4t4: [c("ncert12b", 3)],
  p2u4t5: [c("ncert12b", 1)],

  // Paper II — Social Change in Modern India
  p2u5t1: [c("ncert12b", 2)],
  p2u5t2: [bg("ncert12b", 3), bg("ncert12b", 2)],
  p2u5t3: [c("ncert12b", 3)],
  p2u5t4: [c("ncert12b", 8)],
  p2u5t5: [c("ncert12b", 5), c("ncert11b", 2)],
  p2u5t6: [bg("ncert12b", 8)],

  // Paper II — Women and Children. The programmes and child welfare are
  // policy detail NCERT does not carry.
  p2u6t1: [c("ncert12a", 2)],
  p2u6t2: [c("ncert12a", 5)],

  // Paper II — Globalisation and Ecology
  p2u7t1: [c("ncert11b", 3), c("ncert12b", 6)],
  p2u7t2: [c("ncert12b", 8), bg("ncert11b", 3)],

  // Paper II — Social Problems. NCERT covers population and poverty; child
  // labour, addiction, delinquency, old age and youth it does not.
  p2u8t1: [bg("ncert12b", 4)],
  p2u8t7: [c("ncert12a", 2)],
  p2u8t8: [bg("ncert12a", 5)],
  p2u8t9: [bg("ncert12a", 6)],
};

export function readingsFor(topicId: string): Reading[] {
  return NCERT_READINGS[topicId] ?? [];
}

/** A topic the free path cannot start you on. Not a judgement, just a fact. */
export function isUncovered(topicId: string): boolean {
  return readingsFor(topicId).length === 0;
}

/** One line for a topic row: "NCERT XI — Understanding Society, ch. 4". */
export function readingLine(r: Reading): string {
  return `${bookOf(r.book).short}, ch. ${r.chapter} — ${chapterTitle(r.book, r.chapter)}`;
}
