import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/**
 * Register the service worker, but only in a real build.
 *
 * In dev it would cache Vite's module graph and then serve yesterday's code
 * back with no obvious reason, which costs an hour the first time it happens.
 */
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // No offline support this session. Nothing else depends on it.
    });
  });
}
