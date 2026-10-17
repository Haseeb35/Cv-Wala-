import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckIcon, CopyIcon, DownloadSimpleIcon, PlusIcon, SparkleIcon, WhatsappLogoIcon, ArrowCounterClockwiseIcon, CheckCircleIcon, WarningCircleIcon, CalendarBlankIcon, CurrencyCircleDollarIcon, UserIcon, BookmarkSimpleIcon, PaperPlaneTiltIcon, BriefcaseIcon, CaretRightIcon, ChatsCircleIcon, MagicWandIcon } from "@phosphor-icons/react";
import { ApplySheet } from "../components/ApplySheet";
import { InterviewSheet } from "../components/InterviewSheet";
import { TailorSheet } from "../components/TailorSheet";
import { Area, Field, Press, Reveal, ScoreRing, Screen, SectionTitle, Segmented, toast, useBusy } from "../components/ui";
import { store, useApp, useDoc } from "../state/store";
import { buildLetter } from "../logic/letter";
import { analyzeAd, type AdAnalysis } from "../logic/jobad";
import { isoDate, STATUS } from "../logic/tracker";
import { go } from "../state/nav";
import { ai, useAI } from "../lib/api";
import { copy, shareFile, whatsappLink } from "../lib/native";
import { snappy } from "../lib/motion";
import type { Letter as L } from "../state/types";

const SOURCES = ["Rozee.pk", "LinkedIn", "Indeed", "Mustakbil", "Newspaper", "Referral"];

