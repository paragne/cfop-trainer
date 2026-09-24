/**
 * Tweens between two orthonormal bases over a fixed duration instead of
 * snapping — camera.ts's locked view uses this so a corrective-rotation
 * recompute mid-algorithm doesn't visually snap while an unrelated piece is
 * still mid-turn. A snap is still available (`set(to, true)`) for a fresh
 * case load, where there's no ongoing animation to clash with.
 */
import { rotateByAngle, rotationBetweenFrames } from "../../lib/rotate-by-angle.ts";
import type { Vec } from "../../lib/cube.ts";

const DURATION_MS = 250;

export type Basis = { right: Vec; up: Vec; back: Vec };

export type BasisTransition = {
  current(): Basis;
  set(to: Basis, snap: boolean): void;
  stop(): void;
};

function rotateFrame(basis: Basis, axis: Vec, degrees: number): Basis {
  return {
    right: rotateByAngle(basis.right, axis, degrees),
    up: rotateByAngle(basis.up, axis, degrees),
    back: rotateByAngle(basis.back, axis, degrees),
  };
}

export function createBasisTransition(initial: Basis, onChange: () => void): BasisTransition {
  let current = initial;
  let active: { from: Basis; to: Basis; axis: Vec; totalDegrees: number; start: number } | null = null;
  let rafId: number | null = null;

  function stop(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    active = null;
  }

  function tick(now: number): void {
    if (active === null) return;
    const t = Math.min(1, (now - active.start) / DURATION_MS);
    current = t >= 1 ? active.to : rotateFrame(active.from, active.axis, active.totalDegrees * t);
    onChange();
    if (t >= 1) {
      active = null;
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  }

  return {
    current() {
      return current;
    },
    set(to, snap) {
      stop();
      if (snap) {
        current = to;
        onChange();
        return;
      }
      const { axis, degrees } = rotationBetweenFrames(current, to);
      if (Math.abs(degrees) < 0.5) {
        current = to;
        onChange();
        return;
      }
      active = { from: current, to, axis, totalDegrees: degrees, start: performance.now() };
      rafId = requestAnimationFrame(tick);
    },
    stop,
  };
}
