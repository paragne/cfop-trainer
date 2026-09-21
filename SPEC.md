# CFOP Trainer Specification

## Purpose

Flashcard-style trainer for CFOP. Distinguishing feature versus existing trainers:
the default mode is honor-code recall, not cube input. A case is shown, you solve
it in your head or on a physical cube, then self-grade. Stats drive what you see
next.

Scope for v1: F2L (41 cases), 2-look OLL (10 cases), 2-look PLL (6 cases).
Roadmap: 1-look OLL (57), 1-look PLL (21).

## Data model

A case is defined by its solution, not by a picture.

```ts
type Case = {
  id: string;              // "f2l-disconnected-3", stable, never reused
  group: Group;            // "F2L" | "OLL" | "PLL"
  section: string;         // "Disconnected Pairs", "Finish OLL", "Finish PLL"
  name: string | null;     // "Sune", "Ua Perm". null where no standard name exists.
  aliases: string[];       // ["OLL 27", "Double Sune"]
  algs: Alg[];             // one or more; algs[0] is primary
  mask: Mask;              // which pieces are colored; rest render gray
  setup: string | null;    // optional override, played on a solved cube as-is; if null, setup = inverse(algs[0])
  videoUrl: string | null; // J Perm timestamp link, supplied later
};

type Alg = {
  display: string;         // "U' (R U R') [U2 R U' R']" — parens preserved
  moves: string;           // "U' R U R' U2 R U' R'" — parser input
};

type Mask =
  | { kind: "f2l"; slot: "FR" | "FL" }   // color the slot's corner+edge only
  | { kind: "oll-edges" }                // color U edges only, corners gray
  | { kind: "oll-full" }                 // color all U-layer orientation stickers
  | { kind: "pll-corners" }              // color corners and the full U face; edge side stickers gray
  | { kind: "pll-full" };                // color full last layer
```

The displayed cube state is computed at load time:
`state = applyMoves(SOLVED, setup ?? invert(algs[0].moves))`, then normalized,
then masked. A non-null `setup` is never inverted; it must be solved by
`algs[0]` up to an AUF, which is what lets it pin a different presentation angle.

Rationale: 57 hand-authored sticker layouts are 57 opportunities for a silent
mismatch between the picture and the algorithm. Deriving the picture makes the
data self-validating, and the test suite in CLAUDE.md proves every case.

## Cube engine

54-facelet array, index order U(0-8) R(9-17) F(18-26) D(27-35) L(36-44) B(45-53),
reading left-to-right top-to-bottom per face, U viewed from above, others viewed
head-on.

A move is a permutation table applied to the array. Required move set:

- Faces: U D L R F B, each with ', 2
- Wide: r f (and u d l b for completeness), each with ', 2
- Slices: M E S, each with ', 2
- Rotations: x y z, each with ', 2
- Lowercase `d` in the source algorithms is a wide down move, equal to `D E`, 
  equivalently `y' U`. It is not `D y'`.

`(X)*3` in the source set expands to `X X X`. The parser handles this.
Parentheses and square brackets are memorization grouping only. The parser
strips them. They are preserved in `display` because they are pedagogically
meaningful.

Inverting an algorithm: reverse the token order, then invert each token
(`R` to `R'`, `R'` to `R`, `R2` to `R2`).

