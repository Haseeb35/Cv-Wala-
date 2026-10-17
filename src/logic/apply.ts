import type { CV, Target } from "../state/types";
import { findDeadline } from "./jobad";
import { sortedExperience, totalYears } from "./format";
import { isFresher } from "./score";

// Everything needed to actually send an application: the file names, the
// email and WhatsApp text, and a checklist of what the job ad asks for.

/** "Muhammad Ali Khan", "CV" -> "Muhammad-Ali-Khan-CV.pdf" (no spaces, safe on every phone and email system). */
export function fileName(cv: Pick<CV, "name">, kind: "CV" | "Cover Letter"): string {
  const name = cv.name.normalize("NFKD").replace(/[^A-Za-z0-9\s-]/g, "").trim().split(/\s+/).filter(Boolean).join("-");
  return `${name || "My"}-${kind.replace(/\s+/g, "-")}.pdf`;
}

/** Reference or job code the ad asks applicants to quote, e.g. "Ref: HR-2026-14". */
export function findReference(ad: string): string | undefined {
  for (const m of ad.matchAll(/\b(?:ref(?:erence)?\.?|job\s*(?:id|code)|post\s*code|position\s*code|requisition)\s*(?:no\.?|number|#|code|id)?\s*[:#.-]?\s*([A-Z0-9][A-Z0-9/-]{1,20})/gi))
    if (/\d/.test(m[1])) return m[1].replace(/[.-]+$/, "");
  return undefined;
}

export const findEmail = (ad: string) => ad.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0];

/** A subject line the ad dictates, e.g. 'Subject line should be "Sales Officer – Lahore"'. */
export function findSubject(ad: string): string | undefined {
  const m = ad.match(/subject(?:\s*line)?\s*(?:should be|must be|must read|as|:)\s*[:"“']?\s*([^"”'\n]{4,70}?)(?=["”'\n]|\.\s|\.?$)/i);
  return m?.[1].trim().replace(/[.]$/, "");
}

export type Message = { to?: string; subject: string; body: string; whatsapp: string };

export function applicationMessage(cv: CV, target: Target, withLetter: boolean): Message {
  const role = target.jobTitle.trim() || cv.headline.trim() || "the advertised position";
  const ref = findReference(target.jobAd);
  const name = cv.name.trim() || "Applicant";
  const years = totalYears(cv);
  const latest = sortedExperience(cv.experience).find((x) => x.title.trim());
  const edu = cv.education.find((e) => e.degree.trim());
  const subject = findSubject(target.jobAd) ?? `Application for ${role}${ref ? ` (Ref: ${ref})` : ""} – ${name}`;

  const intro = isFresher(cv) || !latest
    ? `I am a ${edu ? `${edu.degree} graduate` : "recent graduate"}${cv.skills[0] ? ` with skills in ${cv.skills.slice(0, 2).join(" and ")}` : ""}.`
    : `I have ${years >= 2 ? `${Math.floor(years)} years` : "over a year"} of experience, most recently as ${latest.title}${latest.company ? ` at ${latest.company}` : ""}.`;
  const greet = target.manager.trim() ? `Dear ${target.manager.trim()},` : "Dear Hiring Manager,";
  const signoff = [name, cv.phone.trim(), cv.email.trim()].filter(Boolean).join("\n");

  const body = `${greet}

Please find attached my CV${withLetter ? " and cover letter" : ""} for the ${role} position${target.company ? ` at ${target.company}` : ""}${ref ? ` (Ref: ${ref})` : ""}. ${intro}

I would be glad to discuss how I can help your team. Thank you for your time.

Kind regards,
${signoff}`;

  const whatsapp = `Hello, I saw your ad for the ${role} job${target.source ? ` on ${target.source}` : ""}${target.company ? ` at ${target.company}` : ""} and would like to apply. ${intro} I am sending my CV here. Thank you.\n\n${name}`;
  return { to: findEmail(target.jobAd), subject, body, whatsapp };
}

export type CheckItem = { id: string; text: string; detail?: string; done?: boolean };

/** What to send, based on what the ad asks for. `done` is set where the app can tell. */
export function applyChecklist(cv: CV, target: Target): CheckItem[] {
  const ad = target.jobAd;
  const items: CheckItem[] = [{ id: "cv", text: "CV attached as a PDF", detail: fileName(cv, "CV") }];
  if (/cover(ing)?\s*letter|motivation letter/i.test(ad)) items.push({ id: "letter", text: "Cover letter attached — the ad asks for one", detail: fileName(cv, "Cover Letter") });
  const ref = findReference(ad);
  if (ref) items.push({ id: "ref", text: `Quote “${ref}” in the subject`, done: true });
  const subject = findSubject(ad);
  if (subject) items.push({ id: "subject", text: `Use the subject they ask for: “${subject}”`, done: true });
  const email = findEmail(ad);
  if (email) items.push({ id: "email", text: `Send it to ${email}` });
  const deadline = findDeadline(ad);
  if (deadline) items.push({ id: "deadline", text: `Send before ${new Date(deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}` });
  if (/\b(photo(graph)?s?|pictures?)\b/i.test(ad)) items.push({ id: "photo", text: "Add a recent photo to your CV", done: !!cv.photo && cv.showPhoto });
  if (/\b(expected|current)\s+salary\b/i.test(ad)) items.push({ id: "salary", text: "Mention your expected salary — the ad asks for it", done: !!target.expectedSalary?.trim() });
  return items;
}

/** Documents the ad (or a typical Pakistani employer) will ask to see. */
export function documentsFor(cv: CV, ad: string): CheckItem[] {
  const has = (re: RegExp) => re.test(ad);
  const out: CheckItem[] = [{ id: "cnic", text: "CNIC copy, front and back" }];
  const attested = has(/\battested\b/i);
  out.push({ id: "degrees", text: `${attested ? "Attested copies" : "Copies"} of your degrees and mark sheets`, detail: has(/\bHEC\b/) ? "The ad mentions HEC — degrees may need HEC attestation." : attested ? "Attested by a grade-17 (or higher) officer, unless the ad says otherwise." : undefined });
  if (cv.experience.some((x) => x.title.trim() && !x.current) || has(/experience (certificate|letter)/i)) out.push({ id: "exp", text: "Experience letters from past employers" });
  if (has(/\bphotographs?\b|passport[- ]size/i)) out.push({ id: "photos", text: "Recent passport-size photos" });
  if (has(/\bdomicile\b/i)) out.push({ id: "domicile", text: "Domicile certificate" });
  if (has(/\b(character|police) certificate\b|police verification/i)) out.push({ id: "police", text: "Police character certificate" });
  if (has(/\bmedical (certificate|fitness)\b/i)) out.push({ id: "medical", text: "Medical fitness certificate" });
  if (has(/\bNOC\b|no objection certificate/i)) out.push({ id: "noc", text: "NOC from your current employer" });
  if (has(/\bIBCC\b/)) out.push({ id: "ibcc", text: "IBCC equivalence certificate" });
  const council = ad.match(/\b(PEC|PMDC|PMC|PNC|PBC|ICAP|ICMAP)\b/);
  if (council) out.push({ id: "council", text: `${council[1]} registration certificate` });
  if (has(/\b(challan|application fee|bank draft|pay order)\b/i)) out.push({ id: "fee", text: "Paid bank challan or fee receipt" });
  if (has(/\b(salary|pay) slip\b/i)) out.push({ id: "payslip", text: "Your latest salary slip" });
  if (has(/\b(NTS|PTS|OTS|ETEA|FPSC|PPSC|SPSC|KPPSC|BPSC|written test)\b/)) out.push({ id: "test", text: "Prepare for the written test", detail: "Ask which subjects it covers and look for past papers." });
  return out;
}
