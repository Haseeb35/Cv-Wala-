import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightIcon, CheckIcon, InfoIcon, PlusIcon } from "@phosphor-icons/react";
import { Press, ScoreRing, SectionTitle, Sheet, Toggle, toast } from "./ui";
import { store, useDoc } from "../state/store";
import { go } from "../state/nav";
import { applyTailor, planTailor } from "../logic/tailor";
import { haptic } from "../lib/native";
import { snappy } from "../lib/motion";

/** One tap: a copy of the CV aimed at the job ad. Every change can be switched off before it's made. */
export function TailorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const doc = useDoc();
  const { cv, target } = doc;
  const plan = useMemo(() => (open ? planTailor(cv, target) : null), [open, cv, target]);
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const [confirmed, setConfirmed] = useState<string[]>([]);
  useEffect(() => {
    if (!plan) return;
    setKeep(new Set(plan.changes.filter((c) => c.on).map((c) => c.id)));
    setConfirmed([]);
  }, [plan]);
  const result = useMemo(() => (plan ? applyTailor(cv, target, plan, keep, confirmed) : null), [plan, cv, target, keep, confirmed]);
  const label = target.company.trim() || plan?.title || "New job";
  const nothing = !keep.size && !confirmed.length;

  const create = () => {
    if (!result) return;
    store.addVersion(label, result.cv, target);
    haptic.success();
    toast(`“${label}” version created — your original is unchanged`);
    onClose();
    go("design");
  };

  return (
    <Sheet open={open} onClose={onClose} title="Tailor for this job">
      {plan && result && (
        <>
          <div className="card pad tailor-head">
            <div><ScoreRing score={plan.fitBefore} size={64} stroke={6} /><small>Now</small></div>
            <ArrowRightIcon size={20} weight="bold" color="var(--label-3)" />
            <div><ScoreRing score={result.fit} size={64} stroke={6} /><small>This version</small></div>
            <p className="muted">Job fit for {plan.title || "this ad"}{target.company ? ` at ${target.company}` : ""}. A new copy is made — “{doc.label}” stays as it is.</p>
          </div>

          <SectionTitle>Changes</SectionTitle>
          <div className="rows">
            {plan.changes.map((c) => (
              <div key={c.id} className="row" style={{ alignItems: "flex-start" }}>
                <span className="grow">
                  <div style={{ fontSize: 16 }}>{c.text}</div>
                  {c.detail && <div className="row-sub" style={{ whiteSpace: "normal" }}>{c.detail}</div>}
                </span>
                <Toggle label={c.text} on={keep.has(c.id)} onChange={(v) => setKeep((k) => { const n = new Set(k); if (v) n.add(c.id); else n.delete(c.id); return n; })} />
              </div>
            ))}
          </div>

          {plan.ask.length > 0 && (
            <>
              <SectionTitle>Do you have these?</SectionTitle>
              <p className="caption" style={{ margin: "-4px 4px 12px" }}>The ad asks for them but your CV doesn't say so. Tap only the ones that are true.</p>
              <motion.div className="chips" layout>
                {plan.ask.map((s) => {
                  const on = confirmed.includes(s);
                  return (
                    <motion.button key={s} layout transition={snappy} whileTap={{ scale: 0.93 }} className={`chip ${on ? "good" : "miss"}`} aria-pressed={on}
                      onClick={() => setConfirmed((c) => (on ? c.filter((x) => x !== s) : [...c, s]))}>
                      {on ? <CheckIcon size={13} weight="bold" /> : <PlusIcon size={13} weight="bold" />} {s}
                    </motion.button>
                  );
                })}
              </motion.div>
            </>
          )}

          <AnimatePresence>
            {plan.notes.map((n) => (
              <motion.p key={n} className="caption" style={{ display: "flex", gap: 8, marginTop: 16 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <InfoIcon size={17} weight="fill" color="var(--tint)" style={{ flex: "none" }} /> {n}
              </motion.p>
            ))}
          </AnimatePresence>

          <div className="spacer" />
          <Press className="btn primary block" disabled={nothing} onClick={create}>Create “{label}” version</Press>
          <p className="caption" style={{ textAlign: "center" }}>You can still edit everything afterwards.</p>
        </>
      )}
    </Sheet>
  );
}
