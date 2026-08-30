import { describe, expect, it } from "vitest";
import { TOPICS } from "./syllabus";
import {
  BOOKS,
  NCERT_READINGS,
  bookOf,
  chapterTitle,
  chapterUrl,
  isUncovered,
  readingsFor,
} from "./sources";

describe("the reading map", () => {
  it("never points at a chapter that does not exist", () => {
    for (const [topicId, readings] of Object.entries(NCERT_READINGS)) {
      for (const r of readings) {
        const book = bookOf(r.book);
        expect(r.chapter, `${topicId} -> ${r.book}`).toBeGreaterThan(0);
        expect(r.chapter, `${topicId} -> ${r.book}`).toBeLessThanOrEqual(book.chapters.length);
        expect(chapterTitle(r.book, r.chapter)).not.toBe("");
      }
    }
  });

  it("only maps topics that are actually in the syllabus", () => {
    const ids = new Set(TOPICS.map((t) => t.id));
    for (const topicId of Object.keys(NCERT_READINGS)) {
      expect(ids.has(topicId), `${topicId} is not a syllabus topic`).toBe(true);
    }
  });

  it("never lists the same chapter twice for one topic", () => {
    for (const [topicId, readings] of Object.entries(NCERT_READINGS)) {
      const keys = readings.map((r) => `${r.book}-${r.chapter}`);
      expect(new Set(keys).size, topicId).toBe(keys.length);
    }
  });

  it("links the official NCERT PDF", () => {
    expect(chapterUrl("ncert12b", 3)).toBe("https://ncert.nic.in/textbook/pdf/lesy203.pdf");
    expect(chapterTitle("ncert12b", 3)).toBe("The Constitution and Social Change");
  });

  it("covers most of the syllabus, and is honest about the rest", () => {
    const covered = TOPICS.filter((t) => !isUncovered(t.id));
    // NCERT is school sociology: it does not do Simmel, Parsons, Merton, the
    // ethos of science, or the specific social problems. If this ever reads
    // 85 of 85, someone has invented a reference.
    expect(covered.length).toBeGreaterThan(60);
    expect(covered.length).toBeLessThan(TOPICS.length);
  });

  it("names exactly which repeatedly-asked topics the free path cannot start", () => {
    // School sociology stops at Weber, so Parsons and Merton are absent
    // despite three appearances each since 2018; youth and addiction are
    // absent for the same reason at the other end of the syllabus. These are
    // not holes to be filled with plausible-looking chapter references — they
    // are the four topics that justify owning Essential Sociology, and the app
    // says so on the row. If this list grows the map has drifted; if it shrinks
    // without the book arriving, check nobody has invented a citation.
    const gaps = TOPICS.filter((t) => t.pyq >= 2 && isUncovered(t.id)).map((t) => t.id);
    expect(gaps).toEqual(["p1u2t5", "p1u2t6", "p2u8t3", "p2u8t4"]);
  });

  it("has a reading of some kind for every topic it lists", () => {
    for (const t of TOPICS) {
      if (!isUncovered(t.id)) expect(readingsFor(t.id).length).toBeGreaterThan(0);
    }
  });

  it("keeps the book list to the four free NCERTs", () => {
    expect(BOOKS).toHaveLength(4);
    expect(BOOKS.every((b) => b.chapters.length > 0)).toBe(true);
  });
});
