import type { CV } from "../state/types";
import { CITIES, LEVEL_NAMES, degreeLevel } from "../data/pakistan";
import { matchJobAd, type AdMatch } from "./letter";
import { totalYears } from "./format";

// Reads a pasted job ad the way an applicant should: what it requires, whether
// the CV meets it, and which of its important words the CV never mentions.

export type Check = { ok: boolean; label: string; detail: string };

export type AdAnalysis = {
  skills: AdMatch;
  years?: Check & { required: number; have: number };
  degree?: Check & { required: number; have: number };
  city?: Check & { cities: string[]; remote: boolean };
  gender?: "male" | "female";
  deadline?: string; // YYYY-MM-DD
  salary?: string;
  keywords: { present: string[]; missing: string[] };
  fit: number; // 0-100 across everything above
};

const STOP = new Set(
  ("about above after again against also among apply applicants application based before being below between both candidate candidates company could daily degree during each either experience following from good have having here highly including into join just looking minimum more most must need needed only other over please position preferred provide related required requirements responsible role salary should skills some strong such than that their them then there these they this those through under well what when where which while will with within work working would years your team ability able knowledge job jobs ideal plus excellent etc must-have" +
    // How-to-apply wording: about the application, not the job.
    " subject line send email resume attach attached attested copies copy degrees domicile photograph photographs passport size cnic documents document certificate certificates last date deadline cover letter interview interviews shortlisted candidates test month monthly per incomplete reference following below mentioned address")
    .split(" "),
);

const stem = (w: string) => w.toLowerCase().replace(/(ing|ers|er|ed|es|s)$/, "");

