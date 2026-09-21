---
name: run-cfop-trainer
description: Run, build, test, screenshot and drive the CFOP Trainer flashcard app (Vite + vanilla DOM). Use when asked to start the app, take a screenshot of its UI, press keys or click in it, or confirm a UI change works in a real browser rather than only in tests.
---

CFOP Trainer is a static Vite site with no backend. Drive it with
`.claude/skills/run-cfop-trainer/driver.mjs`: it starts the dev server and a
headless Chromium-family browser, then talks to the page over the DevTools
protocol with no dependencies. All paths below are relative to the repo root.

Verified on Windows 11 in Git Bash with Node 24 and Microsoft Edge. Nothing here
has been run on Linux or macOS.

## Prerequisites

- Node 24 was used. The driver needs the global `WebSocket` and `fetch`; older
  versions were not tried.
- `node_modules` installed (the driver launches `node_modules/vite/bin/vite.js`).
- Edge at its default install path. The driver also looks for Chrome and a few
  Linux paths, and honours a `BROWSER` env var, but only Edge is verified.

## Run (agent path)

```bash
node .claude/skills/run-cfop-trainer/driver.mjs up
```

`up` reuses a dev server already answering on the port (your own `npm run dev`)
and starts only what is missing. It prints which it started. `down` stops only
those, never a server or browser it reused.

```bash
node .claude/skills/run-cfop-trainer/driver.mjs smoke
```

`smoke` clears `localStorage`, then drives the core loop with real key events
and prints `PASS`/`FAIL` per check, ending in `ALL PASS`. It exits 1 on any
failure. Checked this session: it goes red when the learning-step gap is broken
and when the typing guard in `src/ui/keys.ts` is removed. It covers reveal,
notes, keyboard guards, grading, the learning step, persistence, group
toggles, the summary, and takes three screenshots.

Ad-hoc poking:

```bash
node .claude/skills/run-cfop-trainer/driver.mjs shot phone
node .claude/skills/run-cfop-trainer/driver.mjs shot wide 1280 800
node .claude/skills/run-cfop-trainer/driver.mjs key space 2 2
node .claude/skills/run-cfop-trainer/driver.mjs eval "document.querySelector('.count').textContent"
node .claude/skills/run-cfop-trainer/driver.mjs eval "JSON.parse(localStorage.getItem('cfop-trainer-v1')).prefs"
```

`shot NAME [WIDTH HEIGHT]` defaults to 390x844 (a phone). `key` takes
`space`, `1`, `2`, `n`, `Escape`, or any single character. Screenshots land in
`%TEMP%\cfop-shots\NAME.png`; the command prints the path. Look at the image; a blank frame means the app failed to load.

```bash
node .claude/skills/run-cfop-trainer/driver.mjs down
```

To use a different dev-server port, set `PORT` for every command:

```bash
PORT=5199 node .claude/skills/run-cfop-trainer/driver.mjs up
```

## Run (human path)

```bash
npm run dev -- --port 5173 --strictPort
```

Open `http://localhost:5173/`. Useless headless.

## Build and test

```bash
npm run check
npm run build
```

`check` is typecheck + eslint + vitest and is the gate CLAUDE.md requires.
`build` writes `dist/` (about 25 kB of JS, no external requests). For a change
confined to `src/lib/`, run just that module's tests:

```bash
npx vitest run src/lib/session
```

## Gotchas

- **State survives between runs.** The browser profile lives in the temp
  directory, so `localStorage` (groups, prefs, cards) persists across `up` and
  `down`. `smoke` clears it first and leaves a PLL-only selection behind, so a
  `shot` right after shows a 6-card PLL session. Reset with
  `eval "localStorage.clear()"`.
- **Real key events, synthetic clicks.** `key` sends `keyDown`/`keyUp` through
  `Input.dispatchKeyEvent`, so the typing, modifier (`Ctrl`) and auto-repeat
  guards behave as in a real browser. Toggles in `smoke` use `.click()`.
- **A fresh browser is on `about:blank`**, which has no app and denies
  `localStorage`. Every command opens the app first if the tab is elsewhere.
- **The tab is chosen by URL.** A download leaves an `edge://downloads-hub/`
  page, and `Emulation.setDeviceMetricsOverride` fails on it with "Target does
  not support metrics override", so the driver attaches to the tab on the app's
  port.
- **`npm run check` lints everything not ignored**, including this directory.
  `.claude/` is in the ignore list in `eslint.config.js` because the driver
  needs `process` and `console`. Without it `check` exits 1.
- **Export and import are not in `smoke`.** They were verified once with the
  protocol's `Browser.setDownloadBehavior` (to capture the file) and
  `DOM.setFileInputFiles` (to fill the hidden file input), but that script is not
  committed.

## Troubleshooting

- **`up` says "reusing the server already on ..." and you did not start one.**
  Something else owns the port, often an earlier `npm run dev` that was never
  stopped. Find it, and stop it yourself only if it is yours:

  ```powershell
  Get-NetTCPConnection -LocalPort 5173 -State Listen | ForEach-Object { Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)" | Select-Object ProcessId, ParentProcessId, CommandLine }
  ```

- **`Error: vite exited while starting; is its port taken?` (exit 1, after a few
  seconds).** Something holds the port without answering HTTP. `down` still stops
  whatever `up` did start. Use `PORT=<other>` for every command.
- **`npm run check` prints `19 failed (19)` with no tests and
  `Cannot read properties of undefined (reading 'config')` at every `describe`.**
  Seen twice in about 36 runs, never reproduced on demand and not explained.
  Rerunning passed every time; the tree was identical.
