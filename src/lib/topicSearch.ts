import { TOPICS, type Topic } from "../data/syllabus";

/**
 * The one matching rule behind every "find a topic" search in the app —
 * Dashboard's quick logger, Mark as Read, and Chapters each had their own
 * copy of this, so a query behaved slightly differently depending which
 * screen you typed it into. This is the one version.
 *
 * Every word in the query has to appear somewhere in the topic's name or its
 * unit. Two characters minimum, so a stray keystroke doesn't flash a list.
 */
export function topicMatches(topic: Topic, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return false;
  const words = q.split(/\s+/);
  const hay = `${topic.name} ${topic.unit}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** All topics matching `query`, in syllabus order, capped at `limit`. */
export function searchTopics(query: string, limit = 8, topics: Topic[] = TOPICS): Topic[] {
  if (query.trim().length < 2) return [];
  return topics.filter((t) => topicMatches(t, query)).slice(0, limit);
}
