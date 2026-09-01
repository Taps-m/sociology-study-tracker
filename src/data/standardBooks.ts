/**
 * The three standard books that are actually on the desk, and which chapter of
 * each answers which topic.
 *
 * Every chapter number, title and page range below was read off the contents
 * pages of the copies in `standard books/` — not off a bookseller listing and
 * not off a coaching site. That matters more here than anywhere else in this
 * repository: a wrong chapter number sends someone to the wrong twenty pages
 * and costs them an hour, which is worse than sending them nowhere. Where a
 * topic has no chapter in any of the three, this file says so and stops.
 *
 * `standard books/` is git-ignored. These are paid books and the repository is
 * public. Nothing here reproduces their text; it is a table of contents index,
 * which is the part you are allowed to write down.
 *
 * The free NCERT path lives in ./sources and is untouched by this file. The two
 * are meant to be shown side by side: NCERT to understand a topic the first
 * time, these three to write a 40-mark answer about it.
 */

export type StdBookId = "sangwan" | "haralambos" | "rao";

export interface StdChapter {
  /** Chapter number as printed. "A" is Rao's annexure to chapter 20. */
  n: number | string;
  title: string;
  /** First and last printed page of the chapter, from the contents pages. */
  from: number;
  to: number;
  /**
   * True when the chapter exists in the book but is not in the scanned copy
   * in `standard books/`. See the Haralambos note below.
   */
  absent?: boolean;
}

export interface StdBook {
  id: StdBookId;
  short: string;
  title: string;
  author: string;
  /**
   * PDF page = printed page + offset, for the copy in `standard books/`.
   * null where the copy is a partial scan and no single offset holds.
   */
  pdfOffset: number | null;
  note?: string;
  chapters: StdChapter[];
}

const SANGWAN: StdChapter[] = [
  { n: 1, title: "Sociology – The Discipline", from: 3, to: 20 },
  { n: 2, title: "Sociology as Science", from: 21, to: 41 },
  { n: 3, title: "Research Methods", from: 42, to: 65 },
  { n: 4, title: "Social Thinkers", from: 66, to: 132 },
  { n: 5, title: "Stratification and Mobility", from: 133, to: 162 },
  { n: 6, title: "Work and Economic Life", from: 163, to: 174 },
  { n: 7, title: "Politics and Society", from: 175, to: 210 },
  { n: 8, title: "Religion and Society", from: 211, to: 232 },
  { n: 9, title: "Systems of Kinship", from: 233, to: 256 },
  { n: 10, title: "Social Change in Modern Society", from: 257, to: 275 },
  { n: 11, title: "Perspectives on Study of Indian Society", from: 276, to: 294 },
  { n: 12, title: "Impact of Colonial Rule on Indian Society", from: 295, to: 307 },
  { n: 13, title: "Rural and Agrarian Social Structure", from: 308, to: 322 },
  { n: 14, title: "Caste System", from: 323, to: 352 },
  { n: 15, title: "Tribal Communities in India", from: 353, to: 365 },
  { n: 16, title: "Social Classes in India", from: 366, to: 378 },
  { n: 17, title: "System of Kinship in India", from: 379, to: 396 },
  { n: 18, title: "Religion and Society in India", from: 397, to: 401 },
  { n: 19, title: "Vision of Social Change in India", from: 402, to: 410 },
  { n: 20, title: "Rural and Agrarian Transformation in India", from: 411, to: 427 },
  { n: 21, title: "Industrialisation and Urbanisation in India", from: 428, to: 448 },
  { n: 22, title: "Politics and Society in India", from: 449, to: 458 },
  { n: 23, title: "Social Movements in Modern India", from: 459, to: 486 },
  { n: 24, title: "Population Dynamics", from: 487, to: 508 },
  { n: 25, title: "Challenges of Social Transformation", from: 509, to: 524 },
];

