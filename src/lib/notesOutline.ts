/**
 * The notes' own outline, recovered from their layout.
 *
 * A mind map of the answer's scaffold — what it asks, the shape, the blocks —
 * teaches how to build an answer. It is the wrong thing to memorise, because
 * what has to be in the head at eleven at night is the subject: ageing, its
 * definition, its types, its problems, what is done about them. That structure
 * already exists in the notes and is thrown away by reading them as prose.
 *
 * It survives in the indentation. `pdftotext -layout` keeps the geometry, and
 * these notes are laid out consistently enough to read back:
 *
 *   indent 18+   a centred section title — the root of the section
 *   indent 0     a sub-heading, if it is short and does not end in a full stop
 *   indent 0     otherwise a line of body prose, usually a definition
 *   bullet at 6  a point under whichever sub-heading is open
 *   indent 9+    the wrapped remainder of the line above it, not a new point
 *
 * That gives three real levels under the topic instead of the one a flat list
 * of blocks gives, and every label is the notes' own wording — which is the
 * point, since the wording is what has to be recognised in the exam hall.
 */

export interface OutlineNode {
  text: string;
  kind: "heading" | "point" | "definition";
  children?: OutlineNode[];
}

/** A scholar's line: "Clark Tibbitts: ..." or "BECKER - Aging in the ...". */
const SCHOLAR = /^([A-Z][A-Za-z.]*(?:\s+(?:and|&|[A-Z][A-Za-z.]*)){0,3})\s*[-–:]\s+(.{12,})$/;

/** A running page number, and the headers and footers that come with it. */
const NOISE = /^(\d{1,3}|page\s*\d+|www\..*|https?:.*)$/i;

function tidy(s: string): string {
  // Strip the bullet before collapsing whitespace, not after: collapsing first
  // leaves a leading space and the anchor never matches, which is how every
  // point ends up still wearing its dot inside the box.
  return s.trim().replace(/^[•▪◦]\s*/, "").replace(/\s+/g, " ").trim();
}

function looksLikeHeading(s: string): boolean {
  if (s.length < 4 || s.length > 72) return false;
  if (/[.;,]$/.test(s)) return false;
  if (s.split(/\s+/).length > 10) return false;
  // A heading names a thing; a sentence does something. The giveaway is a
  // finite verb early on, and these notes' headings almost never carry one.
  if (/^(the|it|this|these|there|however|thus|hence|so)\b/i.test(s)) return false;
  return /^[A-Z0-9]/.test(s);
}

/**
 * Read one section's pages into a tree.
 *
 * `pages` are the raw laid-out page texts, in order, for one section only —
 * the caller has already sliced them to the section's page range.
 */
export function outlineFromPages(pages: string[], sectionTitle: string): OutlineNode {
  const lines: { indent: number; raw: string }[] = [];
  for (const page of pages) {
    for (const raw of page.split("\n")) {
      if (!raw.trim()) continue;
      lines.push({ indent: raw.length - raw.trimStart().length, raw });
    }
  }

  /*
   * A section rarely begins at the top of its first page — its centred title
   * sits partway down, with the tail of the previous section above it. Read
   * from the top and the ageing map opens with four points about family
   * planning, which is the sort of thing that makes a map untrustworthy.
   */
  const first = lines.findIndex(
    (l) => l.indent >= 18 && tidy(l.raw).toLowerCase() === sectionTitle.toLowerCase(),
  );
  const body = first >= 0 ? lines.slice(first + 1) : lines;

  const root: OutlineNode = { text: sectionTitle, kind: "heading", children: [] };
  let open: OutlineNode = root;
  /** The node a wrapped continuation line belongs to. */
  let last: OutlineNode | null = null;

  for (const { indent, raw } of body) {
    const s = tidy(raw);
    if (!s || NOISE.test(s)) continue;

    const bullet = /^\s*[•▪◦]/.test(raw);

    // A wrapped remainder: deeper than a bullet, not a bullet itself.
    if (!bullet && indent >= 9 && last) {
      last.text = `${last.text} ${s}`.replace(/\s+/g, " ");
      continue;
    }

    // The section's own centred title; we already have it as the root.
    if (!bullet && indent >= 18) continue;

    if (bullet) {
      const node: OutlineNode = { text: s, kind: "point" };
      (open.children ??= []).push(node);
      last = node;
      continue;
    }

    // Unbulleted, at the margin: either a new sub-heading or a definition.
    const scholar = SCHOLAR.exec(s);
    if (scholar) {
      const node: OutlineNode = { text: s, kind: "definition" };
      (open.children ??= []).push(node);
      last = node;
      continue;
    }

    if (looksLikeHeading(s)) {
      const node: OutlineNode = { text: s, kind: "heading", children: [] };
      (root.children ??= []).push(node);
      open = node;
      last = node;
      continue;
    }

    const node: OutlineNode = { text: s, kind: "definition" };
    (open.children ??= []).push(node);
    last = node;
  }

  return prune(root);
}

/**
 * Cut it down to something a person can hold.
 *
 * The section is seven pages; drawn whole it is a wall, and a wall is what the
 * prose already was. So: the fullest branches first, a ceiling on each level,
 * and long points clipped — a map is an index to what you have read, not a
 * replacement for having read it.
 */
function prune(root: OutlineNode, maxHeadings = 9, maxPoints = 7, maxChars = 110): OutlineNode {
  const headings = (root.children ?? []).filter((c) => c.kind === "heading");
  const loose = (root.children ?? []).filter((c) => c.kind !== "heading");

  const kept = headings
    .filter((h) => (h.children ?? []).length > 0)
    .sort((a, b) => (b.children?.length ?? 0) - (a.children?.length ?? 0))
    .slice(0, maxHeadings)
    // Back into the order they appear on the page: a map that reorders the
    // material is one you cannot follow with the book open beside it.
    .sort((a, b) => headings.indexOf(a) - headings.indexOf(b));

  const clip = (n: OutlineNode): OutlineNode => ({
    ...n,
    text: n.text.length > maxChars ? `${n.text.slice(0, maxChars - 1).trimEnd()}…` : n.text,
    children: n.children?.slice(0, maxPoints).map(clip),
  });

  return {
    ...root,
    children: [...loose.slice(0, 3), ...kept].map(clip),
  };
}
