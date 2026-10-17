import { useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircleIcon, CircleIcon, FilePdfIcon } from "@phosphor-icons/react";
import { Press, Sheet, toast, useBusy } from "./ui";
import { importCV } from "../logic/importer";
import { store } from "../state/store";
import { snappy } from "../lib/motion";

/** Paste an old CV (or pick a PDF) and fill the form from it. */
export function ImportSheet({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useBusy();
  const result = useMemo(() => (text.trim().length > 30 ? importCV(text) : null), [text]);

  const rows = result
    ? [
        { ok: result.found.name, label: result.found.name ? `Name: ${result.cv.name}` : "Name not found" },
        { ok: result.found.contact > 0, label: `${result.found.contact} contact detail${result.found.contact === 1 ? "" : "s"}` },
        { ok: result.found.jobs > 0, label: `${result.found.jobs} job${result.found.jobs === 1 ? "" : "s"}` },
        { ok: result.found.education > 0, label: `${result.found.education} qualification${result.found.education === 1 ? "" : "s"}` },
        { ok: result.found.skills > 0, label: `${result.found.skills} skill${result.found.skills === 1 ? "" : "s"}` },
      ]
    : [];

  const apply = () => {
    if (!result) return;
    store.importCV(result.cv);
    toast("CV imported — check each step");
    setText("");
    onClose();
    onDone?.();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Import your old CV">
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 15 }}>
        Open your old CV, select all the text, copy it and paste it here. Or choose the PDF.
      </p>
      <div className="card">
        <textarea className="letter-body" style={{ minHeight: 170, maxHeight: 260, overflowY: "auto", fontSize: 15 }} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={"Muhammad Ali Khan\n0300 1234567 · ali@gmail.com\n\nEXPERIENCE\nSales Associate | Imtiaz | 2021 – Present\n• Served 60+ customers daily…"} aria-label="Old CV text" />
      </div>
      <div className="between" style={{ marginTop: 10 }}>
        <Press className="btn soft sm" disabled={busy} onClick={() => fileRef.current?.click()}>
          <FilePdfIcon size={17} weight="fill" /> {busy ? "Reading…" : "Choose PDF"}
        </Press>
        {text && <Press className="btn ghost sm" onClick={() => setText("")}>Clear</Press>}
      </div>
      <input ref={fileRef} type="file" accept="application/pdf,.pdf,.txt,text/plain" hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          run(async () => {
            if (f.type === "text/plain" || f.name.endsWith(".txt")) return setText(await f.text());
            const { pdfToText } = await import("../lib/pdftext");
            const t = await pdfToText(f);
            if (t.trim().length < 30) throw new Error("This PDF has no readable text (it may be a scanned image). Copy and paste the text instead.");
            setText(t);
          });
        }} />
      {error && <p className="caption" style={{ color: "var(--red)" }}>{error}</p>}

      {result && (
        <motion.div className="rows" style={{ marginTop: 16 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={snappy}>
          {rows.map((r) => (
            <div key={r.label} className="row" style={{ minHeight: 44 }}>
              {r.ok ? <CheckCircleIcon size={20} weight="fill" color="var(--green)" /> : <CircleIcon size={20} color="var(--label-3)" />}
              <span className="grow" style={{ color: r.ok ? undefined : "var(--label-2)" }}>{r.label}</span>
            </div>
          ))}
        </motion.div>
      )}
      <div className="spacer" />
      <Press className="btn primary block" disabled={!result || (!result.found.name && !result.found.jobs)} onClick={apply}>Fill my CV</Press>
      <p className="caption" style={{ textAlign: "center" }}>For Word files, copy the text from Word and paste it above.</p>
    </Sheet>
  );
}