/**
 * Haralambos and Heald, the orange OUP India edition. Thirteen chapters.
 *
 * The copy in `standard books/` is a selective scan, not the whole book: the
 * running page numbers jump. Four chapters are not in it at all and three are
 * in it only in part, which is recorded on each chapter rather than discovered
 * halfway through a study session. The page ranges are the book's; the chapters
 * marked absent are absent from this PDF, not from the book.
 */
const HARALAMBOS: StdChapter[] = [
  { n: 1, title: "The Sociological Perspective", from: 1, to: 27 },
  { n: 2, title: "Social Stratification", from: 28, to: 115 },
  { n: 3, title: "Power and Politics", from: 116, to: 165 },
  { n: 4, title: "Poverty", from: 166, to: 204, absent: true },
  { n: 5, title: "Education", from: 205, to: 271 },
  { n: 6, title: "Work and Leisure", from: 272, to: 332 },
  { n: 7, title: "Organizations and Bureaucracy", from: 333, to: 388 },
  { n: 8, title: "The Family", from: 389, to: 441 },
  { n: 9, title: "Women and Society", from: 442, to: 485, absent: true },
  { n: 10, title: "Deviance", from: 486, to: 543 },
  { n: 11, title: "Religion", from: 544, to: 588 },
  { n: 12, title: "Methodology", from: 589, to: 623, absent: true },
  { n: 13, title: "Sociological Theory", from: 624, to: 662 },
];

/**
 * Chapters the scan carries only in part. Reading stops at the page given.
 * Verified by rendering the running heads across the whole PDF, not guessed.
 */
export const HARALAMBOS_PARTIAL: Record<number, number> = {
  2: 73,
  3: 143,
  5: 215,
  10: 507,
};

/**
 * C N Shankar Rao, Principles of Sociology (S Chand). Sixty chapters plus an
 * annexure. The copy in `standard books/` is the complete book with an OCR
 * text layer, and PDF page = printed page + 16 — checked at three points
 * (printed 304, 684 and 914), not assumed from the front matter.
 *
 * A handful of page numbers below were mangled by that OCR and are corrected
 * from the neighbouring chapters, which bound them exactly: ch. 34 (printed
 * "412", impossible, between 471 and 483), ch. 41 ("58f)"), ch. 53 ("145"),
 * ch. 55 ("7()6"). No number here is a guess at an unbounded value.
 */
