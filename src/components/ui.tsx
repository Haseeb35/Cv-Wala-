import { useEffect, useId, useRef, useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { CheckCircleIcon, XIcon } from "@phosphor-icons/react";
import { haptic } from "../lib/native";
import { ease, quick, smooth, snappy, tap } from "../lib/motion";

/** A scrollable screen with an iOS large title that collapses into the nav bar. */
export function Screen(props: { title: string; lede?: ReactNode; left?: ReactNode; right?: ReactNode; wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const on = () => setScrolled(el.scrollTop > 30);
    el.addEventListener("scroll", on, { passive: true });
    return () => el.removeEventListener("scroll", on);
  }, []);
  return (
    <motion.div className="screen" ref={ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease }}>
      <div className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div>{props.left}</div>
        <div className="inline-title">{props.title}</div>
        <div>{props.right}</div>
      </div>
      <div className={props.wide ? undefined : "col"}>
        <h1 className="large-title">{props.title}</h1>
        {props.lede && <p className="lede">{props.lede}</p>}
        {props.children}
      </div>
    </motion.div>
  );
}

/** Button with a quick, springy press. */
export function Press({ className = "", onClick, ...rest }: ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      className={className}
      whileTap={tap}
      transition={snappy}
      onClick={(e) => {
        haptic.tap();
        onClick?.(e);
      }}
      {...rest}
    />
  );
}

export const SectionTitle = ({ children, right }: { children: ReactNode; right?: ReactNode }) => (
  <h2 className="section-title">
    <span>{children}</span>
    {right}
  </h2>
);

type FieldProps = { label: string; hint?: ReactNode; warn?: boolean };

export function Field({ label, hint, warn, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input {...input} />
      <AnimatePresence initial={false}>
        {hint && (
          <motion.div className={`hint ${warn ? "warn" : ""}`} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={quick}>
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </label>
  );
}

export function Area({ label, hint, warn, ...input }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea {...input} />
      {hint && <div className={`hint ${warn ? "warn" : ""}`}>{hint}</div>}
    </label>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? "on" : ""}`}
      onClick={() => {
        haptic.select();
        onChange(!on);
      }}>
      <motion.span className="knob" layout transition={snappy} whileTap={{ width: 32 }} />
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value}
          onClick={() => {
            haptic.select();
            onChange(o.value);
          }}>
          {o.value === value && <motion.div className="thumb" layoutId={`seg-${id}`} transition={snappy} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Bottom sheet: springs up, drag down (or tap outside) to dismiss. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" className="backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
          <motion.div key="sh" className="sheet" role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={smooth}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}>
            <div className="grabber" />
            <div className="sheet-head">
              <h3>{title}</h3>
              <Press className="icon-btn filled" onClick={onClose} aria-label="Close" style={{ width: 30, height: 30 }}>
                <XIcon size={15} weight="bold" />
              </Press>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  );
}

let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => {
  haptic.success();
  pushToast(msg);
};
export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    pushToast = (text) => setMsg({ text, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2000);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <AnimatePresence>
      {msg && (
        <motion.div key={msg.id} className="toast glass" role="status" initial={{ y: -70, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -40, opacity: 0, scale: 0.95 }} transition={snappy}>
          <CheckCircleIcon size={20} weight="fill" /> {msg.text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Score ring that counts up when the score changes. */
export function ScoreRing({ score, size = 96, stroke = 9 }: { score: number; size?: number; stroke?: number }) {
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "var(--green)" : score >= 50 ? "var(--orange)" : "var(--red)";
  const [shown, setShown] = useState(0);
  const reduce = useReducedMotion();
  const last = useRef(0);
  useEffect(() => {
    if (reduce) return setShown(score);
    const ctl = animate(last.current, score, { duration: 0.9, ease, onUpdate: (v) => setShown(Math.round(v)) });
    last.current = score;
    return () => ctl.stop();
  }, [score, reduce]);
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`CV score ${score} out of 100`}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--fill)" strokeWidth={stroke} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeDasharray={c}
          initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - score / 100) }} transition={{ duration: 0.9, ease }} />
      </svg>
      <b style={{ fontSize: size * 0.3 }}>{shown}</b>
    </div>
  );
}

/** Async button helper: tracks busy state and surfaces errors. */
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Animates children in and out with height, for lists that grow and shrink. */
export function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={quick} style={{ overflow: "hidden" }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
