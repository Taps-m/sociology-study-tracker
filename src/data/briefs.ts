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

  {
    key: "1|Pathfinders",
    headline: "Order → Conflict → Meaning → Function",
    flow: [
      { tint: 1, title: "Marx", summary: "Society is driven by who owns what.",
        items: ["Historical materialism", "Mode of production", "Class struggle", "Alienation"] },
      { tint: 0, title: "Durkheim", summary: "Society is a reality above the individual.",
        items: ["Social facts", "Mechanical and organic solidarity", "Suicide as a social fact", "Religion and the collective"] },
      { tint: 2, title: "Weber", summary: "Start from the meaning people give their action.",
        items: ["Social action and verstehen", "Ideal types", "Types of authority", "Protestant ethic"] },
      { tint: 3, title: "Parsons and Merton", summary: "How does a system hold together, and when does it not?",
        items: ["Social system and its four problems", "Pattern variables", "Latent and manifest function", "Anomie and deviance"] },
    ],
    conclusion: { title: "Four answers to one question", caption: "What holds society together, and what pulls it apart?" },
    takeaways: [
      "Marx explains order by conflict: the arrangement suits whoever owns the means of production.",
      "Durkheim treats society as a reality of its own, studied through social facts external to the individual.",
      "Weber insists explanation must start from the meaning actors attach to their own conduct.",
      "Parsons asks what a system must solve to persist; Merton asks what happens when it does not.",
      "WBCS returns to these six more than to anything else — this unit is the spine of Paper I.",
    ],
    thinker: { name: "Max Weber", life: "1864–1920",
      points: ["Social action and interpretive understanding", "Ideal types as mental constructs, not descriptions", "Traditional, charismatic and legal-rational authority", "The Protestant Ethic and the Spirit of Capitalism"] },
  },
  {
    key: "1|Social System",
    headline: "Person → Role → Group → System",
    flow: [
      { tint: 0, title: "The person", summary: "Nobody arrives social; they are made so.",
        items: ["Personality", "Socialization", "Anticipatory socialization"] },
      { tint: 1, title: "Position", summary: "Society hands out places and expectations.",
        items: ["Status and role", "Role conflict", "Conformity and deviance"] },
      { tint: 2, title: "Groups", summary: "Where roles are actually lived out.",
        items: ["Primary and secondary groups", "Reference groups", "Types of human groups"] },
      { tint: 3, title: "The whole", summary: "Culture, control and equilibrium hold it together.",
        items: ["Culture and social control", "Forms of interaction", "Everyday life"] },
    ],
    conclusion: { title: "The social system", caption: "Individuals become society through roles, groups and shared culture" },
    takeaways: [
      "Socialization is the process by which a biological being becomes a social one.",
      "Status is the position; role is the behaviour expected of it. The two are constantly renegotiated.",
      "Primary groups form personality; secondary groups organise modern life.",
      "Social control operates far more through internalised norms than through sanction.",
      "Conformity and deviance are two outcomes of the same system, not opposites.",
    ],
  },
  {
    key: "1|Stratification",
    headline: "Difference → Hierarchy → Mobility",
    flow: [
      { tint: 0, title: "The concepts", summary: "Not all difference is inequality.",
        items: ["Equality and inequality", "Hierarchy", "Exclusion", "Poverty and deprivation"] },
      { tint: 1, title: "The systems", summary: "Inequality gets organised and made to look natural.",
        items: ["Caste", "Class", "Status groups"] },
      { tint: 2, title: "Movement", summary: "Can people move, and what does it cost?",
        items: ["Open and closed systems", "Types of mobility", "Sources of mobility"] },
      { tint: 3, title: "Consequences", summary: "What mobility does to those who move.",
        items: ["Education as a channel", "Consequences of mobility"] },
    ],
    conclusion: { title: "Stratification", caption: "Inequality that has been organised, justified and inherited" },
    takeaways: [
      "Stratification is inequality made systematic, durable and transmitted across generations.",
      "Marx stratifies by ownership; Weber adds status and party alongside class.",
      "Open systems permit mobility; closed ones like caste ascribe position at birth.",
      "Education is the mobility channel most often claimed and least often delivered.",
      "Exclusion is a distinct idea from poverty: it is about being kept out, not only going without.",
    ],
  },
  {
    key: "1|Economy and Society",
    headline: "Production → Organisation → Work → Labour",
    flow: [
      { tint: 1, title: "The economic act", summary: "Production is social before it is economic.",
        items: ["Production and distribution", "Exchange and consumption"] },
      { tint: 0, title: "Types of society", summary: "Each form of society organises work differently.",
        items: ["Slave society", "Feudal society", "Industrial and capitalist", "Post-industrial"] },
      { tint: 2, title: "Inside the workplace", summary: "The rules on paper and the ones that actually operate.",
        items: ["Formal organisation", "Informal organisation", "Bureaucracy at work"] },
      { tint: 3, title: "Labour", summary: "What work does to the people who do it.",
        items: ["Labour and society", "Alienation", "Informalisation"] },
    ],
    conclusion: { title: "Economy and society", caption: "How a society produces shapes how it is organised" },
    takeaways: [
      "The economy is a social institution, not a mechanism standing outside society.",
      "Each societal type — slave, feudal, industrial, post-industrial — has its own organisation of work.",
      "Formal structure never fully describes a workplace; informal organisation does much of the work.",
      "Post-industrial society shifts the centre of gravity from manufacture to service and knowledge.",
      "Work from home and the gig economy are live examples of formal and informal being renegotiated.",
    ],
  },
  {
    key: "1|Politics and Society",
    headline: "Power → Authority → State → Protest",
    flow: [
      { tint: 0, title: "Power", summary: "The capacity to act despite resistance.",
        items: ["Power and authority", "Legitimacy", "Power elite"] },
      { tint: 1, title: "Machinery", summary: "Who actually governs between elections.",
        items: ["Bureaucracy", "Pressure groups", "Political parties"] },
      { tint: 2, title: "The modern state", summary: "Membership, rights and the space between citizen and state.",
        items: ["Nation-state", "Citizenship", "Democracy", "Civil society", "Ideology"] },
      { tint: 3, title: "Against it", summary: "How the governed push back.",
        items: ["Protest and agitation", "Social movements", "Collective action", "Revolution"] },
    ],
    conclusion: { title: "Politics and society", caption: "Power becomes authority when those subject to it accept it" },
    takeaways: [
      "Power compels; authority is power that those subject to it regard as legitimate.",
      "Weber's three types of authority — traditional, charismatic, legal-rational — organise this whole unit.",
      "Pressure groups seek to influence power; parties seek to hold it.",
      "Civil society is the associational space between family and state, and the ground movements grow from.",
      "Social movements are collective, sustained and aimed at change — not merely crowds.",
    ],
  },
  {
    key: "1|Religion and Society",
    headline: "Magic → Religion → Science → Secularization",
    flow: [
      { tint: 0, title: "Ways of explaining", summary: "Three answers to what cannot be controlled.",
        items: ["Magic", "Religion", "Science", "Morality"] },
      { tint: 1, title: "What religion does", summary: "It binds, and it divides.",
        items: ["Solidarity and the collective", "Social conflict", "Legitimating the order"] },
      { tint: 2, title: "Under modernity", summary: "Retreat, and return in new forms.",
        items: ["Secularization", "Religious revivalism", "Fundamentalism", "Pluralism"] },
      { tint: 3, title: "New forms", summary: "Belief reorganising rather than disappearing.",
        items: ["Sects and cults", "Religion in public life"] },
    ],
    conclusion: { title: "Religion and society", caption: "Not disappearing under modernity, but changing shape" },
    takeaways: [
      "Durkheim treats religion as society worshipping itself: the sacred is the collective made visible.",
      "Magic seeks to compel outcomes; religion appeals to them; science explains them.",
      "Secularization is contested — institutional decline coexists with persistent private belief.",
      "Revivalism and fundamentalism are modern phenomena, not survivals from the past.",
      "This unit feeds Group B heavily, so it is worth more than its size suggests.",
    ],
  },
  {
    key: "1|Science and Technology",
    headline: "Ethos → Responsibility → Consequence → Change",
    flow: [
      { tint: 1, title: "The ethos", summary: "Science as a social institution with its own norms.",
        items: ["Ethos of science", "Scientific temper"] },
      { tint: 0, title: "Control", summary: "Who decides what is researched, and for whom.",
        items: ["Social responsibility of science", "Social control of science"] },
      { tint: 2, title: "Consequences", summary: "Effects nobody chose.",
        items: ["Social consequences of science", "Unintended effects"] },
      { tint: 3, title: "Change", summary: "Technology as a driver of social change.",
        items: ["Technology and social change", "ICT and rural society", "Digital divide"] },
    ],
    conclusion: { title: "Science and technology", caption: "A social institution, shaped by society as much as shaping it" },
    takeaways: [
      "Merton's ethos of science — universalism, communism, disinterestedness, organised scepticism.",
      "Scientific temper is a disposition in a population, not an achievement of laboratories.",
      "Technology does not determine social change on its own; it is adopted through existing structures.",
      "The digital divide reproduces existing inequality rather than dissolving it.",
      "Another unit that supplies Group B far more than Group A.",
    ],
  },
  {
    key: "1|Research Methods",
    headline: "Question → Design → Technique → Evidence",
    flow: [
      { tint: 0, title: "Why research", summary: "Sociology's claim to be more than opinion.",
        items: ["Importance of social research", "Objectivity", "Reliability and validity"] },
      { tint: 1, title: "Survey", summary: "Breadth: many people, few questions.",
        items: ["Questionnaires", "Interviews", "Sampling"] },
      { tint: 2, title: "Field", summary: "Depth: few people, long acquaintance.",
        items: ["Participant observation", "Non-participant observation", "Case study"] },
      { tint: 3, title: "Experiment", summary: "Control, and why society resists it.",
        items: ["Experimentation in sociology", "Limits of control"] },
    ],
    conclusion: { title: "Methods of enquiry", caption: "The method must fit the question, not the researcher's habit" },
    takeaways: [
      "Survey buys breadth and loses depth; field method does the reverse. Neither is superior in the abstract.",
      "Participant observation risks going native; non-participant risks missing meaning.",
      "Reliability is repeatability; validity is measuring what you claim to measure. They are not the same.",
      "Experiment is rare in sociology because the variables cannot ethically or practically be held still.",
      "Methods supply seven Group B questions in six years — the single most examined unit in that section.",
    ],
  },
  {
    key: "1|Social and Cultural Change",
    headline: "Development → Agents → Education → Culture",
    flow: [
      { tint: 1, title: "Development", summary: "Who develops, and at whose expense.",
        items: ["Development and dependency", "Models of development", "Underdevelopment"] },
      { tint: 0, title: "Agents", summary: "What actually moves a society.",
        items: ["Agents of social change", "Education", "Science and technology"] },
      { tint: 2, title: "Education", summary: "Reproducing inequality or dissolving it.",
        items: ["Education and social change", "Education and equality"] },
      { tint: 3, title: "Culture", summary: "Whose culture becomes everyone's.",
        items: ["Dominant culture", "Celebrity culture"] },
    ],
    conclusion: { title: "Social and cultural change", caption: "Change is directed by interests, not by time alone" },
    takeaways: [
      "Dependency theory argues underdevelopment is produced by the same process that develops others.",
      "Education is claimed as the great leveller and often functions as the great reproducer.",
      "Dominant culture is the culture of the dominant group presented as culture in general.",
      "Celebrity culture is a distinct modern form: visibility itself becomes the source of status.",
      "Change has agents and interests behind it; treating it as automatic is the commonest weak answer.",
    ],
  },
  {
    key: "2|Introducing Indian Society",
    headline: "Diversity → Unity → Tradition → Modernity",
    flow: [
      { tint: 0, title: "The diversity", summary: "Language, religion, region, caste, tribe.",
        items: ["Linguistic diversity", "Religious diversity", "Regional variation"] },
      { tint: 1, title: "The unity", summary: "What holds it together despite all that.",
        items: ["Cultural continuities", "Constitutional framework", "Shared civilisational themes"] },
      { tint: 2, title: "Approaches", summary: "Four ways of looking at the same society.",
        items: ["Indological — Ghurye", "Structural-functional — Srinivas", "Marxist — Desai", "Dalit — Ambedkar"] },
      { tint: 3, title: "The tension", summary: "Tradition and modernity are not a sequence.",
        items: ["Modernity and tradition", "Contestation", "Book-view and field-view"] },
    ],
    conclusion: { title: "Society and culture in India", caption: "Unity in diversity, permanently contested rather than settled" },
    takeaways: [
      "The four approaches disagree about method, not only conclusions — that is what makes them comparable.",
      "Ghurye reads India through texts; Srinivas through fieldwork. Book-view against field-view.",
      "Desai reads Indian society through class and colonial capitalism; Ambedkar through caste and its annihilation.",
      "Tradition and modernity coexist and interpenetrate; they are not stages one after the other.",
      "Unity and diversity is the most examined theme in Paper II — five appearances in six years.",
    ],
    thinker: { name: "M. N. Srinivas", life: "1916–1999",
      points: ["Structural-functional approach through village studies", "Sanskritisation, Westernisation, secularisation", "Dominant caste", "Field-view against the Indologist's book-view"] },
  },
  {
    key: "2|Major Social Groups",
    headline: "Religion → Language → Caste → Tribe",
    flow: [
      { tint: 0, title: "Religious groups", summary: "Majority, minority, and the politics between.",
        items: ["Religious communities", "Minorities and safeguards", "Communalism"] },
      { tint: 1, title: "Linguistic and regional", summary: "Language as identity and as claim.",
        items: ["Linguistic reorganisation", "Regionalism", "Integration"] },
      { tint: 2, title: "Caste", summary: "Hierarchy that persists by changing.",
        items: ["Varna and jati", "Attributional and interactional approaches", "Changing nature of caste"] },
      { tint: 3, title: "Tribe", summary: "A category that resists definition.",
        items: ["Defining a tribe", "Isolation, assimilation, integration", "Tribal development"] },
    ],
    conclusion: { title: "Major social groups", caption: "Identities that organise Indian society and its politics" },
    takeaways: [
      "Caste is best understood as changing form rather than declining — from ritual hierarchy to political bloc.",
      "The attributional approach defines caste by ritual attributes, the interactional by relations between castes.",
      "The Ghurye–Elwin debate frames tribal policy: assimilation against protected isolation, with integration as settlement.",
      "Defining a tribe has never been settled; the administrative category and the sociological one differ.",
      "Linguistic reorganisation of states channelled regionalism rather than creating it.",
    ],
  },
  {
    key: "2|Major Institutions",
    headline: "Marriage → Family → Kinship → Education",
    flow: [
      { tint: 1, title: "Marriage", summary: "Rules about who may marry whom, and why.",
        items: ["Forms of marriage", "Changing patterns", "Live-in relationships", "Marital conflict"] },
      { tint: 0, title: "Family", summary: "Structure under industrialisation and urbanisation.",
        items: ["Joint and nuclear", "Changing functions", "Family bonds"] },
      { tint: 2, title: "Kinship", summary: "The wider web that marriage and descent create.",
        items: ["Kinship systems in India", "North-South contrasts", "Descent and residence"] },
      { tint: 3, title: "Other institutions", summary: "Gender, religion and education as institutions.",
        items: ["Gender socialization", "Religion and society", "Education and inequality"] },
    ],
    conclusion: { title: "Major institutions", caption: "The structures that reproduce society one generation at a time" },
    takeaways: [
      "Industrialisation and urbanisation change the family's functions before they change its form.",
      "The nuclear family is often a residential arrangement inside a functioning joint kinship network.",
      "Kinship in India divides broadly along a north–south contrast in descent, marriage and terminology.",
      "Gender socialization is where inequality is transmitted before any institution enforces it.",
      "Marriage, family and kinship supply four questions in six years — reliable Group A ground.",
    ],
  },
  {
    key: "2|Social Inequality",
    headline: "Hierarchy → Caste and class → Backward classes → Justice",
    flow: [
      { tint: 0, title: "Traditional hierarchy", summary: "Inequality justified by ritual rank.",
        items: ["Nature and types", "Purity and pollution", "Untouchability"] },
      { tint: 1, title: "Caste and class", summary: "Two systems now working on each other.",
        items: ["Caste–class intersection", "Changing patterns of stratification", "New middle class"] },
      { tint: 2, title: "The Backward Classes", summary: "The category and the safeguards built on it.",
        items: ["OBCs and SEBCs", "Constitutional safeguards", "Reservation"] },
      { tint: 3, title: "Justice", summary: "Equality claimed against inherited hierarchy.",
        items: ["Equality and social justice", "Education and occupation"] },
    ],
    conclusion: { title: "Social inequality", caption: "Hierarchy inherited, contested, and partly redrawn by the state" },
    takeaways: [
      "Caste and class now intersect: caste shapes access to class positions rather than replacing them.",
      "Untouchability persists in altered and often deniable forms, which is what makes it hard to legislate away.",
      "The Backward Classes are an administrative category with sociological consequences of its own.",
      "Social justice in India is redistributive by design, not merely a promise of equal treatment.",
      "Hierarchy and exclusion are examined together — treat them as a pair, not two topics.",
    ],
    thinker: { name: "B. R. Ambedkar", life: "1891–1956",
      points: ["Caste as graded inequality, not merely division of labour", "Annihilation of Caste", "Constitutional safeguards and social justice", "Educate, agitate, organise"] },
  },
  {
    key: "2|Social Change in Modern India",
    headline: "Sanskritisation → Westernisation → Secularisation → Industrialisation",
    flow: [
      { tint: 0, title: "Endogenous change", summary: "Mobility within the system's own terms.",
        items: ["Sanskritisation", "Dominant caste", "Positional not structural change"] },
      { tint: 1, title: "Exogenous change", summary: "Change arriving from outside.",
        items: ["Westernisation", "Modernisation", "Secularisation"] },
      { tint: 2, title: "Directed change", summary: "The state as an agent of change.",
        items: ["Legislative measures", "Executive measures", "Social reforms"] },
      { tint: 3, title: "Structural change", summary: "Change in the arrangement itself.",
        items: ["Industrialisation", "Urbanisation", "Movements and pressure groups"] },
    ],
    conclusion: { title: "Social change in modern India", caption: "Change from within, from outside, and by design" },
    takeaways: [
      "Sanskritisation is positional change: a group rises without the hierarchy itself altering.",
      "Westernisation is Srinivas's term for change through contact with British rule and its institutions.",
      "Secularisation in India means the changing place of religion in public life, not its disappearance.",
      "Directed change is deliberate and legislated; undirected change follows from industry and the market.",
      "Industrialisation and urbanisation are examined together and answer best as one process.",
    ],
  },
  {
    key: "2|Women and Children",
    headline: "Position → Problems → Programmes → Impact",
    flow: [
      { tint: 0, title: "The position", summary: "What the numbers show.",
        items: ["Demographic profile", "Sex ratio", "Work participation"] },
      { tint: 1, title: "The problems", summary: "Violence, discrimination and their forms.",
        items: ["Dowry", "Atrocities and violence", "Discrimination"] },
      { tint: 2, title: "Children", summary: "A separate situation, not a subset.",
        items: ["Situational analysis", "Child labour", "Child welfare"] },
      { tint: 3, title: "The response", summary: "Law, scheme and what they achieve.",
        items: ["Programmes for women", "Constitutional provisions", "Impact and gaps"] },
    ],
    conclusion: { title: "Women and children", caption: "Legal equality secured long before social equality" },
    takeaways: [
      "The declining child sex ratio is the sharpest single indicator of son preference.",
      "Legal provision and social practice diverge widely; an answer that stops at the law scores poorly.",
      "Empowerment has economic and substantive dimensions, and the first does not guarantee the second.",
      "Child labour is bound to poverty and schooling, and cannot be legislated away in isolation.",
      "Four questions in six years, and consistently in Group B.",
    ],
  },
  {
    key: "2|Globalisation and Ecology",
    headline: "Development → Displacement → Movement → Sustainability",
    flow: [
      { tint: 1, title: "Globalisation", summary: "Flows of capital, goods, people and culture.",
        items: ["Economic integration", "Cultural flows", "Effects on mobility"] },
      { tint: 2, title: "Ecological cost", summary: "Who pays for growth.",
        items: ["Environmental degradation", "Displacement", "Forests and livelihood"] },
      { tint: 0, title: "Resistance", summary: "Movements formed around that cost.",
        items: ["Chipko", "Narmada Bachao Andolan", "New social movements"] },
      { tint: 3, title: "Settlement", summary: "Attempting both at once.",
        items: ["Sustainable development", "State and people", "Environmental policy"] },
    ],
    conclusion: { title: "Globalisation and ecological crisis", caption: "Growth and its cost, and who is made to bear it" },
    takeaways: [
      "Indian environmental movements are livelihood movements first and conservation movements second.",
      "Chipko and Narmada are the two examples every answer in this unit should be able to use.",
      "Displacement by development falls hardest on tribal populations, which links this unit to Major Social Groups.",
      "Sustainable development is a claim about intergenerational justice, not only about resources.",
      "Environmental movements appear five times in six years — the joint most-examined topic in Paper II.",
    ],
  },
  {
    key: "2|Social Problems",
    headline: "Poverty → Youth → Age → Violence",
    flow: [
      { tint: 0, title: "Deprivation", summary: "Want, and being shut out.",
        items: ["Rural and urban poverty", "Slums", "Mass illiteracy"] },
      { tint: 1, title: "The young", summary: "Problems concentrated in one age band.",
        items: ["Problems of youth", "Drug addiction", "Juvenile delinquency", "Child labour"] },
      { tint: 2, title: "The old", summary: "A problem produced by demographic success.",
        items: ["Ageing", "Old age and care", "Policy response"] },
      { tint: 3, title: "Population and violence", summary: "Pressure, and its expression.",
        items: ["Population problem", "Violence", "Violence against women"] },
    ],
    conclusion: { title: "Social problems in India", caption: "Conditions a society recognises as problems and organises to address" },
    takeaways: [
      "A social problem is a condition a society defines as one — the definition is itself sociological.",
      "Drug addiction and delinquency answer best through anomie and differential association, not moral language.",
      "Ageing is a new problem in India, produced by falling mortality and changing family structure.",
      "Poverty is examined as rural and urban with different mechanisms, not as one condition.",
      "This unit supplies six Group B questions in six years — second only to Methods.",
    ],
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
