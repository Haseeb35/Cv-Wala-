import type { CV } from "../state/types";

// Offline writing checks: common CV misspellings, empty phrases recruiters skip,
// and verb tense (jobs you've left are written in the past tense).

export type WritingIssue = {
  kind: "spelling" | "cliche" | "tense";
  text: string; // what to tell the user
  step: number; // editor step that fixes it
  fix?: { from: string; to: string };
};

/** Words CVs in Pakistan most often get wrong. Keys are lower case. */
const MISSPELLINGS: Record<string, string> = {
  recieve: "receive", recieved: "received", managment: "management", mangement: "management", experiance: "experience",
  experince: "experience", responsibilty: "responsibility", responsibilites: "responsibilities", reponsible: "responsible",
  resposible: "responsible", acheive: "achieve", acheived: "achieved", achived: "achieved", acheivement: "achievement",
  acomplished: "accomplished", accomodate: "accommodate", adress: "address", buisness: "business", bussiness: "business",
  comunication: "communication", communcation: "communication", communicaton: "communication", custmer: "customer",
  coustomer: "customer", costumer: "customer", costumers: "customers", custmers: "customers", enviroment: "environment",
  excelent: "excellent", sucessful: "successful", succesful: "successful", successfull: "successful", sucess: "success",
  proffesional: "professional", profesional: "professional", knowlege: "knowledge", knowladge: "knowledge",
  maintainance: "maintenance", maintenence: "maintenance", oppurtunity: "opportunity", oportunity: "opportunity",
  seperate: "separate", targetted: "targeted", untill: "until", wich: "which", writting: "writing", computor: "computer",
  independant: "independent", relevent: "relevant", calender: "calendar", definately: "definitely", occured: "occurred",
  begining: "beginning", comittee: "committee", commited: "committed", supervison: "supervision", inventry: "inventory",
  accountent: "accountant", techer: "teacher", skils: "skills", langauge: "language", languge: "language",
  certifcate: "certificate", certificat: "certificate", univeristy: "university", univercity: "university",
  colege: "college", intermidiate: "intermediate", bachlor: "bachelor", graduatation: "graduation", grauduate: "graduate",
  orgnization: "organization", organisaton: "organisation", coordinaton: "coordination", developement: "development",
  analysys: "analysis", efficent: "efficient", effecient: "efficient", reliabe: "reliable",
  handeled: "handled", handeling: "handling", maintaned: "maintained", manged: "managed", prepaired: "prepared",
};

/** Phrases every CV uses. They prove nothing, so recruiters skip them. */
const CLICHES: { re: RegExp; phrase: string; advice: string }[] = [
  { re: /\bhard[- ]?working\b/i, phrase: "hard-working", advice: "Show it instead: a number, a target you hit, or extra work you took on." },
  { re: /\bteam[- ]player\b/i, phrase: "team player", advice: "Say what you did with your team and the result." },
  { re: /\bgo[- ]getter\b/i, phrase: "go-getter", advice: "Give one example of something you started yourself." },
  { re: /\bresults?[- ]oriented\b/i, phrase: "result-oriented", advice: "Name one result, with a number." },
  { re: /\bself[- ]motivated\b/i, phrase: "self-motivated", advice: "Mention something you learned or did without being asked." },
  { re: /\bthink(ing)? outside the box\b/i, phrase: "think outside the box", advice: "Describe one problem you solved in a new way." },
  { re: /\bchallenging (environment|position|role)\b/i, phrase: "challenging environment", advice: "Say what you can do for the employer instead." },
  { re: /\bgrowth of the organi[sz]ation\b/i, phrase: "growth of the organisation", advice: "Old-fashioned. Say what you can do for the employer instead." },
  { re: /\bbest of my abilit(y|ies)\b/i, phrase: "best of my abilities", advice: "Cut it. Every applicant says this." },
  { re: /\bdynamic (individual|person|professional)\b/i, phrase: "dynamic individual", advice: "Cut it. Show energy with a result." },
];

const PAST_IRREGULAR = new Set(
  "led sold taught built ran wrote drove grew won made met kept set cut brought took gave spent oversaw began chose did found held paid put read saw sent sought spoke stood thought understood upheld".split(" "),
);
// Base form -> past, for verbs that open CV points.
export const PRESENT_TO_PAST: Record<string, string> = {
  manage: "Managed", handle: "Handled", lead: "Led", sell: "Sold", teach: "Taught", create: "Created",
  prepare: "Prepared", maintain: "Maintained", serve: "Served", deliver: "Delivered", build: "Built",
  design: "Designed", train: "Trained", support: "Supported", process: "Processed", organise: "Organised",
  organize: "Organised", resolve: "Resolved", answer: "Answered", drive: "Drove", repair: "Repaired",
  install: "Installed", write: "Wrote", plan: "Planned", check: "Checked", track: "Tracked", run: "Ran",
  coordinate: "Coordinated", supervise: "Supervised", assist: "Assisted", develop: "Developed", conduct: "Conducted",
  record: "Recorded", monitor: "Monitored", oversee: "Oversaw", grow: "Grew", increase: "Increased", reduce: "Reduced",
};

