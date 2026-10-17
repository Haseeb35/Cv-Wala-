import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRightIcon, CameraIcon, CaretLeftIcon, MagicWandIcon, MinusCircleIcon, PlusIcon, SparkleIcon, TrashIcon, WarningCircleIcon, XIcon, SwatchesIcon, TextAaIcon,
} from "@phosphor-icons/react";
import { Area, Field, Press, Reveal, Screen, SectionTitle, Toggle, toast, useBusy } from "../components/ui";
import { RolePicker } from "../components/RolePicker";
import { CvPaper, Tilt } from "../components/Paper";
import { store, useApp, useDoc } from "../state/store";
import { go } from "../state/nav";
import { emptyEducation, emptyExperience } from "../state/defaults";
import type { Experience, Language } from "../state/types";
import { roleById } from "../data/roles";
import { CITIES, DEGREES } from "../data/pakistan";
import { improveBullet, repeatedVerbs, type BulletReview } from "../logic/bullets";
import { dateIssues, findGaps, isValidEmail, normalizePhone, suggestEmail, titleCase } from "../logic/format";
import { buildSummary } from "../logic/summary";
import { applyFix, checkWriting, toPast, type WritingIssue } from "../logic/writing";
import { isFresher } from "../logic/score";
import { ai, useAI } from "../lib/api";
import { toCirclePhoto } from "../lib/photo";
import { ease, snappy } from "../lib/motion";

const STEPS = ["Your field", "Contact", "Experience", "Education", "Skills & summary"];


export default function Edit() {
  const step = useApp((s) => s.step);
  const { cv, target } = useDoc();
  const dir = useRef(1);
  const setStep = (n: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, n));
    dir.current = next >= step ? 1 : -1;
    store.patch({ step: next });
    document.querySelector(".screen")?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Screen title={STEPS[step]} wide>
      <div className="editor">
        <div style={{ maxWidth: 720, width: "100%", margin: "0 auto" }}>
          <div className="steps" role="progressbar" aria-valuenow={step + 1} aria-valuemax={STEPS.length}>
            {STEPS.map((s, i) => (
              <button key={s} aria-label={s} onClick={() => setStep(i)}>
                <motion.i initial={false} animate={{ scaleX: i <= step ? 1 : 0 }} transition={snappy} />
              </button>
            ))}
          </div>
          <div className="step-meta"><span>Step {step + 1} of {STEPS.length}</span><span>{step < STEPS.length - 1 ? `Next: ${STEPS[step + 1]}` : "Last step"}</span></div>

          <AnimatePresence mode="popLayout" initial={false} custom={dir.current}>
            <motion.div key={step} custom={dir.current}
              variants={{ in: (d: number) => ({ opacity: 0, x: 26 * d }), on: { opacity: 1, x: 0 }, out: (d: number) => ({ opacity: 0, x: -26 * d }) }}
              initial="in" animate="on" exit="out" transition={{ duration: 0.22, ease }}>
              {step === 0 && <div style={{ marginTop: 18 }}><RolePicker onPick={() => setStep(1)} /></div>}
              {step === 1 && <Contact />}
              {step === 2 && <ExperienceStep />}
              {step === 3 && <EducationStep />}
              {step === 4 && <SkillsStep />}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="live">
          <div className="between" style={{ marginBottom: 14 }}>
            <span className="overline">Live preview</span>
            <Press className="link" onClick={() => go("design")}>Change design</Press>
          </div>
          <Tilt max={6}>
            <CvPaper cv={cv} width={400} jobAd={target.jobAd} />
          </Tilt>
        </aside>
      </div>

      <div className="dock">
        {step > 0 && (
          <Press className="btn plain round" aria-label="Back" onClick={() => setStep(step - 1)}>
            <CaretLeftIcon size={20} weight="bold" />
          </Press>
        )}
        {step < STEPS.length - 1 ? (
          <Press className="btn primary" onClick={() => setStep(step + 1)}>
            Continue <ArrowRightIcon size={18} weight="bold" />
          </Press>
        ) : (
          <Press className="btn primary" onClick={() => go("design")}>
            <SwatchesIcon size={19} weight="fill" /> Choose a design
          </Press>
        )}
      </div>
    </Screen>
  );
}

