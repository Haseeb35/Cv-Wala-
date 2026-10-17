import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CaretRightIcon, CopyIcon, DotsThreeIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, PencilSimpleIcon, PlusIcon, SealCheckIcon, TrashIcon, BellIcon, FileArrowUpIcon, ArrowCounterClockwiseIcon, CloudArrowUpIcon, ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { BackupSheet } from "../components/BackupSheet";
import { snapshotsOf } from "../logic/history";
import { Field, Press, ScoreRing, Screen, SectionTitle, Sheet, toast } from "../components/ui";
import { CvPaper, Tilt } from "../components/Paper";
import { AppearanceButton } from "../components/Appearance";
import { store, useApp, useDoc } from "../state/store";
import { go } from "../state/nav";
import { scoreCV } from "../logic/score";
import { attention } from "../logic/tracker";
import { ImportSheet } from "../components/ImportSheet";
import { showcase } from "../data/sample";
import { snappy } from "../lib/motion";
import type { Doc } from "../state/types";

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Good evening" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const ago = (t: number) => {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export default function Home() {
  const doc = useDoc();
  const docs = useApp((s) => s.docs);
  const { cv, target } = doc;
  const { score, label, tips } = useMemo(() => scoreCV(cv, target), [cv, target]);
  const [menu, setMenu] = useState<Doc | null>(null);
  const [importing, setImporting] = useState(false);
  const [backup, setBackup] = useState(false);
  const apps = useApp((s) => s.applications);
  const todo = useMemo(() => attention(apps), [apps]);
  const first = cv.name.trim().split(/\s+/)[0];

  const fix = (step: number) => {
    store.patch({ step });
    go("edit");
  };

  return (
    <Screen title={first ? `${greeting()}, ${first}` : greeting()}
      left={<Press className="brand-btn" aria-label="Go to the start page" onClick={() => store.patch({ onboarded: false })}>CV Wala</Press>}
      right={
        <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <AppearanceButton />
          {cv.photo && <span className="avatar sm"><img src={cv.photo} alt="" /></span>}
        </span>
      }>
      <div className="card home-hero">
        <Tilt max={12}>
          <Press onClick={() => go("design")} aria-label="Open design" style={{ display: "block", width: 116 }}>
            <CvPaper cv={showcase(cv)} width={260} jobAd={target.jobAd} />
          </Press>
        </Tilt>
        <div>
          <span className="overline">CV strength</span>
          <div className="between" style={{ justifyContent: "flex-start", gap: 14, margin: "10px 0 2px" }}>
            <ScoreRing score={score} size={64} stroke={7} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 650, letterSpacing: "-0.02em" }}>{label}</div>
              <div className="muted" style={{ fontSize: 14 }}>{tips.length ? `${tips.length} thing${tips.length > 1 ? "s" : ""} to improve` : "Nothing left to fix"}</div>
            </div>
          </div>
        </div>
        <div className="actions">
          <Press className="btn primary sm" style={{ height: 44 }} onClick={() => go("edit")}>
            <PencilSimpleIcon size={17} weight="bold" /> Edit CV
          </Press>
          <Press className="btn soft sm" style={{ height: 44 }} onClick={() => go("design")}>
            <DownloadSimpleIcon size={17} weight="bold" /> Download
          </Press>
        </div>
      </div>

      {tips.length > 0 ? (
        <>
          <SectionTitle right={<small>{score}/100</small>}>Next steps</SectionTitle>
          <div className="rows">
            {tips.slice(0, 4).map((t, i) => (
              <motion.button key={t.id} className="row tap next" onClick={() => fix(t.step)}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...snappy, delay: 0.04 * i }}>
                <span className="dot" />
                <span className="grow row-title" style={{ fontSize: 16 }}>{t.text}</span>
                <span className="pts">+{t.weight}</span>
                <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
              </motion.button>
            ))}
          </div>
        </>
      ) : (
        <div className="card pad" style={{ marginTop: 24, display: "flex", gap: 14, alignItems: "center" }}>
          <SealCheckIcon size={30} weight="fill" color="var(--green)" />
          <div>
            <b>Ready to send</b>
            <div className="muted" style={{ fontSize: 15 }}>Pick a design and download your PDF.</div>
          </div>
        </div>
      )}

      <SectionTitle right={<small>{docs.length} saved</small>}>Your CVs</SectionTitle>
      <div className="docs">
        {docs.map((d) => (
          <div key={d.id} className={`doc-card ${d.id === doc.id ? "active" : ""}`}>
            <Press style={{ display: "block", width: "100%" }} onClick={() => store.select(d.id)} aria-label={`Open ${d.label}`}>
              <CvPaper cv={showcase(d.cv)} width={200} />
            </Press>
            <div className="between" style={{ alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <b>{d.label}</b>
                <small>{ago(d.cv.updatedAt)}</small>
              </div>
              <Press className="icon-btn" style={{ marginTop: 6, width: 30, height: 30 }} aria-label="More" onClick={() => setMenu(d)}>
                <DotsThreeIcon size={22} weight="bold" />
              </Press>
            </div>
          </div>
        ))}
        <Press className="doc-card" onClick={() => { store.duplicate(doc.id); toast("Copy created"); }}>
          <div className="doc-new">
            <PlusIcon size={22} />
            <span>Version for
              <br />
              another job</span>
          </div>
        </Press>
      </div>

      <div className="rows">
        {todo[0] && (
          <Press className="row tap" onClick={() => go("jobs")}>
            <span className="glyph" style={{ background: "#AF52DE" }}><BellIcon size={18} weight="fill" /></span>
            <span className="grow">
              <div className="row-title">{todo[0].text}</div>
              {todo.length > 1 && <div className="row-sub">+{todo.length - 1} more in Jobs</div>}
            </span>
            <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
          </Press>
        )}
        <Press className="row tap" onClick={() => go("letter")}>
          <span className="glyph" style={{ background: "#FF9500" }}><EnvelopeSimpleIcon size={18} weight="fill" /></span>
          <span className="grow">
            <div className="row-title">Cover letter</div>
            <div className="row-sub">{target.company ? `For ${target.company}` : "Written from your CV in seconds"}</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
        <Press className="row tap" onClick={() => setImporting(true)}>
          <span className="glyph" style={{ background: "#34C759" }}><FileArrowUpIcon size={18} weight="fill" /></span>
          <span className="grow">
            <div className="row-title">Import an old CV</div>
            <div className="row-sub">Paste text or choose a PDF</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
      </div>

      <SectionTitle>Keep it safe</SectionTitle>
      <div className="rows">
        <Press className="row tap" onClick={() => setBackup(true)}>
          <span className="glyph" style={{ background: "#0A84FF" }}><CloudArrowUpIcon size={18} weight="fill" /></span>
          <span className="grow">
            <div className="row-title">Backup</div>
            <div className="row-sub">Save your CVs to a file, or restore them</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
      </div>

      <BackupSheet open={backup} onClose={() => setBackup(false)} />
      <ImportSheet open={importing} onClose={() => setImporting(false)} onDone={() => { store.patch({ step: 1 }); go("edit"); }} />
      <DocMenu doc={menu} onClose={() => setMenu(null)} />
    </Screen>
  );
}

