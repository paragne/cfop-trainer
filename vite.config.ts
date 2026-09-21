import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { iconRgb } from "./src/lib/icon.ts";
import { logoSvg } from "./src/lib/logo.ts";
import { encodePng } from "./src/lib/png.ts";

const ICON_SIZE = 180;
// --bg in style.css. An apple-touch-icon is opaque, and iOS fills any
// transparency with black anyway.
const ICON_BACKGROUND = "#0b0b0c";

// The icons come from the renderer that draws every case picture, so they are
// built here rather than committed: a committed copy could drift from it.
async function brandAssets() {
  return {
    "favicon.svg": { type: "image/svg+xml", body: logoSvg() },
    "apple-touch-icon.png": {
      type: "image/png",
      body: await encodePng(ICON_SIZE, ICON_SIZE, iconRgb(ICON_SIZE, ICON_BACKGROUND)),
    },
  };
}

function brandIcons(): Plugin {
  let built: ReturnType<typeof brandAssets> | undefined;
  return {
    name: "brand-icons",
    async generateBundle() {
      for (const [fileName, { body }] of Object.entries(await brandAssets())) {
        this.emitFile({ type: "asset", fileName, source: body });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        built ??= brandAssets();
        const file = Object.entries(await built).find(
          ([name]) => `/${name}` === req.url?.split("?")[0],
        );
        if (file === undefined) return next();
        res.setHeader("Content-Type", file[1].type);
        res.end(file[1].body);
      });
    },
  };
}

export default defineConfig({
  plugins: [brandIcons()],
  build: {
    // The contact sheet ships in every build, unlinked, as a second page.
    rolldownOptions: {
      input: { main: "index.html", "contact-sheet": "contact-sheet.html" },
    },
  },
});
