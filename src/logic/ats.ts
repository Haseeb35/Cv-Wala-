import type { CV } from "../state/types";

// Checks the text that screening software (ATS) actually pulls out of the PDF,
// so the user can see that nothing important is lost.

export type AtsCheck = { ok: boolean; label: string; detail: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9@+.]/g, "");

export function atsReport(text: string, cv: CV): AtsCheck[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const flat = norm(text);
  const found = (s: string) => !!s.trim() && flat.includes(norm(s));
  const out: AtsCheck[] = [];

  out.push({ ok: text.replace(/\s/g, "").length > 200, label: "Text can be read", detail: text.trim() ? "The PDF holds real text, not a picture." : "No text found — software would see a blank page." });
  if (cv.name.trim()) out.push({ ok: lines.slice(0, 4).some((l) => norm(l).includes(norm(cv.name))), label: "Name at the top", detail: "Software takes the first lines as your name." });
  const digits = cv.phone.replace(/\D/g, "").slice(-10);
  if (cv.phone.trim()) out.push({ ok: !!digits && text.replace(/\D/g, "").includes(digits), label: "Phone number readable", detail: cv.phone });
  if (cv.email.trim()) out.push({ ok: found(cv.email), label: "Email readable", detail: cv.email });

  const headings = [
    { want: cv.experience.some((x) => x.title.trim()), re: /^(work |professional )?experience|employment|projects?/i, name: "Experience" },
    { want: cv.education.some((e) => e.degree.trim()), re: /^education|qualifications?/i, name: "Education" },
    { want: cv.skills.length > 0, re: /^(key )?skills/i, name: "Skills" },
  ].filter((h) => h.want);
  const missing = headings.filter((h) => !lines.some((l) => h.re.test(l)));
  out.push({ ok: !missing.length, label: "Standard section names", detail: missing.length ? `Not found: ${missing.map((h) => h.name).join(", ")}` : headings.map((h) => h.name).join(", ") });

  const titles = cv.experience.filter((x) => x.title.trim());
  const lostTitles = titles.filter((x) => !found(x.title));
  if (titles.length) out.push({ ok: !lostTitles.length, label: "Job titles readable", detail: lostTitles.length ? `Missing: ${lostTitles.map((x) => x.title).join(", ")}` : `${titles.length} of ${titles.length} found` });
  const lostSkills = cv.skills.filter((s) => !found(s));
  if (cv.skills.length) out.push({ ok: lostSkills.length === 0, label: "Skills readable", detail: lostSkills.length ? `Missing: ${lostSkills.slice(0, 4).join(", ")}` : `${cv.skills.length} of ${cv.skills.length} found` });
  if (/\[[^\]]+\]/.test(text)) out.push({ ok: false, label: "No example text", detail: "Some [brackets] are still in your CV." });
  return out;
}
