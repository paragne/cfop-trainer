# CFOP Trainer

Flashcard trainer for Rubik's Cube CFOP: F2L, 2-look OLL, 2-look PLL.
Static site. No backend. Deployed to Cloudflare Workers static assets at cfop.paragone.dev.

## Stack

- TypeScript, strict mode, no `any`.
- Vite. Vanilla DOM. No React, no Vue, no Svelte, no framework.
- No state management library. No UI component library. No CSS framework.
- Vitest for tests.
- Total production dependencies target: zero. Ask before adding any.

## Architecture

Module boundaries are load-bearing. Do not cross them.

- `src/data/algorithms.ts` — the 57 case definitions. Pure data. Never inline case
  data anywhere else. Never generate case data at runtime.
- `src/lib/cube.ts` — facelet model and move engine. Pure functions only.
  No DOM access, no imports from src/ui or src/data. This module must be
  independently testable.
- `src/lib/notation.ts` — parses move strings into move tokens. Pure.
- `src/lib/case-state.ts` — turns a Case into the cube state to display: setup,
  normalize, then mask. Pure. May import types from src/data; no DOM, no storage.
- `src/lib/render.ts` — takes a cube state, returns an SVG string. No app state.
- `src/lib/srs.ts` — SM-2 scheduling. Pure functions. Takes a card record and a
  grade, returns a new card record. Never reads or writes storage itself.
- `src/lib/storage.ts` — the only module in the repo that touches localStorage.
  Exposes load(), save(), exportJson(), importJson(). If any other file
  references `localStorage`, that is a bug.
- `src/ui/` — DOM. The only place querySelector and addEventListener appear.
- `src/main.ts` — wiring only.

Case images are computed, never stored. A case is defined by its solution
algorithm plus a mask. The displayed state is the solved state with the inverse
of the solution applied, with unmasked facelets rendered gray.

## Rules

- No file over 200 lines. Split before you exceed it. Exempt: src/data/, which
  holds flat case records and is capped by hand-verification, not by line count.
- No file named utils, helpers, common, shared, misc, or index (except entry points).
- No `any`, no `as` casts to silence the compiler, no `@ts-ignore`.
- No abstraction with a single caller. Inline it.
- No options object parameters with fewer than three fields.
- No error handling for states that cannot occur. Throw on programmer error,
  handle only genuine runtime conditions (corrupt localStorage, bad import file).
- Comments explain why, never what. Delete any comment that restates the code.
- No dead code, no commented-out code, no TODO comments. Open an issue instead.
- Prefer deleting code over adding a flag to preserve old behavior.
- No console.log in committed code.
- If a test fails, diagnose before editing. State whether the code or the test
  is wrong and why, and wait for my decision before changing a test to make it pass.
- A test that cannot fail is not a test. If an assertion is true for any possible
  implementation, say so rather than counting it as coverage.
- Do not add Co-Authored-By trailers to commit messages.

## Testing

`src/lib/cube.ts` is the module with provable correctness. Test it hard:

- Every move applied 4 times returns to identity.
- (R U R' U') applied 6 times returns to identity.
- Sune has order 6: applied 6 times it returns to identity, and 3 times it does not.
- For every one of the 57 cases: apply the inverse of the solution to a solved
  cube, then apply the solution. The result must be solved. This test validates
  the entire data file and must pass before any case is considered correct.
- Notation parser round-trips: parse then stringify equals the input.
- F2L structural tests cannot detect a wrong or missing U turn, since deleting a
  U turn yields a different but valid F2L case. U turns in src/data/algorithms.ts
  are verified by hand only.

`src/lib/srs.ts`: test that a failed card resets interval to 1, that ease factor
floors at 1.3, and that intervals grow monotonically on repeated success.

## Workflow

- Propose a plan before writing code for anything over roughly 50 lines.
  Wait for approval.
- One logical change per commit. Conventional commit format.
- Run `npm run check` (typecheck + lint + test) before claiming a task is done.
  Do not report success on a failing check.
- Never pipe a verification command through tail, head, or grep in a way that
  discards its exit code. Run `npm run check` on its own and report the real
  exit status before committing.
- Never run `git push`. Never run `wrangler deploy`. I deploy.
- Do not modify `src/data/algorithms.ts` without telling me explicitly which
  case you changed and why. That file is hand-verified.

## Accessibility and scope

- Keyboard first: space reveals solution, 1 marks unknown, 2 marks known,
  n hides/shows the case name.
- Works offline after first load.
- No analytics, no telemetry, no external requests at runtime.

## Visual design

Dense, fast, high-contrast. This is a drilling tool used with a cube in one
hand, not a marketing page.

- Dark background, near-black. The cube renders bright against it.
- One accent color, used only for the primary action. Everything else is
  grayscale.
- System font stack. No web fonts, no font loading.
- Sharp or minimally rounded corners. No shadows, no gradients, no glass
  effects, no animated transitions except where they convey state change.
- The case picture is the largest element on screen by a wide margin.
  Everything else is chrome.
- Primary actions sit in the lower third, reachable by thumb on a phone.
- No modal dialogs. Notes edit in place.
- Design mobile-first, single column, then let it breathe on desktop. Do not
  design a desktop layout and shrink it.
