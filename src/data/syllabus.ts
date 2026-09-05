/**
 * The WBCS Sociology optional syllabus, as it stands for this candidate.
 *
 * WBPSC notified a revised Mains pattern from the 2025 cycle, which kept the
 * optional and kept Sociology on the list. The syllabus below is the older one,
 * and it remains the syllabus in force through 2027 — so it is the right thing
 * to plan against, not an artefact to be updated. Recorded here because a
 * future reader finding a 2025 notification could reasonably assume otherwise
 * and rewrite eighty-five topics for nothing.
 *
 * The question bank runs to 2023; see PYQ_YEARS in ./pyq.
 */
import { PYQS } from "./pyq";

export interface Topic {
  id: string;
  paper: 1 | 2;
  unit: string;
  name: string;
  estHours: number;
  yield: 1 | 2 | 3;
  /**
   * Times this topic was asked in WBCS Main, 2018-2023.
   *
   * Counted from the question corpus, never written down here. It was written
   * down once, and thirty-two of the eighty-five had drifted from the questions
   * they claimed to summarise — which mattered, because this number drives the
   * yield band, the depth each topic is planned to, and therefore the order of
   * the whole queue. The plan was being built on a stale copy of its own
   * evidence.
   */
  pyq: number;
}

/** Everything about a topic except the figure that is derived from the papers. */
type RawTopic = Omit<Topic, "pyq">;

