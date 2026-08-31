/**
 * WBCS Main, Sociology optional — every question from 2018 to 2023.
 *
 * Transcribed from the papers themselves, then mapped onto the syllabus topics
 * in `syllabus.ts`. The per-topic `pyq` counts there are the summary; this is
 * the evidence behind them, and the only place the questions themselves live.
 *
 * `topicIds` is a judgement: which syllabus topic a question actually tests.
 * Some legitimately test two. A few test none, and carry an empty array with a
 * note rather than being forced into a topic they do not belong to.
 *
 * Group A supplies five questions of which three are answered; Group B supplies
 * three of which two are answered. That distinction is what makes the blind-spot
 * report possible, so it is recorded on every question.
 */

export interface PastQuestion {
  year: number;
  paper: 1 | 2;
  group: "A" | "B";
  number: number;
  marks: number;
  text: string;
  topicIds: string[];
  /** Set where the source was truncated or the question fits no topic. */
  note?: string;
}

export const PYQS: PastQuestion[] = [
  {
    year: 2023, paper: 1, group: "A", number: 1, marks: 40,
    text: "From the viewpoint of growing importance of multidisciplinary, how do you relate sociology to other social sciences especially when the scope of Sociology been changing in the context of globalisation?",
    topicIds: ["p1u1t3"],
  },
  {
    year: 2023, paper: 1, group: "A", number: 2, marks: 40,
    text: "Elucidate the relevance of Parsonian Social systems in present society.",
    topicIds: ["p1u2t5"],
  },
  {
    year: 2023, paper: 1, group: "A", number: 3, marks: 40,
    text: "'Ideal Types' of bureaucracy proposed by Max Weber are 'mental constructs'; they do not correspond to the reality. Give your views.",
    topicIds: ["p1u2t3"],
  },
  {
    year: 2023, paper: 1, group: "A", number: 4, marks: 40,
    text: "\\\"The sociological imagination enables us to grasp history and biography and the relationship between the two in a society.\\\" — C.W. Mills. Explain with your life-based examples.",
    topicIds: ["p1u1t3"],
    note: "Mills is not named in the syllabus; the question is answerable from scope and the sociological perspective.",
  },
  {
    year: 2023, paper: 1, group: "A", number: 5, marks: 40,
    text: "Explain how post-industrial society is distinctly different from the previous societal forms i.e. from nomadic to industrial societies. Also, draw reference in distinguishing between post-industrial society with that of classical societies as conceptualized by Durkheim, Marx and Weber.",
    topicIds: ["p1u5t1"],
  },
  {
    year: 2023, paper: 1, group: "B", number: 6, marks: 40,
    text: "[first line missing in source] … uses over survey and field research methods.",
    topicIds: ["p1u9t4", "p1u9t2", "p1u9t3"],
    note: "Truncated at a page break in the source PDF. The surviving line points at experimentation compared with survey and field methods.",
  },
  {
    year: 2023, paper: 1, group: "B", number: 7, marks: 40,
    text: "Examine with appropriate examples how Durkheim and Merton explicate anomie.",
    topicIds: ["p1u2t2", "p1u2t6"],
  },
  {
    year: 2023, paper: 1, group: "B", number: 8, marks: 40,
    text: "How has the idea of 'Work from Home' forced us to redefine the formal and informal organization of work?",
    topicIds: ["p1u5t2"],
  },
  {
    year: 2023, paper: 2, group: "A", number: 1, marks: 40,
    text: "Examine the dialectical relation between tradition and modernity in the study of social change with reference to Indian society.",
    topicIds: ["p2u1t1"],
  },
  {
    year: 2023, paper: 2, group: "A", number: 2, marks: 40,
    text: "Explicate G.S. Ghurye's Indological approaches towards study of Indian society. Critically examine the relevance of his approach in contemporary Indian society.",
    topicIds: ["p2u1t2"],
  },
  {
    year: 2023, paper: 2, group: "A", number: 3, marks: 40,
    text: "How are Hierarchy and Exclusion the major impediments in the transformation of Indian societies? Discuss.",
    topicIds: ["p2u4t1"],
  },
  {
    year: 2023, paper: 2, group: "A", number: 4, marks: 40,
    text: "In the light of judicial intervention on 'Live-in relationship', discuss the feature of marriage with special reference to India?",
    topicIds: ["p2u3t2"],
  },
  {
    year: 2023, paper: 2, group: "A", number: 5, marks: 40,
    text: "Discuss how 'environmentalism' can be explained with new social movements approach. Illustrate giving examples from India.",
    topicIds: ["p2u7t2", "p2u5t4"],
  },
  {
    year: 2023, paper: 2, group: "B", number: 6, marks: 40,
    text: "How is the increasing use of technology is changing the status of women in Indian society?",
    topicIds: ["p2u6t1"],
  },
  {
    year: 2023, paper: 2, group: "B", number: 7, marks: 40,
    text: "Examine how rise of old population is becoming a major problem in India. What kind of policy interventions would you propose to address their problems?",
    topicIds: ["p2u8t6"],
  },
  {
    year: 2023, paper: 2, group: "B", number: 8, marks: 40,
    text: "Do you think that the social media has brought significant changes in creating awareness about various social problems prevalent in Indian society? Argue your case.",
    topicIds: [],
    note: "No single syllabus leaf covers this. It is answerable from the social-problems unit generally plus Paper I's technology and social change.",
  },
  {
    year: 2022, paper: 1, group: "A", number: 1, marks: 40,
    text: "'The Sociological perspective often challenges common sense'. Discuss the nature and scope of sociology in the light of a review of the preceding statement.",
    topicIds: ["p1u1t4", "p1u1t3"],
  },
  {
    year: 2022, paper: 1, group: "A", number: 2, marks: 40,
    text: "(a) Illustrate what is meant by Emile Durkheim's concept of Social fact and mention the features of social fact. (b) Show how he relates forms of social solidarity with types of societies.",
    topicIds: ["p1u2t2"],
  },
  {
    year: 2022, paper: 1, group: "A", number: 3, marks: 40,
    text: "(a) What is meant by Talcott Parsons by Social System and its functional prerequisites? (b) Mention the pattern variables noted by him. (c) How far do his ideas explain social reality across the globe?",
    topicIds: ["p1u2t5"],
  },
  {
    year: 2022, paper: 1, group: "A", number: 4, marks: 40,
    text: "(a) Show the relationship of personality and socialization. (b) Critically examine the impact of (i) Anticipatory socialization and (ii) Oversocialization as suggested by Dennis Wrong's 'Over-socialized conception of man' on personality.",
    topicIds: ["p1u3t6"],
  },
  {
    year: 2022, paper: 1, group: "A", number: 5, marks: 40,
    text: "Write short notes on: (a) Karl Marx's idea of class struggle. (b) The relative importance of primary groups and secondary groups in life in modern societies.",
    topicIds: ["p1u2t1", "p1u3t5"],
  },
  {
    year: 2022, paper: 1, group: "B", number: 6, marks: 40,
    text: "(a) Briefly delineate the features of survey method highlighting the importance of random sampling in it. (b) What are its advantages and points of weakness?",
    topicIds: ["p1u9t2"],
  },
  {
    year: 2022, paper: 1, group: "B", number: 7, marks: 40,
    text: "How far does education help social mobility of the currently less privileged people and ensure their equality with those who are more favourable placed in society?",
    topicIds: ["p1u4t2", "p1u10t3"],
  },
  {
    year: 2022, paper: 1, group: "B", number: 8, marks: 40,
    text: "(a) Examine the place of religion in modern society. …",
    topicIds: ["p1u7t1"],
    note: "Truncated at a page break in the source PDF; part (b) not recovered.",
  },
  {
    year: 2022, paper: 2, group: "A", number: 1, marks: 40,
    text: "(a) Explain the nature of unity and diversity in the Indian society and culture. (b) Examine whether and how far the proposed Uniform Civil Code would farther or hinder the harmonisation of the two.",
    topicIds: ["p2u1t1"],
  },
  {
    year: 2022, paper: 2, group: "A", number: 2, marks: 40,
    text: "Discuss briefly the major points of contribution of A.R. Desai to the understanding of Indian Society and culture.",
    topicIds: ["p2u1t4"],
  },
  {
    year: 2022, paper: 2, group: "A", number: 3, marks: 40,
    text: "Comment on the processes noted by M.N. Srinivas in bringing about social change in modern India.",
    topicIds: ["p2u1t3", "p2u5t1"],
  },
  {
    year: 2022, paper: 2, group: "A", number: 4, marks: 40,
    text: "(a) Discuss, in brief, the nature of kinship and marriage in India. (b) Show how important and effective they are in modern India.",
    topicIds: ["p2u3t2"],
  },
  {
    year: 2022, paper: 2, group: "A", number: 5, marks: 40,
    text: "Assess the prospect and problems of industrialisation of India with special reference to West Bengal.",
    topicIds: ["p2u5t5"],
  },
  {
    year: 2022, paper: 2, group: "B", number: 6, marks: 40,
    text: "(a) Show the connection between Ecology and Environment. (b) Analyse the nature of crisis to environment and ecology which is faced in India and the world.",
    topicIds: ["p2u7t2"],
  },
  {
    year: 2022, paper: 2, group: "B", number: 7, marks: 40,
    text: "(a) Explain how empowerment of women is connected with their status in society. (b) Attempt a brief review of the existing programmes initiated by the state of West Bengal in this realm.",
    topicIds: ["p2u6t3"],
  },
  {
    year: 2022, paper: 2, group: "B", number: 8, marks: 40,
    text: "Write short notes on: (a) B.R. Ambedkar and the Dalits. (b) Measures adopted and to be adopted in relation to persons above 60 years of age in the society and policy in view of their increasing number in the population of India.",
    topicIds: ["p2u1t5", "p2u8t6"],
  },
  {
    year: 2021, paper: 1, group: "A", number: 1, marks: 40,
    text: "What is meant by 'Sociology as the study of human relationships'? Examine the nature of human relationships in the light of micro and macro levels of understanding with suitable examples.",
    topicIds: ["p1u1t3"],
  },
  {
    year: 2021, paper: 1, group: "A", number: 2, marks: 40,
    text: "Examine after Max Weber the concept of Bureaucracy as a form of rational authority. What are its functions and dysfunctions?",
    topicIds: ["p1u2t3"],
  },
  {
    year: 2021, paper: 1, group: "A", number: 3, marks: 40,
    text: "'Social Stratification is an universal phenomenon'. — Discuss. Do you think that the caste system is still a basic problem of Indian Society? Justify your answer with examples.",
    topicIds: ["p1u4t1"],
  },
  {
    year: 2021, paper: 1, group: "A", number: 4, marks: 40,
    text: "What did R.K. Merton mean by 'Conformity' and 'Deviance'? Explain with illustration his five modes of adaptation which people adopt due to social pressure.",
    topicIds: ["p1u2t6"],
  },
  {
    year: 2021, paper: 1, group: "A", number: 5, marks: 40,
    text: "'Humans are embedded in social organisation'. — Discuss.",
    topicIds: ["p1u3t1"],
  },
  {
    year: 2021, paper: 1, group: "B", number: 6, marks: 40,
    text: "Point out the differences between participant and non-participant observation. Explain the advantages and limitations of observation as a form of data collection.",
    topicIds: ["p1u9t3"],
  },
  {
    year: 2021, paper: 1, group: "B", number: 7, marks: 40,
    text: "Discuss the social functions of religion. What are the differences between religion and magic?",
    topicIds: ["p1u3t8", "p1u7t1"],
  },
  {
    year: 2021, paper: 1, group: "B", number: 8, marks: 40,
    text: "What is meant by Information and Communication Technologies (ICT)? Discuss its impact on rural society.",
    topicIds: ["p1u8t3"],
  },
  {
    year: 2021, paper: 2, group: "A", number: 1, marks: 40,
    text: "Narrate the distinctive features of unity as well as diversity in the perspective of Indian society and culture.",
    topicIds: ["p2u1t1"],
  },
  {
    year: 2021, paper: 2, group: "A", number: 2, marks: 40,
    text: "Discuss, in brief, any two environmental movements in India.",
    topicIds: ["p2u7t2"],
  },
  {
    year: 2021, paper: 2, group: "A", number: 3, marks: 40,
    text: "Discuss the process on integration of various linguistic groups in the main stream of contemporary Indian society.",
    topicIds: ["p2u2t2"],
  },
  {
    year: 2021, paper: 2, group: "A", number: 4, marks: 40,
    text: "Distinguish between caste and tribe. Give a historical account of tribal welfare in India since independence.",
    topicIds: ["p2u2t3"],
  },
  {
    year: 2021, paper: 2, group: "A", number: 5, marks: 40,
    text: "What do you understand by gender socialization? 'Gender bias is visibly evident even in the 21st Century.' — Explain in the context of Indian society.",
    topicIds: ["p2u3t3"],
  },
  {
    year: 2021, paper: 2, group: "B", number: 6, marks: 40,
    text: "How do you conceptualize secularism? 'Contemporary Indian society is a secular society.' — Discuss.",
    topicIds: ["p2u5t1"],
  },
  {
    year: 2021, paper: 2, group: "B", number: 7, marks: 40,
    text: "Discuss the demographic, educational and occupational profiles of the youth in India today.",
    topicIds: ["p2u8t3"],
  },
  {
    year: 2021, paper: 2, group: "B", number: 8, marks: 40,
    text: "Is drug addiction a social problem? Explain.",
    topicIds: ["p2u8t4"],
  },
  {
    year: 2020, paper: 1, group: "A", number: 1, marks: 40,
    text: "(a) Give a brief idea of the scope of Sociology. (b) Examine the relation between common sense and sociology.",
    topicIds: ["p1u1t3", "p1u1t4"],
  },
  {
    year: 2020, paper: 1, group: "A", number: 2, marks: 40,
    text: "Briefly evaluate Max Weber's thesis in The Protestant Ethic and the Spirit of Capitalism.",
    topicIds: ["p1u2t3"],
  },
  {
    year: 2020, paper: 1, group: "A", number: 3, marks: 40,
    text: "Discuss the changing nature of definitions and functions of the family in modern societies.",
    topicIds: ["p1u3t5"],
    note: "Family is a Paper II institution; in Paper I it falls under types of human groups and their contemporary significance.",
  },
  {
    year: 2020, paper: 1, group: "A", number: 4, marks: 40,
    text: "Analyse the role of education in social change focussing especially on its relation with promotion or obstruction of equality in society.",
    topicIds: ["p1u10t3"],
  },
  {
    year: 2020, paper: 1, group: "A", number: 5, marks: 40,
    text: "Write short notes on: (a) Karl Marx's notion of alienation. (b) Georg Simmel's idea of subjective culture and objective culture.",
    topicIds: ["p1u2t1", "p1u2t4"],
  },
  {
    year: 2020, paper: 1, group: "B", number: 6, marks: 40,
    text: "Examine the utility and limitation of field study in grasping the social reality in modern times, highlight the chief techniques of field study.",
    topicIds: ["p1u9t3"],
  },
  {
    year: 2020, paper: 1, group: "B", number: 7, marks: 40,
    text: "Briefly outline the major models of development. How far does the capitalist mode of development eliminate or enhance dependency of the underdeveloped or developing nations?",
    topicIds: ["p1u10t1"],
  },
  {
    year: 2020, paper: 1, group: "B", number: 8, marks: 40,
    text: "Scientific temper is both a progenitor and a child of scientific and technological development. Discuss.",
    topicIds: ["p1u8t1"],
  },
  {
    year: 2020, paper: 2, group: "A", number: 1, marks: 40,
    text: "Examine tradition and modernity. Is tradition standing in the way of modernity of India? Give reasons in support of your answer.",
    topicIds: ["p2u1t1"],
  },
  {
    year: 2020, paper: 2, group: "A", number: 2, marks: 40,
    text: "Give a detailed analysis of the structural-functional approach of Srinivas for the study of Indian society. What are the defects in this method of analysis?",
    topicIds: ["p2u1t3"],
  },
  {
    year: 2020, paper: 2, group: "A", number: 3, marks: 40,
    text: "Discuss the impact of some of the existing programmes initiated by the Government of India for the development of women.",
    topicIds: ["p2u6t3"],
  },
  {
    year: 2020, paper: 2, group: "A", number: 4, marks: 40,
    text: "Write a note on the problems of child labour in some of the industries of India.",
    topicIds: ["p2u8t2"],
  },
  {
    year: 2020, paper: 2, group: "A", number: 5, marks: 40,
    text: "What function does education have in Indian society? Show whether education has been able to eradicate inequality in society.",
    topicIds: ["p2u3t6"],
  },
  {
    year: 2020, paper: 2, group: "B", number: 6, marks: 40,
    text: "What is meant by Social Reforms? Narrate, in brief, any social reform that has taken place in Indian society.",
    topicIds: ["p2u5t3"],
  },
  {
    year: 2020, paper: 2, group: "B", number: 7, marks: 40,
    text: "Who are the Other Backward Classes? State some of the Constitutional safeguards taken by the Government of India for the uplift of the Backward Classes.",
    topicIds: ["p2u4t3"],
  },
  {
    year: 2020, paper: 2, group: "B", number: 8, marks: 40,
    text: "Give an outline of the ecological and environmental movements in India.",
    topicIds: ["p2u7t2"],
  },
  {
    year: 2019, paper: 1, group: "A", number: 1, marks: 40,
    text: "Write a brief note on the scope of sociology. State the relationship between Sociology and Anthropology.",
    topicIds: ["p1u1t3"],
  },
  {
    year: 2019, paper: 1, group: "A", number: 2, marks: 40,
    text: "Define, following Weber, Ideal Types. Examine Weber's thesis on Protestant Ethic and the Spirit of Capitalism.",
    topicIds: ["p1u2t3"],
  },
  {
    year: 2019, paper: 1, group: "A", number: 3, marks: 40,
    text: "Discuss the social aspects of production and distribution.",
    topicIds: ["p1u3t9"],
  },
  {
    year: 2019, paper: 1, group: "A", number: 4, marks: 40,
    text: "Delineate, after Talcott Parsons, social system and its four major problems.",
    topicIds: ["p1u2t5"],
  },
  {
    year: 2019, paper: 1, group: "A", number: 5, marks: 40,
    text: "What do you understand by formal and informal organizations of work? Briefly state the problems of labour in the modern world.",
    topicIds: ["p1u5t2", "p1u5t3"],
  },
  {
    year: 2019, paper: 1, group: "B", number: 6, marks: 40,
    text: "Define social mobility. What are the different types of mobility? Distinguish, with examples, between open and closed systems of mobility.",
    topicIds: ["p1u4t2"],
  },
  {
    year: 2019, paper: 1, group: "B", number: 7, marks: 40,
    text: "Narrate the importance of participant observation with reference to a particular study.",
    topicIds: ["p1u9t3"],
  },
  {
    year: 2019, paper: 1, group: "B", number: 8, marks: 40,
    text: "(a) Show the interface of science, technology and social change. (b) Distinguish between dominant culture and celebrity culture.",
    topicIds: ["p1u8t4", "p1u10t5"],
  },
  {
    year: 2019, paper: 2, group: "A", number: 1, marks: 40,
    text: "(a) Examine the merits and limitations of the Approach made by M.N. Srinivas towards studying the Indian society. (b) Why did M.N. Srinivas find it important to adopt field view from the book-view in studying the society and culture of India?",
    topicIds: ["p2u1t3"],
  },
  {
    year: 2019, paper: 2, group: "A", number: 2, marks: 40,
    text: "Show if caste and class intersect in the Indian society. What have been the consequences of the interface of the two?",
    topicIds: ["p2u4t1"],
  },
  {
    year: 2019, paper: 2, group: "A", number: 3, marks: 40,
    text: "Examine the nature of changes, if any, that have been occasioned in the family patterns by industrialisation and urbanisation in contemporary Indian society.",
    topicIds: ["p2u3t2", "p2u5t5"],
  },
  {
    year: 2019, paper: 2, group: "A", number: 4, marks: 40,
    text: "Analyse the factors responsible for vulnerability of women and children and suggest ways and means for overcoming them in the light of the steps already taken by the state in that direction.",
    topicIds: ["p2u6t1", "p2u6t4"],
  },
  {
    year: 2019, paper: 2, group: "A", number: 5, marks: 40,
    text: "Assess the nature of social and cultural change brought about in the society and culture of India by sanskritization, westernization and secularization.",
    topicIds: ["p2u5t1"],
  },
  {
    year: 2019, paper: 2, group: "B", number: 6, marks: 40,
    text: "Discuss the nature and causes of the problem of drug addiction in today's India. How should it be combated?",
    topicIds: ["p2u8t4"],
  },
  {
    year: 2019, paper: 2, group: "B", number: 7, marks: 40,
    text: "Examine the nature of the impact of forest on ecology. What more in to be done in avoiding conflict between State and people? How to ensure cooperation of the two in improving forests and ecology?",
    topicIds: ["p2u7t2"],
  },
  {
    year: 2019, paper: 2, group: "B", number: 8, marks: 40,
    text: "Write notes on: (a) B. R. Ambedkar and the Dalits. (b) The Socially and Educationally Backward Classes.",
    topicIds: ["p2u1t5", "p2u4t3"],
  },
  {
    year: 2018, paper: 1, group: "A", number: 1, marks: 40,
    text: "Discuss the emergence of sociology as an academic discipline.",
    topicIds: ["p1u1t1"],
  },
  {
    year: 2018, paper: 1, group: "A", number: 2, marks: 40,
    text: "What is a social fact? Is suicide a social fact? Discuss with reference to Emile Durkheim.",
    topicIds: ["p1u2t2"],
  },
  {
    year: 2018, paper: 1, group: "A", number: 3, marks: 40,
    text: "How would you estimate R. K. Merton as a sociologist?",
    topicIds: ["p1u2t6"],
  },
  {
    year: 2018, paper: 1, group: "A", number: 4, marks: 40,
    text: "What do you understand by post-industrial society? Discuss its major dimensions.",
    topicIds: ["p1u5t1"],
  },
  {
    year: 2018, paper: 1, group: "A", number: 5, marks: 40,
    text: "(a) Discuss the important issues of citizenship in post-independent India. (b) Do you agree with the view that 'Civil society' can play a significant role in forming public opinion? Justify your answer.",
    topicIds: ["p1u6t2"],
  },
  {
    year: 2018, paper: 1, group: "B", number: 6, marks: 40,
    text: "Is there any debate between religion and science? Explain their significance in modern India.",
    topicIds: ["p1u7t1"],
  },
  {
    year: 2018, paper: 1, group: "B", number: 7, marks: 40,
    text: "Write an essay on Social responsibility of Science.",
    topicIds: ["p1u8t2"],
  },
  {
    year: 2018, paper: 1, group: "B", number: 8, marks: 40,
    text: "[not recovered]",
    topicIds: [],
    note: "Question 8 falls after a page break in the source PDF and is not present. Worth sourcing from the original paper.",
  },
  {
    year: 2018, paper: 2, group: "A", number: 1, marks: 40,
    text: "Explain how India has portrayed the problems of Unity and diversity in its Socio-cultural structure.",
    topicIds: ["p2u1t1"],
  },
  {
    year: 2018, paper: 2, group: "A", number: 2, marks: 40,
    text: "Discuss the distinctiveness in G.S. Ghurye's Study of Indian Society and culture.",
    topicIds: ["p2u1t2"],
  },
  {
    year: 2018, paper: 2, group: "A", number: 3, marks: 40,
    text: "Who are the Scheduled Tribes in India? Write a note on the problems of Scheduled Tribes in India.",
    topicIds: ["p2u2t3"],
  },
  {
    year: 2018, paper: 2, group: "A", number: 4, marks: 40,
    text: "Analyse the relationship between Social change and urbanization.",
    topicIds: ["p2u5t5"],
  },
  {
    year: 2018, paper: 2, group: "A", number: 5, marks: 40,
    text: "What is globalization? How does globalization affect the nature of Social mobility in modern India?",
    topicIds: ["p2u4t5"],
  },
  {
    year: 2018, paper: 2, group: "B", number: 6, marks: 40,
    text: "Briefly discuss the causes and consequences of declining child Sex Ratio in India. Do you think it is an extreme form of gender inequality? Justify your answer.",
    topicIds: ["p2u6t1"],
  },
  {
    year: 2018, paper: 2, group: "B", number: 7, marks: 40,
    text: "How does marriage perform various functions in Indian Society? Examine the causes and consequences of marital conflict in India.",
    topicIds: ["p2u3t2"],
  },
  {
    year: 2018, paper: 2, group: "B", number: 8, marks: 40,
    text: "[first lines missing in source] … reducing Violence against Women? Discuss.",
    topicIds: ["p2u8t9", "p2u6t1"],
    note: "Truncated at a page break in the source PDF.",
  },

  // ── 2015, Paper I ───────────────────────────────────────────────────────
  // Transcribed from a typed reproduction rather than a scan of the paper, so
  // the wording of Q7 carries the source's own garble.
  {
    year: 2015, paper: 1, group: "A", number: 1, marks: 40,
    text: "Discuss Max Weber's view on power. Analyse the three basic types of legitimate authority as distinguished by him.",
    topicIds: ["p1u2t3", "p1u3t7"],
  },
  {
    year: 2015, paper: 1, group: "A", number: 2, marks: 40,
    text: "Discuss the concept of pattern variables as formulated by Talcott Parsons.",
    topicIds: ["p1u2t5"],
  },
  {
    year: 2015, paper: 1, group: "A", number: 3, marks: 40,
    text: "Sociological approaches to religion have been strongly influenced by the ideas of classical theorists — list the main ideas of Marx, Durkheim and Weber on religion. What do they have in common and what divides them? Is it possible to say which is the most accurate characterization?",
    topicIds: ["p1u3t8", "p1u2t1", "p1u2t2", "p1u2t3"],
  },
  {
    year: 2015, paper: 1, group: "A", number: 4, marks: 40,
    text: "What are social movements? Give some old and recent examples of social movements. How do social movements pursue change in comparison to political parties?",
    topicIds: ["p1u6t3", "p1u6t1"],
  },
  {
    year: 2015, paper: 1, group: "A", number: 5, marks: 40,
    text: "What is the working class? What social and economic factors account for the shrinking of this class from the mid-twentieth century? Describe the main elements said to be the characterisation of the 'Under Class'. Explain why and how this concept has been criticized by sociologists.",
    topicIds: ["p1u4t1", "p1u5t3"],
  },
  {
    year: 2015, paper: 1, group: "B", number: 6, marks: 40,
    text: "Define social theory. Write an essay on the basis of the relationship between theory and research.",
    topicIds: ["p1u9t1"],
  },
  {
    year: 2015, paper: 1, group: "B", number: 7, marks: 40,
    text: "What is the observation method? Discuss in detail the merits and demerits of the observation method.",
    topicIds: ["p1u9t3"],
    note: "The source reads 'What do observation method?'; transcribed as intended.",
  },
  {
    year: 2015, paper: 1, group: "B", number: 8, marks: 40,
    text: "Discuss in brief the survey method in social research.",
    topicIds: ["p1u9t2"],
  },

  // ── 2016, Paper I ───────────────────────────────────────────────────────
  {
    year: 2016, paper: 1, group: "A", number: 1, marks: 40,
    text: "Explain Karl Marx's analysis of Historical-materialism and Class-struggle.",
    topicIds: ["p1u2t1"],
  },
  {
    year: 2016, paper: 1, group: "A", number: 2, marks: 40,
    text: "Discuss Emile Durkheim's theory of Division of Labour.",
    topicIds: ["p1u2t2"],
  },
  {
    year: 2016, paper: 1, group: "A", number: 3, marks: 40,
    text: "Indicate the roles of social mobility in the process of social stratification.",
    topicIds: ["p1u4t2", "p1u4t1"],
  },
  {
    year: 2016, paper: 1, group: "A", number: 4, marks: 40,
    text: "Examine in the context of modern society the relation between religion and science.",
    topicIds: ["p1u7t1"],
  },
  {
    year: 2016, paper: 1, group: "A", number: 5, marks: 40,
    text: "Write an essay on poverty and deprivation in the context of modern India.",
    topicIds: ["p1u4t1"],
  },
  {
    year: 2016, paper: 1, group: "B", number: 6, marks: 40,
    text: "Elaborate the importance and sources of hypotheses in social science research.",
    topicIds: ["p1u9t1"],
  },
  {
    year: 2016, paper: 1, group: "B", number: 7, marks: 40,
    text: "Write an essay on education as an instrument of social change.",
    topicIds: ["p1u10t3"],
  },
  {
    year: 2016, paper: 1, group: "B", number: 8, marks: 40,
    text: "Explain the roles of science and technology in the development of a society.",
    topicIds: ["p1u8t3", "p1u10t4"],
    note: "The printed paper reads 'a sciety'; transcribed as intended.",
  },

  // ── 2014, Paper I ───────────────────────────────────────────────────────
  {
    year: 2014, paper: 1, group: "A", number: 1, marks: 40,
    text: "Analyse how Weber differed from Marx in explaining social change.",
    topicIds: ["p1u2t3", "p1u2t1"],
  },
  {
    year: 2014, paper: 1, group: "A", number: 2, marks: 40,
    text: "Examine after Simmel, the nature and role of culture in modern life.",
    topicIds: ["p1u2t4"],
  },
  {
    year: 2014, paper: 1, group: "A", number: 3, marks: 40,
    text: "What is post-industrial society? What are its major features?",
    topicIds: ["p1u5t1"],
  },
  {
    year: 2014, paper: 1, group: "A", number: 4, marks: 40,
    text: "What is pluralism? Examine the process of secularization in modern society.",
    topicIds: ["p1u7t4", "p1u7t2"],
  },
  {
    year: 2014, paper: 1, group: "A", number: 5, marks: 40,
    text: "Examine, in the context of globalization, the relation between technology and social change.",
    topicIds: ["p1u8t4", "p1u10t4"],
  },
  {
    year: 2014, paper: 1, group: "B", number: 6, marks: 40,
    text: "What is sociological imagination? How would you distinguish between sociology and common sense?",
    topicIds: ["p1u1t4"],
  },
  {
    year: 2014, paper: 1, group: "B", number: 7, marks: 40,
    text: "What is the importance of social research? What steps one should follow to conduct social research?",
    topicIds: ["p1u9t1"],
  },
  {
    year: 2014, paper: 1, group: "B", number: 8, marks: 40,
    text: "How is development related to dependency? Explain.",
    topicIds: ["p1u10t1"],
  },

  // ── 2014, Paper II ──────────────────────────────────────────────────────
  {
    year: 2014, paper: 2, group: "A", number: 1, marks: 40,
    text: "Has Market led Industrialization and urbanization resulted in Western consumerism and materialistic culture creeping in, that adversely affect the plural Indian culture? Explain with examples from contemporary India.",
    topicIds: ["p2u5t5", "p2u5t1", "p2u1t1"],
  },
  {
    year: 2014, paper: 2, group: "A", number: 2, marks: 40,
    text: "Describe the process of social mobility among the lower castes and discuss the role of the Backward Classes Movement in strengthening this process.",
    topicIds: ["p2u4t3", "p2u5t4"],
  },
  {
    year: 2014, paper: 2, group: "A", number: 3, marks: 40,
    text: "Discuss how occupational diversification has affected the pattern of social stratification in India.",
    topicIds: ["p2u4t5"],
  },
  {
    year: 2014, paper: 2, group: "A", number: 4, marks: 40,
    text: "Discuss the paradoxical nature of change in contemporary Indian society. Describe the factors responsible for it.",
    topicIds: ["p2u5t2", "p2u1t1"],
  },
  {
    year: 2014, paper: 2, group: "A", number: 5, marks: 40,
    text: "What have been the functions of democracy in India? Has Democracy been successful in eliminating some of the traditional social inequalities?",
    topicIds: ["p2u3t4", "p2u4t4"],
  },
  {
    year: 2014, paper: 2, group: "B", number: 6, marks: 40,
    text: "Describe the salient features of the poverty alleviation programmes. What modifications would you suggest to make them more effective?",
    topicIds: ["p2u8t1"],
  },
  {
    year: 2014, paper: 2, group: "B", number: 7, marks: 40,
    text: "Discuss the social consequences of economic reforms like Liberalization, Privatization and Globalization.",
    topicIds: ["p2u7t1", "p2u4t5"],
  },
  {
    year: 2014, paper: 2, group: "B", number: 8, marks: 40,
    text: "How do you define development? What are your suggestions to resolve the issues of displacement and environment related to development?",
    topicIds: ["p2u7t1", "p2u7t2"],
  },

  // ── 2015, Paper II ──────────────────────────────────────────────────────
  {
    year: 2015, paper: 2, group: "A", number: 1, marks: 40,
    text: "How do you account for the growing rise of violence against women in India? What are some of recent legal provisions to counter such violence? Do you think they are adequate to remedy the present situation?",
    topicIds: ["p2u6t2", "p2u8t9", "p2u5t3"],
  },
  {
    year: 2015, paper: 2, group: "A", number: 2, marks: 40,
    text: "What are the ways in which caste and class intersect in contemporary Indian Society? Do you think the nature of this intersection is responsible for the persistent social inequalities in Indian society?",
    topicIds: ["p2u4t2", "p2u4t1"],
  },
  {
    year: 2015, paper: 2, group: "A", number: 3, marks: 40,
    text: "What are the changes that have been brought in family and marriage patterns due to industrialization and urbanization in contemporary Indian society?",
    topicIds: ["p2u3t2", "p2u3t1", "p2u5t5"],
  },
  {
    year: 2015, paper: 2, group: "A", number: 4, marks: 40,
    text: "What do you understand by M.N. Srinivas's distinction between \"Book View\" and \"Field View\"? How do you think this difference has contributed to Srinivas's understanding of caste in India? What according to you is the contemporary relevance of this distinction?",
    topicIds: ["p2u1t3", "p2u2t3"],
  },
  {
    year: 2015, paper: 2, group: "A", number: 5, marks: 40,
    text: "What do you understand by the concept of secularism and secularization? Employing these two concepts, evaluate the role and significance of religion in contemporary Indian society.",
    topicIds: ["p2u3t5", "p2u5t1"],
  },
  {
    year: 2015, paper: 2, group: "B", number: 6, marks: 40,
    text: "Write a critical essay on nature and role of environmental movements in India.",
    topicIds: ["p2u7t2"],
  },
  {
    year: 2015, paper: 2, group: "B", number: 7, marks: 40,
    text: "Is the description of India as a 'Unity in Diversity' a misleading one that veils persistent social segregation and structural inequalities? Cite contemporary examples.",
    topicIds: ["p2u1t1", "p2u4t1"],
  },
  {
    year: 2015, paper: 2, group: "B", number: 8, marks: 40,
    text: "Critically evaluate the debates around the Family planning policies in India.",
    topicIds: ["p2u8t7", "p2u6t3"],
  },
];


/**
 * Years in the corpus. 2014, 2015 and 2018-2023 are complete; 2016 is Paper I
 * only, its Paper II sheet not yet found. Every paper that is here is whole — a
 * test refuses a half-transcribed one, so a partial year can never quietly
 * count as a full one.
 *
 * Outstanding, and worth chasing: 2016 Paper II, both 2017 papers if that year
 * ran, and both 2024 papers. 2024 was the last sitting actually held, so the
 * series ends there — 2025 and 2026 are not missing, they do not exist, and
 * nothing should go looking for them.
 */
export const PYQ_YEARS = [2014, 2015, 2016, 2018, 2019, 2020, 2021, 2022, 2023] as const;
