import { useEffect, useState, type ReactNode } from "react";
import { ROUTES, type RouteId } from "./routes";
import { applyTheme, C, loadTheme, type ThemeName } from "../lib/theme";

/**
 * The app chrome: a dark rail on the left from 900px up, a dark bar across the
 * top always. Below 900px the rail disappears and the bar's tab strip scrolls,
 * so the whole thing still works one-handed on a phone.
 */
/** Two letters from a name: "Tapomoy Das" gives TD, "Tapomoy" gives TA. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Shell({
  route,
  go,
  name,
  children,
}: {
  route: RouteId;
  go: (id: RouteId) => void;
  /** Shown beside the avatar. Undefined until the user gives one. */
  name?: string;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeName>(loadTheme);
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <div className="shell">
      <nav className="rail" aria-label="Sections">
        <div style={{ padding: "6px 12px 18px" }}>
          <div style={{ color: "var(--rail-text)", fontSize: 16, fontWeight: 700 }}>
            WBCS Sociology
          </div>
          <div style={{ color: "var(--rail-muted)", fontSize: 13, marginTop: 3 }}>
            Understand society. Write better.
          </div>
        </div>

        {ROUTES.map((r) => (
          <button
            key={r.id}
            className="rail-item"
            aria-current={route === r.id ? "page" : undefined}
            onClick={() => go(r.id)}
          >
            <span aria-hidden style={{ width: 16, textAlign: "center", opacity: 0.9 }}>
              {r.icon}
            </span>
            <span style={{ flex: 1 }}>{r.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ minWidth: 0 }}>
        <header className="topbar">
          {route !== "dashboard" && (
            <button
              onClick={() => (window.history.length > 1 ? window.history.back() : go("dashboard"))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                minHeight: 42,
                padding: "0 16px 0 12px",
                borderRadius: 9,
                border: "1px solid var(--rail-line)",
                background: "var(--rail-2)",
                color: "var(--rail-text)",
                font: "inherit",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                flex: "0 0 auto",
              }}
            >
              <span aria-hidden style={{ fontSize: 19, lineHeight: 1 }}>
                ←
              </span>
              Back
            </button>
          )}

          <div className="tabstrip" style={{ flex: 1 }}>
            {ROUTES.map((r) => (
              <button
                key={r.id}
                aria-current={route === r.id ? "page" : undefined}
                onClick={() => go(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => go("settings")}
            title={name ? `${name} — open settings` : "Add your name"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minHeight: 40,
              padding: "0 12px 0 6px",
              borderRadius: 999,
              border: "1px solid var(--rail-line)",
              background: "var(--rail-2)",
              color: "var(--rail-text)",
              font: "inherit",
              fontSize: 14,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "grid",
                placeItems: "center",
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {name ? initials(name) : "+"}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{name ?? "Add your name"}</span>
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              minHeight: 36,
              minWidth: 36,
              borderRadius: 8,
              border: "1px solid var(--rail-line)",
              background: "var(--rail-2)",
              color: "var(--rail-text)",
              cursor: "pointer",
              fontSize: 15.5,
            }}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
        </header>

        <main className="main" style={{ fontFamily: C.sans }}>
          {children}
        </main>

        <footer
          style={{
            borderTop: `1px solid ${C.line}`,
            padding: "18px 16px 28px",
            textAlign: "center",
            fontSize: 12.5,
            color: C.muted,
          }}
        >
          Copyright © {new Date().getFullYear()} Tapomoy. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

/** A titled card. Every module builds out of these. */
export function Card({
  title,
  action,
  children,
  pad = 16,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  pad?: number;
}) {
  return (
    <section className="card" style={{ padding: pad }}>
      {title && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 15.5, fontWeight: 600, margin: 0 }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