export default function Letter() {
  const { cv, target, letter } = useDoc();
  const aiOn = useAI();
  const { busy, error, run } = useBusy();
  const fit = useMemo(() => analyzeAd(cv, target.jobAd), [cv, target.jobAd]);
  const doc = useDoc();
  const tracked = useApp((s) => s.applications.find((a) => a.docId === doc.id && a.company.trim().toLowerCase() === target.company.trim().toLowerCase()));
  const auto = useMemo(() => buildLetter(cv, target, letter), [cv, target, letter]);
  const [sheet, setSheet] = useState<"apply" | "interview" | "tailor" | null>(null);

  // Until the user edits the letter, keep it in sync with the inputs.
  useEffect(() => {
    if (!letter.touched && letter.body !== auto) store.letter({ body: auto });
  }, [auto, letter.touched, letter.body]);

  const track = (status: "saved" | "applied") => {
    store.addApplication({
      company: target.company, jobTitle: target.jobTitle || cv.headline, source: target.source, contact: target.manager, status,
      appliedAt: status === "applied" ? isoDate() : undefined, deadline: fit?.deadline,
    });
    toast(status === "applied" ? "Added to Jobs — we'll remind you to follow up" : "Saved to Jobs");
  };

  return (
    <Screen title="Cover letter" lede="Tell us about the job. Your letter writes itself from your CV.">
      <div className="rows">
        <Field label="Company" placeholder="Hum Mart" value={target.company} onChange={(e) => store.target({ company: e.target.value })} />
        <Field label="Job title" placeholder={cv.headline || "Sales Associate"} value={target.jobTitle} onChange={(e) => store.target({ jobTitle: e.target.value })} />
        <Field label="Hiring manager" placeholder="Optional — Ms. Ayesha Malik" value={target.manager} onChange={(e) => store.target({ manager: e.target.value })} />
      </div>
      <div className="overline" style={{ margin: "20px 4px 10px" }}>Where did you see it?</div>
      <div className="chips">
        {SOURCES.map((s) => (
          <Press key={s} className={`chip ${target.source === s ? "on" : ""}`} onClick={() => store.target({ source: target.source === s ? "" : s })}>{s}</Press>
        ))}
      </div>

      <SectionTitle right={<small>Recommended</small>}>Job ad</SectionTitle>
      <div className="rows">
        <Area label="Paste the job description" rows={4} placeholder="Paste the ad here — we'll match it against your CV." value={target.jobAd} onChange={(e) => store.target({ jobAd: e.target.value })} />
      </div>
      <p className="caption">This also puts the matching skills first on your CV.</p>

      <Reveal show={!!fit}>
        {fit && <JobFit fit={fit} />}
        {fit && (
          <Press className="btn primary block" style={{ marginTop: 12 }} onClick={() => setSheet("tailor")}>
            <MagicWandIcon size={18} weight="fill" /> Make a CV version for this job
          </Press>
        )}
      </Reveal>
      <TailorSheet open={sheet === "tailor"} onClose={() => setSheet(null)} />

      <SectionTitle>Style</SectionTitle>
      <div className="stack">
        <Segmented<L["tone"]> value={letter.tone} onChange={(tone) => store.letter({ tone })}
          options={[{ value: "formal", label: "Formal" }, { value: "warm", label: "Warm" }, { value: "confident", label: "Confident" }]} />
        <Segmented<L["length"]> value={letter.length} onChange={(length) => store.letter({ length })}
          options={[{ value: "short", label: "Short" }, { value: "standard", label: "Standard" }]} />
      </div>

      <SectionTitle right={
        <span style={{ display: "flex", gap: 16 }}>
          {letter.touched && <Press className="link" style={{ display: "inline-flex", gap: 4, alignItems: "center" }} onClick={() => store.letter({ touched: false })}><ArrowCounterClockwiseIcon size={14} /> Reset</Press>}
          {aiOn && (
            <Press className="link" style={{ display: "inline-flex", gap: 4, alignItems: "center" }} disabled={busy}
              onClick={() => run(async () => {
                const { body } = await ai.letter(cv, target, letter);
                store.letter({ body, touched: true });
                toast("Letter written");
              })}>
              <SparkleIcon size={14} weight="fill" /> {busy ? "Writing…" : "Write with AI"}
            </Press>
          )}
        </span>
      }>Your letter</SectionTitle>
      {error && <p className="caption" style={{ color: "var(--red)", marginBottom: 8 }}>{error}</p>}
      <div className="card">
        {busy ? (
          <div style={{ padding: 20 }}>{[92, 100, 84, 96, 60].map((w, i) => <div key={i} className="shimmer" style={{ width: `${w}%` }} />)}</div>
        ) : (
          <textarea className="letter-body" value={letter.body} onChange={(e) => store.letter({ body: e.target.value, touched: true })} aria-label="Cover letter" />
        )}
      </div>
      <p className="caption">{letter.touched ? "Edited by you. Reset to go back to the automatic letter." : "Updates as you change the details above."}</p>

      <div className="spacer" />
      <div className="grid2">
        <Press className="btn primary" onClick={async () => {
          const { letterPdf, fileName } = await import("../lib/pdf");
          await shareFile(letterPdf(cv, letter.body).output("blob"), fileName(cv, "Cover Letter"), "Cover letter");
          toast("Letter ready");
        }}>
          <DownloadSimpleIcon size={18} weight="bold" /> PDF
        </Press>
        <Press className="btn plain" onClick={async () => { await copy(letter.body); toast("Copied"); }}>
          <CopyIcon size={18} /> Copy
        </Press>
      </div>
      <div className="spacer" />
      <motion.a className="btn plain block" href={whatsappLink(letter.body)} target="_blank" rel="noreferrer" whileTap={{ scale: 0.965 }} transition={snappy} style={{ textDecoration: "none" }}>
        <WhatsappLogoIcon size={20} weight="fill" color="#25D366" /> Send on WhatsApp
      </motion.a>

      <SectionTitle>Apply</SectionTitle>
      <div className="rows">
        <Press className="row tap" onClick={() => setSheet("apply")}>
          <span className="glyph" style={{ background: "#30A46C" }}><PaperPlaneTiltIcon size={18} weight="fill" /></span>
          <span className="grow">
            <div className="row-title">Send your application</div>
            <div className="row-sub">Email, WhatsApp and a checklist</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
        <Press className="row tap" onClick={() => setSheet("interview")}>
          <span className="glyph" style={{ background: "#AF52DE" }}><ChatsCircleIcon size={18} weight="fill" /></span>
          <span className="grow">
            <div className="row-title">Practise for the interview</div>
            <div className="row-sub">Likely questions, with answers from your CV</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
      </div>
      <ApplySheet open={sheet === "apply"} onClose={() => setSheet(null)} />
      <InterviewSheet open={sheet === "interview"} onClose={() => setSheet(null)} />

      <SectionTitle>Track it</SectionTitle>
      {tracked ? (
        <Press className="card app-card" onClick={() => go("jobs")}>
          <span className="company-badge"><BriefcaseIcon size={20} weight="fill" /></span>
          <span className="grow"><b>{tracked.company}</b><span className="row-sub">In your Jobs list</span></span>
          <span className="pill" style={{ color: STATUS[tracked.status].color, background: `color-mix(in srgb, ${STATUS[tracked.status].color} 14%, transparent)` }}>{STATUS[tracked.status].label}</span>
        </Press>
      ) : (
        <div className="grid2">
          <Press className="btn plain" disabled={!target.company.trim()} onClick={() => track("saved")}><BookmarkSimpleIcon size={18} weight="fill" /> Save</Press>
          <Press className="btn primary" disabled={!target.company.trim()} onClick={() => track("applied")}><PaperPlaneTiltIcon size={18} weight="fill" /> I've applied</Press>
        </div>
      )}
      {!target.company.trim() && !tracked && <p className="caption">Add the company name to track this application.</p>}
    </Screen>
  );
}

