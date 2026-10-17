import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretRightIcon, CheckCircleIcon, DownloadSimpleIcon, ScanIcon, ShareFatIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Press, Screen, SectionTitle, Sheet, Toggle, toast, useBusy } from "../components/ui";
import { CvPaper } from "../components/Paper";
import { store, useDoc } from "../state/store";
import { go } from "../state/nav";
import { showcase } from "../data/sample";
import { preflight, type Issue } from "../logic/preflight";
import { AtsSheet } from "../components/AtsSheet";
import { shareFile } from "../lib/native";
import { ease, quick } from "../lib/motion";
import type { CV } from "../state/types";
import { TEMPLATES } from "../data/templates";

const ACCENTS = [
  { c: "#0071E3", n: "Blue" }, { c: "#1D1D1F", n: "Graphite" }, { c: "#1F3A5F", n: "Navy" }, { c: "#0F7B5F", n: "Emerald" },
  { c: "#6E3AA8", n: "Plum" }, { c: "#B4233C", n: "Crimson" }, { c: "#8A5A2B", n: "Bronze" }, { c: "#0E7490", n: "Teal" },
];

export default function Design() {
  const { cv, target } = useDoc();
  const meta = TEMPLATES.find((t) => t.id === cv.template) ?? TEMPLATES[0];
  const [info, setInfo] = useState<{ pages: number; fitted: boolean } | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [ats, setAts] = useState(false);
  const { busy, run } = useBusy();
  const jobAd = target.jobAd.trim().length > 40 ? target.jobAd : undefined;

  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      const [{ cvPdf }, { renderPages }] = await Promise.all([import("../lib/pdf"), import("../lib/thumbs")]);
      const r = cvPdf(cv, { jobAd });
      const imgs = await renderPages(cv, 640, { jobAd });
      if (!live) return;
      setInfo({ pages: r.pages, fitted: r.fitted });
      setPages(imgs);
    }, 150);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [cv, jobAd]);

  const download = () =>
    run(async () => {
      const { cvPdf, fileName } = await import("../lib/pdf");
      await shareFile(cvPdf(cv, { jobAd }).doc.output("blob"), fileName(cv, "CV"), "My CV");
      setIssues(null);
      toast("Your CV is ready");
    });
  const tryDownload = () => {
    const found = preflight(cv);
    if (found.length) setIssues(found);
    else download();
  };

  return (
    <Screen title="Design" right={<Press className="icon-btn" aria-label="Share CV" onClick={tryDownload}><ShareFatIcon size={22} weight="fill" /></Press>}>
      <Coverflow cv={cv} />
      <div className="cover-label">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={meta.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16, ease }}>
            <b>{meta.name}</b>
            <span>{meta.blurb}</span>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="dots" aria-hidden>{TEMPLATES.map((t) => <i key={t.id} className={t.id === cv.template ? "on" : ""} />)}</div>

      <SectionTitle>Colour</SectionTitle>
      <div className="card" style={{ padding: "16px 18px" }}>
        <div className="swatches" role="radiogroup" aria-label="Colour">
          {ACCENTS.map(({ c, n }) => (
            <Press key={c} role="radio" aria-checked={cv.accent === c} aria-label={n} className={`swatch ${cv.accent === c ? "on" : ""}`} style={{ background: c, color: c }} onClick={() => store.cv({ accent: c })}>
              <span className="inner" />
            </Press>
          ))}
        </div>
      </div>

      <SectionTitle>Layout</SectionTitle>
      <div className="rows">
        <div className="row">
          <span className="grow">
            <div className="row-title">Fit on one page</div>
            <div className="row-sub">Tightens spacing slightly when you're just over</div>
          </span>
          <Toggle label="Fit on one page" on={cv.fitOnePage} onChange={(v) => store.cv({ fitOnePage: v })} />
        </div>
        {meta.photo && (cv.photo ? (
          <div className="row">
            <span className="grow">
              <div className="row-title">Show photo</div>
              <div className="row-sub">Leave off for jobs abroad and most multinationals</div>
            </span>
            <Toggle label="Show photo" on={cv.showPhoto} onChange={(v) => store.cv({ showPhoto: v })} />
          </div>
        ) : (
          <Press className="row tap" onClick={() => { store.patch({ step: 1 }); go("edit"); }}>
            <span className="grow"><div className="row-title" style={{ color: "var(--tint)" }}>Add a photo</div><div className="row-sub">This design has space for one</div></span>
          </Press>
        ))}
      </div>
      <div className="between" style={{ margin: "10px 4px 0", flexWrap: "wrap" }}>
        {info && (
          <span className={`status ${info.pages === 1 ? "ok" : ""}`}>
            {info.pages === 1 ? <CheckCircleIcon size={15} weight="fill" /> : <WarningCircleIcon size={15} weight="fill" />}
            {info.pages} page{info.pages > 1 ? "s" : ""}{info.fitted ? " · tightened to fit" : ""}
          </span>
        )}
        {jobAd && <span className="status">Skills ordered for {target.company || "your target job"}</span>}
      </div>
      <div className="rows" style={{ marginTop: 14 }}>
        <Press className="row tap" onClick={() => setAts(true)}>
          <span className="glyph" style={{ background: "#0A84FF" }}><ScanIcon size={18} weight="bold" /></span>
          <span className="grow">
            <div className="row-title">What software reads</div>
            <div className="row-sub">Check your CV the way company systems see it</div>
          </span>
          <CaretRightIcon size={14} weight="bold" color="var(--label-3)" />
        </Press>
      </div>
      <AtsSheet open={ats} onClose={() => setAts(false)} cv={cv} jobAd={jobAd} />

      <SectionTitle>Preview</SectionTitle>
      <div className="pages">
        {(pages.length ? pages : [""]).map((src, i) => (
          <motion.div key={i} className={`paper ${src ? "" : "skeleton"}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ ...quick, delay: i * 0.05 }}>
            {src && <img src={src} alt={`Page ${i + 1}`} />}
          </motion.div>
        ))}
      </div>
      {info && info.pages > 2 && <p className="caption" style={{ textAlign: "center" }}>Recruiters prefer one or two pages. Try Compact, or trim older jobs to two points each.</p>}

      <div className="dock">
        <Press className="btn primary" disabled={busy} onClick={tryDownload}>
          <DownloadSimpleIcon size={19} weight="bold" /> {busy ? "Preparing…" : "Download PDF"}
        </Press>
      </div>

      <Sheet open={!!issues} onClose={() => setIssues(null)} title="Before you send it">
        <div className="rows">
          {issues?.map((i) => (
            <Press key={i.text} className="row tap issue" onClick={() => { setIssues(null); store.patch({ step: i.step }); go("edit"); }}>
              <span className="dot" style={{ background: i.blocking ? "var(--red)" : "var(--orange)" }} />
              <span className="grow">{i.text}</span>
              <span className="link">Fix</span>
            </Press>
          ))}
        </div>
        <div className="spacer" />
        <Press className="btn plain block" disabled={busy} onClick={download}>Download anyway</Press>
      </Sheet>
    </Screen>
  );
}

/** Horizontal 3D carousel. Transforms are written straight to the DOM on scroll, so it stays at 60fps+. */
function Coverflow({ cv }: { cv: CV }) {
  const scroller = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const sample = showcase(cv);

  const paint = () => {
    const el = scroller.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    items.current.forEach((it) => {
      if (!it) return;
      const d = (it.offsetLeft + it.offsetWidth / 2 - mid) / it.offsetWidth;
      const a = Math.min(Math.abs(d), 2.2);
      // The centred cover stays flat so its text is sharp.
      it.style.transform = a < 0.02 ? "none" : `perspective(1100px) translateZ(${-a * 110}px) rotateY(${Math.max(-50, Math.min(50, -d * 42))}deg) scale(${1 - a * 0.06})`;
      it.style.opacity = String(1 - Math.min(a, 2.2) * 0.22);
      it.style.zIndex = String(10 - Math.round(a * 3));
    });
  };

  useLayoutEffect(() => {
    const el = scroller.current;
    const i = TEMPLATES.findIndex((t) => t.id === cv.template);
    const it = items.current[i];
    if (el && it) el.scrollLeft = it.offsetLeft + it.offsetWidth / 2 - el.clientWidth / 2;
    paint();
    // Only on mount: later template changes come from scrolling itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    requestAnimationFrame(paint);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const el = scroller.current!;
      const mid = el.scrollLeft + el.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      items.current.forEach((it, i) => {
        const d = it ? Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid) : Infinity;
        if (d < bestD) [best, bestD] = [i, d];
      });
      if (TEMPLATES[best].id !== store.active().cv.template) store.cv({ template: TEMPLATES[best].id });
    }, 90);
  };

  return (
    <div className="flow-wrap">
      <div className="coverflow" ref={scroller} onScroll={onScroll}>
        {TEMPLATES.map((t, i) => (
          <div key={t.id} className="cover" ref={(n) => { items.current[i] = n; }}
            onClick={() => items.current[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })}>
            <CvPaper cv={{ ...sample, template: t.id }} width={240} />
          </div>
        ))}
      </div>
    </div>
  );
}