const RAO: StdChapter[] = [
  { n: 1, title: "Introduction", from: 3, to: 16 },
  { n: 2, title: "Definition, Scope and Uses of Sociology", from: 17, to: 29 },
  { n: 3, title: "Some Branches of Sociology", from: 30, to: 43 },
  { n: 4, title: "Methods of Sociology", from: 44, to: 53 },
  { n: 5, title: "Social Research: Its Methods and Techniques", from: 54, to: 77 },
  { n: 6, title: "Sociology and Other Social Sciences", from: 78, to: 93 },
  { n: 7, title: "The Study of Human Society", from: 94, to: 100 },
  { n: 8, title: "Some Basic Concepts", from: 103, to: 121 },
  { n: 9, title: "Role and Status", from: 122, to: 134 },
  { n: 10, title: "Power, Status, Authority", from: 135, to: 139 },
  { n: 11, title: "Social Structure and Function", from: 140, to: 152 },
  { n: 12, title: "Individual and Society", from: 155, to: 162 },
  { n: 13, title: "Heredity and Environment", from: 163, to: 171 },
  { n: 14, title: "Individual and Communities", from: 172, to: 188 },
  { n: 15, title: "Culture", from: 189, to: 204 },
  { n: 16, title: "Socialisation and Culture", from: 205, to: 226 },
  { n: 17, title: "Social Groups", from: 227, to: 246 },
  { n: 18, title: "Social Processes", from: 247, to: 265 },
  { n: 19, title: "Organisation and Individual", from: 266, to: 276 },
  { n: 20, title: "Social Differentiation and Social Stratification", from: 279, to: 288 },
  { n: 21, title: "Caste, Estates and Class", from: 289, to: 308 },
  { n: 22, title: "Some Aspects of Social Mobility – Sanskritisation, Westernisation, Modernisation", from: 309, to: 324 },
  { n: 23, title: "Marriage", from: 327, to: 333 },
  { n: 24, title: "Marriage in India", from: 334, to: 347 },
  { n: 25, title: "The Family", from: 348, to: 364 },
  { n: 26, title: "Kinship System", from: 365, to: 369 },
  { n: 27, title: "The Educational System", from: 370, to: 379 },
  { n: 28, title: "The Economic System", from: 380, to: 398 },
  { n: 29, title: "The Political System", from: 399, to: 411 },
  { n: 30, title: "Religion, Morality and Magic", from: 412, to: 433 },
  { n: 31, title: "Meaning and Nature of Social Control", from: 437, to: 447 },
  { n: 32, title: "Folkways, Mores, Customs and Sanctions", from: 448, to: 456 },
  { n: 33, title: "Social Norms and Social Values", from: 457, to: 471 },
  { n: 34, title: "Social Conformity and Deviance", from: 472, to: 480 },
  { n: 35, title: "Meaning and Nature of Social Change", from: 483, to: 494 },
  { n: 36, title: "Theories and Factors of Social Change", from: 495, to: 510 },
  { n: 37, title: "Collective Behaviour", from: 513, to: 526 },
  { n: 38, title: "Social Movements", from: 527, to: 534 },
  { n: 39, title: "Social Disorganisation", from: 537, to: 542 },
  { n: 40, title: "Juvenile Delinquency, Youth Unrest and Problems of the Aged", from: 543, to: 561 },
  { n: 41, title: "The Problem of Overpopulation in India", from: 562, to: 580 },
  { n: 42, title: "The Problem of Poverty", from: 581, to: 589 },
  { n: 43, title: "Unemployment Problem", from: 590, to: 601 },
  { n: 44, title: "Problems of the Under-Privileged: Scheduled Castes, Scheduled Tribes and Other Backward Classes", from: 602, to: 629 },
  { n: 45, title: "Corruption and Black Money in Society", from: 630, to: 638 },
  { n: 46, title: "The Problem of Order", from: 641, to: 649 },
  { n: 47, title: "Applied Sociology", from: 650, to: 656 },
  { n: 48, title: "Introduction to Social Thought", from: 657, to: 665 },
  { n: 49, title: "Auguste Comte and His Thoughts", from: 666, to: 679 },
  { n: 50, title: "Herbert Spencer and His Thoughts", from: 680, to: 695 },
  { n: 51, title: "Durkheim and His Contributions", from: 696, to: 709 },
  { n: 52, title: "Max Weber and His Thoughts", from: 710, to: 723 },
  { n: 53, title: "Karl Marx and His Thoughts", from: 724, to: 745 },
  { n: 54, title: "Science and Technology", from: 746, to: 765 },
  { n: 55, title: "Types of Societies", from: 766, to: 777 },
  { n: 56, title: "Social Mobility", from: 778, to: 789 },
  { n: 57, title: "Race and Ethnic Relations", from: 790, to: 812 },
  { n: 58, title: "Women in Society", from: 813, to: 857 },
  { n: 59, title: "Social Work, Social Welfare and Social Security", from: 858, to: 884 },
  { n: 60, title: "Talcott Parsons and Robert K Merton – Their Contributions", from: 885, to: 906 },
  { n: "A", title: "Annexure to Ch. 20 – Equality, Inequality, Hierarchy, Exclusion, Poverty, Deprivation", from: 907, to: 913 },
];

export const STD_BOOKS: StdBook[] = [
  {
    id: "sangwan",
    short: "Sangwan",
    title: "Essential Sociology for Civil Services Main",
    author: "Seema and Nitin Sangwan",
    pdfOffset: null,
    note: "Organised by the syllabus rather than by the discipline, so a topic usually maps to one chapter and stops there. Start here.",
    chapters: SANGWAN,
  },
  {
    id: "haralambos",
    short: "Haralambos",
    title: "Sociology: Themes and Perspectives",
    author: "Haralambos and Heald",
    pdfOffset: null,
    note: "Depth on the western theory. The copy on the desk is a partial scan — four chapters are missing from it and three are cut short; see HARALAMBOS_PARTIAL.",
    chapters: HARALAMBOS,
  },
  {
    id: "rao",
    short: "Shankar Rao",
    title: "Principles of Sociology, with an Introduction to Sociological Thought",
    author: "C N Shankar Rao",
    pdfOffset: 16,
    note: "The widest coverage of the three, and the only one that carries the specific Indian social problems as chapters of their own.",
    chapters: RAO,
  },
];

