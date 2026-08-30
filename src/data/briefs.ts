/**
 * One brief per unit: the mind map, the takeaways, and the thinker to lead with.
 *
 * This is content, not code. Each brief is written once and committed, so it
 * works offline and costs nothing per use — PLAN.md §7's "cut cost before adding
 * features". Units without a brief simply do not show the tab.
 *
 * Check anything here against your own texts before you write it in an exam.
 */

export interface FlowStage {
  title: string;
  /** One line, always visible. The detail stays folded until asked for. */
  summary: string;
  items: string[];
  /** Which tint to use, 0-3, so a stage keeps its colour across themes. */
  tint: 0 | 1 | 2 | 3;
}

export interface UnitBrief {
  /** `${paper}|${unit}`, matching the syllabus. */
  key: string;
  headline: string;
  flow: FlowStage[];
  conclusion: { title: string; caption: string };
  takeaways: string[];
  thinker?: { name: string; life: string; points: string[] };
}

export const BRIEFS: UnitBrief[] = [
  {
    key: "1|Foundations",
    headline: "Modernity → Social Change → Emergence of Sociology",
    flow: [
      {
        tint: 0,
        title: "Before",
        summary: "Land, church and birth decided everything.",
        items: ["Feudalism", "Religion and tradition", "Agrarian economy", "Fixed hierarchy"],
      },
      {
        tint: 1,
        title: "What changed",
        summary: "Four revolutions in thought, trade, industry and politics.",
        items: [
          "Enlightenment and the Scientific Revolution",
          "Commercial and Industrial Revolution",
          "French Revolution",
          "Urbanisation and capitalism",
        ],
      },
      {
        tint: 2,
        title: "What broke",
        summary: "The new cities produced problems nobody had language for.",
        items: [
          "New class relations",
          "Poverty and exploitation",
          "Social disorder",
          "Political instability",
        ],
      },
      {
        tint: 3,
        title: "What was needed",
        summary: "A way to study society as rigorously as nature.",
        items: [
          "What is happening to society?",
          "Why is it changing, and what holds it together?",
          "Can it be studied scientifically?",
        ],
      },
    ],
    conclusion: {
      title: "Emergence of sociology",
      caption: "Nineteenth-century Europe: a scientific and systematic study of society",
    },
    takeaways: [
      "Modernity is the shift to rationality, science, industry, capitalism and urban life.",
      "The Enlightenment, the Industrial Revolution and the French Revolution together transformed European society.",
      "Rapid social change created problems that older forms of explanation could not address.",
      "Those problems created the demand for a systematic, scientific study of society.",
      "Sociology emerged as an intellectual response to that demand, not as an abstract invention.",
    ],
    thinker: {
      name: "Auguste Comte",
      life: "1798–1857",
      points: [
        "Coined the term sociology and is conventionally called its founder",
        "Positivism: society should be studied by the methods of the natural sciences",
        "Law of three stages — theological, metaphysical, positive",
      ],
    },
  },
];

export function briefFor(paper: number, unit: string): UnitBrief | undefined {
  return BRIEFS.find((b) => b.key === `${paper}|${unit}`);
}

/** Every unit that has a written brief, as `${paper}|${unit}`. */
export function unitsWithBriefs(): { key: string; paper: number; unit: string }[] {
  return BRIEFS.map((b) => {
    const [paper, unit] = b.key.split("|");
    return { key: b.key, paper: Number(paper), unit: unit! };
  });
}
