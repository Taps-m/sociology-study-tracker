import { expect, it } from "vitest";
import { TOPICS } from "./syllabus";
import {
  HARALAMBOS_PARTIAL,
  STANDARD_READINGS,
  STD_BOOKS,
  UNCOVERED,
  notOnDesk,
  stdBook,
  stdChapter,
  stdJump,
  stdLine,
  standardReadingsFor,
} from "./standardBooks";

const ids = new Set(TOPICS.map((t) => t.id));

it("every mapped topic id is a real topic", () => {
  for (const id of Object.keys(STANDARD_READINGS)) {
    expect(ids.has(id)).toBe(true);
  }
});

it("every chapter referenced exists in the book it names", () => {
  for (const [id, readings] of Object.entries(STANDARD_READINGS)) {
    for (const r of readings) {
      const ch = stdChapter(r.book, r.chapter);
      expect(ch, `${id} -> ${r.book} ch. ${r.chapter}`).toBeDefined();
    }
  }
});

it("a sub-range lies inside the chapter it narrows", () => {
  for (const [id, readings] of Object.entries(STANDARD_READINGS)) {
    for (const r of readings) {
      if (r.from === undefined && r.to === undefined) continue;
      const ch = stdChapter(r.book, r.chapter)!;
      const from = r.from ?? ch.from;
      const to = r.to ?? ch.to;
      const where = `${id} -> ${r.book} ch. ${r.chapter} pp. ${from}-${to} (chapter ${ch.from}-${ch.to})`;
      expect(from <= to, where).toBe(true);
      expect(from >= ch.from, where).toBe(true);
      expect(to <= ch.to, where).toBe(true);
    }
  }
});

it("chapters run forward and do not overlap, in every book", () => {
  for (const b of STD_BOOKS) {
    for (const ch of b.chapters) expect(ch.from <= ch.to, `${b.short} ch. ${ch.n}`).toBe(true);
    for (let i = 1; i < b.chapters.length; i++) {
      const prev = b.chapters[i - 1]!;
      const next = b.chapters[i]!;
      expect(next.from > prev.to, `${b.short} ch. ${prev.n} -> ${next.n}`).toBe(true);
    }
  }
});

it("the topics recorded as uncovered really have no reading", () => {
  for (const id of UNCOVERED) {
    expect(ids.has(id), id).toBe(true);
    expect(standardReadingsFor(id)).toHaveLength(0);
  }
});

it("uncovered is the whole list, not a sample", () => {
  const missing = TOPICS.filter((t) => standardReadingsFor(t.id).length === 0).map((t) => t.id);
  expect(missing.sort()).toEqual([...UNCOVERED].sort());
});

/**
 * The copy of Haralambos on the desk is a partial scan. A reading that lands in
 * a chapter the scan does not carry has to be visibly flagged, not silently
 * offered — that is the whole reason the partial ranges were measured.
 */
it("no reading sends the candidate to a page the scan does not have", () => {
  const stranded: string[] = [];
  for (const [id, readings] of Object.entries(STANDARD_READINGS)) {
    for (const r of readings) {
      if (notOnDesk(r) && r.kind === "covers") stranded.push(`${id} -> ${stdLine(r)}`);
    }
  }
  expect(stranded).toEqual([]);
});

it("the partial list only names chapters that exist and are not absent", () => {
  for (const n of Object.keys(HARALAMBOS_PARTIAL).map(Number)) {
    const ch = stdChapter("haralambos", n);
    expect(ch, `haralambos ch. ${n}`).toBeDefined();
    expect(ch!.absent).toBeUndefined();
    expect(HARALAMBOS_PARTIAL[n]! <= ch!.to).toBe(true);
    expect(HARALAMBOS_PARTIAL[n]! >= ch!.from).toBe(true);
  }
});

it("only Rao offers a PDF jump, and it is the verified +16", () => {
  expect(stdBook("rao").pdfOffset).toBe(16);
  expect(stdBook("sangwan").pdfOffset).toBeNull();
  expect(stdBook("haralambos").pdfOffset).toBeNull();
  expect(stdJump({ book: "rao", chapter: 53, kind: "covers" })).toBe(740);
  expect(stdJump({ book: "sangwan", chapter: 4, kind: "covers" })).toBeNull();
});

it("a reading line names the book, the chapter and the pages", () => {
  const line = stdLine({ book: "sangwan", chapter: 4, from: 68, to: 81, kind: "covers" });
  expect(line).toBe("Sangwan, ch. 4 — Social Thinkers, pp. 68–81");
});