/** Everything the job ad asks for, checked against the CV. */
function JobFit({ fit }: { fit: AdAnalysis }) {
  const reqs = [fit.years, fit.degree, fit.city].filter(Boolean) as NonNullable<AdAnalysis["years" | "degree" | "city"]>[];
  const s = fit.skills;
  const daysLeft = fit.deadline ? Math.round((new Date(fit.deadline).getTime() - Date.now()) / 86_400_000) : null;
  return (
    <div className="card pad" style={{ marginTop: 14 }}>
      <div className="match">
        <ScoreRing score={fit.fit} size={72} stroke={7} />
        <div>
          <b style={{ fontSize: 17 }}>{fit.fit >= 75 ? "Strong fit" : fit.fit >= 50 ? "Partial fit" : "Long shot"}</b>
          <div className="muted" style={{ fontSize: 14 }}>
            {fit.fit >= 75 ? "Apply — you match most of what they want." : fit.fit >= 50 ? "Worth applying. Strengthen the gaps below." : "You miss key requirements. Apply if you're close."}
          </div>
        </div>
      </div>

      {(fit.deadline || fit.salary || fit.gender) && (
        <div className="facts" style={{ marginTop: 16 }}>
          {fit.deadline && (
            <span className={`fact ${daysLeft !== null && daysLeft <= 3 ? "warn" : ""}`}>
              <CalendarBlankIcon size={15} weight="fill" />
              {daysLeft !== null && daysLeft < 0 ? "Deadline passed" : `Apply by ${new Date(fit.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}${daysLeft !== null && daysLeft <= 7 ? ` · ${daysLeft === 0 ? "today" : `${daysLeft}d left`}` : ""}`}
            </span>
          )}
          {fit.salary && <span className="fact"><CurrencyCircleDollarIcon size={15} weight="fill" /> {fit.salary}</span>}
          {fit.gender && <span className="fact"><UserIcon size={15} weight="fill" /> Prefers {fit.gender} candidates</span>}
        </div>
      )}

      {reqs.length > 0 && (
        <div className="stack" style={{ marginTop: 18, gap: 14 }}>
          {reqs.map((r) => (
            <div key={r.label} className="req">
              {r.ok ? <CheckCircleIcon size={22} weight="fill" color="var(--green)" /> : <WarningCircleIcon size={22} weight="fill" color="var(--orange)" />}
              <div><b>{r.label}</b><span className="muted" style={{ fontSize: 14 }}>{r.detail}</span></div>
            </div>
          ))}
        </div>
      )}

      {s.matched.length + s.missing.length > 0 && (
        <>
          <div className="overline" style={{ margin: "20px 0 10px" }}>Skills they want</div>
          <motion.div className="chips" layout>
            {s.matched.map((x) => (
              <motion.span layout key={x} className="chip good" transition={snappy}><CheckIcon size={13} weight="bold" /> {x}</motion.span>
            ))}
            {s.missing.map((x) => (
              <motion.button layout key={x} className="chip miss" transition={snappy} whileTap={{ scale: 0.93 }}
                onClick={() => { store.cv((c) => ({ skills: [...c.skills, x] })); toast(`Added ${x}`); }}>
                <PlusIcon size={13} weight="bold" /> {x}
              </motion.button>
            ))}
          </motion.div>
          {s.missing.length > 0 && <p className="caption" style={{ margin: "8px 0 0" }}>Tap a skill to add it — only if you really have it.</p>}
        </>
      )}

      {fit.keywords.missing.length > 0 && (
        <>
          <div className="overline" style={{ margin: "20px 0 10px" }}>Words the ad repeats</div>
          <div className="chips">{fit.keywords.missing.map((w) => <span key={w} className="chip">{w}</span>)}</div>
          <p className="caption" style={{ margin: "8px 0 0" }}>Your CV never uses these. Work them into your points where they're true — screening software looks for them.</p>
        </>
      )}
    </div>
  );
}
