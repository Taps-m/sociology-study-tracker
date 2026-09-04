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
  define: {
    __BUILD_AT__: JSON.stringify(new Date().toISOString().slice(0, 16).replace("T", " ")),
    __BUILD_COMMIT__: JSON.stringify(commit()),
  },
});
