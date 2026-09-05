import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Stamp the build with when it was made and what it was made from.
 *
 * A service worker plus a hashed bundle means "I rebuilt and nothing changed"
 * is ambiguous: the code may be wrong, or the page in front of you may simply
 * be an older one. That question cost an afternoon, and it is unanswerable by
 * looking — so the app says which build it is, in Settings, and the answer
 * takes two seconds instead of a bisect.
 */
function commit(): string {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "nogit";
  }
}

export default defineConfig({
  plugins: [react()],
  build: {
    /**
     * One bundle, on purpose — do not code-split this app.
     *
     * Vite warns above 500 kB and suggests dynamic import(). That advice is
     * wrong here, and the reason is in sw.js: the service worker caches assets
     * on first use, deliberately, because there is no build-time precache list
     * to go stale. Split the bundle and a route the candidate has not opened
     * yet has no chunk in the cache — so the first time they open Answer
     * practice on a train with no signal, it fails. A single bundle means one
     * download and then the whole app works offline, which is the entire point
     * of a local-first tracker.
     *
     * The size is content, not bloat: React is about a quarter of it and the
     * rest is the 224-question PYQ bank, the planner, the unit briefs and the
     * book page maps. Splitting would move those bytes, not remove them.
     *
     * 150 kB gzipped, fetched once. Raised so the warning stops suggesting a
     * change that would break offline, and this comment says why.
     */
    chunkSizeWarningLimit: 700,
  },
  define: {
    __BUILD_AT__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ")),
    __BUILD_COMMIT__: JSON.stringify(commit()),
  },
});