A y rotation moves the centers, so normalize() undoes it. The display
layer must not call normalize after applying a presentation rotation.
AUF (U, U', U2) is safe because U turns leave centers home.

## Modes

### 1. Flashcard (default)

- Pick groups to drill: any combination of F2L, OLL, PLL.
- One case shown at a time as a computed SVG.
- Controls: reveal/hide solution, reveal/hide case name, edit notes.
- Grade: "Know it" or "Don't know it".
- Grading feeds the scheduler. Next case is drawn from the due queue.
- Name visibility is a sticky stored preference: it is the visible state, and
  toggling it carries across cards.
- Solution auto-reveal is a sticky stored preference, off by default. Revealing
  the solution for the current card is per-card state that resets on every new
  card. Revealing must never write the preference, or one reveal would show
  every later solution and defeat honor-code recall.

### 2. Verify (no honor code)

- Session starts from a solved cube.
- Feeds N randomly chosen 2-look OLL and 2-look PLL cases. Excludes F2L.
- For each case: apply the case setup to the cube state, render it, and show
  the user what the cube looks like.
- User performs the algorithm on their physical cube.
- App then shows the expected resulting state, computed by applying the
  algorithm to the current state. User confirms match or mismatch.
- Mismatch is graded as "don't know it".
- The expected state is always computed. Never hardcode an expected result.

### 3. Random rotation

- Toggle available on both modes above.
- Applies a random y rotation and a random AUF (U, U', U2, or nothing) to the
  displayed state before rendering.
- Forces recognition from any angle rather than memorizing one picture.
- For F2L this means also randomizing which slot is presented, which is why
  slot is part of the mask rather than baked into the data.

## Notes

Per-case freeform text, unlimited length, plain text. Stored with the user's
progress. Included in export. Rendered below the solution when revealed, and
also viewable while the solution is hidden, since a note is often the memory
hook that lets you recall the alg without seeing it.

## Scheduling (SM-2)

Per-case record, stored under the case id in `cards`, so it carries no id of
its own:

```ts
type CardState = {
  ease: number;        // starts 2.5, floor 1.3, cap 3.0
  interval: number;    // days
  reps: number;
  due: number;         // epoch ms
  seen: number;        // lifetime count
  known: number;       // lifetime "know it" count
  lastGrade: 0 | 1;
};
```

On "know it": reps += 1. Interval becomes 1 on first success, 6 on second,
otherwise `round(interval * ease)`, using the ease from before this grade. Then
ease increases by 0.05, capped at 3.0.
On "don't know it": reps = 0, interval = 1, ease -= 0.2, floor 1.3.
Due = now + interval days.

Session queue: all cases with `due <= now` (including cases never seen),
shuffled. If the due queue is empty or shorter than the session length (20, or
the number of selected cases if that is smaller), fill with the not-due cases
having the lowest `known / seen` ratio. The initial queue never contains a case
twice.

### Learning step

A failed case is not finished for the session. Failing a case and not seeing it
for 24 hours discards the moment the case is actually being learned, so it comes
back while the cube is still in hand.

- "Don't know it" reinserts the card four positions later in the queue, or at
  the end if fewer remain. A card is reinserted at most twice per session, so it
  appears at most three times. After the third failure it is let go, so a case
  that cannot be done yet does not trap the session.
- The first grade a card receives in a session is the only one that can change
  its long-term schedule:
  - First attempt, "know it", card due or never seen: the full update above.
  - First attempt, "know it", card not yet due (a fill card): counters only. The
    scheduler updates `seen`, `known` and `lastGrade`, and leaves `interval`,
    `ease`, `reps` and `due` alone. Otherwise drilling ahead grows intervals
    until nothing is ever due and the scheduler stops mattering.
  - First attempt, "don't know it": the full failure update, due or not.
  - Any later attempt in the same session: counters only.
- So repeated in-session failures do not lower ease again, and a later "know
  it" does not undo the first failure. `seen` and `lastGrade` still move on
  every attempt, so raw accuracy stays honest.
- The session counter shows completed cases over the number of unique cases the
  session started with.

The learning step means a session can present the same case more than once. This
supersedes the earlier rule that no case is shown twice in one session; only the
initial queue is duplicate-free.

Expose raw accuracy per case and per section in a stats view. The user asked
for stats tracking; SM-2 is how those stats get used, not a replacement for
showing them.

## Persistence

`localStorage`, single key `cfop-trainer-v1`, single JSON blob:

```json
{
  "version": 1,
  "updatedAt": 0,
  "prefs": { "showNames": true, "showSolutions": false, "groups": ["F2L", "OLL", "PLL"] },
  "cards": { "f2l-easy-1": { "ease": 2.5, "interval": 1, "...": null } },
  "notes": { "f2l-easy-1": "insert from the back, don't rotate" }
}
```

`prefs.randomRotation` is added when Mode 3 lands. A missing pref loads as its
default, so adding one needs no version bump.

Not cookies. Cookies cap at 4KB per domain and are transmitted on every request
for no benefit here. localStorage gives 5MB+ and the same zero-backend property.

Export: download the blob as `cfop-progress-YYYY-MM-DD.json`.
Import: file picker, validate `version`, merge or replace (ask the user which).
Unknown case IDs in an imported file are dropped with a count reported, not
silently ignored. A `version` mismatch triggers a migration function, never a
silent overwrite.

## Rendering

- F2L: isometric three-face view (U, F, R), matching the convention every F2L
  resource uses. Target slot is front-right; FL cases are rendered by mirroring
  the camera, not by mirroring the data.
- OLL/PLL: flat top-down view of the U face plus the top row of each adjacent
  side face.
- Unmasked facelets render in a neutral gray.
- Colors: yellow-up scheme (U yellow, D white, F green, B blue, R orange, L red).
  R orange, not red, is what keeps the picture from being a mirror image: with
  U yellow and F green the right face is orange.
- v1 renderer: SVG generated as a string from the facelet array, no canvas or
  WebGL. See the 3D animation note under Non-goals for the planned alternative
  renderer.

## Deployment

- Repo on GitHub. Cloudflare Workers static assets, git-connected build.
- Build command `npm run build`, output `dist`.
- `wrangler.jsonc`:

```jsonc
{
  "name": "cfop-trainer",
  "compatibility_date": "2026-09-01",
  "assets": { "directory": "./dist", "not_found_handling": "single-page-application" }
}
```

- Custom domain `cfop.paragone.dev` bound to the Worker.
- Push to `main` deploys production. Branch pushes get preview URLs.
- No Cloudflare credentials in the local dev environment or in any agent's
  permission list. Deployment is triggered by git push only.

## Non-goals for v1

- No accounts, no server, no sync between devices beyond JSON export/import.
- No timer, no scramble generator, no solve reconstruction.
- No webcam or bluetooth cube input.
- No 1-look OLL/PLL. The data model supports adding them without schema change.
- No 3D animation in v1. Planned for a later version: an optional mode that
  renders the cube in 3D and animates each move of an algorithm as a visible
  layer rotation, primarily to teach F2L pair intuition rather than
  memorization.

  Camera: locked by default, following whole-cube rotations (y, x, z) and the
  rotation component of wide moves, so the viewer experiences a reorientation
  the way a solver does. Optional free-cam mode: orbit by drag at a fixed
  radius, radius adjustable by slider.

  Technology undecided. Evaluate CSS transform-style: preserve-3d first, since
  it needs no dependency and animates a layer turn with a single transition.
  Its known limitation is painter's-algorithm sorting rather than a z-buffer,
  which can misorder faces mid-rotation and at some orbit angles; mitigate by
  rendering 54 outward stickers rather than 26 solid cubies. If sorting proves
  unacceptable under free cam, move to WebGL, preferring a minimal library such
  as OGL or a raw WebGL2 context over Three.js, since none of Three.js's
  loaders, materials or lighting are needed here.

  The hard part either way is decomposing wide moves, slices and whole-cube
  rotations into which cubies turn about which axis, since the engine stores
  these as composed permutations rather than layer descriptions.

  Design constraint for v1: keep cube state and rendering separate enough that
  an animated view can be swapped in as an alternative renderer without
  touching cube.ts or case-state.ts.
