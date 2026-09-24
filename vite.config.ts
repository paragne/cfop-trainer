import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const { version } = JSON.parse(readFileSync("package.json", "utf-8"));

export default defineConfig({
  // Shown on the home screen, so the version has one home: package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // The contact sheet and 3D prototype ship in every build, unlinked, as
    // extra pages.
    rolldownOptions: {
      input: {
        main: "index.html",
        "contact-sheet": "contact-sheet.html",
        "three-d": "three-d.html",
      },
    },
  },
});
