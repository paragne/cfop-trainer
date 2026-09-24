import { defineConfig } from "vite";

export default defineConfig({
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
