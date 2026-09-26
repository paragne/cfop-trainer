import type { Cube } from "../lib/cube.ts";
import type { Move } from "../lib/notation.ts";
import type { Prefs } from "../lib/prefs.ts";
import type { ShownMask } from "../lib/sticker-mask.ts";
import type { ViewFaces } from "../lib/view-faces.ts";
import type { Picker } from "./transport.ts";
import type { PanelSession } from "./three-d/panel-session.ts";

export type StageHandlers = {
  onSpeed: (speed: number) => void;
  onAesthetic: (aesthetic: Prefs["aesthetic"]) => void;
  onZoom: (zoom: number) => void;
  picker: Picker | null;
};

// Everything the 3D view needs to show a cube and play a solution on it, so
// the stage knows nothing about cases: a case screen and a scramble build the
// same thing.
export type Scene = {
  // Which card and turn of it this is: the camera goes back to the locked view
  // when it changes.
  key: string;
  // What is loaded, so a render that changes nothing does not restart playback.
  id: string;
  mask: ShownMask | null;
  start: Cube;
  // Null while the solution is hidden, and with it the controls that play it.
  moves: readonly Move[] | null;
  legend: (session: PanelSession) => ViewFaces | null;
};
