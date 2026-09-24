/**
 * Zoom by mouse wheel and two-finger touch pinch, independent of camera.ts's
 * orbit mode. Reports a factor by which the distance to the cube changed
 * (above 1 is farther), leaving what to do with it to the page. The wheel
 * listener is non-passive and canvas-only, so the page never scrolls while
 * zooming the cube but scrolls normally everywhere else.
 */
type Point = { x: number; y: number };

const WHEEL_FACTOR = 1.06;

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

export function attachZoom(canvas: HTMLCanvasElement, onFactor: (farther: number) => void): void {
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      onFactor(e.deltaY > 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR);
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
    onFactor(pinchDistance / next);
    pinchDistance = next;
  });

  const release = (e: PointerEvent): void => {
    if (e.pointerType === "touch") touches.delete(e.pointerId);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
}