function Contact() {
  const { cv } = useDoc();
  const role = roleById(cv.roleId);
  const emailFix = suggestEmail(cv.email);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useBusy();
  const phoneShort = !!cv.phone && cv.phone.replace(/\D/g, "").length < 10;

  return (
    <>
      <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
      <div className="card pad" style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
        <div className="avatar">{cv.photo ? <img src={cv.photo} alt="Your photo" /> : (cv.name.trim()[0] ?? "").toUpperCase() || <CameraIcon size={24} />}</div>
        <div style={{ flex: 1 }}>
          <b style={{ fontSize: 16 }}>Photo</b>
          <div className="muted" style={{ fontSize: 14 }}>Optional. Used by designs that show one.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Press className="btn soft sm" disabled={busy} onClick={() => fileRef.current?.click()}>{cv.photo ? "Change" : "Add photo"}</Press>
            {cv.photo && <Press className="btn ghost sm" style={{ color: "var(--red)" }} onClick={() => store.cv({ photo: "" })}>Remove</Press>}
          </div>
          {error && <div className="hint warn">{error}</div>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) run(async () => store.cv({ photo: await toCirclePhoto(f), showPhoto: true }));
          }} />
      </div>

      <SectionTitle>Name & title</SectionTitle>
      <div className="rows">
        <Field label="Full name" autoComplete="name" placeholder="Muhammad Ali Khan" value={cv.name}
          onChange={(e) => store.cv({ name: e.target.value })} onBlur={() => store.cv({ name: titleCase(cv.name) })} />
        <Field label="Job title" placeholder={role.headline || "e.g. Sales Associate"} value={cv.headline}
          onChange={(e) => store.cv({ headline: e.target.value })}
          hint={!cv.headline && role.headline ? <button onClick={() => store.cv({ headline: role.headline })}>Use “{role.headline}”</button> : undefined} />
      </div>

      <SectionTitle>Contact</SectionTitle>
      <div className="rows">
        <Field label="Mobile" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" value={cv.phone}
          onChange={(e) => store.cv({ phone: e.target.value })} onBlur={() => store.cv({ phone: normalizePhone(cv.phone) })}
          hint={phoneShort ? "This number looks incomplete" : undefined} warn />
        <Field label="Email" type="email" inputMode="email" autoComplete="email" autoCapitalize="off" placeholder="ali.khan@gmail.com" value={cv.email}
          onChange={(e) => store.cv({ email: e.target.value.trim() })} warn
          hint={emailFix ? <span>Did you mean <button onClick={() => store.cv({ email: emailFix })}>{emailFix}</button>?</span> : cv.email && !isValidEmail(cv.email) ? "Check this email address" : undefined} />
        <Field label="City" list="cities" autoComplete="address-level2" placeholder="Lahore" value={cv.city} onChange={(e) => store.cv({ city: e.target.value })} />
        <Field label="LinkedIn" type="url" autoCapitalize="off" placeholder="Optional — linkedin.com/in/you" value={cv.linkedin} onChange={(e) => store.cv({ linkedin: e.target.value.trim() })} />
      </div>
      <p className="caption">Use a professional email — firstname.lastname@gmail.com works best.</p>
    </>
  );
}