export function stdBook(id: StdBookId): StdBook {
  return STD_BOOKS.find((b) => b.id === id)!;
}

export function stdChapter(id: StdBookId, n: number | string): StdChapter | undefined {
  return stdBook(id).chapters.find((c) => c.n === n);
}

/** The PDF page to jump to, where the copy on disk has a single known offset. */
export function pdfPageOf(id: StdBookId, printedPage: number): number | null {
  const off = stdBook(id).pdfOffset;
  return off === null ? null : printedPage + off;
}

/**
 * "covers" means that chapter is the reading for this topic and finishing it
 * finishes the topic. "background" means it is worth the time but will not
 * close the topic on its own — shown in a quieter voice, because a candidate
 * who cannot tell the two apart reads three chapters where one was needed.
 */
export type StdKind = "covers" | "background";

export interface StdReading {
  book: StdBookId;
  chapter: number | string;
  /** Narrower than the chapter, where the contents page gave a sub-range. */
  from?: number;
  to?: number;
  kind: StdKind;
}

const s_ = (chapter: number | string, from?: number, to?: number): StdReading => ({
  book: "sangwan", chapter, from, to, kind: "covers",
});
const sb = (chapter: number | string, from?: number, to?: number): StdReading => ({
  book: "sangwan", chapter, from, to, kind: "background",
});
const h_ = (chapter: number, from?: number, to?: number): StdReading => ({
  book: "haralambos", chapter, from, to, kind: "covers",
});
const hb = (chapter: number, from?: number, to?: number): StdReading => ({
  book: "haralambos", chapter, from, to, kind: "background",
});
const r_ = (chapter: number | string, from?: number, to?: number): StdReading => ({
  book: "rao", chapter, from, to, kind: "covers",
});
const rb = (chapter: number | string, from?: number, to?: number): StdReading => ({
  book: "rao", chapter, from, to, kind: "background",
});

/**
 * Topic id to standard reading, best first.
 *
 * Four topics are deliberately absent, and their absence is the finding rather
 * than an omission: Simmel, dominant and celebrity culture, child welfare
 * programmes, and drug addiction have no chapter in any of the three books on
 * the desk. Nothing is invented to fill them — see UNCOVERED below.
 */
