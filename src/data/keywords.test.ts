import { describe, expect, it } from "vitest";
import { TOPICS } from "./syllabus";
import { KEYWORDS, keywordsFor, keywordCoverage } from "./keywords";

/*
 * The keyword lists spend the candidate's evenings, so they get the same
 * treatment as the page map: every claim checkable, nothing invented.
 */
describe("chapter keywords", () => {
  it("only names chapters that exist", () => {
    // A tick is stored against a topic id. One that has drifted from the
    // syllabus records reading against a chapter nobody can open.
    for (const id of Object.keys(KEYWORDS)) {
      expect(
        TOPICS.some((t) => t.id === id),
        `${id} is not a topic id`,
      ).toBe(true);
    }
  });

  it("never lists a chapter with fewer than two ideas", () => {
    // One "part" is not a part, it is the chapter — and it would show a
    // candidate a checklist of length one, which reads as a bug.
    for (const [id, list] of Object.entries(KEYWORDS)) {
      expect(list.length, id).toBeGreaterThan(1);
    }
  });

  it("has no duplicate or empty keywords inside a chapter", () => {
    for (const [id, list] of Object.entries(KEYWORDS)) {
      expect(new Set(list).size, `${id} repeats an idea`).toBe(list.length);
      for (const k of list) expect(k.trim().length, `${id} has a blank`).toBeGreaterThan(1);
    }
  });

  it("keeps keywords short enough to be a chip rather than a sentence", () => {
    // A keyword is something you find in an index. Anything longer is a
    // summary, and a summary cannot be ticked honestly.
    for (const [id, list] of Object.entries(KEYWORDS)) {
      for (const k of list) expect(k.length, `${id}: "${k}"`).toBeLessThanOrEqual(46);
    }
  });

  it("falls back to the syllabus's own em-dash wording", () => {
    // Paper II is not written up here — this volume of the notes is Paper I —
    // but where the Commission named a chapter's parts itself, the chapter
    // still decomposes without anybody authoring anything.
    const fallback = TOPICS.find(
      (t) => !KEYWORDS[t.id] && (t.name.split(" — ")[1] ?? "").includes(","),
    );
    expect(fallback, "every splittable topic is now authored; drop this test").toBeDefined();
    const parts = keywordsFor(fallback!);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(fallback!.name).toContain(p);
  });

  it("leaves a single-idea chapter with nothing, which callers read as a whole tick", () => {
    const single = TOPICS.find((t) => t.name === "Types of human groups")!;
    expect(keywordsFor(single)).toEqual([]);
  });

  it("reports coverage honestly", () => {
    const c = keywordCoverage();
    expect(c.of).toBe(TOPICS.length);
    expect(c.chapters).toBeLessThan(c.of);
    expect(c.keywords).toBeGreaterThan(c.chapters);
  });
});
