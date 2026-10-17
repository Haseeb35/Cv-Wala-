import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BellIcon, BriefcaseIcon, CaretRightIcon, ChatCircleTextIcon, CopyIcon, PlusIcon, TrashIcon, WhatsappLogoIcon, ArrowSquareOutIcon, ChatsCircleIcon, FlameIcon, LightbulbIcon } from "@phosphor-icons/react";
import { InterviewSheet } from "../components/InterviewSheet";
import { Area, Field, Press, Screen, SectionTitle, Segmented, Sheet, toast } from "../components/ui";
import { store, useApp } from "../state/store";
import { go } from "../state/nav";
import { STATUS, attention, daysSince, followUpMessage, insights, isoDate, stats, applicationSubject, weekProgress } from "../logic/tracker";
import { copy, whatsappLink } from "../lib/native";
import { snappy } from "../lib/motion";
import type { Application } from "../state/types";

type Filter = "active" | Application["status"] | "all";

const when = (a: Application) => {
  if (a.status === "interview" && a.interviewAt) return new Date(a.interviewAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  if (a.status === "saved") return a.deadline ? `Apply by ${new Date(a.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Not applied yet";
  if (a.appliedAt) {
    const d = daysSince(a.appliedAt);
    return d === 0 ? "Applied today" : `Applied ${d} day${d === 1 ? "" : "s"} ago`;
  }
  return "";
};

export const StatusPill = ({ status }: { status: Application["status"] }) => (
  <span className="pill" style={{ color: STATUS[status].color, background: `color-mix(in srgb, ${STATUS[status].color} 14%, transparent)` }}>{STATUS[status].label}</span>
);

export default function Jobs() {
  const apps = useApp((s) => s.applications);
  const [filter, setFilter] = useState<Filter>("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const todo = useMemo(() => attention(apps), [apps]);
  const s = useMemo(() => stats(apps), [apps]);
  const goal = useApp((st) => st.weeklyGoal);
  const docs = useApp((st) => st.docs);
  const week = useMemo(() => weekProgress(apps, goal), [apps, goal]);
  const tips = useMemo(() => insights(apps, (id) => docs.find((d) => d.id === id)?.label), [apps, docs]);
  const [goalOpen, setGoalOpen] = useState(false);
  const shown = apps.filter((a) => filter === "all" || (filter === "active" ? a.status !== "rejected" : a.status === filter));
  const count = (f: Filter) => apps.filter((a) => f === "all" || (f === "active" ? a.status !== "rejected" : a.status === f)).length;

  const add = () => {
    const doc = store.active();
    const id = store.addApplication({ company: doc.target.company, jobTitle: doc.target.jobTitle || doc.cv.headline, source: doc.target.source, contact: doc.target.manager, status: "saved" });
    setOpenId(id);
  };

  return (
    <Screen title="Applications" lede={apps.length ? undefined : "Keep track of every job you apply for — and never forget to follow up."}>
      {apps.length > 0 && (
        <div className="stats card">
          <div><b className="num">{s.thisWeek}</b><span>This week</span></div>
          <div><b className="num">{s.interviews}</b><span>Interviews</span></div>
          <div><b className="num">{s.responseRate === null ? "—" : `${s.responseRate}%`}</b><span>Reply rate</span></div>
        </div>
      )}

      {apps.length > 0 && (
        <Press className="card goal" onClick={() => setGoalOpen(true)} aria-label="Change weekly goal">
          <div className="between">
            <span>
              <b className="num">{week.done} of {week.goal}</b> <span className="muted">applications this week</span>
            </span>
            {week.streak > 0 && <span className="fact" style={{ color: "var(--orange)" }}><FlameIcon size={14} weight="fill" /> {week.streak} week{week.streak > 1 ? "s" : ""}</span>}
          </div>
          <div className="goal-bar"><motion.i initial={{ width: 0 }} animate={{ width: `${Math.min(100, (week.done / week.goal) * 100)}%` }} transition={{ ...snappy, delay: 0.1 }} /></div>
          <span className="row-sub" style={{ display: "block" }}>
            {week.left ? `${week.left} more to reach your goal · ${week.daysLeft} day${week.daysLeft > 1 ? "s" : ""} left` : "Goal reached this week. Well done."}
          </span>
        </Press>
      )}

      {tips.map((t) => (
        <p key={t} className="caption" style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <LightbulbIcon size={17} weight="fill" color="var(--orange)" style={{ flex: "none" }} /> {t}
        </p>
      ))}

      <Sheet open={goalOpen} onClose={() => setGoalOpen(false)} title="Weekly goal">
        <p className="muted" style={{ margin: "0 0 14px", fontSize: 15 }}>How many jobs do you want to apply for each week? A steady number works better than many at once.</p>
        <Segmented<string> value={String(goal)} onChange={(v) => store.patch({ weeklyGoal: Number(v) })}
          options={["3", "5", "10", "15"].map((v) => ({ value: v, label: v }))} />
      </Sheet>

      {todo.length > 0 && (
        <>
          <SectionTitle>Needs you</SectionTitle>
          <div className="rows">
            {todo.slice(0, 4).map((t) => (
              <Press key={t.app.id + t.kind} className="row tap" onClick={() => setOpenId(t.app.id)}>
                <span className="glyph" style={{ background: t.kind === "follow-up" ? "#0A84FF" : t.kind === "deadline" ? "#FF9500" : t.kind === "offer" ? "#30A46C" : "#AF52DE" }}>
                  {t.kind === "follow-up" ? <ChatCircleTextIcon size={18} weight="fill" /> : <BellIcon size={18} weight="fill" />}
                </span>
                <span className="grow" style={{ fontSize: 16 }}>{t.text}</span>
                <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
              </Press>
            ))}
          </div>
        </>
      )}

      {apps.length > 0 ? (
        <>
          <div className="chips filter" style={{ margin: "26px 0 12px" }}>
            {(["active", "saved", "applied", "interview", "offer", "rejected"] as Filter[]).map((f) => (
              <Press key={f} className={`chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                {f === "active" ? "Active" : STATUS[f as Application["status"]].label} <span className="num" style={{ opacity: 0.6 }}>{count(f)}</span>
              </Press>
            ))}
          </div>
          <motion.div layout className="stack">
            <AnimatePresence initial={false}>
              {shown.map((a) => (
                <motion.div key={a.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={snappy}>
                  <Press className="card app-card" onClick={() => setOpenId(a.id)}>
                    <span className="company-badge">{(a.company || "?").trim()[0]?.toUpperCase()}</span>
                    <span className="grow" style={{ minWidth: 0 }}>
                      <b>{a.company || "Untitled"}</b>
                      <span className="row-sub">{[a.jobTitle, when(a)].filter(Boolean).join(" · ")}</span>
                    </span>
                    <StatusPill status={a.status} />
                  </Press>
                </motion.div>
              ))}
            </AnimatePresence>
            {!shown.length && <p className="caption" style={{ textAlign: "center" }}>Nothing here.</p>}
          </motion.div>
        </>
      ) : (
        <div className="card pad" style={{ textAlign: "center", padding: "34px 24px", marginTop: 8 }}>
          <span className="glyph" style={{ background: "#0A84FF", width: 52, height: 52, borderRadius: 15, margin: "0 auto 14px" }}><BriefcaseIcon size={26} weight="fill" /></span>
          <b style={{ fontSize: 18 }}>No applications yet</b>
          <p className="muted" style={{ margin: "6px 0 0", fontSize: 15 }}>Add jobs you want to apply for, and we'll remind you about deadlines, interviews and follow-ups.</p>
        </div>
      )}

      <div className="dock">
        <Press className="btn primary" onClick={add}><PlusIcon size={18} weight="bold" /> Add a job</Press>
      </div>

      <ApplicationSheet id={openId} onClose={() => setOpenId(null)} />
    </Screen>
  );
}

function ApplicationSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const app = useApp((s) => s.applications.find((a) => a.id === id));
  const docs = useApp((s) => s.docs);
  const [confirm, setConfirm] = useState(false);
  const [prep, setPrep] = useState(false);
  useEffect(() => setConfirm(false), [id]);
  const doc = docs.find((d) => d.id === app?.docId);
  const set = (p: Partial<Application>) => app && store.updateApplication(app.id, p);
  const msg = app && doc ? followUpMessage(app, doc.cv) : "";

  return (
    <Sheet open={!!app} onClose={onClose} title={app?.company || "New job"}>
      {app && (
        <>
          <div className="status-row">
            {(Object.keys(STATUS) as Application["status"][]).map((st) => (
              <Press key={st} className={`chip ${app.status === st ? "on" : ""}`}
                onClick={() => set({ status: st, ...(st === "applied" && !app.appliedAt ? { appliedAt: isoDate() } : {}) })}>
                {STATUS[st].label}
              </Press>
            ))}
          </div>
          <div className="spacer" />
          <div className="rows">
            <Field label="Company" placeholder="Hum Mart" value={app.company} onChange={(e) => set({ company: e.target.value })} />
            <Field label="Job title" placeholder="Sales Associate" value={app.jobTitle} onChange={(e) => set({ jobTitle: e.target.value })} />
            <Field label="Contact person" placeholder="Optional — for follow-ups" value={app.contact} onChange={(e) => set({ contact: e.target.value })} />
          </div>
          <div className="spacer" />
          <div className="rows">
            {app.status === "saved" ? (
              <Field label="Apply by" type="date" value={app.deadline ?? ""} onChange={(e) => set({ deadline: e.target.value || undefined })} />
            ) : (
              <Field label="Date applied" type="date" value={app.appliedAt ?? ""} onChange={(e) => set({ appliedAt: e.target.value || undefined })} />
            )}
            {(app.status === "interview" || app.status === "offer") && (
              <Field label="Interview" type="datetime-local" value={app.interviewAt ?? ""} onChange={(e) => set({ interviewAt: e.target.value || undefined })} />
            )}
            <label className="field">
              <span className="field-label">CV sent</span>
              <select value={app.docId} onChange={(e) => set({ docId: e.target.value })}>
                {docs.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>
            <Area label="Notes" rows={2} placeholder="Salary discussed, who you spoke to, next steps…" value={app.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>

          {app.status === "applied" && msg && (
            <>
              <SectionTitle right={app.followedUpAt ? <small>Last on {new Date(app.followedUpAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</small> : undefined}>Follow up</SectionTitle>
              <div className="card pad" style={{ fontSize: 15, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{msg}</div>
              <div className="grid2" style={{ marginTop: 10 }}>
                <Press className="btn plain sm" onClick={async () => { await copy(msg); set({ followedUpAt: isoDate() }); toast("Copied"); }}><CopyIcon size={16} /> Copy</Press>
                <motion.a className="btn plain sm" href={whatsappLink(msg)} target="_blank" rel="noreferrer" whileTap={{ scale: 0.96 }} onClick={() => set({ followedUpAt: isoDate() })} style={{ textDecoration: "none" }}>
                  <WhatsappLogoIcon size={17} weight="fill" color="#25D366" /> WhatsApp
                </motion.a>
              </div>
              <p className="caption">Email subject: {applicationSubject(app.jobTitle, doc?.cv.name ?? "")}</p>
            </>
          )}

          <div className="spacer" />
          <div className="rows">
            {doc && (app.status === "applied" || app.status === "interview") && (
              <Press className="row tap" onClick={() => { store.select(doc.id); setPrep(true); }}>
                <ChatsCircleIcon size={20} color="var(--tint)" /> <span className="grow">Practise for the interview</span>
              </Press>
            )}
            {doc && (
              <Press className="row tap" onClick={() => { store.select(doc.id); onClose(); go("design"); }}>
                <ArrowSquareOutIcon size={20} color="var(--tint)" /> <span className="grow">Open “{doc.label}”</span>
              </Press>
            )}
            <Press className="row tap" style={{ color: "var(--red)" }} onClick={() => (confirm ? (store.removeApplication(app.id), onClose()) : setConfirm(true))}>
              <TrashIcon size={20} /> <span className="grow">{confirm ? "Tap again to delete" : "Delete"}</span>
            </Press>
          </div>
          <InterviewSheet open={prep} onClose={() => setPrep(false)} company={app.company} jobTitle={app.jobTitle} />
        </>
      )}
    </Sheet>
  );
}