export const STANDARD_READINGS: Record<string, StdReading[]> = {
  // ── Paper I ───────────────────────────────────────────────────────────────

  // Foundations
  p1u1t1: [s_(1, 4, 8), rb(1)],
  p1u1t2: [s_(1, 4, 10), r_(1)],
  p1u1t3: [s_(1, 9, 15), r_(2), rb(6)],
  p1u1t4: [s_(1, 16, 17), rb(2)],

  // Pathfinders. Sangwan's ch. 4 is the spine; Rao gives each thinker a whole
  // chapter of his own, which is the place to go for a 40-mark answer.
  p1u2t1: [s_(4, 68, 81), r_(53), hb(13)],
  p1u2t2: [s_(4, 82, 95), r_(51), hb(13)],
  p1u2t3: [s_(4, 96, 107), r_(52), hb(7)],
  // p1u2t4 — Simmel. Not in any of the three. See UNCOVERED.
  p1u2t5: [s_(4, 108, 114), r_(60, 885, 895), hb(13)],
  p1u2t6: [s_(4, 115, 128), r_(60, 896, 906), hb(13)],

  // Social System
  p1u3t1: [r_(9), r_(11), sb(4, 109, 114)],
  p1u3t2: [r_(13), rb(15)],
  p1u3t3: [r_(31), r_(34), hb(10)],
  p1u3t4: [r_(18), sb(2, 35, 39)],
  p1u3t5: [r_(17)],
  p1u3t6: [r_(16)],
  p1u3t7: [r_(10), s_(7, 175, 186), hb(3)],
  p1u3t8: [r_(30), s_(8, 211, 220), hb(11)],
  p1u3t9: [r_(28), s_(6, 163, 170)],

  // Stratification
  p1u4t1: [s_(5, 133, 145), r_("A"), rb(20)],
  p1u4t2: [s_(5, 153, 159), r_(56), rb(22)],

  // Economy and Society
  p1u5t1: [s_(6, 163, 167), r_(55), hb(6)],
  p1u5t2: [s_(6, 168, 170), r_(19), hb(7)],
  p1u5t3: [s_(6, 171, 173), hb(6)],

  // Politics and Society
  p1u6t1: [s_(7, 175, 186), h_(3), rb(29)],
  p1u6t2: [s_(7, 187, 197), hb(3)],
  p1u6t3: [s_(7, 198, 207), r_(37), r_(38)],

  // Religion and Society
  p1u7t1: [s_(8, 221, 222), rb(30), rb(54)],
  p1u7t2: [s_(8, 223, 225), h_(11), sb(22, 455, 457)],
  p1u7t3: [s_(8, 226, 229)],
  p1u7t4: [s_(8, 216, 220), hb(11)],
  p1u7t5: [r_(30), sb(8, 215, 220)],

  // Science and Technology. Rao's ch. 54 is the only chapter in the three that
  // treats the ethos and the social control of science rather than only its
  // consequences, which is most of this unit.
  p1u8t1: [r_(54, 746, 755)],
  p1u8t2: [r_(54, 756, 765)],
  p1u8t3: [r_(54), sb(10, 268, 269)],
  p1u8t4: [s_(10, 268, 269), r_(54)],

  // Research Methods
  p1u9t1: [s_(3, 42, 45), r_(5, 54, 58)],
  p1u9t2: [s_(3, 52, 55), r_(5, 60, 70)],
  p1u9t3: [s_(3, 46, 49), r_(5, 58, 60), hb(12)],
  p1u9t4: [r_(5, 70, 77), sb(3, 56, 63)],

  // Social and Cultural Change
  p1u10t1: [s_(10, 262, 263)],
  p1u10t2: [s_(10, 264, 265), r_(36)],
  p1u10t3: [s_(10, 266, 267), r_(27), hb(5)],
  p1u10t4: [s_(10, 268, 269), r_(54)],
  // p1u10t5 — dominant and celebrity culture. See UNCOVERED.

  // ── Paper II ──────────────────────────────────────────────────────────────

  // Introducing Indian Society
  p2u1t1: [s_(12, 298, 302), sb(11, 276, 280)],
  p2u1t2: [s_(11, 276, 280)],
  p2u1t3: [s_(11, 280, 288)],
  p2u1t4: [s_(11, 288, 293)],
  p2u1t5: [s_(14, 339, 341), rb(44, 602, 615)],

  // Major Social Groups
  p2u2t1: [s_(18), sb(8, 211, 220)],
  p2u2t2: [sb(22, 451, 455)],
  p2u2t3: [s_(14), s_(15), r_(21)],

  // Major Institutions
  p2u3t1: [s_(17, 386, 390), r_(24)],
  p2u3t2: [s_(17, 379, 396), r_(25), r_(26)],
  p2u3t3: [s_(17, 390, 391), r_(58, 813, 840)],
  p2u3t4: [s_(22, 449, 455)],
  p2u3t5: [s_(18), r_(30)],
  p2u3t6: [s_(19, 406, 408), r_(27)],

  // Social Inequality
  p2u4t1: [s_(5, 133, 152), r_("A")],
  p2u4t2: [s_(14, 323, 335), s_(16), r_(21)],
  p2u4t3: [r_(44, 616, 629), s_(14, 340, 343)],
  p2u4t4: [s_(14, 340, 350), sb(19, 405, 406)],
  p2u4t5: [s_(16), sb(14, 341, 344)],

  // Social Change in Modern India
  p2u5t1: [s_(11, 283, 288), r_(22), sb(22, 455, 458)],
  p2u5t2: [s_(19, 403, 406)],
  p2u5t3: [s_(19, 405, 406), sb(12, 304, 306)],
  p2u5t4: [s_(23), r_(38)],
  p2u5t5: [s_(21), sb(13)],
  p2u5t6: [s_(22, 449, 452), sb(7, 183, 187)],

  // Women and Children
  p2u6t1: [s_(24, 502, 506), rb(58, 813, 830)],
  p2u6t2: [s_(25, 512, 515), r_(58, 830, 857)],
  // Rao's ch. 58 carries the constitutional protections, the empowerment
  // strategies and the programme detail, which is the whole of this topic and
  // was the longest-standing gap in the free path.
  p2u6t3: [r_(58, 830, 857), sb(23, 464, 468)],
  // p2u6t4 — child welfare programmes. See UNCOVERED.

  // Globalisation and Ecology
  p2u7t1: [s_(25, 509, 512), sb(21, 428, 436)],
  p2u7t2: [s_(23, 478, 481)],

  // Social Problems
  p2u8t1: [r_(42), s_(5, 136, 142), sb(21, 444, 446)],
  p2u8t2: [s_(21, 442, 444)],
  p2u8t3: [r_(40, 549, 557)],
  // p2u8t4 — drug addiction. See UNCOVERED.
  p2u8t5: [r_(40, 543, 549)],
  p2u8t6: [r_(40, 557, 561), s_(24, 499, 502)],
  p2u8t7: [r_(41), s_(24, 487, 499)],
  p2u8t8: [s_(25, 521, 523), rb(27)],
  p2u8t9: [s_(25, 514, 521)],
};

