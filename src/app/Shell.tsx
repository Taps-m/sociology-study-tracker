import { useEffect, useState, type ReactNode } from "react";
import { Logo } from "./Logo";
import { Icon } from "./Icon";
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
  avatar,
  onLogout,
  children,
}: {
  route: RouteId;
  go: (id: RouteId) => void;
  /** Shown beside the avatar. Undefined until the user gives one. */
  name?: string;
  /** A square data URL, or nothing — then the initials stand in. */
  avatar?: string | null;
  /** Closes the session. Deletes nothing — see LockScreen. */
  onLogout: () => void;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<ThemeName>(loadTheme);
  const [more, setMore] = useState(false);

  // A menu that survives the navigation it caused is a menu left hanging open.
  useEffect(() => setMore(false), [route]);
  useEffect(() => applyTheme(theme), [theme]);

  return (
    <div className="shell">
      <nav className="rail" aria-label="Sections">
        <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "6px 12px 18px" }}>
          <Logo size={30} tone="var(--rail-text)" />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "var(--rail-text)", fontSize: 16, fontWeight: 700 }}>
              WBCS Sociology
            </div>
            <div style={{ color: "var(--rail-muted)", fontSize: 13, marginTop: 3 }}>
              Understand society. Write better.
            </div>
          </div>
        </div>

        {ROUTES.map((r) => (
          <button
            key={r.id}
            className="rail-item"
            aria-current={route === r.id ? "page" : undefined}
            onClick={() => go(r.id)}
          >
            <span style={{ flex: "0 0 auto", display: "grid", placeItems: "center" }}>
              <Icon name={r.icon} size={18} />
            </span>
            <span style={{ flex: 1 }}>{r.label}</span>
          </button>
        ))}

        {/*
          Attribution at the foot of the rail rather than under the last screen.

          It is on every page this way without being on any page twice, and the
          rail has a bottom that needs holding down — ten links and then nothing
          reads as a list that got cut off.
        */}
        <div className="rail-foot">
          <div>Designed and built by Tapomoy</div>
          <div>for WBCS Sociology aspirants</div>
          <div style={{ marginTop: 6, opacity: 0.75 }}>
            Copyright © {new Date().getFullYear()} Tapomoy. All rights reserved.
          </div>
        </div>
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
                border: "1px solid var(--line)",
                background: "var(--raised)",
                color: "var(--text)",
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

          {/*
            Only the daily loop across the top, with the rest behind "More".
            Ten equally weighted links is not a menu, it is a list — and on a
            phone it was a list you had to scroll sideways through to find the
            one thing you open every day.
          */}
          <div className="tabstrip" style={{ flex: 1 }}>
            {ROUTES.filter((r) => r.primary).map((r) => (
              <button
                key={r.id}
                aria-current={route === r.id ? "page" : undefined}
                onClick={() => go(r.id)}
              >
                {r.label}
              </button>
            ))}
            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <button
                aria-expanded={more}
                aria-haspopup="true"
                aria-current={
                  ROUTES.some((r) => !r.primary && r.id === route) ? "page" : undefined
                }
                onClick={() => setMore((v) => !v)}
                title="The screens you visit now and then"
              >
                More {more ? "▴" : "▾"}
              </button>
              {more && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    right: 0,
                    zIndex: 40,
                    minWidth: 186,
                    padding: 6,
                    borderRadius: 10,
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    boxShadow: "var(--shadow)",
                    display: "grid",
                    gap: 2,
                  }}
                >
                  {ROUTES.filter((r) => !r.primary).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setMore(false);
                        go(r.id);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 9,
                        width: "100%",
                        minHeight: 38,
                        padding: "0 10px",
                        borderRadius: 8,
                        border: "none",
                        background: route === r.id ? "var(--accent-soft)" : "transparent",
                        color: route === r.id ? "var(--accent)" : "var(--muted)",
                        font: "inherit",
                        fontSize: 13.5,
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ flex: "0 0 auto", display: "grid", placeItems: "center" }}>
                        <Icon name={r.icon} size={16} />
                      </span>
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/*
            Who you are, and how to leave — at the far end of the bar.

            They sat hard against the left edge because the tab strip that used
            to push them across is hidden from 900px up, so on every desktop
            screen the three of them huddled in the corner the back button had
            just left. marginLeft:auto does what the strip was doing by accident.

            They also still wore the rail's near-black, which was invisible on a
            dark bar and a hole punched in a light one.
          */}
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
              border: "1px solid var(--line)",
              background: "var(--raised)",
              color: "var(--text)",
              marginLeft: "auto",
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
                overflow: "hidden",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.02em",
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                />
              ) : name ? (
                initials(name)
              ) : (
                "+"
              )}
            </span>
            <span style={{ whiteSpace: "nowrap" }}>{name ?? "Add your name"}</span>
          </button>

          <button
            onClick={onLogout}
            title="Log out — nothing is deleted"
            style={{
              minHeight: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--raised)",
              color: "var(--text)",
              font: "inherit",
              fontSize: 13.5,
              cursor: "pointer",
              flex: "0 0 auto",
            }}
          >
            Log out
          </button>

          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              minHeight: 36,
              minWidth: 36,
              borderRadius: 8,
              border: "1px solid var(--line)",
              background: "var(--raised)",
              color: "var(--text)",
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
  icon,
  action,
  children,
  pad = 16,
}: {
  title?: string;
  /**
   * A mark beside the heading. Optional, and worth using on a screen where
   * several cards stack: a column of headings set in the same size and weight
   * is a wall of text, and the mark is what the eye finds a card by before it
   * has read anything.
   */
  icon?: string;
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
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              fontSize: 15.5,
              fontWeight: 600,
              margin: 0,
              minWidth: 0,
            }}
          >
            {icon && (
              <span style={{ color: "var(--accent)", flex: "0 0 auto" }}>
                <Icon name={icon} size={19} />
              </span>
            )}
            <span style={{ minWidth: 0 }}>{title}</span>
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
