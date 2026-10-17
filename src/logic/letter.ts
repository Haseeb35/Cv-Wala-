import type { CV, Letter, Target } from "../state/types";
import { ALL_SKILLS, roleById } from "../data/roles";
import { sortedExperience, totalYears } from "./format";
import { CITIES } from "../data/pakistan";

export type AdMatch = {
  matched: string[]; // CV skills the ad asks for
  missing: string[]; // skills the ad asks for that the CV doesn't list
  percent: number;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#.\s]/g, " ").replace(/\s+/g, " ");

/** Compares a pasted job ad with the CV's skills so the letter (and CV) can target it. */
export function matchJobAd(cv: CV, ad: string): AdMatch {
  const text = ` ${norm(ad)} `;
  if (text.trim().length < 20) return { matched: [], missing: [], percent: 0 };
  const hits = (skill: string) => {
    const words = norm(skill).replace(/\(.*?\)/g, "").trim().split(" ").filter((w) => w.length > 2 || /^[a-z]{2}$/.test(w));
    if (!words.length) return false;
    // A skill matches when its main words all appear in the ad.
    return words.every((w) => text.includes(` ${w}`));
  };
  const matched = cv.skills.filter(hits);
  const pool = new Set([...ALL_SKILLS, ...roleById(cv.roleId).skills]);
  const missing = [...pool].filter((s) => !cv.skills.includes(s) && hits(s)).slice(0, 8);
  const total = matched.length + missing.length;
  return { matched, missing, percent: total ? Math.round((matched.length / total) * 100) : 0 };
}

const OPENERS: Record<Letter["tone"], (job: string, company: string, src: string) => string> = {
  formal: (j, c, s) => `I am writing to apply for the position of ${j} at ${c}${s ? `, as advertised on ${s}` : ""}.`,
  warm: (j, c, s) => `I was excited to see the ${j} opening at ${c}${s ? ` on ${s}` : ""}, and I would love to be considered.`,
  confident: (j, c, s) => `I am applying for the ${j} role at ${c}${s ? ` (seen on ${s})` : ""} because I am confident I can deliver results for your team from day one.`,
};

const CLOSERS: Record<Letter["tone"], string> = {
  formal: "I would welcome the opportunity to discuss how I can contribute to your team. Thank you for your time and consideration.",
  warm: "I would be grateful for the chance to meet and talk about how I can help. Thank you for reading my application.",
  confident: "I would like to meet and show you what I can bring to the role. Thank you for your time — I look forward to hearing from you.",
};

/** Builds a tailored cover letter from the CV and the job details. */
export function buildLetter(cv: CV, t: Target, l: Letter): string {
  const role = roleById(cv.roleId);
  const job = t.jobTitle.trim() || cv.headline || role.headline || "the advertised role";
  const company = t.company.trim() || "your organisation";
  const greet = t.manager.trim() ? `Dear ${t.manager.trim()},` : "Dear Hiring Manager,";
  const years = totalYears(cv);
  const latest = sortedExperience(cv.experience).find((x) => x.title);
  const edu = cv.education.find((e) => e.degree);

  // Skills that the ad asks for come first.
  const ad = matchJobAd(cv, t.jobAd);
  const skills = [...ad.matched, ...cv.skills.filter((s) => !ad.matched.includes(s))].slice(0, 3);
  // Best evidence: points with real numbers; fall back to the first real point.
  const real = (latest?.bullets ?? []).map((b) => b.trim()).filter((b) => b && !/\[[^\]]+\]/.test(b));
  const withNumbers = real.filter((b) => /\d/.test(b));
  const proof = (withNumbers.length ? withNumbers : real.slice(0, 1)).slice(0, l.length === "short" ? 1 : 2);

  const p1 = OPENERS[l.tone](job, company, t.source.trim());

  let p2: string;
  if (latest && years >= 0.5) {
    const y = years >= 2 ? `${Math.floor(years)} years` : years >= 1 ? "over a year" : "several months";
    p2 = `I bring ${y} of experience, most recently as ${article(latest.title)} ${latest.title}${latest.company ? ` at ${latest.company}` : ""}.`;
    if (proof[0]) p2 += ` In this role I ${stripDot(lowerFirst(proof[0]))}.`;
    if (proof[1]) p2 += ` I also ${stripDot(lowerFirst(proof[1]))}.`;
  } else if (edu) {
    p2 = `I recently completed my ${edu.degree}${edu.institute ? ` at ${edu.institute}` : ""}${edu.grade ? ` with ${edu.grade}` : ""}, and I am ready to put what I have learned into practice.`;
  } else {
    p2 = "I am a reliable person who learns quickly and takes ownership of my work.";
  }

  const p3 = skills.length
    ? `My strengths include ${joinList(skills.map((s) => (/^[A-Z]{2,}|^MS |^[A-Z][a-z]+[A-Z]/.test(s) ? s : s.toLowerCase())))}, which match what ${company === "your organisation" ? "you are" : `${company} is`} looking for${job ? ` in a ${job}` : ""}.`
    : "";

  // If the job is in another city, say up front that moving isn't a problem.
  const adCity = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(t.jobAd));
  const remote = /\b(remote|work from home|wfh)\b/i.test(t.jobAd);
  const moving = adCity && cv.city.trim() && !remote && adCity.toLowerCase() !== cv.city.trim().toLowerCase();
  const p4 = moving ? `I am based in ${cv.city.trim()} and happy to relocate to ${adCity}. ${CLOSERS[l.tone]}` : CLOSERS[l.tone];

  const body = l.length === "short" ? [p1 + " " + p2, p3, p4] : [p1, p2, p3, p4];
  return [greet, ...body.filter(Boolean), "Sincerely,", cv.name || "Your Name"].join("\n\n");
}

/** Skills the job ad asks for move to the front, so they're the first thing a recruiter reads. */
export function tailorSkills(cv: CV, ad: string): string[] {
  const { matched } = matchJobAd(cv, ad);
  return [...matched, ...cv.skills.filter((s) => !matched.includes(s))];
}

const joinList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const stripDot = (s: string) => s.replace(/[.]+$/, "");
const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");