function DocMenu({ doc, onClose }: { doc: Doc | null; onClose: () => void }) {
  const [name, setName] = useState("");
  const [confirm, setConfirm] = useState(false);
  const count = useApp((s) => s.docs.length);
  const history = useApp((s) => s.history);
  const versions = doc ? snapshotsOf(history, doc.id) : [];
  const [restoring, setRestoring] = useState<string | null>(null);
  useEffect(() => {
    if (doc) setName(doc.label);
    setConfirm(false);
    setRestoring(null);
  }, [doc]);
  const close = () => onClose();
  return (
    <Sheet open={!!doc} onClose={close} title={doc?.label ?? ""}>
      {doc && (
        <>
          <div className="rows">
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && store.rename(doc.id, name.trim())} />
          </div>
          <div className="spacer" />
          <div className="rows">
            <Press className="row tap" onClick={() => { store.duplicate(doc.id); toast("Copy created"); close(); }}>
              <CopyIcon size={20} color="var(--tint)" /> <span className="grow">Duplicate for another job</span>
            </Press>
            <Press className="row tap" onClick={() => (confirm ? (store.remove(doc.id), close()) : setConfirm(true))} style={{ color: "var(--red)" }}>
              {count > 1 ? <TrashIcon size={20} /> : <ArrowCounterClockwiseIcon size={20} />}
              <span className="grow">{confirm ? "Tap again to confirm" : count > 1 ? "Delete this CV" : "Start over"}</span>
            </Press>
          </div>

          <SectionTitle right={<Press className="link" onClick={() => { store.snapshot("Saved by you", doc.id); toast("Version saved"); }}>Save now</Press>}>Earlier versions</SectionTitle>
          {versions.length ? (
            <div className="rows">
              {versions.map((v) => (
                <Press key={v.id} className="row tap" onClick={() => {
                  if (restoring !== v.id) return setRestoring(v.id);
                  store.restoreSnapshot(v.id);
                  toast("Earlier version restored");
                  close();
                }}>
                  <ClockCounterClockwiseIcon size={20} color="var(--label-2)" />
                  <span className="grow">
                    <div className="row-title" style={{ fontSize: 16 }}>{v.reason}</div>
                    <div className="row-sub">{new Date(v.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</div>
                  </span>
                  <span className="link">{restoring === v.id ? "Tap to confirm" : "Restore"}</span>
                </Press>
              ))}
            </div>
          ) : (
            <p className="caption">No earlier versions yet. One is saved each day you edit, and before every import or AI rewrite.</p>
          )}
        </>
      )}
    </Sheet>
  );
}