const RAW: RawTopic[] = [

  // ── PAPER 1 ──────────────────────────────────────────────────────────────

  // Unit 1 — Foundations
  { id: "p1u1t1", paper: 1, unit: "Foundations", name: "Modernity and social changes in Europe", estHours: 3, yield: 1 },
  { id: "p1u1t2", paper: 1, unit: "Foundations", name: "Emergence of Sociology", estHours: 2, yield: 3 },
  { id: "p1u1t3", paper: 1, unit: "Foundations", name: "Scope and comparison with other social sciences", estHours: 2, yield: 3 },
  { id: "p1u1t4", paper: 1, unit: "Foundations", name: "Sociology and common sense", estHours: 2, yield: 3 },

  // Unit 2 — Pathfinders
  { id: "p1u2t1", paper: 1, unit: "Pathfinders", name: "Karl Marx — historical materialism, mode of production, alienation, class struggle", estHours: 6, yield: 3 },
  { id: "p1u2t2", paper: 1, unit: "Pathfinders", name: "Emile Durkheim — social fact, collective consciousness, solidarity, suicide, religion", estHours: 6, yield: 3 },
  { id: "p1u2t3", paper: 1, unit: "Pathfinders", name: "Max Weber — social action, ideal types, authority, bureaucracy, Protestant ethic", estHours: 6, yield: 3 },
  { id: "p1u2t4", paper: 1, unit: "Pathfinders", name: "Simmel — formal sociology, forms and types, subjective and objective culture, money, metropolis", estHours: 5, yield: 2 },
  { id: "p1u2t5", paper: 1, unit: "Pathfinders", name: "Talcott Parsons — social system, four problems, pattern variables", estHours: 4, yield: 3 },
  { id: "p1u2t6", paper: 1, unit: "Pathfinders", name: "Robert K Merton — latent and manifest functions, dysfunction, conformity, deviance, reference groups", estHours: 4, yield: 3 },

  // Unit 3 — Social System
  { id: "p1u3t1", paper: 1, unit: "Social System", name: "Equilibrium, status and role", estHours: 3, yield: 2 },
  { id: "p1u3t2", paper: 1, unit: "Social System", name: "Culture, heredity and environment", estHours: 3, yield: 1 },
  { id: "p1u3t3", paper: 1, unit: "Social System", name: "Social control, conformity and deviance", estHours: 3, yield: 1 },
  { id: "p1u3t4", paper: 1, unit: "Social System", name: "Forms of interaction and everyday life", estHours: 3, yield: 1 },
  { id: "p1u3t5", paper: 1, unit: "Social System", name: "Types of human groups", estHours: 2, yield: 3 },
  { id: "p1u3t6", paper: 1, unit: "Social System", name: "Personality and socialisation", estHours: 3, yield: 2 },
  { id: "p1u3t7", paper: 1, unit: "Social System", name: "Power, authority and legitimacy", estHours: 3, yield: 1 },
  { id: "p1u3t8", paper: 1, unit: "Social System", name: "Religion — solidarity, conflict, magic, science, morality", estHours: 4, yield: 2 },
  { id: "p1u3t9", paper: 1, unit: "Social System", name: "Social aspects of production, distribution, exchange and consumption", estHours: 3, yield: 2 },

  // Unit 4 — Inequality, Stratification and Mobility
  { id: "p1u4t1", paper: 1, unit: "Stratification", name: "Equality, inequality, hierarchy, exclusion, poverty and deprivation", estHours: 4, yield: 2 },
  { id: "p1u4t2", paper: 1, unit: "Stratification", name: "Social mobility — open and closed systems, types, sources, consequences", estHours: 4, yield: 3 },

  // Unit 5 — Economy and Society
  { id: "p1u5t1", paper: 1, unit: "Economy and Society", name: "Social organisation of work — slave, feudal, industrial, post-industrial", estHours: 4, yield: 3 },
  { id: "p1u5t2", paper: 1, unit: "Economy and Society", name: "Formal and informal organisation of work", estHours: 3, yield: 3 },
  { id: "p1u5t3", paper: 1, unit: "Economy and Society", name: "Labour and society", estHours: 3, yield: 1 },

  // Unit 6 — Politics and Society
  { id: "p1u6t1", paper: 1, unit: "Politics and Society", name: "Power elite, bureaucracy, pressure groups and political parties", estHours: 4, yield: 1 },
  { id: "p1u6t2", paper: 1, unit: "Politics and Society", name: "Nation-state, citizenship, democracy, civil society, ideology", estHours: 4, yield: 2 },
  { id: "p1u6t3", paper: 1, unit: "Politics and Society", name: "Protest, agitation, social movements, collective action, revolution", estHours: 4, yield: 1 },

  // Unit 7 — Religion and Society
  { id: "p1u7t1", paper: 1, unit: "Religion and Society", name: "Religion and science", estHours: 3, yield: 2 },
  { id: "p1u7t2", paper: 1, unit: "Religion and Society", name: "Secularisation", estHours: 3, yield: 1 },
  { id: "p1u7t3", paper: 1, unit: "Religion and Society", name: "Religious revivalism and fundamentalism", estHours: 3, yield: 1 },
  { id: "p1u7t4", paper: 1, unit: "Religion and Society", name: "Pluralism", estHours: 2, yield: 1 },
  { id: "p1u7t5", paper: 1, unit: "Religion and Society", name: "Magic, religion, morality and science", estHours: 3, yield: 2 },

  // Unit 8 — Science and Technology
  { id: "p1u8t1", paper: 1, unit: "Science and Technology", name: "Ethos of science and scientific temper", estHours: 2, yield: 2 },
  { id: "p1u8t2", paper: 1, unit: "Science and Technology", name: "Social responsibility and social control of science", estHours: 2, yield: 2 },
  { id: "p1u8t3", paper: 1, unit: "Science and Technology", name: "Social consequences of science and technology", estHours: 3, yield: 2 },
  { id: "p1u8t4", paper: 1, unit: "Science and Technology", name: "Technology and social change", estHours: 3, yield: 1 },

  // Unit 9 — Research Methods
  { id: "p1u9t1", paper: 1, unit: "Research Methods", name: "Importance of social research", estHours: 2, yield: 1 },
  { id: "p1u9t2", paper: 1, unit: "Research Methods", name: "Survey method — questionnaires and interviews", estHours: 3, yield: 3 },
  { id: "p1u9t3", paper: 1, unit: "Research Methods", name: "Field method — participant and non-participant observation", estHours: 3, yield: 3 },
  { id: "p1u9t4", paper: 1, unit: "Research Methods", name: "Experimentation in sociology", estHours: 2, yield: 1 },

  // Unit 10 — Social and Cultural Change
  { id: "p1u10t1", paper: 1, unit: "Social and Cultural Change", name: "Development and dependency", estHours: 3, yield: 2 },
  { id: "p1u10t2", paper: 1, unit: "Social and Cultural Change", name: "Agents of social change", estHours: 3, yield: 1 },
  { id: "p1u10t3", paper: 1, unit: "Social and Cultural Change", name: "Education and social change", estHours: 3, yield: 2 },
  { id: "p1u10t4", paper: 1, unit: "Social and Cultural Change", name: "Science, technology and social change", estHours: 3, yield: 2 },
  { id: "p1u10t5", paper: 1, unit: "Social and Cultural Change", name: "Dominant culture and celebrity culture", estHours: 2, yield: 2 },

  // ── PAPER 2 ──────────────────────────────────────────────────────────────

  // Unit 1 — Introductory
  { id: "p2u1t1", paper: 2, unit: "Introducing Indian Society", name: "Unity and diversity, modernity and tradition, contestation", estHours: 3, yield: 3 },
  { id: "p2u1t2", paper: 2, unit: "Introducing Indian Society", name: "Indological approach — Ghurye", estHours: 3, yield: 3 },
  { id: "p2u1t3", paper: 2, unit: "Introducing Indian Society", name: "Structural-functional approach — Srinivas", estHours: 3, yield: 3 },
  { id: "p2u1t4", paper: 2, unit: "Introducing Indian Society", name: "Marxist / dialectical approach — Desai", estHours: 3, yield: 1 },
  { id: "p2u1t5", paper: 2, unit: "Introducing Indian Society", name: "Dalit approach — Ambedkar", estHours: 4, yield: 2 },

  // Unit 2 — Major Social Groups
  { id: "p2u2t1", paper: 2, unit: "Major Social Groups", name: "Religious groups in India", estHours: 3, yield: 1 },
  { id: "p2u2t2", paper: 2, unit: "Major Social Groups", name: "Linguistic and regional groups", estHours: 3, yield: 2 },
  { id: "p2u2t3", paper: 2, unit: "Major Social Groups", name: "Castes and tribes", estHours: 5, yield: 3 },

  // Unit 3 — Major Institutions
  { id: "p2u3t1", paper: 2, unit: "Major Institutions", name: "Marriage in India — types and changes", estHours: 4, yield: 3 },
  { id: "p2u3t2", paper: 2, unit: "Major Institutions", name: "Family and kinship patterns and changes", estHours: 4, yield: 1 },
  { id: "p2u3t3", paper: 2, unit: "Major Institutions", name: "Gender socialisation and division of labour", estHours: 4, yield: 2 },
  { id: "p2u3t4", paper: 2, unit: "Major Institutions", name: "Decision-making, centres of power and political participation", estHours: 3, yield: 1 },
  { id: "p2u3t5", paper: 2, unit: "Major Institutions", name: "Religion and society in India", estHours: 3, yield: 1 },
  { id: "p2u3t6", paper: 2, unit: "Major Institutions", name: "Education — inequality, social change, contemporary trends", estHours: 4, yield: 2 },

  // Unit 4 — Social Inequality
  { id: "p2u4t1", paper: 2, unit: "Social Inequality", name: "Nature and types of inequality", estHours: 3, yield: 1 },
  { id: "p2u4t2", paper: 2, unit: "Social Inequality", name: "Traditional concepts of hierarchy — caste and class", estHours: 5, yield: 3 },
  { id: "p2u4t3", paper: 2, unit: "Social Inequality", name: "The Backward Classes", estHours: 4, yield: 3 },
  { id: "p2u4t4", paper: 2, unit: "Social Inequality", name: "Equality and social justice in relation to traditional hierarchies", estHours: 3, yield: 1 },
  { id: "p2u4t5", paper: 2, unit: "Social Inequality", name: "Changing patterns of stratification — education and occupation", estHours: 3, yield: 1 },

  // Unit 5 — Social Change in Modern India
  { id: "p2u5t1", paper: 2, unit: "Social Change in Modern India", name: "Westernisation, Sanskritisation and secularisation", estHours: 5, yield: 3 },
  { id: "p2u5t2", paper: 2, unit: "Social Change in Modern India", name: "Directed and undirected change", estHours: 3, yield: 1 },
  { id: "p2u5t3", paper: 2, unit: "Social Change in Modern India", name: "Legislative and executive measures and social reforms", estHours: 3, yield: 2 },
  { id: "p2u5t4", paper: 2, unit: "Social Change in Modern India", name: "Social movements", estHours: 4, yield: 1 },
  { id: "p2u5t5", paper: 2, unit: "Social Change in Modern India", name: "Industrialisation and urbanisation", estHours: 4, yield: 3 },
  { id: "p2u5t6", paper: 2, unit: "Social Change in Modern India", name: "Associations and pressure groups", estHours: 3, yield: 1 },

  // Unit 6 — Women and Children
  { id: "p2u6t1", paper: 2, unit: "Women and Children", name: "Demographic profile of women", estHours: 2, yield: 1 },
  { id: "p2u6t2", paper: 2, unit: "Women and Children", name: "Dowry, atrocities and discrimination against women", estHours: 4, yield: 3 },
  { id: "p2u6t3", paper: 2, unit: "Women and Children", name: "Existing programmes for women and their impact", estHours: 3, yield: 2 },
  { id: "p2u6t4", paper: 2, unit: "Women and Children", name: "Situational analysis of children and child welfare programmes", estHours: 3, yield: 2 },

  // Unit 7 — Globalisation and Ecology
  { id: "p2u7t1", paper: 2, unit: "Globalisation and Ecology", name: "Globalisation and ecological crisis in India", estHours: 3, yield: 3 },
  { id: "p2u7t2", paper: 2, unit: "Globalisation and Ecology", name: "Ecological and environmental movements in India", estHours: 3, yield: 3 },

  // Unit 8 — Social Problems in India
  { id: "p2u8t1", paper: 2, unit: "Social Problems", name: "Poverty in rural and urban areas", estHours: 4, yield: 1 },
  { id: "p2u8t2", paper: 2, unit: "Social Problems", name: "Child labour", estHours: 3, yield: 2 },
  { id: "p2u8t3", paper: 2, unit: "Social Problems", name: "Problem of youth", estHours: 2, yield: 3 },
  { id: "p2u8t4", paper: 2, unit: "Social Problems", name: "Drug addiction", estHours: 2, yield: 3 },
  { id: "p2u8t5", paper: 2, unit: "Social Problems", name: "Juvenile delinquency", estHours: 2, yield: 1 },
  { id: "p2u8t6", paper: 2, unit: "Social Problems", name: "Problems relating to old age", estHours: 2, yield: 2 },
  { id: "p2u8t7", paper: 2, unit: "Social Problems", name: "Population problem", estHours: 3, yield: 1 },
  { id: "p2u8t8", paper: 2, unit: "Social Problems", name: "Mass illiteracy", estHours: 2, yield: 1 },
  { id: "p2u8t9", paper: 2, unit: "Social Problems", name: "Problem of violence", estHours: 2, yield: 1 },
];

export const TOPICS: Topic[] = RAW.map((t) => ({
  ...t,
  pyq: PYQS.filter((q) => q.topicIds.includes(t.id)).length,
}));

export const TOTAL_HOURS = TOPICS.reduce((s, t) => s + t.estHours, 0);
export const TOPIC_COUNT = TOPICS.length;
