/**
 * Routing, by URL hash, hand-rolled.
 *
 * A router library would be ~15KB for what fits in forty lines here, and
 * PLAN.md's "runs on a cheap phone" rule makes that a bad trade. The hash also
 * means the app can be dropped on any static host with no rewrite rules.
 */
import { useEffect, useState } from "react";

/**
 * Every screen, and which of them earn a place in a narrow top bar.
 *
 * `primary` is the daily loop: where you land, what you read, what you write,
 * what comes back round. The rest are real screens that are visited
 * occasionally — a weekly plan, a browse through old papers, the guide you read
 * once — and putting all ten across the top gave them equal billing with the
 * four that matter and truncated the last one mid-word.
 */
export const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: "◎", primary: true },
  { id: "chapters", label: "Chapters", icon: "▤", primary: true },
  { id: "answers", label: "Answer Practice", icon: "✎", primary: true },
  { id: "revision", label: "Quick Revision", icon: "↻", primary: true },
  { id: "plan", label: "Study Plan", icon: "◫", primary: false },
  { id: "today", label: "Today's Study", icon: "◐", primary: false },
  { id: "pyq", label: "PYQ Explorer", icon: "◈", primary: false },
  { id: "progress", label: "Progress", icon: "▲", primary: false },
  { id: "guide", label: "How this works", icon: "?", primary: false },
  { id: "settings", label: "Settings", icon: "⚙", primary: false },
] as const;

export type RouteId = (typeof ROUTES)[number]["id"];

const DEFAULT: RouteId = "dashboard";

function read(): RouteId {
  const raw = window.location.hash.replace(/^#\/?/, "");
  return (ROUTES.find((r) => r.id === raw)?.id ?? DEFAULT) as RouteId;
}

export function useRoute(): [RouteId, (id: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(read);

  useEffect(() => {
    const onHash = () => setRoute(read());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return [
    route,
    (id: RouteId) => {
      window.location.hash = `#/${id}`;
      window.scrollTo(0, 0);
    },
  ];
}