/** Spelling, cliché and tense problems for one editor step, with one-tap fixes where the app can make them. */
function WritingCard({ step }: { step: number }) {
  const { cv } = useDoc();
  const issues = useMemo(() => checkWriting(cv).filter((w) => w.step === step), [cv, step]);
  const fix = (w: WritingIssue) => {
    if (w.fix) store.cv((c) => applyFix(c, w.fix!));
    else if (w.kind === "tense") store.cv((c) => ({ experience: c.experience.map((x) => (x.current ? x : { ...x, bullets: x.bullets.map((b) => (b.trim() ? toPast(b) : b)) })) }));
    toast("Fixed");
  };
  const canFix = (w: WritingIssue) => !!w.fix || (w.kind === "tense" && w.text.startsWith("Use the past"));
  return (
    <Reveal show={issues.length > 0}>
      <div className="card pad" style={{ marginTop: 18 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
          <span className="glyph" style={{ background: "#FF9500", width: 28, height: 28, borderRadius: 8 }}><TextAaIcon size={16} weight="bold" /></span>
          <b style={{ fontSize: 15 }}>Writing check</b>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          {issues.slice(0, 4).map((w) => (
            <div key={w.text} className="between" style={{ alignItems: "flex-start" }}>
              <span style={{ fontSize: 14.5, lineHeight: 1.4 }}>{w.text}</span>
              {canFix(w) && <Press className="btn soft sm" style={{ flex: "none", height: 32 }} onClick={() => fix(w)}>Fix</Press>}
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

const STARTERS = ["Final-year project", "Internship", "Volunteer work", "Freelance work"];

function ExperienceStep() {
  const { cv } = useDoc();
  const role = roleById(cv.roleId);
  const update = (id: string, p: Partial<Experience>) => store.cv((c) => ({ experience: c.experience.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const allBullets = cv.experience.flatMap((x) => x.bullets.filter((b) => b.trim()));
  const repeats = useMemo(() => repeatedVerbs(allBullets).filter((r) => r.alternatives.length), [allBullets]);
  const gaps = useMemo(() => findGaps(cv.experience), [cv.experience]);

  // Swap the last use of an overused verb for an alternative.
  const swapVerb = (verb: string, alt: string) =>
    store.cv((c) => {
      const exp = structuredClone(c.experience);
      for (let j = exp.length - 1; j >= 0; j--)
        for (let i = exp[j].bullets.length - 1; i >= 0; i--)
          if (exp[j].bullets[i].trim().toLowerCase().startsWith(verb.toLowerCase() + " ")) {
            exp[j].bullets[i] = alt + exp[j].bullets[i].trim().slice(verb.length);
            return { experience: exp };
          }
      return {};
    });

  return (
    <>
      <Reveal show={repeats.length > 0}>
        {repeats[0] && (
          <div className="card pad" style={{ marginTop: 18 }}>
            <b style={{ fontSize: 15 }}>“{repeats[0].verb}” starts {repeats[0].count} of your points</b>
            <p className="muted" style={{ fontSize: 14, margin: "4px 0 12px" }}>Varied wording reads stronger. Tap to swap one:</p>
            <div className="chips">
              {repeats[0].alternatives.slice(0, 4).map((a) => (
                <Press key={a} className="chip" onClick={() => swapVerb(repeats[0].verb, a)}>{a}</Press>
              ))}
            </div>
          </div>
        )}
      </Reveal>
      <Reveal show={gaps.length > 0}>
        {gaps[0] && (
          <p className="caption" style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <WarningCircleIcon size={17} color="var(--orange)" style={{ flex: "none" }} />
            There's a {gaps[0].months}-month gap ({gaps[0].from} – {gaps[0].to}). If you studied, freelanced or helped in a family business then, add it as a job.
          </p>
        )}
      </Reveal>

      <WritingCard step={2} />
      {(cv.roleId === "fresh" || isFresher(cv)) && (
        <div className="card pad" style={{ marginTop: 18 }}>
          <b style={{ fontSize: 15 }}>No job yet? These count too</b>
          <p className="muted" style={{ fontSize: 14, margin: "4px 0 12px" }}>Employers hiring fresh graduates look for projects, internships and grades.</p>
          <div className="chips">
            {STARTERS.map((t) => (
              <Press key={t} className="chip" onClick={() => store.cv((c) => ({ experience: [...c.experience, { ...emptyExperience(), title: t }] }))}>
                <PlusIcon size={13} weight="bold" /> {t}
              </Press>
            ))}
          </div>
        </div>
      )}

      {cv.experience.length === 0 && (
        <div className="card pad" style={{ marginTop: 18, textAlign: "center", padding: "30px 24px" }}>
          <b style={{ fontSize: 18 }}>Add your work experience</b>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>
            Jobs, internships, family business, freelancing and volunteering all count.
            {cv.roleId === "fresh" && " No experience yet? Add your final-year project, or skip this step."}
          </p>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <AnimatePresence initial={false}>
          {cv.experience.map((x, i) => (
            <motion.div key={x.id} layout initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, height: 0, marginTop: 0 }} transition={snappy} style={{ marginTop: i ? 14 : 0 }}>
              <JobCard job={x} index={i} examples={role.bullets} roleLabel={role.label}
                onChange={(p) => update(x.id, p)} onRemove={() => store.cv((c) => ({ experience: c.experience.filter((j) => j.id !== x.id) }))} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <div className="spacer" />
      <Press className="btn plain block" onClick={() => store.cv((c) => ({ experience: [...c.experience, { ...emptyExperience(), title: c.experience.length ? "" : c.headline }] }))}>
        <PlusIcon size={18} weight="bold" /> {cv.experience.length ? "Add another job" : cv.roleId === "fresh" ? "Add internship or project" : "Add a job"}
      </Press>
    </>
  );
}

function JobCard({ job, index, examples, roleLabel, onChange, onRemove }: {
  job: Experience; index: number; examples: string[]; roleLabel: string; onChange: (p: Partial<Experience>) => void; onRemove: () => void;
}) {
  const [reviews, setReviews] = useState<Record<number, BulletReview | undefined>>({});
  const [undo, setUndo] = useState<string[] | null>(null);
  const aiOn = useAI();
  const { busy, error, run } = useBusy();
  const bullets = job.bullets;
  const setBullets = (b: string[]) => onChange({ bullets: b });
  const unused = examples.filter((e) => !bullets.includes(e));
  const filled = bullets.filter((b) => b.trim());
  const issue = job.title.trim() ? dateIssues(job) : null;

  const coach = (i: number) => {
    const r = improveBullet(bullets[i]);
    if (!r.text) return;
    setReviews((v) => ({ ...v, [i]: r }));
    if (r.changed) setBullets(bullets.map((b, j) => (j === i ? r.text : b)));
  };
  const addBullet = (text = "") => setBullets(bullets.length === 1 && !bullets[0].trim() ? [text] : [...bullets, text]);

  return (
    <div className="job">
      <div className="job-head">
        <span className="overline">{index === 0 ? "Most recent" : `Job ${index + 1}`}</span>
        <Press className="icon-btn" aria-label="Remove job" style={{ color: "var(--red)" }} onClick={onRemove}>
          <TrashIcon size={19} />
        </Press>
      </div>
      <Field label="Job title" placeholder="Sales Associate" value={job.title} onChange={(e) => onChange({ title: e.target.value })} />
      <Field label="Company" placeholder="Imtiaz Super Market" value={job.company} onChange={(e) => onChange({ company: e.target.value })} />
      <div className="field-pair">
        <Field label="Started" type="month" value={job.start} onChange={(e) => onChange({ start: e.target.value })} />
        {job.current ? (
          <label className="field"><span className="field-label">Ended</span><span className="muted" style={{ lineHeight: "27px" }}>Present</span></label>
        ) : (
          <Field label="Ended" type="month" value={job.end} min={job.start} onChange={(e) => onChange({ end: e.target.value })} />
        )}
      </div>
      <div className="row">
        <span className="grow">I work here now</span>
        <Toggle label="I work here now" on={job.current} onChange={(v) => onChange({ current: v, end: v ? "" : job.end })} />
      </div>
      <Reveal show={!!issue}>
        <div className="warn-row"><WarningCircleIcon size={16} /> {issue}</div>
      </Reveal>

      <div className="between" style={{ padding: "14px 18px 6px" }}>
        <span className="overline">What you achieved</span>
        <span className="muted" style={{ fontSize: 13 }}>{filled.length}/4</span>
      </div>
      {bullets.map((b, i) => (
        <motion.div key={i} layout="position" transition={snappy}>
          <div className="bullet">
            <span className="dot" />
            <textarea rows={1} value={b} placeholder="e.g. Served 60+ customers daily" aria-label={`Point ${i + 1}`}
              onChange={(e) => {
                setBullets(bullets.map((x, j) => (j === i ? e.target.value : x)));
                setReviews((v) => ({ ...v, [i]: undefined }));
              }}
              onBlur={() => b.trim() && setReviews((v) => ({ ...v, [i]: improveBullet(b) }))} />
            <Press className="icon-btn" aria-label="Polish this point" onClick={() => coach(i)}><MagicWandIcon size={18} /></Press>
            {bullets.length > 1 && (
              <Press className="icon-btn" aria-label="Remove point" style={{ color: "var(--label-3)" }} onClick={() => setBullets(bullets.filter((_, j) => j !== i))}>
                <MinusCircleIcon size={19} />
              </Press>
            )}
          </div>
          <Reveal show={!!reviews[i]?.tips.length}>
            <div className="coach"><ul>{reviews[i]?.tips.map((t) => <li key={t}>{t}</li>)}</ul></div>
          </Reveal>
        </motion.div>
      ))}

      <div className="toolbar">
        <Press className="btn soft sm" onClick={() => addBullet()}><PlusIcon size={15} weight="bold" /> Point</Press>
        {aiOn && filled.length > 0 && (
          <Press className="btn soft sm" disabled={busy}
            onClick={() => run(async () => {
              const { bullets: better } = await ai.improve(filled, job.title);
              store.snapshot("Before AI rewrite");
              setUndo(bullets);
              setBullets(better);
              toast("Points rewritten");
            })}>
            <SparkleIcon size={15} weight="fill" /> {busy ? "Rewriting…" : "Rewrite with AI"}
          </Press>
        )}
        {undo && <Press className="btn ghost sm" onClick={() => { setBullets(undo); setUndo(null); }}>Undo</Press>}
      </div>
      {error && <p className="caption" style={{ color: "var(--red)", margin: "-6px 18px 12px" }}>{error}</p>}

      {unused.length > 0 && filled.length < 4 && (
        <div style={{ padding: "0 18px 18px" }}>
          <div className="overline" style={{ marginBottom: 8 }}>Examples for {roleLabel}</div>
          <div className="stack" style={{ gap: 8 }}>
            {unused.slice(0, 3).map((e) => (
              <Press key={e} className="chip example" onClick={() => addBullet(e)}><PlusIcon size={14} weight="bold" /> {e}</Press>
            ))}
          </div>
          <p className="caption" style={{ margin: "8px 0 0" }}>Replace the [brackets] with your real numbers.</p>
        </div>
      )}
    </div>
  );
}

function EducationStep() {
  const { cv } = useDoc();
  const eds = cv.education;
  const fresher = isFresher(cv);
  const update = (id: string, p: object) => store.cv((c) => ({ education: c.education.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  return (
    <>
      <datalist id="degrees">{DEGREES.map((d) => <option key={d} value={d} />)}</datalist>
      <AnimatePresence initial={false}>
        {eds.map((e, i) => (
          <motion.div key={e.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={snappy}>
            <SectionTitle right={eds.length > 1 && (
              <Press className="link" style={{ color: "var(--red)" }} onClick={() => store.cv((c) => ({ education: c.education.filter((x) => x.id !== e.id) }))}>Remove</Press>
            )}>
              {i === 0 ? "Highest qualification" : `Qualification ${i + 1}`}
            </SectionTitle>
            <div className="rows">
              <Field label="Degree" list="degrees" placeholder="BCom" value={e.degree} onChange={(ev) => update(e.id, { degree: ev.target.value })} />
              <Field label="School, college or university" placeholder="University of the Punjab" value={e.institute} onChange={(ev) => update(e.id, { institute: ev.target.value })} />
              <div className="field-pair">
                <Field label="Year" inputMode="numeric" maxLength={9} placeholder="2023" value={e.year} onChange={(ev) => update(e.id, { year: ev.target.value })} />
                <Field label="Grade" placeholder={fresher ? "CGPA 3.4 or 78%" : "Optional — CGPA 3.4"} value={e.grade} onChange={(ev) => update(e.id, { grade: ev.target.value })} />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <p className="caption">{fresher ? "Highest first. As a fresh graduate, add your CGPA or marks — employers check them." : "Highest first. Only add your grade if it helps you."}</p>
      <div className="spacer" />
      <Press className="btn plain block" onClick={() => store.cv((c) => ({ education: [...c.education, emptyEducation()] }))}>
        <PlusIcon size={18} weight="bold" /> Add qualification
      </Press>
      <WritingCard step={3} />
    </>
  );
}

function SkillsStep() {
  const { cv } = useDoc();
  const role = roleById(cv.roleId);
  const [custom, setCustom] = useState("");
  const suggestions = role.skills.filter((s) => !cv.skills.includes(s));

  const toggle = (s: string) => store.cv((c) => ({ skills: c.skills.includes(s) ? c.skills.filter((x) => x !== s) : [...c.skills, s] }));
  const addCustom = () => {
    const parts = custom.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1));
    if (!parts.length) return;
    store.cv((c) => ({ skills: [...c.skills, ...parts.filter((p) => !c.skills.some((s) => s.toLowerCase() === p.toLowerCase()))] }));
    setCustom("");
  };
  const setLang = (i: number, p: Partial<Language>) => store.cv((c) => ({ languages: c.languages.map((l, j) => (j === i ? { ...l, ...p } : l)) }));
  const words = cv.summary.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <SectionTitle right={<small className="num">{cv.skills.length} of 5–12</small>}>Skills</SectionTitle>
      <div className="card pad">
        <motion.div className="chips" layout>
          <AnimatePresence initial={false}>
            {cv.skills.map((s) => (
              <motion.button key={s} layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={snappy}
                className="chip on" onClick={() => toggle(s)} aria-label={`Remove ${s}`}>
                {s} <XIcon size={12} weight="bold" />
              </motion.button>
            ))}
          </AnimatePresence>
          {!cv.skills.length && <span className="muted" style={{ fontSize: 15 }}>Tap suggestions below or type your own.</span>}
        </motion.div>
        {suggestions.length > 0 && (
          <>
            <div className="overline" style={{ margin: "18px 0 10px" }}>Suggested for {role.label}</div>
            <motion.div className="chips" layout>
              {suggestions.map((s) => (
                <motion.button key={s} layout transition={snappy} whileTap={{ scale: 0.93 }} className="chip" onClick={() => toggle(s)}>
                  <PlusIcon size={13} weight="bold" /> {s}
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
        <div className="between" style={{ marginTop: 16, background: "var(--fill)", borderRadius: 999, padding: "4px 4px 4px 16px" }}>
          <input style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontSize: 16 }} placeholder="Add your own, comma separated"
            value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} />
          <Press className="btn primary sm" onClick={addCustom} disabled={!custom.trim()}>Add</Press>
        </div>
      </div>

      <SectionTitle>Languages</SectionTitle>
      <div className="rows">
        {cv.languages.map((l, i) => (
          <div className="row" key={i}>
            <input className="grow" style={{ border: 0, outline: 0, background: "transparent", fontSize: 17, minWidth: 0 }} value={l.name} placeholder="Language" onChange={(e) => setLang(i, { name: e.target.value })} />
            <select value={l.level} onChange={(e) => setLang(i, { level: e.target.value as Language["level"] })} style={{ border: 0, background: "transparent", color: "var(--label-2)", fontSize: 16 }}>
              {["Native", "Fluent", "Professional", "Basic"].map((v) => <option key={v}>{v}</option>)}
            </select>
            <Press className="icon-btn" aria-label="Remove language" style={{ color: "var(--label-3)" }} onClick={() => store.cv((c) => ({ languages: c.languages.filter((_, j) => j !== i) }))}>
              <MinusCircleIcon size={19} />
            </Press>
          </div>
        ))}
        <Press className="row tap" style={{ color: "var(--tint)" }} onClick={() => store.cv((c) => ({ languages: [...c.languages, { name: "", level: "Professional" }] }))}>
          <PlusIcon size={18} weight="bold" /> Add language
        </Press>
      </div>

      <SectionTitle>Certifications</SectionTitle>
      <div className="rows">
        <Area label="One per line — optional" rows={2} placeholder={"Google Ads Search Certification\nDIT (Diploma in IT)"}
          value={cv.certifications.join("\n")} onChange={(e) => store.cv({ certifications: e.target.value.split("\n") })} />
      </div>

      <SectionTitle right={
        <Press className="link" style={{ display: "inline-flex", gap: 5, alignItems: "center" }}
          onClick={() => { store.cv((c) => ({ summaryTouched: false, summary: buildSummary(c) })); toast("Summary rewritten"); }}>
          <MagicWandIcon size={15} /> Rewrite
        </Press>
      }>Summary</SectionTitle>
      <div className="rows">
        <Area label={cv.summaryTouched ? "Your summary" : "Written from your answers — edit freely"} rows={4} value={cv.summary}
          onChange={(e) => store.cv({ summary: e.target.value, summaryTouched: true })}
          hint={<span className="num">{words} words · best between 30 and 70</span>} warn={words > 0 && (words < 25 || words > 90)} />
      </div>
      <p className="caption">The summary keeps itself up to date as you edit your CV, until you change it yourself.</p>
      <WritingCard step={4} />
    </>
  );
}
