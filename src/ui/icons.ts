// Constant markup, never built from user text. Material Design Icons
// (Apache-2.0), drawn in currentColor so they follow their button.
const icon = (size: number, path: string) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;

export const SHUFFLE_ICON = icon(
  20,
  "M17,3L22.25,7.5L17,12L22.25,16.5L17,21V18H14.26L11.44,15.18L13.56,13.06L15.5,15H17V12L17,9H15.5L6.5,18H2V15H5.26L14.26,6H17V3M2,6H6.5L9.32,8.82L7.2,10.94L5.26,9H2V6Z",
);

export const MENU_ICON = icon(24, "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z");

export const HELP_ICON = icon(
  24,
  "M15.07,11.25L14.17,12.17C13.45,12.89 13,13.5 13,15H11V14.5C11,13.39 11.45,12.39 12.17,11.67L13.41,10.41C13.78,10.05 14,9.55 14,9C14,7.89 13.1,7 12,7A2,2 0 0,0 10,9H8A4,4 0 0,1 12,5A4,4 0 0,1 16,9C16,9.88 15.64,10.67 15.07,11.25M13,19H11V17H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z",
);

// Camera flip: the same cube seen from another turn of the top layer.
export const AUF_ICON = icon(
  20,
  "M20 5H17L15 3H9L7 5H4C2.9 5 2 5.9 2 7V19C2 20.11 2.9 21 4 21H20C21.11 21 22 20.11 22 19V7C22 5.9 21.11 5 20 5M5 12H7.1C7.65 9.29 10.29 7.55 13 8.1C13.76 8.25 14.43 8.59 15 9L13.56 10.45C13.11 10.17 12.58 10 12 10C10.74 10 9.6 10.8 9.18 12H11L8 15L5 12M16.91 14C16.36 16.71 13.72 18.45 11 17.9C10.25 17.74 9.58 17.41 9 17L10.44 15.55C10.9 15.83 11.43 16 12 16C13.27 16 14.41 15.2 14.83 14H13L16 11L19 14H16.91Z",
);

export const THREE_D_ICON = icon(
  24,
  "M5,7H9A2,2 0 0,1 11,9V15A2,2 0 0,1 9,17H5V15H9V13H6V11H9V9H5V7M13,7H16A3,3 0 0,1 19,10V14A3,3 0 0,1 16,17H13V7M16,15A1,1 0 0,0 17,14V10A1,1 0 0,0 16,9H15V15H16Z",
);

// Double chevrons, as on a TV remote: skip to either end of the algorithm.
export const SKIP_BACK_ICON = icon(
  16,
  "M18.41,7.41L17,6L11,12L17,18L18.41,16.59L13.83,12L18.41,7.41M12.41,7.41L11,6L5,12L11,18L12.41,16.59L7.83,12L12.41,7.41Z",
);

export const SKIP_FORWARD_ICON = icon(
  16,
  "M5.59,7.41L10.18,12L5.59,16.59L7,18L13,12L7,6L5.59,7.41M11.59,7.41L16.18,12L11.59,16.59L13,18L19,12L13,6L11.59,7.41Z",
);

// Framing corners around a cube: the view goes back to its frame.
export const CENTER_ICON =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8V3H8"/><path d="M16 3H21V8"/><path d="M3 16V21H8"/><path d="M16 21H21V16"/><path d="M12 6.8L16.5 9.4L12 12L7.5 9.4L12 6.8Z"/><path d="M7.5 9.4L7.5 14.6L12 17.2L12 12"/><path d="M16.5 9.4L16.5 14.6L12 17.2"/></svg>';

export const NOTE_EDIT_ICON = icon(
  20,
  "M18.13 12L19.39 10.74C19.83 10.3 20.39 10.06 21 10V9L15 3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H11V19.13L11.13 19H5V5H12V12H18.13M14 4.5L19.5 10H14V4.5M19.13 13.83L21.17 15.87L15.04 22H13V19.96L19.13 13.83M22.85 14.19L21.87 15.17L19.83 13.13L20.81 12.15C21 11.95 21.33 11.95 21.53 12.15L22.85 13.47C23.05 13.67 23.05 14 22.85 14.19Z",
);
