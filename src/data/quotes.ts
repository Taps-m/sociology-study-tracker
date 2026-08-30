/**
 * A line for the top of the day's screen.
 *
 * All of these are quoted from named works by the thinkers on your own syllabus,
 * so the daily line doubles as a revision prompt rather than being generic
 * encouragement. Verify the wording against your own texts before this app is
 * ever shown publicly — quotations get corrupted as they circulate.
 *
 * The choice is by date, so it is the same all day and changes at midnight.
 * Nothing here is generated, and nothing here is random.
 */

export interface Quote {
  text: string;
  who: string;
  where: string;
}

export const QUOTES: Quote[] = [
  {
    text: "The philosophers have only interpreted the world, in various ways; the point is to change it.",
    who: "Karl Marx",
    where: "Theses on Feuerbach, XI",
  },
  {
    text: "The sociological imagination enables us to grasp history and biography and the relations between the two within society.",
    who: "C. Wright Mills",
    where: "The Sociological Imagination",
  },
  {
    text: "Politics is a strong and slow boring of hard boards.",
    who: "Max Weber",
    where: "Politics as a Vocation",
  },
  {
    text: "Educate, Agitate, Organise.",
    who: "B. R. Ambedkar",
    where: "Address to the Bahishkrit Hitakarini Sabha",
  },
  {
    text: "I measure the progress of a community by the degree of progress which women have achieved.",
    who: "B. R. Ambedkar",
    where: "Speech, All India Depressed Classes Conference",
  },
  {
    text: "Society is not a mere sum of individuals; the system formed by their association represents a specific reality with its own characteristics.",
    who: "Émile Durkheim",
    where: "The Rules of Sociological Method",
  },
  {
    text: "Man is an animal suspended in webs of significance he himself has spun.",
    who: "Clifford Geertz",
    where: "The Interpretation of Cultures",
  },
  {
    text: "Neither the life of an individual nor the history of a society can be understood without understanding both.",
    who: "C. Wright Mills",
    where: "The Sociological Imagination",
  },
];

/** Same quote all day, a different one tomorrow. */
export function quoteOfTheDay(today = new Date()): Quote {
  const start = Date.UTC(today.getFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - start) / 86400000);
  return QUOTES[day % QUOTES.length];
}
