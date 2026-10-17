import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRightIcon, CaretDownIcon, CaretLeftIcon, ChatCircleTextIcon, CheckCircleIcon, DownloadSimpleIcon, FilePdfIcon, SealCheckIcon } from "@phosphor-icons/react";
import { Press, ScoreRing, Screen } from "../components/ui";
import { CvPaper, Tilt } from "../components/Paper";
import { RolePicker } from "../components/RolePicker";
import { AppearanceButton } from "../components/Appearance";
import { ImportSheet } from "../components/ImportSheet";
import { SAMPLE_CV } from "../data/sample";
import { TEMPLATES } from "../data/templates";
import { store, useApp } from "../state/store";
import { go } from "../state/nav";
import { ease, gentle } from "../lib/motion";
import type { TemplateId } from "../state/types";

// Back-left, back-right, then front — fanned like sheets on a desk. The front sheet
// stays flat (2D) so its text renders sharp; the angled ones give the depth.
const FAN: { template: TemplateId; accent: string; front?: boolean; to: Record<string, number> }[] = [
  { template: "sidebar", accent: "#1F3A5F", to: { x: -58, z: -140, rotateY: 24, rotateZ: -7 } },
  { template: "executive", accent: "#8A5A2B", to: { x: 58, z: -140, rotateY: -24, rotateZ: 7 } },
  { template: "aurora", accent: "#0071E3", front: true, to: { x: 0, z: 0, rotateY: 0, rotateZ: 0 } },
];

export default function Welcome() {
  const [phase, setPhase] = useState<"intro" | "role">("intro");
  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "intro" ? <Intro key="intro" onStart={() => setPhase("role")} /> : <RoleStep key="role" onBack={() => setPhase("intro")} />}
    </AnimatePresence>
  );
}

