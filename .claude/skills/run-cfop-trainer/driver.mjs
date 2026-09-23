#!/usr/bin/env node
// Agent tooling, not product code. Drives cfop-trainer in a headless
// Chromium-family browser over the DevTools protocol. No dependencies: it
// needs Node 22+ for the global WebSocket and fetch.
//
//   node .claude/skills/run-cfop-trainer/driver.mjs up
//   node .claude/skills/run-cfop-trainer/driver.mjs smoke
//   node .claude/skills/run-cfop-trainer/driver.mjs shot NAME [WIDTH HEIGHT]
//   node .claude/skills/run-cfop-trainer/driver.mjs eval "JS EXPRESSION"
//   node .claude/skills/run-cfop-trainer/driver.mjs key space 1 2 n
//   node .claude/skills/run-cfop-trainer/driver.mjs down
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const PORT = process.env.PORT ?? "5173";
const APP = `http://localhost:${PORT}/`;
const CDP = 9222;
const STATE = join(tmpdir(), `cfop-driver-${PORT}.json`);
const SHOTS = join(tmpdir(), "cfop-shots");
const BROWSERS = [
  process.env.BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].filter((p) => p && existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const up = async (url) => { try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; } };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
async function waitFor(url, what, pid) {
  for (let i = 0; i < 100; i++) {
    if (await up(url)) return;
    if (pid !== undefined && !alive(pid)) throw new Error(`${what} exited while starting; is its port taken?`);
    await sleep(200);
  }
  throw new Error(`${what} did not come up at ${url}`);
}

// Reuses whatever already answers on the port (say, your own `npm run dev`) and
// spawns only what is missing, so `down` never stops a process it did not start.
async function start() {
  const opts = { detached: true, stdio: "ignore", windowsHide: true };
  const started = [];
  const launch = async (name, command, args, url, extra = {}) => {
    const child = spawn(command, args, { ...opts, ...extra });
    child.unref();
    started.push(child.pid);
    await waitFor(url, name, child.pid);
    console.log(`started ${name} (pid ${child.pid})`);
  };
  try {
    if (await up(APP)) console.log(`reusing the server already on ${APP}`);
    else await launch("vite", process.execPath, [join(ROOT, "node_modules/vite/bin/vite.js"), "--port", PORT, "--strictPort"], APP, { cwd: ROOT });
    if (await up(`http://127.0.0.1:${CDP}/json/version`)) console.log(`reusing the browser already on :${CDP}`);
    else {
      if (BROWSERS.length === 0) throw new Error("no browser found; set BROWSER to a chromium-family executable");
      await launch("browser", BROWSERS[0], [
        "--headless=new", `--remote-debugging-port=${CDP}`, `--user-data-dir=${join(tmpdir(), "cfop-driver-profile")}`,
        "--no-first-run", "--disable-gpu", "about:blank",
      ], `http://127.0.0.1:${CDP}/json/version`);
    }
  } finally {
    writeFileSync(STATE, JSON.stringify({ pids: started }));
  }
  console.log(`up: ${APP}`);
}

// Kills only the process trees `up` started, never a server or browser it reused.
function stop() {
  if (!existsSync(STATE)) return console.log("nothing to stop");
  for (const pid of JSON.parse(readFileSync(STATE, "utf8")).pids) {
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-pid);
    } catch { /* already gone */ }
  }
  rmSync(STATE);
  console.log("down");
}

