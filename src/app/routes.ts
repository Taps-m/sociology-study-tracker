/**
 * Routing, by URL hash, hand-rolled.
 *
 * A router library would be ~15KB for what fits in forty lines here, and
 * PLAN.md's "runs on a cheap phone" rule makes that a bad trade. The hash also
 * means the app can be dropped on any static host with no rewrite rules.
 */
import { useEffect, useState } from "react";

export const ROUTES = [
  { id: "dashboard", label: "Dashboard", icon: "◎", built: true },
  { id: "plan", label: "Study Plan", icon: "◫", built: true },
  { id: "chapters", label: "Chapters", icon: "▤", built: true },
  { id: "today", label: "Today's Study", icon: "◐", built: true },
  { id: "pyq", label: "PYQ Explorer", icon: "◈", built: false },
  { id: "answers", label: "Answer Practice", icon: "✎", built: true },
  { id: "revision", label: "Quick Revision", icon: "↻", built: true },
  { id: "flashcards", label: "Flashcards", icon: "▦", built: false },
  { id: "notes", label: "My Notes", icon: "▭", built: false },
  { id: "mindmaps", label: "Mind Maps", icon: "⌘", built: false },
  { id: "progress", label: "Progress", icon: "▲", built: true },
  { id: "settings", label: "Settings", icon: "⚙", built: true },
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