/** Words the ad leans on: repeated, or in a "required / must" sentence. */
function adKeywords(ad: string): string[] {
  const counts = new Map<string, { word: string; n: number }>();
  for (const sentence of ad.split(/[.\n;•]/)) {
    const weight = /\b(must|required|requirement|should|essential|mandatory)\b/i.test(sentence) ? 2 : 1;
    for (const raw of sentence.match(/[A-Za-z][A-Za-z+#.-]{3,}/g) ?? []) {
      const w = raw.replace(/[.-]+$/, "");
      if (STOP.has(w.toLowerCase()) || w.toLowerCase().split("-").some((part) => STOP.has(part)) || CITIES.some((c) => c.toLowerCase() === w.toLowerCase())) continue;
      const k = stem(w);
      const e = counts.get(k) ?? { word: w.toLowerCase(), n: 0 };
      e.n += weight;
      counts.set(k, e);
    }
  }
  return [...counts.values()].filter((e) => e.n >= 2).sort((a, b) => b.n - a.n).slice(0, 12).map((e) => e.word);
}

const cvText = (cv: CV) =>
  [cv.headline, cv.summary, ...cv.skills, ...cv.certifications, ...cv.experience.flatMap((x) => [x.title, x.company, ...x.bullets]), ...cv.education.map((e) => `${e.degree} ${e.institute}`)]
    .join(" ")
    .toLowerCase();

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Last date: 20 Oct 2026" / "Apply by October 20, 2026" / "20/10/2026" -> "2026-10-20". */
export function findDeadline(ad: string): string | undefined {
  const m = ad.match(/(?:last date|deadline|apply (?:by|before)|closing date)[^0-9a-z]{0,12}([^\n]{4,30})/i);
  if (!m) return;
  const s = m[1].toLowerCase();
  let d: number | undefined, mo: number | undefined, y: number | undefined;
  const a = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,})\.?,?\s+(\d{4})/);
  const b = s.match(/([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  const c = s.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (a) [d, mo, y] = [+a[1], MONTHS.indexOf(a[2].slice(0, 3)) + 1, +a[3]];
  else if (b) [d, mo, y] = [+b[2], MONTHS.indexOf(b[1].slice(0, 3)) + 1, +b[3]];
  else if (c) [d, mo, y] = [+c[1], +c[2], +c[3] < 100 ? 2000 + +c[3] : +c[3]]; // Pakistan writes day/month/year
  if (!d || !mo || !y || mo > 12 || d > 31) return;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function analyzeAd(cv: CV, ad: string): AdAnalysis | null {
  if (ad.trim().length < 40) return null;
  const text = ` ${ad.replace(/\s+/g, " ")} `;
  const skills = matchJobAd(cv, ad);
  const out: AdAnalysis = { skills, keywords: { present: [], missing: [] }, fit: 0 };

  // Years: "3+ years of experience", "minimum 2 years", "2-4 years experience".
  const yearsHits = [...text.matchAll(/(?:minimum|min\.?|at least)?\s*(\d{1,2})\s*(?:\+|-\s*\d{1,2}|to\s*\d{1,2})?\s*(?:years?|yrs?)(?:'s)?\s*(?:of\s+)?(?:[a-z-]+\s+){0,2}?(?:experience|exp\b)/gi)];
  if (yearsHits.length) {
    const required = Math.min(...yearsHits.map((m) => +m[1]));
    const have = totalYears(cv);
    out.years = { ok: have >= required || required === 0, required, have, label: `${required}+ years' experience`, detail: have >= required ? `You have ${have >= 1 ? Math.floor(have) : "under 1"} year${Math.floor(have) === 1 ? "" : "s"}` : `You have ${have < 1 ? "under 1 year" : `${Math.floor(have)} year${Math.floor(have) === 1 ? "" : "s"}`} — apply anyway if you're close` };
  } else if (/\b(fresh(?:er)?s?|fresh graduates?|no experience required|entry[\s-]level)\b/i.test(text)) {
    out.years = { ok: true, required: 0, have: totalYears(cv), label: "Fresh graduates welcome", detail: "No experience needed" };
  }

  // Degree: lowest level the ad accepts ("Bachelor's or Master's" -> Bachelor's).
  const reqSentences = text.split(/[.\n;•]/).filter((s) => /\b(degree|qualification|education|graduate|bachelor|master|matric|intermediate|diploma|mba|bba|bcom|bs|ms)\b/i.test(s));
  const levels = reqSentences.flatMap((s) => [1, 2, 3, 4, 5].filter((l) => degreeLevel(s) === l || s.split(/\bor\b|\/|,/).some((part) => degreeLevel(part) === l)));
  if (levels.length) {
    const required = Math.min(...levels);
    const have = Math.max(0, ...cv.education.map((e) => degreeLevel(e.degree)));
    out.degree = { ok: have >= required, required, have, label: `${LEVEL_NAMES[required]} or higher`, detail: have ? `You have ${LEVEL_NAMES[have]}` : "Add your education to check" };
  }

  // City: cities named in the ad, unless the job is remote.
  const cities = CITIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  const remote = /\b(remote|work from home|wfh|anywhere in pakistan)\b/i.test(text);
  if (cities.length || remote) {
    const mine = cv.city.trim().toLowerCase();
    const ok = remote || !mine || cities.some((c) => c.toLowerCase() === mine);
    out.city = { ok, cities, remote, label: remote ? "Remote" : `Based in ${cities.slice(0, 2).join(" or ")}`, detail: remote ? "Work from anywhere" : !mine ? "Add your city to check" : ok ? "Matches your city" : `You're in ${cv.city} — the letter will say you can relocate` };
  }

  const g = text.match(/\b(male|female)\s+(?:candidates?|applicants?|only|required|preferred)\b|\bonly\s+(male|female)\b/i);
  if (g) out.gender = (g[1] ?? g[2]).toLowerCase() as "male" | "female";
  out.deadline = findDeadline(ad);
  const sal = text.match(/(?:rs\.?|pkr)\s*([\d,]{4,})(?:\s*(?:-|to)\s*(?:rs\.?|pkr)?\s*([\d,]{4,}))?/i);
  if (sal) out.salary = `PKR ${sal[1]}${sal[2] ? ` – ${sal[2]}` : ""}`;

  const mine = cvText(cv);
  const covered = (w: string) => mine.includes(stem(w)) || skills.matched.some((s) => s.toLowerCase().includes(stem(w)));
  const words = adKeywords(ad).filter((w) => !skills.missing.some((s) => s.toLowerCase().includes(stem(w))));
  out.keywords = { present: words.filter(covered), missing: words.filter((w) => !covered(w)).slice(0, 6) };

  // Fit: skills count most, then hard requirements, then the ad's own vocabulary.
  // Clearly missing a hard requirement caps the fit, so a strong skills match
  // can't hide that the person doesn't qualify.
  const parts: [number, number][] = [];
  if (skills.matched.length + skills.missing.length) parts.push([skills.percent, 3]);
  if (out.years) parts.push([out.years.ok ? 100 : out.years.have >= out.years.required - 1 ? 70 : 25, 2]);
  if (out.degree) parts.push([out.degree.ok ? 100 : out.degree.have === out.degree.required - 1 ? 40 : 0, 2]);
  if (out.city) parts.push([out.city.ok ? 100 : 50, 1]);
  const kw = out.keywords.present.length + out.keywords.missing.length;
  if (kw) parts.push([Math.round((out.keywords.present.length / kw) * 100), 1]);
  const total = parts.reduce((s, [, w]) => s + w, 0);
  out.fit = total ? Math.round(parts.reduce((s, [v, w]) => s + v * w, 0) / total) : 0;
  const hardMiss = (out.years && out.years.have < out.years.required - 1) || (out.degree && out.degree.have < out.degree.required);
  if (hardMiss) out.fit = Math.min(out.fit, 55);
  return out;
}