// The app tab, not whatever else the browser opened (a download leaves an
// edge://downloads-hub page that rejects viewport overrides).
async function connect() {
  const targets = await (await fetch(`http://127.0.0.1:${CDP}/json`)).json();
  const page = targets.find((t) => t.type === "page" && t.url.includes(`localhost:${PORT}`)) ?? targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    msg.error ? p.rej(new Error(JSON.stringify(msg.error))) : p.res(msg.result);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { pending.set(++id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const b = {
    send, sleep, close: () => ws.close(),
    async goto(url) { await send("Page.navigate", { url }); await sleep(700); },
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? "eval failed");
      return r.result.value;
    },
    viewport: (width, height, mobile) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 2, mobile }),
    async shot(name) {
      mkdirSync(SHOTS, { recursive: true });
      const path = join(SHOTS, `${name}.png`);
      writeFileSync(path, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
      return path;
    },
    // keyDown then keyUp, as a keyboard sends them. modifiers: 2 is Ctrl.
    async key(key, { modifiers = 0, repeat = false } = {}) {
      const text = key.length === 1 ? key : undefined;
      const code = key === " " ? "Space" : /^\d$/.test(key) ? `Digit${key}` : key.length === 1 ? `Key${key.toUpperCase()}` : key;
      const base = { key, code, modifiers, autoRepeat: repeat };
      await send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", text, ...base });
      await send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
      await sleep(60);
    },
    type: async (text) => { await send("Input.insertText", { text }); await sleep(60); },
    // Real mouse events, so camera.ts's pointerdown/pointermove listeners
    // (which the browser fires alongside mouse events for mouse input) see
    // a genuine drag, one small step at a time — camera.ts uses the raw
    // pixel delta per step as a degree value, so a single small step is a
    // precise, small-angle yaw/pitch nudge.
    async dragStep(x, y, dx, dy) {
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: x + dx, y: y + dy, button: "left", buttons: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: x + dx, y: y + dy, button: "left", buttons: 0, clickCount: 1 });
      await sleep(30);
    },
  };
  // A fresh browser sits on about:blank, where there is no app and no localStorage.
  if (!page.url.includes(`localhost:${PORT}`)) await b.goto(APP);
  return b;
}

const READ = `(() => { const q = (s) => document.querySelector(s); return {
  count: q('.count')?.textContent, alg: q('.solution')?.textContent, revealed: !q('.solution')?.hidden,
  note: q('.note')?.value, summary: !q('.summary').hidden, home: !q('.home').hidden,
  modes: [...document.querySelectorAll('.modes .toggle')].map((t) => t.textContent), startVisible: !!q('.start button'),
  cardMode: q('.card')?.dataset.mode, shownButtons: [...document.querySelectorAll('.actions button')].filter((b) => !b.hidden).map((b) => b.firstChild.textContent) }; })()`;
const STORED = "JSON.parse(localStorage.getItem('cfop-trainer-v1') ?? 'null')";
const CLICK_TOGGLE = (label) => `[...document.querySelectorAll('.toggle')].find((t) => (t.querySelector('span') ?? t).firstChild.textContent === ${JSON.stringify(label)}).click()`;

