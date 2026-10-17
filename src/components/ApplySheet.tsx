import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCircleIcon, CircleIcon, CopyIcon, DownloadSimpleIcon, EnvelopeSimpleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { Press, SectionTitle, Sheet, toast, useBusy } from "./ui";
import { useDoc } from "../state/store";
import { applicationMessage, applyChecklist, documentsFor, type CheckItem } from "../logic/apply";
import { copy, shareFile, whatsappLink } from "../lib/native";
import { snappy } from "../lib/motion";

/** Everything needed to send the application: email and WhatsApp text, the files, and a checklist from the job ad. */
export function ApplySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cv, target, letter } = useDoc();
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const { busy, run } = useBusy();
  const msg = useMemo(() => applicationMessage(cv, target, !!letter.body.trim()), [cv, target, letter.body]);
  const checklist = useMemo(() => applyChecklist(cv, target), [cv, target]);
  const docs = useMemo(() => documentsFor(cv, target.jobAd), [cv, target.jobAd]);
  const mailto = `mailto:${msg.to ?? ""}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;

  const download = (kind: "CV" | "Cover Letter") =>
    run(async () => {
      const { cvPdf, letterPdf, fileName } = await import("../lib/pdf");
      const jobAd = target.jobAd.trim().length > 40 ? target.jobAd : undefined;
      const blob = kind === "CV" ? cvPdf(cv, { jobAd }).doc.output("blob") : letterPdf(cv, letter.body).output("blob");
      await shareFile(blob, fileName(cv, kind), kind === "CV" ? "My CV" : "Cover letter");
    });

  const list = (items: CheckItem[]) => (
    <div className="rows">
      {items.map((i) => {
        const done = i.done ?? !!ticked[i.id];
        return (
          <button key={i.id} className="row tap" style={{ textAlign: "left", alignItems: "flex-start" }} aria-pressed={done}
            onClick={() => i.done === undefined && setTicked((t) => ({ ...t, [i.id]: !t[i.id] }))}>
            <motion.span key={String(done)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={snappy} style={{ display: "grid", marginTop: 1 }}>
              {done ? <CheckCircleIcon size={22} weight="fill" color="var(--green)" /> : <CircleIcon size={22} color="var(--label-3)" />}
            </motion.span>
            <span className="grow">
              <div style={{ fontSize: 16, color: done ? "var(--label-2)" : undefined }}>{i.text}</div>
              {i.detail && <div className="row-sub" style={{ whiteSpace: "normal" }}>{i.detail}</div>}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Sheet open={open} onClose={onClose} title="Send your application">
      <SectionTitle>Email</SectionTitle>
      <div className="card pad mail">
        {msg.to && <div className="mail-row"><span>To</span><b>{msg.to}</b></div>}
        <div className="mail-row"><span>Subject</span><b>{msg.subject}</b></div>
        <div className="mail-body">{msg.body}</div>
      </div>
      <div className="grid2" style={{ marginTop: 10 }}>
        <motion.a className="btn primary sm" href={mailto} whileTap={{ scale: 0.96 }} style={{ textDecoration: "none" }}>
          <EnvelopeSimpleIcon size={17} weight="fill" /> Open email
        </motion.a>
        <Press className="btn plain sm" onClick={async () => { await copy(`${msg.subject}\n\n${msg.body}`); toast("Copied"); }}><CopyIcon size={16} /> Copy</Press>
      </div>
      <p className="caption">Your email app can't attach files from here — attach the PDFs below yourself.</p>

      <SectionTitle>Files to attach</SectionTitle>
      <div className="grid2">
        <Press className="btn plain sm" disabled={busy} onClick={() => download("CV")}><DownloadSimpleIcon size={16} weight="bold" /> CV</Press>
        <Press className="btn plain sm" disabled={busy || !letter.body.trim()} onClick={() => download("Cover Letter")}><DownloadSimpleIcon size={16} weight="bold" /> Letter</Press>
      </div>

      <SectionTitle>On WhatsApp</SectionTitle>
      <div className="card pad" style={{ fontSize: 15, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.whatsapp}</div>
      <motion.a className="btn plain block sm" href={whatsappLink(msg.whatsapp)} target="_blank" rel="noreferrer" whileTap={{ scale: 0.96 }} style={{ textDecoration: "none", marginTop: 10 }}>
        <WhatsappLogoIcon size={18} weight="fill" color="#25D366" /> Send on WhatsApp
      </motion.a>

      <SectionTitle>Before you send</SectionTitle>
      {list(checklist)}
      <SectionTitle>Documents to keep ready</SectionTitle>
      {list(docs)}
      <p className="caption">{target.jobAd.trim() ? "Based on the job ad and what most employers in Pakistan ask for." : "Paste the job ad in the Letter tab for a list made for that job."}</p>
    </Sheet>
  );
}
