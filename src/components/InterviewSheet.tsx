import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { Field, Sheet } from "./ui";
import { store, useDoc } from "../state/store";
import { GROUPS, interviewPrep, type Question } from "../logic/interview";
import { snappy } from "../lib/motion";

/** Likely interview questions for the active CV and its target job. Tap a question to see what to say. */
export function InterviewSheet({ open, onClose, company, jobTitle }: { open: boolean; onClose: () => void; company?: string; jobTitle?: string }) {
  const { cv, target } = useDoc();
  const [shown, setShown] = useState<string | null>(null);
  const qs = useMemo(
    () => interviewPrep(cv, { ...target, company: company ?? target.company, jobTitle: jobTitle ?? target.jobTitle }),
    [cv, target, company, jobTitle],
  );
  const groups = (Object.keys(GROUPS) as Question["group"][]).map((g) => ({ g, items: qs.filter((q) => q.group === g) })).filter((x) => x.items.length);

  return (
    <Sheet open={open} onClose={onClose} title="Interview practice">
      <p className="muted" style={{ margin: "0 0 14px", fontSize: 15 }}>
        Questions you are likely to get{company || target.company ? ` at ${company || target.company}` : ""}. Say your answer out loud, then tap to check it.
      </p>
      <div className="rows">
        <Field label="Salary you will ask for (per month)" inputMode="numeric" placeholder="e.g. 80,000" value={target.expectedSalary}
          onChange={(e) => store.target({ expectedSalary: e.target.value })} />
      </div>
      {groups.map(({ g, items }) => (
        <div key={g}>
          <div className="overline" style={{ margin: "22px 4px 10px" }}>{GROUPS[g]}</div>
          <div className="rows">
            {items.map((q) => {
              const on = shown === q.id;
              return (
                <div key={q.id}>
                  <button className="row tap" style={{ textAlign: "left" }} aria-expanded={on} onClick={() => setShown(on ? null : q.id)}>
                    <span className="grow row-title" style={{ fontSize: 16, fontWeight: 550 }}>{q.q}</span>
                    <motion.span animate={{ rotate: on ? 180 : 0 }} transition={snappy} style={{ display: "grid", color: "var(--label-3)" }}><CaretDownIcon size={15} weight="bold" /></motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {on && (
                      <motion.ol className="answer" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={snappy}>
                        {q.points.map((p) => <li key={p}>{p}</li>)}
                      </motion.ol>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="caption">Paste the job ad in the Letter tab to get questions for that exact job.</p>
    </Sheet>
  );
}