async function smoke() {
  const b = await connect();
  let failed = 0;
  const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`); };
  const s = () => b.eval(READ);
  await b.send("Page.enable");
  await b.viewport(390, 844, true);
  await b.goto(APP); await b.eval("localStorage.clear()"); await b.goto(APP);

  let now = await s();
  check("opens on the home screen with Learn and its due count, then Drill, and no Verify", now.home && now.modes.join() === "Learn · 57 due,Drill", now.modes.join());
  check("home shows a Start button", now.startVisible);
  console.log("shot:", await b.shot("phone-home"));
  await b.key(" ");
  now = await s();
  check("space on home starts a 20-card session with the solution hidden", !now.home && now.count === "0 / 20" && !now.revealed, now.count);
  await b.key(" ");
  check("space reveals the solution", (await s()).revealed);
  await b.key(" ");
  check("space again hides it", !(await s()).revealed);

  await b.eval("document.querySelector('.note').focus()");
  await b.type("n12 ");
  for (const k of ["n", "1", "2", " "]) await b.key(k);
  now = await s();
  check("n / 1 / 2 / space are inert while typing in the note", now.count === "0 / 20" && !now.revealed && now.note === "n12 n12 ", JSON.stringify(now.note));
  check("the note is persisted as it is typed", Object.values((await b.eval(STORED)).notes)[0] === "n12 n12 ");
  await b.key("Escape");
  await b.key("2", { modifiers: 2 });
  await b.key("2", { repeat: true });
  check("Ctrl+2 and auto-repeat do not grade", (await s()).count === "0 / 20");

  await b.key("2");
  check("2 grades know it", (await s()).count === "1 / 20");
  const first = (await b.eval(STORED)).cards;
  check("the card is stored: seen 1, known 1", Object.values(first).length === 1 && Object.values(first)[0].seen === 1 && Object.values(first)[0].known === 1);

  const failedAlg = (await s()).alg;
  await b.key("1");
  const between = [];
  for (let i = 0; i < 3; i++) { between.push((await s()).alg); await b.key("2"); }
  check("a failed card returns after three others", (await s()).alg === failedAlg && !between.includes(failedAlg));
  await b.key("1");
  for (let i = 0; i < 3; i++) await b.key("2");
  await b.key("1");
  const cards = Object.values((await b.eval(STORED)).cards);
  check("three failures: seen 3, known 0, ease dropped once (2.3)", cards.some((c) => c.seen === 3 && c.known === 0 && c.ease === 2.3), JSON.stringify(cards.find((c) => c.seen === 3)));

  const stored = JSON.stringify((await b.eval(STORED)).cards);
  await b.goto(APP);
  check("a reload keeps the cards", JSON.stringify((await b.eval(STORED)).cards) === stored);

  await b.eval("document.querySelector('.logo').click()");
  check("the logo returns home mid-session", (await s()).home);
  await b.eval(CLICK_TOGGLE("F2L")); await b.eval(CLICK_TOGGLE("2-Look OLL"));
  const sets = (await b.eval(STORED)).prefs.sets;
  check("set toggles rewrite only the Learn selection", sets.learn.join() === "2-Look PLL" && sets.drill.join() === "F2L,2-Look OLL,2-Look PLL", JSON.stringify(sets));
  await b.eval(CLICK_TOGGLE("2-Look PLL"));
  check("the last set cannot be switched off", (await b.eval(STORED)).prefs.sets.learn.join() === "2-Look PLL");
  await b.key(" ");
  check("PLL only gives a 6-card session", (await s()).count === "0 / 6");
  console.log("shot:", await b.shot("phone-pll"));
  await b.key(" ");
  console.log("shot:", await b.shot("phone-revealed"));
  for (let i = 0; i < 6; i++) await b.key("2");
  check("finishing the session shows the summary", (await s()).summary);
  await b.key(" ");
  check("space on the summary starts another session", !(await s()).summary && (await s()).count === "0 / 6");

  await b.eval("document.querySelector('.logo').click()");
  const cardsBefore = JSON.stringify((await b.eval(STORED)).cards);
  await b.eval("[...document.querySelectorAll('.modes .toggle')].find((t) => t.textContent === 'Drill').click()");
  const drillPrefs = (await b.eval(STORED)).prefs;
  check("choosing Drill stores it as the last mode and shows its own sets", drillPrefs.mode === "drill" && (await b.eval("[...document.querySelectorAll('.set-toggles .toggle')].filter((t) => t.getAttribute('aria-pressed') === 'true').map((t) => t.textContent).join()")) === "F2L,2-Look OLL,2-Look PLL");
  await b.eval(CLICK_TOGGLE("F2L")); await b.eval(CLICK_TOGGLE("2-Look OLL")); await b.eval(CLICK_TOGGLE("2-Look PLL"));
  const kept = (await b.eval(STORED)).prefs.sets;
  check("Drill's toggles leave Learn's selection alone, and the last set stays on", kept.drill.join() === "2-Look PLL" && kept.learn.join() === "2-Look PLL", JSON.stringify(kept));
  await b.eval(CLICK_TOGGLE("F2L")); await b.eval(CLICK_TOGGLE("2-Look OLL"));
  await b.goto(APP);
  check("a reload opens on Drill", (await b.eval("[...document.querySelectorAll('.modes .toggle')].find((t) => t.getAttribute('aria-pressed') === 'true').textContent")) === "Drill");
  await b.key(" ");
  now = await s();
  check("Start runs Drill: Reveal and Next only, count 1", now.cardMode === "drill" && now.shownButtons.join() === "Reveal,Next" && now.count === "1", JSON.stringify(now.shownButtons));
  await b.key(" ");
  check("space reveals in Drill", (await s()).revealed);
  await b.key("1");
  check("1 does nothing in Drill", (await s()).count === "1");
  let repeats = 0;
  let last = (await s()).alg;
  for (let i = 0; i < 80; i++) { await b.key("2"); const alg = (await s()).alg; if (alg === last) repeats++; last = alg; }
  now = await s();
  check("80 presses of 2 advance to card 81 without an immediate repeat", now.count === "81" && repeats === 0, `count ${now.count}, repeats ${repeats}`);
  check("a new card starts hidden", !now.revealed);
  console.log("shot:", await b.shot("phone-drill"));
  check("Drill wrote no card", JSON.stringify((await b.eval(STORED)).cards) === cardsBefore);
  await b.eval("document.querySelector('.logo').click()");
  check("the logo leaves Drill for home", (await s()).home);

  await b.viewport(1280, 800, false);
  console.log("shot:", await b.shot("desktop"));
  b.close();
  console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  process.exitCode = failed === 0 ? 0 : 1;
}

// Pixel classification for the WebGL 3D prototype (three-d.html), set up
// once per page load. Colors are the exact values from src/ui/three-d/
// palette.ts and gl-shaders.ts's EDGE_COLOR/gl-scene.ts's clear color — a
// second hand-copy, not an import, since this runs inside the page with no
// module loader for app source. BG is deliberately not pure white: D's own
// face color is pure white, so a background leak inside the silhouette must
// be distinguishable from a genuine D face by color alone.
const CLASSIFIER_SETUP = `(() => {
  const canvas = document.querySelector("#canvas");
  const gl = canvas.getContext("webgl2");
  const PALETTE = {
    U: [255, 229, 0], D: [255, 255, 255], F: [0, 214, 90], B: [30, 107, 255],
    R: [255, 122, 0], L: [255, 45, 45], EDGE: [26, 26, 26], BG: [217, 217, 217],
  };
  function nearest(r, g, b) {
    let best = null, bestDist = Infinity;
    for (const name in PALETTE) {
      const [pr, pg, pb] = PALETTE[name];
      const d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
      if (d < bestDist) { bestDist = d; best = name; }
    }
    return { name: best, dist: Math.round(Math.sqrt(bestDist)) };
  }
  window.__gl3d = {
    sample(fx, fy) {
      const dpr = window.devicePixelRatio || 1;
      const cssX = canvas.clientWidth / 2 + fx * canvas.clientWidth;
      const cssY = canvas.clientHeight / 2 + fy * canvas.clientHeight;
      const px = Math.round(cssX * dpr);
      const py = Math.round((canvas.clientHeight - cssY) * dpr);
      const buf = new Uint8Array(4);
      gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      return { r: buf[0], g: buf[1], b: buf[2], ...nearest(buf[0], buf[1], buf[2]) };
    },
    // Calibrated against the default locked camera on a solved cube: each is
    // deep enough inside one sticker's interior to read a pure, unblended
    // color at rest (see the probe session that picked them), not merely
    // "somewhere on the cube" the way a dense pixel scan would be — a scan
    // like that inevitably lands on the antialiased blend band along every
    // grid line and silhouette edge, which is correct rendering, not a
    // defect, and swamps a distance-from-nearest-color threshold with false
    // positives. This instead asks the one question the historical bugs
    // here were actually about: is there a background gap where a sticker
    // clearly belongs, under a move or a small camera nudge.
    INTERIOR_POINTS: [
      [-0.2, -0.2], [0.2, -0.2], [0, -0.4], [-0.2, 0], [0.2, 0], [-0.2, 0.2], [0.2, 0.2],
    ],
    checkInterior() {
      return window.__gl3d.INTERIOR_POINTS.map(([fx, fy]) => ({ fx, fy, ...window.__gl3d.sample(fx, fy) }));
    },
    frameDiff(setupMovesText, moveText, fraction) {
      const w = canvas.width, h = canvas.height;
      const read = () => {
        const buf = new Uint8Array(w * h * 4);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        return buf;
      };
      window.__threeD.renderAt(setupMovesText, moveText, fraction);
      const a = read();
      window.__threeD.renderAt(setupMovesText, moveText, fraction);
      const b = read();
      let diff = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++;
      return diff;
    },
  };
  return true;
})()`;

async function threeDCheck() {
  const b = await connect();
  let failed = 0;
  const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  [${detail}]` : ""}`); };

  await b.send("Page.enable");
  await b.viewport(480, 700, false);
  await b.goto(`${APP}three-d.html?debug=1`);
  await b.sleep(400);
  await b.eval(CLASSIFIER_SETUP);

  // Chirality: SPEC.md's yellow-up/green-front/orange-right cube, on the
  // default locked camera, solved. A handedness bug in mat4's lookAt or
  // perspective mirrors this and nothing else here would catch it.
  const u = await b.eval("window.__gl3d.sample(0, -0.3)");
  const f = await b.eval("window.__gl3d.sample(-0.22, 0.1)");
  const r = await b.eval("window.__gl3d.sample(0.22, 0.1)");
  check("U is on screen-top", u.name === "U", JSON.stringify(u));
  check("F is on screen-left", f.name === "F", JSON.stringify(f));
  check("R is on screen-right", r.name === "R", JSON.stringify(r));

  // Back-face culling + winding: two renders of the same paused frame must
  // be pixel-identical. Without culling, two exactly coincident faces at an
  // internal boundary (the turning layer's underside against the stationary
  // layer's top) z-fight, and which one wins can differ frame to frame.
  for (const move of ["U", "M", "r"]) {
    const diff = await b.eval(`window.__gl3d.frameDiff("", "${move}", 0.5)`);
    check(`no z-fighting: two renders of the same paused ${move} 50% frame are identical`, diff === 0, `${diff} differing bytes`);
  }

  // Paused mid-move: no background bleeding into the silhouette at any of
  // the calibrated interior points — the historical bug class here (seam
  // gaps, overhanging plates) showed up exactly this way. The points are
  // calibrated against the solved cube at rest; a moving layer can rotate a
  // sticker's true color away from a point's rest-state color, so this only
  // asserts "still some face, not the gray background", not which face.
  for (const move of ["U", "M", "r"]) {
    for (const fraction of [0.25, 0.5, 0.75]) {
      await b.eval(`window.__threeD.renderAt("", "${move}", ${fraction})`);
      const interior = await b.eval("window.__gl3d.checkInterior()");
      const gaps = interior.filter((p) => p.name === "BG");
      check(`${move} at ${fraction * 100}%: no background gap at any interior point`, gaps.length === 0, JSON.stringify(gaps));
    }
  }

  // Yaw/pitch sweep on the solved cube: camera.ts uses the raw drag pixel
  // delta as a degree value, so a 5px step is a precise 5 degree nudge.
  await b.eval('window.__threeD.renderAt("", "U", 0)'); // back to a plain solved frame, camera locked
  await b.eval("document.querySelector('#freecam').click()");
  const cx = 240, cy = 200;
  for (const [label, dx, dy] of [["yaw +5", 5, 0], ["yaw +5", 5, 0], ["pitch +5", 0, 5], ["pitch +5", 0, 5], ["yaw -5", -5, 0], ["pitch -5", 0, -5]]) {
    await b.dragStep(cx, cy, dx, dy);
    const interior = await b.eval("window.__gl3d.checkInterior()");
    const gaps = interior.filter((p) => p.name === "BG");
    check(`after ${label}: no background gap at any interior point`, gaps.length === 0, JSON.stringify(gaps));
  }

  b.close();
  console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
  process.exitCode = failed === 0 ? 0 : 1;
}

async function shot([name = "app", width = "390", height = "844"]) {
  const b = await connect();
  await b.send("Page.enable");
  await b.viewport(Number(width), Number(height), Number(width) < 768);
  await b.goto(APP);
  console.log(await b.shot(name));
  b.close();
}

async function evaluate([expression]) {
  const b = await connect();
  console.log(JSON.stringify(await b.eval(expression)));
  b.close();
}

// Real key events, so the app's typing, modifier and repeat guards are exercised.
async function press(keys) {
  const b = await connect();
  for (const key of keys) await b.key(key === "space" ? " " : key);
  b.close();
}

const [command, ...args] = process.argv.slice(2);
const commands = {
  up: start, down: stop, smoke, shot: () => shot(args), eval: () => evaluate(args), key: () => press(args),
  "three-d": threeDCheck,
};
if (!commands[command]) {
  console.error("usage: driver.mjs up | down | smoke | shot NAME [W H] | eval JS | key KEY... | three-d");
  process.exit(2);
}
await commands[command]();
