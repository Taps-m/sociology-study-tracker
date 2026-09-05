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
  { id: "dashboard", label: "Dashboard", icon: "home", primary: true },
  { id: "chapters", label: "Chapters", icon: "layers", primary: true },
  { id: "answers", label: "Answer Practice", icon: "pencil", primary: true },
  { id: "read", label: "Mark as read", icon: "tick", primary: true },
  { id: "revision", label: "Quick Revision", icon: "refresh", primary: false },
  { id: "plan", label: "Study Plan", icon: "calendar", primary: false },
  { id: "today", label: "Today's Study", icon: "clock", primary: false },
  { id: "pyq", label: "PYQ Explorer", icon: "diamond", primary: false },
  { id: "predict", label: "Question prediction", icon: "trend", primary: false },
  { id: "progress", label: "Progress", icon: "trend", primary: false },
  { id: "guide", label: "How this works", icon: "question", primary: false },
  { id: "settings", label: "Settings", icon: "gear", primary: false },
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
