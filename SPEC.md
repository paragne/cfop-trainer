# CFOP Driller Specification

## Purpose

Flashcard-style trainer for CFOP. Distinguishing feature versus existing trainers:
the default mode is honor-code recall, not cube input. A case is shown, you solve
it in your head or on a physical cube, then self-grade. Stats drive what you see
next.

Scope for v1: F2L (41 cases), 2-look OLL (10 cases), 2-look PLL (6 cases).
v2 adds Full OLL (57) and Full PLL (21); see the v2 section. J Perm's
Advanced (36) and Expert (17) F2L follow as their own sets.

## Data model

A case is defined by its solution, not by a picture.

```ts
type Case = {
  id: string;              // "f2l-disconnected-3", stable, never reused
  group: Group;            // "F2L" | "OLL" | "PLL"
  sets: CaseSet[];         // v2: membership tags, see v2 Case sets. One case, one id, one SRS record, however many sets list it
  section: string;         // "Disconnected Pairs", "Finish OLL", "Finish PLL"
  name: string | null;     // "Sune", "Ua Perm". null where no standard name exists.
  aliases: string[];       // ["OLL 27", "Double Sune"]
  algs: Alg[];             // one or more; algs[0] is primary
  mask: Mask;              // which pieces are colored; rest render gray
  setup: string | null;    // optional override, played on a solved cube as-is; if null, setup = inverse(algs[0])
  videoUrl: string | null; // J Perm timestamp link, supplied later
};

type CaseSet =
  | "F2L" | "Advanced F2L" | "Expert F2L"   // "F2L" is labeled "Basic F2L"
  | "2-Look OLL" | "2-Look PLL" | "Full OLL" | "Full PLL";

type Alg = {
  display: string;         // "U' (R U R') [U2 R U' R']" — parens preserved
  moves: string;           // "U' R U R' U2 R U' R'" — parser input
  affectsOtherSlots?: boolean; // F2L only: J Perm's highlighted algs
};

type Mask =
  | { kind: "f2l"; slot: "FR" | "FL" }   // cross, target pair, and any displaced F2L piece
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

Apart from a `setup` override, every displayed alg must solve the displayed
picture exactly, with no AUF tolerance. A source alg for an existing case can
solve the picture only up to AUF, since sheets often write one U turn off from
the picture. That alg is added as an alternate with the missing U turns
prepended and/or appended, in both `display` and `moves`. For PLL this includes
a trailing AUF, because a PLL alg must leave the cube solved. `algs[0]` of an
existing case is never changed, and every added U turn is stated in the commit
message. The same holds for a whole-cube rotation: an F2L source that presents
every case in the front-right slot needs a y rotation prepended to solve a case
shown in the front-left slot, and a y already leading the alg merges with it.

For F2L, "solves" means every F2L piece ends solved, with one exception. An alg
marked `affectsOtherSlots` (J Perm highlights these as affecting more than one
slot) must solve the target pair and keep the cross, but may leave another slot
unsolved. The solution marks it "multi-slot", and it is never `algs[0]`.

The F2L mask colors the white cross, the non-U centers, the target corner and
edge, and every other F2L piece (D-layer corner or E-slice edge) that the setup
leaves unsolved. On a Basic case the target pair is the only unsolved one, so
nothing else is colored. On an Advanced or Expert case the target can sit in a
back slot, hidden from the camera, and the colored pieces of the slot it
displaced are what keep the picture recognizable. Which pieces count as
displaced is fixed once from the case's setup, so the 3D view masks the same
physical pieces throughout an animation.

A source picture that shows a physically impossible state is a defect in the
source, not in the data. Report it with the reasoning and do not adjust the
case to match it.

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

### 1. Learn (default)

- Pick sets to drill: any combination of F2L, 2-Look OLL, 2-Look PLL, Full OLL,
  Full PLL.
- One case shown at a time as a computed SVG.
- Controls: reveal/hide solution, reveal/hide case name, show/hide notes, edit
  notes.
- Grade: "Know it" or "Don't know it".
- Grading feeds the scheduler. Next case is drawn from the due queue.
- Name visibility is a sticky stored preference: it is the visible state, and
  toggling it carries across cards.
- Note visibility is a sticky stored preference, on by default. Hiding notes
  never removes the edit button, so a note can still be written.
- Solution auto-reveal is a sticky stored preference, off by default. Revealing
  the solution for the current card is per-card state that resets on every new
  card. Revealing must never write the preference, or one reveal would show
  every later solution and defeat honor-code recall.

### 2. Verify (no honor code)

- Home screen: chosen sets (every F2L set excluded, and their toggles disabled
  while Verify is selected), in `prefs.sets.verify`. There is no session length:
  like Drill, Verify runs until the user goes home.
- Start screen: "Hold a solved cube yellow up, green front." and Begin.
- Each step shows the case picture as in Learn, name hideable, turned by the
  random AUF like any other card. The user executes that case's algorithm on
  their physical cube from whatever state it is in; the cube in hand will not
  look like the pictured case, since the check is on the result, not the setup.
- Check reveals the expected state: the cumulative engine state after every
  algorithm so far (this step's AUF-prefixed algorithm applied to wherever the
  previous step left the cube), top view, no mask, never normalized. The
  un-normalized state is exactly the physical cube as held after executing,
  including any net rotation. One alg, `oll-42`, leaves centers displaced; when
  the expected state needs a whole-cube rotation to restore home centers
  (green front, yellow up), Check names that rotation as an instruction, and
  Match applies it to the engine state directly rather than normalizing, since
  normalizing recolors stickers in place instead of physically relocating
  them and is not equivalent for this case.
- When a case's algs disagree on where it lands from the current cube (not
  just on solving it), Check offers "Expected if you used:" with each
  alternate's display text, AUF included. This is computed per case, not
  hardcoded: today it is `oll-24` and `oll-25`, whose alternates orient the
  case correctly but permute it differently. A PLL alternate is always the
  identical permutation and never triggers this. The selected alg is what the
  expected picture shows and what Match advances the engine state by.
- The user answers Match or Mismatch. Mismatch shows the correct algorithm(s)
  and offers Reset: the user solves their physical cube, the engine state
  returns to solved, and the session continues.
- Session tally only, shown in the header as the step and the matches so far. Verify never reads or writes `cards`, so it neither
  feeds nor is fed by the scheduler.
- No immediate case repeats, using the same shuffle bag as Drill. `chosen`
  (see above) resets to `algs[0]` at the start of every step.

### 3. Random rotation

- Toggle available in all three modes: Learn, Drill and Verify, persisted as
  `prefs.randomRotation` (default off).
- Applies a random AUF (U, U', U2, or nothing) to the displayed OLL or PLL
  state before rendering. No y rotation: a y rotation moves the centers, which
  would need normalizing to display, defeating the point of a rotation the
  user is meant to notice.
- Forces recognition from any angle rather than memorizing one picture.
- Never applied to F2L cases: a U turn on an F2L picture is a different case,
  not the same one from another angle, since the U layer is part of what
  defines the pair. When a Learn or Drill selection mixes F2L with OLL or PLL
  sets, the toggle affects only the OLL and PLL cards.
- Every displayed algorithm still solves the displayed picture: the AUF is
  prepended to the shown solution, merging with the algorithm's own leading U
  turns if it has any (`U' U R` displays as `R`, not `U' U R`) so no shown
  algorithm carries a redundant pair of U turns.
- In Verify, that AUF is part of what the user executes and part of the
  expected state.

### 4. Shuffle

- Toggle available in all three modes, persisted as `prefs.shuffle` (default on).
- On: Learn draws its due cases in random order, and Drill and Verify draw from
  a shuffle bag.
- Off: every mode walks the chosen sets in the order the home screen lists them,
  top to bottom (Basic, Advanced and Expert F2L, 2-Look OLL, Full OLL, 2-Look
  PLL, Full PLL), each set in the order of the data file. A case in two chosen
  sets appears once, with the earlier set. Drill and Verify wrap to the top and
  never repeat the case just shown. Learn queues the first due cases in that
  order, and the fill after them takes the weakest cards, ties in that order.
- A first-time user has every case due, so Learn's first session is a random
  twenty with shuffle on.

## Notes

Per-case freeform text, unlimited length, plain text. Stored with the user's
progress. Included in export. Shown on the card at the right of the name's row,
never wider than 40% of the card, so it stays clear of the 60% line. It is
clamped to four lines with an ellipsis, and clicking it opens it to its full
length. It is visible while the solution is hidden, since a note is often the
memory hook that lets you recall the alg without seeing it. The Notes toggle
hides the text. Writing starts from the edit button in the top bar, beside 3D,
and happens in place.

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

`localStorage`, single key `cfop-trainer-v1` (a name, not a version; the version
lives in the blob), single JSON blob:

```json
{
  "version": 2,
  "updatedAt": 0,
  "prefs": {
    "showNames": true,
    "showSolutions": false,
    "showNotes": true,
    "randomRotation": false,
    "shuffle": true,
    "mode": "learn",
    "sets": {
      "learn": ["F2L", "2-Look OLL", "2-Look PLL"],
      "drill": ["F2L", "2-Look OLL", "2-Look PLL"],
      "verify": ["2-Look OLL", "2-Look PLL"]
    }
  },
  "cards": { "f2l-easy-1": { "ease": 2.5, "interval": 1, "...": null } },
  "notes": { "f2l-easy-1": "insert from the back, don't rotate" }
}
```

`prefs.sets` holds one selection per mode, each a list of case sets. A list may
be empty: every set can be switched off, and Start is disabled until one is on.
The values above are the defaults, and a missing mode takes its default. The
full sets are opt-in, since they add about a hundred cases to a session queue of
twenty. Verify never offers an F2L set; it excludes them by group, so every F2L
set is covered. The Advanced and Expert F2L sets are opt-in too. Adding a set
needs no version bump: stored set ids are only ever added to.

`prefs.mode` is the last mode used, and the home screen opens on it. It holds
only a mode that has shipped: `learn`, `drill` or `verify`.

`prefs.randomRotation`, `prefs.shuffle` and `prefs.showNotes` were added after
v2's first release. A missing pref loads as its default, so adding one needs no
version bump. `prefs.verifyLength` was removed when Verify lost its session
length; a stored one is ignored. `prefs.speed` is one of 0.2, 0.5, 1, 2, 4 or
10, and a stored value from the earlier slider snaps to the nearest, a tie going
to the slower.

### Version 1 to 2

Version 2 replaced `prefs.groups` (one list of `F2L`, `OLL`, `PLL`) with
`prefs.sets`. `migrateV1toV2` maps the groups to the Learn selection: `F2L` to
`F2L`, `OLL` to `2-Look OLL`, `PLL` to `2-Look PLL`, since the full sets did not
exist. Drill and Verify take their defaults. `cards`, `notes` and `updatedAt`
pass through untouched. Malformed groups are passed through unmapped, so the
ordinary v2 reader rejects them and there is one definition of valid.

Migration runs in `parseProgress`, so both a stored blob and an imported v1
export file go through it, and the first save writes version 2.

Before that first save, `load()` copies the raw v1 text to
`cfop-trainer-v1:pre-v2`, once: an existing copy is never replaced. localStorage
is per browser, so an Export file only protects the device it came from. Like the
`:unreadable` stash, the copy is best effort, and importing a file does not write
it. A blob with any other version is set aside under `:unreadable` and progress
starts fresh; it is never overwritten.

Not cookies. Cookies cap at 4KB per domain and are transmitted on every request
for no benefit here. localStorage gives 5MB+ and the same zero-backend property.

Wipe: removes the blob and both set-aside copies (`:unreadable` and `:pre-v2`)
from the browser, and the app returns to defaults. It asks for a second press on
the button, since a dialog is not allowed.

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

## Non-goals

- No accounts, no server, no sync between devices beyond JSON export/import.
- No timer, no scramble generator, no solve reconstruction.
- No webcam or bluetooth cube input.
- No 3D animation in v1. Planned as its own version: an optional mode that
  renders the cube in 3D and animates each move of an algorithm as a visible
  layer rotation, primarily to teach F2L pair intuition.

  Available in every mode. Speed is a persisted pref, chosen from a grid of six
  (0.2x, 0.5x, 1x, 2x, 4x, 10x) under "Playback Speed", opened from a button
  that shows the current speed. The transport row is speed, go to start, step
  back, play, step forward, go to end. Left and right step; down and up snap to
  the start and the end without animating. The play button reveals the solution, so
  it is unavailable until the solution is revealed in Learn and Drill, and
  until after the attempt in Verify.

  Camera: locked by default, following whole-cube rotations and the rotation
  component of wide moves. In F2L a small cube names the top, left and right
  faces as notation does, from where the centers are at each rest point: F, U, R
  at the start (L, U, F for a front-left case), and after a y' it reads R, U, B.
  It is hidden in a free orbit. Optional free cam: orbit by drag at a fixed radius,
  radius adjustable by slider.

  Technology undecided. Evaluate CSS transform-style: preserve-3d first, since
  it needs no dependency. Its known limitation is painter's-algorithm sorting
  rather than a z-buffer, which can misorder faces mid-rotation and at some
  orbit angles; mitigate by rendering 54 outward stickers rather than 26
  solid cubies. If sorting proves unacceptable under free cam, move to WebGL,
  preferring OGL or a raw WebGL2 context over Three.js.

  The hard part either way is decomposing wide moves, slices and whole-cube
  rotations into which cubies turn about which axis, since the engine stores
  these as composed permutations.

  Keep cube state and rendering separate so an animated view can be swapped in
  without touching cube.ts or case-state.ts.

## v2

### Case sets

Seven sets, selectable independently: Basic F2L, Advanced F2L, Expert F2L,
2-Look OLL, 2-Look PLL, Full OLL, Full PLL. A set is a membership tag and a case
may belong to several. A case exists once, with one id, one mask and one SRS
record, however many sets include it.

- Basic F2L is stored as the id `F2L`, which predates the other F2L sets and
  keys real stored prefs. Only its label says "Basic".
- Advanced and Expert F2L come from J Perm's F2L sheet, Sections 2 and 3, each
  case presented in the front-right slot. Section 1 of the same sheet adds
  alternates to the Basic cases rather than new cases.
- A set with no cases is not offered: it gets no home toggle and no stat row.
- An Advanced or Expert cell may pool algorithms for loose-piece arrangements
  its picture does not distinguish; only those solving the displayed state are
  kept.

- OLL 21-27 belong to both 2-Look OLL and Full OLL.
- Ua, Ub, H and Z belong to both 2-Look PLL and Full PLL.
- pll-corners-adjacent and pll-corners-diagonal are separate from full-PLL T
  and Y: different mask, different recognition task.
- The three cross cases belong to 2-Look OLL only.
- Existing case ids are frozen. They key real stored progress.

### Modes

- Learn: the existing SRS flashcard mode.
- Drill: endless random cycling over the chosen sets. Same card screen, with
  the grade buttons replaced by Next, which is the Enter key. Enter yields to a
  focused button, link or field, where it already activates them. No immediate repeats.
  Nothing graded, scheduled or recorded; notes stay editable, since a note is
  the user's own text and not a grade. Cards come from a shuffle bag: every
  case in the chosen sets once in random order, then a reshuffle whose first
  card is never the one just shown.
- Verify: see Mode 2 above. Endless, no honor code.
- Each mode remembers its own set selection.

- Gallery: a browsable grid of every case in the chosen sets, in the order the
  home screen lists them, grouped by section, a case in two sets shown once.
  Its set selection, `prefs.sets.gallery`, defaults to every set and takes F2L
  sets; a stored blob without it loads the default, so no version bump.
  Choosing a case opens the Drill card layout with the solution always shown
  and no Reveal, grade or Next button; notes, stars and 3D work as there. A
  large Back control at the top left returns to the grid at the scroll position
  left. Gallery records no grades, scheduling or timing. Shuffle and Random AUF
  do not apply and are hidden while it is selected.

### Layout

No sidebar. The home screen is the navigation.

- Top bar: logo centered, returns home. On the home screen a menu button at the
  left opens Save Data, Load Data, Wipe Data and Share (which copies
  https://cfop.paragone.dev), and a `?` at the right opens a how-to, both in
  place under the bar with no dialog. Leaving a session via the logo needs no
  confirmation, since grades save on each tap.
- Home, top to bottom: the mode selector; the F2L sets (Basic, Advanced,
  Expert); 2-Look OLL and Full OLL; 2-Look PLL and Full PLL, each row narrower
  than the last; a small Shuffle and Random AUF pair; stats; a credit line
  ("Paragone on GitHub" and the version from `package.json`) at the bottom
  right; and one Start button in the accent color, pinned at the bottom where a
  thumb reaches it. Start is disabled when the mode has no sets selected. The
  selector lists only modes that exist.
- Verify disables the F2L toggles.
- Stats, per set: cases seen out of total, accuracy (known over seen, summed
  over the set's cases), due count. A case in two sets counts in both. Due
  counts every case the session queue would take: never seen, or `due <= now`.
  The rows run in the order the sets are listed above and take the colors of the
  rainbow in that order, red to violet.
- The card screens carry the Names, Auto-reveal and Notes toggles (Verify has
  neither Auto-reveal nor Notes). On a phone they take a row under the bar so
  the logo stays centered. Set toggles live only on the home screen.

### Brand

Logo pack designed outside the app, committed as static files. `logo-mark.svg`
(transparent mark) is the top-bar button, in `src/assets/`. The favicons,
apple-touch-icon, PWA icons and `site.webmanifest` are in `public/`, served from
the site root. The accent color matches the mark's violet.

### Contact sheet

Permanent debug page, no longer throwaway. Shipped in every build at
/contact-sheet.html, unlinked, with a noindex meta tag. Shows every case in
every set.
