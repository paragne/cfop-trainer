/**
 * Radius (zoom) control: mouse wheel and two-finger touch pinch, independent
 * of camera.ts's orbit mode (radius is not part of the free/locked basis).
 * The wheel listener is non-passive and canvas-only, so the page never
 * scrolls while zooming the cube but scrolls normally everywhere else.
 */
import type { Camera } from "./camera.ts";

type Point = { x: number; y: number };

const WHEEL_STEP = 0.5;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function attachZoom(canvas: HTMLCanvasElement, radiusInput: HTMLInputElement, camera: Camera): void {
  function setRadius(next: number): void {
    const clamped = Math.min(Number(radiusInput.max), Math.max(Number(radiusInput.min), next));
    camera.setRadius(clamped);
    radiusInput.value = String(clamped);
    // So whoever listens to the slider hears wheel and pinch too.
    radiusInput.dispatchEvent(new Event("input"));
  }

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      setRadius(camera.getRadius() + Math.sign(e.deltaY) * WHEEL_STEP);
    },
    { passive: false },
  );

  // Two active touch pointers only; a mouse/pen drag is camera.ts's own
  // free-cam orbit (attachDrag), untouched here.
  const touches = new Map<number, Point>();
  let pinchDistance = 0;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "touch") return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...touches.values()];
    if (points.length === 2) pinchDistance = distance(points[0], points[1]);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "touch" || !touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = [...touches.values()];
    if (points.length !== 2) return;
    const next = distance(points[0], points[1]);
    setRadius(camera.getRadius() * (pinchDistance / next));
    pinchDistance = next;
  });

  const release = (e: PointerEvent): void => {
    if (e.pointerType === "touch") touches.delete(e.pointerId);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
}