type Tense = "past" | "present" | null;
function tenseOf(point: string): Tense {
  const w = point.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  if (!w) return null;
  if (PAST_IRREGULAR.has(w) || (w.endsWith("ed") && w.length > 4)) return "past";
  if (PRESENT_TO_PAST[w] || (w.endsWith("s") && PRESENT_TO_PAST[w.slice(0, -1)]) || (w.endsWith("es") && PRESENT_TO_PAST[w.slice(0, -2)])) return "present";
  return null;
}
const baseOf = (w: string) => (PRESENT_TO_PAST[w] ? w : PRESENT_TO_PAST[w.slice(0, -1)] ? w.slice(0, -1) : w.slice(0, -2));

const keepCase = (orig: string, fixed: string) =>
  orig === orig.toUpperCase() && orig.length > 1 ? fixed.toUpperCase() : orig[0] === orig[0].toUpperCase() ? fixed[0].toUpperCase() + fixed.slice(1) : fixed;

/** Misspelled words in a piece of text, each with its correction. */
export function misspellings(text: string): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  for (const w of text.match(/[A-Za-z]+/g) ?? []) {
    const fix = MISSPELLINGS[w.toLowerCase()];
    if (fix && !out.some((o) => o.from === w)) out.push({ from: w, to: keepCase(w, fix) });
  }
  return out;
}

export const fixSpelling = (text: string) =>
  text.replace(/[A-Za-z]+/g, (w) => (MISSPELLINGS[w.toLowerCase()] ? keepCase(w, MISSPELLINGS[w.toLowerCase()]) : w));

export function cliches(text: string): { phrase: string; advice: string }[] {
  return CLICHES.filter((c) => c.re.test(text)).map(({ phrase, advice }) => ({ phrase, advice }));
}

/** Rewrites a present-tense opener into the past tense ("Manages stock" -> "Managed stock"). */
export function toPast(point: string): string {
  const t = point.trim();
  const first = t.split(/\s+/)[0] ?? "";
  if (tenseOf(t) !== "present") return t;
  return PRESENT_TO_PAST[baseOf(first.toLowerCase().replace(/[^a-z]/g, ""))] + t.slice(first.length);
}

/** Every writing problem in the CV, in the order the user meets them in the editor. */
export function checkWriting(cv: CV): WritingIssue[] {
  const out: WritingIssue[] = [];
  const seen = new Set<string>();
  const add = (i: WritingIssue) => {
    const key = i.kind + (i.fix?.from.toLowerCase() ?? i.text);
    if (!seen.has(key)) (seen.add(key), out.push(i));
  };

  for (const job of cv.experience.filter((x) => x.title.trim())) {
    const points = job.bullets.filter((b) => b.trim());
    for (const p of points) {
      for (const m of misspellings(p)) add({ kind: "spelling", text: `“${m.from}” should be “${m.to}”`, step: 2, fix: m });
      for (const c of cliches(p)) add({ kind: "cliche", text: `“${c.phrase}” — ${c.advice}`, step: 2 });
    }
    const tenses = points.map(tenseOf);
    const present = points.filter((_, i) => tenses[i] === "present");
    if (!job.current && present.length)
      add({ kind: "tense", text: `Use the past tense for ${job.company || job.title}: “${present[0].split(/\s+/)[0]}” → “${toPast(present[0]).split(/\s+/)[0]}”`, step: 2 });
    else if (job.current && present.length && tenses.includes("past"))
      add({ kind: "tense", text: `Your points at ${job.company || job.title} mix past and present tense — pick one`, step: 2 });
  }
  for (const text of [cv.headline, cv.summary, ...cv.skills, ...cv.certifications, ...cv.education.flatMap((e) => [e.degree, e.institute])]) {
    for (const m of misspellings(text)) add({ kind: "spelling", text: `“${m.from}” should be “${m.to}”`, step: text === cv.headline ? 1 : text === cv.summary ? 4 : 3, fix: m });
  }
  for (const c of cliches(cv.summary)) add({ kind: "cliche", text: `“${c.phrase}” in your summary — ${c.advice}`, step: 4 });
  return out;
}

/** Applies one spelling fix everywhere in the CV. */
export function applyFix(cv: CV, fix: { from: string; to: string }): Partial<CV> {
  const re = new RegExp(`\\b${fix.from}\\b`, "g");
  const r = (s: string) => s.replace(re, fix.to);
  return {
    headline: r(cv.headline),
    summary: r(cv.summary),
    skills: cv.skills.map(r),
    certifications: cv.certifications.map(r),
    experience: cv.experience.map((x) => ({ ...x, title: r(x.title), bullets: x.bullets.map(r) })),
    education: cv.education.map((e) => ({ ...e, degree: r(e.degree), institute: r(e.institute) })),
  };
}
