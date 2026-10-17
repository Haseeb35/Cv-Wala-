import type { CV } from "../state/types";
import { dateIssues, isValidEmail, isValidPhone } from "./format";
import { hasPlaceholder } from "./bullets";
import { checkWriting } from "./writing";

export type Issue = { text: string; step: number; blocking: boolean };

/** Last check before the PDF leaves the device. Blocking issues would embarrass the applicant. */
export function preflight(cv: CV): Issue[] {
  const out: Issue[] = [];
  if (!cv.name.trim()) out.push({ text: "Your name is missing", step: 1, blocking: true });
  if (!isValidPhone(cv.phone) && !isValidEmail(cv.email)) out.push({ text: "Employers have no way to contact you", step: 1, blocking: true });
  const placeholders = cv.experience.flatMap((x) => x.bullets).filter(hasPlaceholder).length;
  if (placeholders) out.push({ text: placeholders > 1 ? `${placeholders} points still have [example] text` : "1 point still has [example] text", step: 2, blocking: true });
  if (cv.experience.some((x) => x.title.trim() && dateIssues(x))) out.push({ text: "Some job dates don't look right", step: 2, blocking: false });
  if (cv.experience.some((x) => !x.title.trim() && (x.company.trim() || x.bullets.some((b) => b.trim()))))
    out.push({ text: "A job is missing its title and won't appear", step: 2, blocking: false });
  const typos = checkWriting(cv).filter((w) => w.kind === "spelling");
  if (typos.length) out.push({ text: typos.length > 1 ? `${typos.length} spelling mistakes, e.g. ${typos[0].text}` : `Spelling: ${typos[0].text}`, step: typos[0].step, blocking: false });
  if (cv.summary.trim().split(/\s+/).filter(Boolean).length < 15) out.push({ text: "Your summary is very short", step: 4, blocking: false });
  return out;
}
