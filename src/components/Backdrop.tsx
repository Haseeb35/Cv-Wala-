import { useEffect, useMemo } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

// One closed contour around a peak. Low-frequency waves with a phase that drifts
// level by level give the organic, nested look of a real topographic map.
function ring(cx: number, cy: number, r: number, k: number, seed: number): string {
  const pts: [number, number][] = [];
  const n = 90;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const rr = r * (1 + 0.11 * Math.sin(3 * t + seed + k * 0.16) + 0.06 * Math.sin(5 * t - seed * 1.7 + k * 0.1) + 0.025 * Math.sin(9 * t + seed * 2.3));
    pts.push([cx + rr * Math.cos(t) * 1.3, cy + rr * Math.sin(t)]);
  }
  // Catmull-Rom through the points, as cubic Béziers, for smooth curves.
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

const PEAKS = [
  { cx: 860, cy: 120, seed: 0.7, levels: 15 },
  { cx: 90, cy: 930, seed: 2.9, levels: 13 },
];

let drawn = false; // draw the lines in once per session, not on every remount

/**
 * The app's signature backdrop: studio light falling across the page, fine
 * topographic contour lines (with heavier "index" lines every 5th, like a real
 * survey map), a vignette and paper grain. Moves slightly with the pointer.
 */
export function Backdrop() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 18 });
  const sy = useSpring(my, { stiffness: 40, damping: 18 });
  const topoX = useTransform(sx, (v) => v * 14);
  const topoY = useTransform(sy, (v) => v * 10);
  const lightX = useTransform(sx, (v) => v * -26);
  const lightY = useTransform(sy, (v) => v * -18);

  useEffect(() => {
    if (reduce) return;
    const on = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx.set(e.clientX / innerWidth - 0.5);
      my.set(e.clientY / innerHeight - 0.5);
    };
    addEventListener("pointermove", on, { passive: true });
    return () => removeEventListener("pointermove", on);
  }, [reduce, mx, my]);

  const paths = useMemo(
    () => PEAKS.flatMap((p) => Array.from({ length: p.levels }, (_, k) => ({ d: ring(p.cx, p.cy, 34 + k * 38, k, p.seed), index: k % 5 === 4, k }))),
    [],
  );
  const firstDraw = !drawn && !reduce;
  useEffect(() => {
    drawn = true;
  }, []);

  return (
    <div className="bd" aria-hidden>
      <motion.div className="bd-light" style={{ x: lightX, y: lightY }}>
        <i className="beam b1" />
        <i className="beam b2" />
        <i className="beam b3" />
      </motion.div>
      <motion.svg className="bd-topo" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" style={{ x: topoX, y: topoY }}>
        {paths.map((p, i) => (
          <motion.path key={i} d={p.d} className={p.index ? "index" : undefined} vectorEffect="non-scaling-stroke"
            initial={firstDraw ? { pathLength: 0, opacity: 0 } : false}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 0.8, 0.24, 1], delay: 0.15 + p.k * 0.05 }} />
        ))}
      </motion.svg>
      <div className="bd-vignette" />
      <div className="grain" />
    </div>
  );
}
