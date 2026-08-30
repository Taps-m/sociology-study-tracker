/**
 * Routing, by URL hash, hand-rolled.
 *
 * A router library would be ~15KB for what fits in forty lines here, and
 * PLAN.md's "runs on a cheap phone" rule makes that a bad trade. The hash also
 * means the app can be dropped on any static host with no rewrite rules.
 */
import { useEffect, useState } from "react";

export const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: "◎" },
  { id: "plan", label: "Study Plan", icon: "◫" },
  { id: "chapters", label: "Chapters", icon: "▤" },
  { id: "today", label: "Today's Study", icon: "◐" },
  { id: "answers", label: "Answer Practice", icon: "✎" },
  { id: "revision", label: "Quick Revision", icon: "↻" },
  { id: "progress", label: "Progress", icon: "▲" },
  { id: "settings", label: "Settings", icon: "⚙" },
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
