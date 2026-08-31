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
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Ask on every load rather than waiting for the browser's own schedule.
        void reg.update();
      })
      .catch(() => {
        // No offline support this session. Nothing else depends on it.
      });
  });

  /**
   * Reload once when a new worker takes over.
   *
   * The first version shipped without this and the cost was real: a deploy went
   * out, the old worker kept answering from its cache, and two rounds of fixes
   * were invisible on the device that had the app installed. Offline support is
   * worth having, but not at the price of an app that quietly refuses to
   * update.
   *
   * The flag guards the one case this pattern can loop on — a worker that
   * claims control immediately on first install.
   */
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}