function Intro({ onStart }: { onStart: () => void }) {
  const [importing, setImporting] = useState(false);
  // Someone who came back here from Home already has a CV — let them return to it.
  const started = useApp((s) => s.docs.some((d) => d.cv.name.trim() || d.cv.experience.length));
  const reduce = useReducedMotion();
  // Pointer position over the hero, -1..1. Floating cards move with it at their own depth.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20 });
  const sy = useSpring(my, { stiffness: 120, damping: 20 });

  const primary = started ? (
    <Press className="btn dark block" onClick={() => { store.patch({ onboarded: true }); go("home"); }}>
      Go to my CV <ArrowRightIcon size={18} weight="bold" />
    </Press>
  ) : (
    <Press className="btn dark block" onClick={onStart}>
      Create my CV <ArrowRightIcon size={18} weight="bold" />
    </Press>
  );

  return (
    <motion.div className="screen" exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2, ease }} style={{ paddingBottom: "calc(var(--safe-bottom) + 24px)" }}>
      <div className="welcome col">
        <div style={{ position: "absolute", top: "calc(var(--safe-top) + 10px)", right: 20, zIndex: 5 }}>
          <AppearanceButton />
        </div>
        <div className="hero-stage"
          onPointerMove={(e) => {
            if (reduce || e.pointerType !== "mouse") return;
            const r = e.currentTarget.getBoundingClientRect();
            mx.set(((e.clientX - r.left) / r.width) * 2 - 1);
            my.set(((e.clientY - r.top) / r.height) * 2 - 1);
          }}
          onPointerLeave={() => { mx.set(0); my.set(0); }}>
          <Tilt max={9} touch>
            <div className="hero-papers">
              {FAN.map((p, i) => (
                <motion.div key={p.template} style={{ position: "absolute", inset: 0, transformPerspective: p.front ? undefined : 1400 }}
                  initial={p.front ? { opacity: 0, y: 90, scale: 0.94 } : { opacity: 0, y: 120, rotateX: 32, x: `${p.to.x}%`, z: p.to.z, rotateY: p.to.rotateY * 0.4 }}
                  animate={p.front ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: 0, rotateX: 6, x: `${p.to.x}%`, z: p.to.z, rotateY: p.to.rotateY, rotateZ: p.to.rotateZ }}
                  transition={{ ...gentle, delay: 0.08 + i * 0.09 }}>
                  <div className={p.front ? undefined : "drift"} style={{ animationDelay: `${-i * 2.2}s` }}>
                    <CvPaper cv={{ ...SAMPLE_CV, template: p.template, accent: p.accent }} width={460} />
                  </div>
                  {p.front && !reduce && <div className="scan" aria-hidden />}
                </motion.div>
              ))}
            </div>
          </Tilt>
          <div className="hero-cards" aria-hidden>
            <FloatCard className="fc-score" x={sx} y={sy} depth={14} delay={1.5}>
              <ScoreRing score={92} size={46} stroke={5} />
              <span><b>Strong CV</b><small>Checked like a recruiter</small></span>
            </FloatCard>
            <FloatCard className="fc-fix" x={sx} y={sy} depth={22} delay={1.9}>
              <small className="fc-before">Responsible for sales</small>
              <span className="fc-after"><CheckCircleIcon size={15} weight="fill" color="var(--green)" /> Grew monthly sales by 30%</span>
            </FloatCard>
            <FloatCard className="fc-ats" x={sx} y={sy} depth={9} delay={2.3}>
              <FilePdfIcon size={16} weight="fill" color="var(--red)" /> Text PDF · ATS-ready
            </FloatCard>
          </div>
        </div>

        <div>
          <motion.span className="overline" style={{ display: "block" }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.3 }}>CV Wala</motion.span>
          <h1 className="display" style={{ marginTop: 8 }}>
            {["A CV that gets", "you the call"].map((line, i) => (
              <motion.span key={line} className="line" style={{ transformPerspective: 700, transformOrigin: "50% 100%" }}
                initial={{ opacity: 0, rotateX: -75, y: 24 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} transition={{ ...gentle, delay: 0.36 + i * 0.1 }}>
                {line}{i === 1 && <span className="soft">.</span>}
              </motion.span>
            ))}
          </h1>
          <motion.p className="lede" style={{ marginTop: 14 }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.56 }}>
            Answer a few short questions. CV Wala writes it, checks it like a recruiter would, and designs it — with a cover letter to match.
          </motion.p>
        </div>
        <div style={{ flex: 1 }} />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.64 }}>
          {primary}
          <Press className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setImporting(true)}>I already have a CV — import it</Press>
          <p className="caption" style={{ textAlign: "center", marginTop: 4 }}>About 5 minutes · Works offline · Stays on your device</p>
          <div className="more-hint"><CaretDownIcon size={16} weight="bold" /></div>
        </motion.div>
      </div>

      <div className="col">
        <Reveal>
          <span className="overline">How it works</span>
          <h2 className="display sm">Three steps. No blank page.</h2>
        </Reveal>
        <div className="how">
          {STEPS.map((st, i) => (
            <Reveal key={st.title} delay={i * 0.08} tilt>
              <div className="card how-card">
                <span className="how-num num">{i + 1}</span>
                <span className="glyph" style={{ background: st.color }}><st.icon size={18} weight="fill" /></span>
                <b>{st.title}</b>
                <p>{st.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <span className="overline">Eight designs</span>
          <h2 className="display sm">Change the look in one tap.</h2>
          <p className="lede" style={{ marginTop: 10 }}>Every design is a real text PDF, so company software can read it.</p>
        </Reveal>
      </div>
      <TemplateWall />

      <div className="col">
        <Reveal tilt>
          <div className="card final-cta">
            <h2 className="display sm" style={{ margin: 0 }}>Ready in 5 minutes.</h2>
            <p className="muted" style={{ margin: "8px 0 20px" }}>Your CV stays on your device. No account needed.</p>
            {primary}
            <Press className="btn ghost block" style={{ marginTop: 6 }} onClick={() => setImporting(true)}>I already have a CV — import it</Press>
          </div>
        </Reveal>
      </div>

      <ImportSheet open={importing} onClose={() => setImporting(false)}
        onDone={() => { store.patch({ onboarded: true, step: 1 }); go("edit"); }} />
    </motion.div>
  );
}

const STEPS: { title: string; text: string; icon: Icon; color: string }[] = [
  { title: "Answer short questions", text: "Your work, studies and skills. We suggest the words for your field.", icon: ChatCircleTextIcon, color: "#0A84FF" },
  { title: "Get a recruiter's check", text: "A score out of 100 and clear fixes, like adding numbers to your points.", icon: SealCheckIcon, color: "#30A46C" },
  { title: "Download and apply", text: "Pick a design, get your PDF and a cover letter that matches.", icon: DownloadSimpleIcon, color: "#FF9500" },
];

/** A small solid card that flips up into place, then floats with the pointer at its own depth. */
function FloatCard({ className, x, y, depth, delay, children }: { className: string; x: MotionValue<number>; y: MotionValue<number>; depth: number; delay: number; children: ReactNode }) {
  const tx = useTransform(x, (v) => v * depth);
  const ty = useTransform(y, (v) => v * depth);
  return (
    <motion.div className={`float-card ${className}`} style={{ x: tx, y: ty }}>
      <motion.div className="float-inner" style={{ transformPerspective: 600, transformOrigin: "50% 100%" }}
        initial={{ opacity: 0, rotateX: -70, scale: 0.9 }} animate={{ opacity: 1, rotateX: 0, scale: 1 }} transition={{ ...gentle, delay }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

/** Rises into place (optionally tipping up from a 3D angle) the first time it scrolls into view. */
function Reveal({ children, delay = 0, tilt = false }: { children: ReactNode; delay?: number; tilt?: boolean }) {
  return (
    <motion.div className="reveal" style={{ transformPerspective: 900, transformOrigin: "50% 0%" }}
      initial={{ opacity: 0, y: 34, ...(tilt ? { rotateX: 24 } : {}) }} whileInView={{ opacity: 1, y: 0, ...(tilt ? { rotateX: 0 } : {}) }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }} transition={{ ...gentle, delay }}>
      {children}
    </motion.div>
  );
}

const WALL_ACCENTS = ["#0071E3", "#1F3A5F", "#8A5A2B", "#30A46C", "#AF52DE", "#D9480F", "#0F766E", "#B4234A"];

/** All eight designs on a slowly drifting isometric wall. Uses only 2D transforms, so the pages stay sharp. */
function TemplateWall() {
  const [show, setShow] = useState(false);
  const cols = [0, 1, 2, 3].map((c) => [0, 1, 2, 3].map((r) => TEMPLATES[(c * 3 + r * 2) % TEMPLATES.length]));
  return (
    <motion.div className="wall" onViewportEnter={() => setShow(true)} viewport={{ once: true, margin: "200px 0px" }}>
      {show && (
        <motion.div className="wall-plane" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease }}>
          {cols.map((col, c) => (
            <div key={c} className={`wall-col ${c % 2 ? "up" : "down"}`}>
              {[...col, ...col].map((t, i) => (
                <CvPaper key={i} cv={{ ...SAMPLE_CV, template: t.id, accent: WALL_ACCENTS[TEMPLATES.indexOf(t)] }} width={220} />
              ))}
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

function RoleStep({ onBack }: { onBack: () => void }) {
  return (
    <Screen title="What work do you do?" lede="We'll suggest skills, wording and examples for your field." right={<AppearanceButton />}
      left={<Press className="btn ghost sm" onClick={onBack} style={{ paddingLeft: 0 }}><CaretLeftIcon size={18} weight="bold" /> Back</Press>}>
      <RolePicker
        onPick={() => {
          store.patch({ onboarded: true, step: 1 });
          go("edit");
        }}
      />
    </Screen>
  );
}
