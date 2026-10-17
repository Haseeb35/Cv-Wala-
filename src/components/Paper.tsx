import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { CV } from "../state/types";

/** A rendered page of the real PDF. Shows a shimmer until the first render, then cross-fades updates. */
export function CvPaper({ cv, width, page = 0, jobAd, className = "", style }: { cv: CV; width: number; page?: number; jobAd?: string; className?: string; style?: CSSProperties }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const { renderPages } = await import("../lib/thumbs");
      const pages = await renderPages(cv, width, { jobAd, maxPages: page + 1 });
      if (live && pages[page]) setSrc(pages[page]);
    }, 90);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [cv, width, page, jobAd]);
  return (
    <div className={`paper ${src ? "" : "skeleton"} ${className}`} style={style}>
      {src && <motion.img key={src} src={src} alt="" initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} draggable={false} />}
    </div>
  );
}

/**
 * Physical 3D tilt: follows the pointer (or a finger, with `touch`) and settles
 * back with a spring. A soft light sheen moves with the angle so it reads as paper.
 */
export function Tilt({ children, max = 10, className = "", touch = false }: { children: ReactNode; max?: number; className?: string; touch?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [max, -max]), { stiffness: 260, damping: 22 });
  const ry = useSpring(useTransform(px, [0, 1], [-max, max]), { stiffness: 260, damping: 22 });
  const gx = useTransform(px, [0, 1], [10, 90]);
  const gy = useTransform(py, [0, 1], [0, 100]);
  // Flat (no 3D transform) at rest: Chrome rasterizes 3D-transformed layers at low
  // resolution, so the CV text is only ever soft while it is actually being tilted.
  const transform = useTransform([rx, ry], ([a, b]: number[]) =>
    Math.abs(a) < 0.05 && Math.abs(b) < 0.05 ? "none" : `perspective(1400px) rotateX(${a}deg) rotateY(${b}deg)`,
  );
  const sheen = useMotionTemplate`radial-gradient(120% 90% at ${gx}% ${gy}%, rgba(255,255,255,0.32), rgba(255,255,255,0) 55%)`;

  return (
    <div className={`stage ${className}`} style={touch ? { touchAction: "pan-y" } : undefined}
      onPointerMove={(e) => {
        // On touch screens only tilt while a finger is down (when enabled), so it never fights scrolling.
        if (reduce || (e.pointerType !== "mouse" && !(touch && e.buttons))) return;
        const r = ref.current!.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
      }}
      onPointerUp={() => {
        px.set(0.5);
        py.set(0.5);
      }}
      onPointerLeave={() => {
        px.set(0.5);
        py.set(0.5);
      }}>
      <motion.div ref={ref} style={{ transform, transformStyle: "preserve-3d", position: "relative" }}>
        {children}
        <motion.div className="sheen" style={{ background: sheen, borderRadius: 6 }} />
      </motion.div>
    </div>
  );
}