/**
 * Topics no chapter of the three books answers, pinned by id so a later
 * session can see at a glance whether a new book closes one.
 *
 *   p1u2t4   Simmel — formal sociology, money, the metropolis
 *   p1u10t5  Dominant culture and celebrity culture
 *   p2u6t4   Children and child welfare programmes
 *   p2u8t4   Drug addiction
 *
 * The first is a real hole in all three books; the other three are contemporary
 * enough that the books predate them. Nothing is invented to cover them.
 */
export const UNCOVERED = ["p1u2t4", "p1u10t5", "p2u6t4", "p2u8t4"] as const;

export function standardReadingsFor(topicId: string): StdReading[] {
  return STANDARD_READINGS[topicId] ?? [];
}

export function hasStandardReading(topicId: string): boolean {
  return standardReadingsFor(topicId).length > 0;
}

/** True when the chapter is in the book but not in the copy on the desk. */
export function notOnDesk(r: StdReading): boolean {
  const ch = stdChapter(r.book, r.chapter);
  if (ch?.absent) return true;
  if (r.book !== "haralambos" || typeof r.chapter !== "number") return false;
  const stops = HARALAMBOS_PARTIAL[r.chapter];
  return stops !== undefined && (r.from ?? ch?.from ?? 0) > stops;
}

/** "Sangwan, ch. 4 — Social Thinkers, pp. 68–81". */
export function stdLine(r: StdReading): string {
  const b = stdBook(r.book);
  const ch = stdChapter(r.book, r.chapter);
  const head = `${b.short}, ch. ${r.chapter}${ch ? ` — ${ch.title}` : ""}`;
  const from = r.from ?? ch?.from;
  const to = r.to ?? ch?.to;
  if (from === undefined || to === undefined) return head;
  return `${head}, pp. ${from}–${to}`;
}

/** "open the PDF at page 84" — only where the copy has a known offset. */
export function stdJump(r: StdReading): number | null {
  const ch = stdChapter(r.book, r.chapter);
  const from = r.from ?? ch?.from;
  return from === undefined ? null : pdfPageOf(r.book, from);
}
