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
        title: "Traditional European society",
        items: ["Feudalism", "Religion and tradition", "Agrarian economy", "Fixed hierarchy"],
      },
      {
        tint: 1,
        title: "Major transformations",
        items: [
          "Renaissance",
          "Scientific Revolution",
          "Enlightenment",
          "Commercial Revolution",
          "Industrial Revolution",
          "French Revolution",
          "Urbanisation and capitalism",
        ],
      },
      {
        tint: 2,
        title: "New social problems",
        items: [
          "Urbanisation",
          "New class relations",
          "Poverty and exploitation",
          "Social inequality",
          "Social disorder",
          "Political instability",
        ],
      },
      {
        tint: 3,
        title: "Need for systematic understanding",
        items: [
          "What is happening to society?",
          "Why is it changing?",
          "What creates order?",
          "How can society be studied scientifically?",
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
