import { useEffect, useState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Sheet } from "./ui";
import { atsReport, type AtsCheck } from "../logic/ats";
import type { CV } from "../state/types";

/** Shows the plain text screening software pulls out of the real PDF, and whether anything important is lost. */
export function AtsSheet({ open, onClose, cv, jobAd }: { open: boolean; onClose: () => void; cv: CV; jobAd?: string }) {
  const [res, setRes] = useState<{ text: string; checks: AtsCheck[] } | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setRes(null);
    (async () => {
      const [{ cvPdf }, { pdfToText }] = await Promise.all([import("../lib/pdf"), import("../lib/pdftext")]);
      const text = await pdfToText(cvPdf(cv, { jobAd }).doc.output("blob"));
      if (live) setRes({ text, checks: atsReport(text, cv) });
    })();
    return () => { live = false; };
  }, [open, cv, jobAd]);
  const bad = res?.checks.filter((c) => !c.ok).length ?? 0;

  return (
    <Sheet open={open} onClose={onClose} title="What software reads">
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 15 }}>
        Many companies use software to read CVs before a person sees them. This is what it gets from your PDF.
      </p>
      {!res ? (
        <div className="card" style={{ padding: 20 }}>{[90, 70, 100, 60].map((w, i) => <div key={i} className="shimmer" style={{ width: `${w}%` }} />)}</div>
      ) : (
        <>
          <div className="rows">
            {res.checks.map((c) => (
              <div key={c.label} className="row" style={{ alignItems: "flex-start" }}>
                {c.ok ? <CheckCircleIcon size={22} weight="fill" color="var(--green)" style={{ flex: "none" }} /> : <WarningCircleIcon size={22} weight="fill" color="var(--orange)" style={{ flex: "none" }} />}
                <span className="grow"><div style={{ fontSize: 16 }}>{c.label}</div><div className="row-sub" style={{ whiteSpace: "normal" }}>{c.detail}</div></span>
              </div>
            ))}
          </div>
          <p className="caption">{bad ? "Fix the items above, or try the Classic or Compact design — they are the easiest for software to read." : "Everything important can be read."}</p>
          <div className="overline" style={{ margin: "22px 4px 10px" }}>Plain text</div>
          <pre className="ats-text">{res.text.trim()}</pre>
        </>
      )}
    </Sheet>
  );
}
