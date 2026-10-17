import type { CV, Education, Experience, Language } from "../state/types";
import { ROLES } from "../data/roles";
import { CITIES } from "../data/pakistan";
import { normalizePhone, titleCase, uid } from "./format";

// Reads an existing CV pasted as plain text (or pulled out of a PDF) and fills
// in the form, so people don't have to type everything again.

type Section = "head" | "summary" | "experience" | "education" | "skills" | "languages" | "certifications" | "ignore";

const HEADINGS: Record<Exclude<Section, "head">, string[]> = {
  summary: ["summary", "professional summary", "profile", "professional profile", "career objective", "objective", "about me", "personal statement", "career summary"],
  experience: ["experience", "work experience", "professional experience", "employment history", "employment", "work history", "career history", "job experience", "internships", "internship", "projects", "relevant experience"],
  education: ["education", "academic qualification", "academic qualifications", "qualification", "qualifications", "educational background", "academics", "education and qualifications", "academic record"],
  skills: ["skills", "key skills", "technical skills", "core skills", "core competencies", "competencies", "computer skills", "professional skills", "skills and abilities", "it skills", "soft skills"],
  languages: ["languages", "language skills", "language"],
  certifications: ["certifications", "certificates", "certification", "courses", "training", "trainings", "certifications and courses", "professional development", "short courses"],
  ignore: ["references", "reference", "personal information", "personal details", "personal data", "personal profile", "hobbies", "interests", "hobbies and interests", "declaration", "contact", "contact information", "contact details", "achievements", "awards"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z\s&]/g, " ").replace(/&/g, "and").replace(/\s+/g, " ").trim();

function headingOf(line: string): Exclude<Section, "head"> | null {
  const n = norm(line);
  if (!n || n.length > 40) return null;
  for (const [section, names] of Object.entries(HEADINGS) as [Exclude<Section, "head">, string[]][]) {
    if (names.includes(n)) return section;
  }
  return null;
}

const MON = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:${MON}\\s*,?\\s*'?\\d{2,4}|\\d{1,2}\\s*[/.-]\\s*\\d{4}|\\d{4})`;
const RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|till|until)\\s*(${DATE}|present|current|now|till date|to date|date|ongoing)`, "i");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Jan 2020" / "01/2020" / "2020" -> "2020-01". */
export function parseDate(raw: string): string {
  const s = raw.toLowerCase().trim();
  const year = s.match(/(\d{4})|'(\d{2})/);
  if (!year) return "";
  const y = year[1] ?? `20${year[2]}`;
  const mName = MONTHS.findIndex((m) => s.startsWith(m));
  if (mName >= 0) return `${y}-${String(mName + 1).padStart(2, "0")}`;
  const mNum = s.match(/^(\d{1,2})\s*[/.-]/);
  if (mNum && +mNum[1] >= 1 && +mNum[1] <= 12) return `${y}-${mNum[1].padStart(2, "0")}`;
  return `${y}-01`;
}

const BULLET = /^\s*(?:[•▪●◦*·>»➢✓✔-]|\d{1,2}[.)])\s+/;
const isBullet = (l: string) => BULLET.test(l) || l.split(/\s+/).length >= 8;
const cleanBullet = (l: string) => l.replace(BULLET, "").replace(/\s+/g, " ").trim().replace(/[.;]$/, "");
const COMPANY_HINT = /\b(ltd|limited|pvt|private|company|co\.|corp|corporation|inc|group|bank|store|stores|mart|hospital|clinic|school|college|university|academy|institute|pakistan|services|solutions|technologies|tech|industries|traders|enterprises|foundation|ngo|restaurant|hotel|international|agency|studio|software|systems)\b/i;
const findCity = (s: string) => CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(s)) ?? "";

/** Splits "Sales Associate | Imtiaz Super Market, Lahore" into its parts. */
function jobFromHeader(lines: string[], range?: RegExpMatchArray): Experience {
  const text = lines.join(" | ");
  const parts = text.split(/\s+(?:at|@)\s+|\s*[|•·–—]\s*|\s+-\s+|,\s*/).map((p) => p.trim().replace(/^[(]|[)]$/g, "")).filter(Boolean);
  const city = findCity(text);
  const rest = parts.filter((p) => p.toLowerCase() !== city.toLowerCase());
  let title = rest[0] ?? "";
  let company = rest[1] ?? "";
  if (COMPANY_HINT.test(title) && company && !COMPANY_HINT.test(company)) [title, company] = [company, title];
  const end = range?.[2] ?? "";
  const current = /present|current|now|till date|to date|^date$|ongoing/i.test(end);
  return {
    id: uid(), title, company, city,
    start: range ? parseDate(range[1]) : "",
    end: range && !current ? parseDate(end) : "",
    current: !!range && current,
    bullets: [],
  };
}

function parseExperience(lines: string[]): Experience[] {
  const jobs: Experience[] = [];
  let pending: string[] = [];
  let cur: Experience | null = null;
  for (const line of lines) {
    const range = line.match(RANGE);
    if (range) {
      const header = [...pending, line.replace(range[0], "")].map((l) => l.replace(/^[\s|,–—-]+|[\s|,–—-]+$/g, "")).filter(Boolean);
      pending = [];
      cur = jobFromHeader(header, range);
      jobs.push(cur);
      continue;
    }
    if (isBullet(line)) {
      // Bullets after a job title with no dates still form a job.
      if (pending.length) {
        cur = jobFromHeader(pending);
        jobs.push(cur);
        pending = [];
      }
      if (cur) cur.bullets.push(cleanBullet(line));
      continue;
    }
    // Short line straight after a dated header is usually "Company, City".
    if (cur && !cur.bullets.length && !cur.company && !pending.length) {
      const extra = jobFromHeader([line]);
      cur.company = extra.title;
      cur.city ||= extra.city || findCity(line);
      continue;
    }
    pending.push(line);
  }
  if (pending.length && (!jobs.length || pending.length <= 2)) jobs.push(jobFromHeader(pending));
  return jobs
    .filter((j) => j.title)
    .map((j) => ({ ...j, bullets: j.bullets.length ? j.bullets.slice(0, 6) : [""] }));
}

const DEGREE = /\b(matric(?:ulation)?|ssc|hssc|o[\s-]?levels?|a[\s-]?levels?|intermediate|f\.?\s?sc|f\.?\s?a|i\.?\s?cs|i\.?\s?com|dae|b\.?\s?a|b\.?\s?sc|b\.?\s?com|bba|b\.?\s?s|b\.?\s?e|bachelor'?s?|mbbs|bsn|m\.?\s?a|m\.?\s?sc|m\.?\s?com|mba|m\.?\s?s|m\.?\s?phil|ph\.?\s?d|master'?s?|diploma|dit)\b(?!\s*(?:office|excel|word|powerpoint))/i;
const INSTITUTE = /\b(university|college|school|institute|academy|board|bise|polytechnic|lums|nust|fast|comsats|iba|uet|giki|aku|campus)\b/i;
const GRADE = /(c?gpa\s*[:-]?\s*[\d.]+(?:\s*\/\s*[\d.]+)?|\d{2,3}(?:\.\d+)?\s*%|\b[a-f][+]?\s*grade\b|\bgrade\s*[a-f][+]?\b|\d(?:st|nd|rd)\s+division|\b(?:first|second|third)\s+division)/i;

function parseEducation(lines: string[]): Education[] {
  const out: Education[] = [];
  let cur: Education | null = null;
  for (const raw of lines) {
    const line = cleanBullet(raw);
    const year = line.match(/\b(19|20)\d{2}\b(?!.*\b(19|20)\d{2}\b)/)?.[0] ?? "";
    const grade = line.match(GRADE)?.[0] ?? "";
    const parts = line.split(/\s*[|•·–—,]\s*|\s+-\s+|\s+from\s+/i).map((p) => p.trim()).filter(Boolean);
    const degreePart = parts.find((p) => DEGREE.test(p) && !INSTITUTE.test(p)) ?? (DEGREE.test(line) && !INSTITUTE.test(line) ? line : "");
    const instPart = parts.find((p) => INSTITUTE.test(p)) ?? "";
    const strip = (s: string) => s.replace(GRADE, "").replace(/\b(19|20)\d{2}\b/g, "").replace(/[()]/g, " ").replace(/\s+/g, " ").replace(/^[\s:–-]+|[\s:–-]+$/g, "").trim();
    if (degreePart) {
      cur = { id: uid(), degree: strip(degreePart), institute: strip(instPart), year, grade };
      out.push(cur);
    } else if (cur) {
      if (!cur.institute && instPart) cur.institute = strip(instPart);
      cur.year ||= year;
      cur.grade ||= grade;
    }
  }
  return out.filter((e) => e.degree).slice(0, 5);
}

function splitList(lines: string[]): string[] {
  const items = lines.flatMap((l) => cleanBullet(l).split(/\s*[,•|;·▪●]\s*|\s{2,}/));
  const seen = new Set<string>();
  return items
    .map((s) => s.replace(/^[\s:-]+|[\s:.-]+$/g, "").trim())
    .filter((s) => s.length >= 2 && s.length <= 40 && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))
    .map((s) => (s === s.toLowerCase() ? s[0].toUpperCase() + s.slice(1) : s));
}

function parseLanguages(lines: string[]): Language[] {
  return splitList(lines).slice(0, 6).map((item) => {
    const l = item.toLowerCase();
    const level: Language["level"] = /native|mother/.test(l) ? "Native" : /fluent|excellent/.test(l) ? "Fluent" : /basic|beginner|elementary/.test(l) ? "Basic" : "Professional";
    return { name: titleCase(item.replace(/\(.*?\)|[-:].*$|\b(native|fluent|basic|good|professional|excellent|intermediate|beginner|mother tongue)\b/gi, "").trim()), level };
  }).filter((l) => l.name);
}

function guessRole(text: string, headline: string): string {
  const t = ` ${text.toLowerCase()} `;
  const h = headline.toLowerCase();
  let best = { id: "other", score: 0 };
  for (const r of ROLES) {
    if (r.id === "other") continue;
    let score = r.keywords.filter((k) => t.includes(` ${k}`)).length + r.skills.filter((s) => t.includes(s.toLowerCase())).length;
    if (r.keywords.some((k) => h.includes(k))) score += 4;
    if (score > best.score) best = { id: r.id, score };
  }
  return best.score >= 2 ? best.id : "other";
}

export type ImportResult = {
  cv: Partial<CV>;
  found: { name: boolean; contact: number; jobs: number; education: number; skills: number; summary: boolean };
};

export function importCV(text: string): ImportResult {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\t/g, "  ").trim()).filter(Boolean);
  const all = lines.join("\n");

  const email = all.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phoneRaw = all.match(/(?:\+?92|0)\s?3\d{2}[\s-]?\d{7}|(?:\+?92|0)3\d{9}|\+\d[\d\s-]{8,15}\d/)?.[0] ?? "";
  const linkedin = all.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i)?.[0] ?? "";

  // Split into sections by headings ("Experience:", "EDUCATION", ...).
  const sections: Record<Section, string[]> = { head: [], summary: [], experience: [], education: [], skills: [], languages: [], certifications: [], ignore: [] };
  let section: Section = "head";
  for (const line of lines) {
    const h = headingOf(line.replace(/:$/, ""));
    if (h) {
      section = h;
      continue;
    }
    // "Skills: Excel, Tally" on one line.
    const inline = line.match(/^([A-Za-z ]{3,30}):\s*(.+)$/);
    const ih = inline && headingOf(inline[1]);
    if (ih) {
      sections[ih].push(inline![2]);
      continue;
    }
    sections[section].push(line);
  }

  // Name: an early line of 2-4 words, letters only, that isn't a title like "Curriculum Vitae".
  const head = sections.head.length ? sections.head : lines.slice(0, 6);
  const nameIdx = head.findIndex((l) => /^[A-Za-z][A-Za-z.\s'-]{2,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 4 && !/curriculum|vitae|resume|\bcv\b/i.test(l));
  const name = nameIdx >= 0 ? titleCase(head[nameIdx]) : "";
  const next = nameIdx >= 0 ? head[nameIdx + 1] : undefined;
  const headline = next && !/[@\d]/.test(next) && next.split(/\s+/).length <= 6 && !headingOf(next) && !findCity(next) ? next.replace(/[|•].*$/, "").trim() : "";
  const city = findCity(head.join(" ")) || findCity(all.slice(0, 400));

  const experience = parseExperience(sections.experience);
  const education = parseEducation(sections.education);
  const skills = splitList(sections.skills).slice(0, 16);
  const languages = parseLanguages(sections.languages);
  const certifications = sections.certifications.map(cleanBullet).filter((c) => c.length > 2).slice(0, 8);
  const summary = sections.summary.join(" ").replace(/\s+/g, " ").trim();

  const cv: Partial<CV> = { roleId: guessRole(all, headline || experience[0]?.title || "") };
  if (name) cv.name = name;
  if (headline) cv.headline = headline;
  else if (experience[0]?.title) cv.headline = experience[0].title;
  if (email) cv.email = email.toLowerCase();
  if (phoneRaw) cv.phone = normalizePhone(phoneRaw);
  if (city) cv.city = city;
  if (linkedin) cv.linkedin = linkedin.replace(/^https?:\/\/(www\.)?/, "");
  if (summary) Object.assign(cv, { summary, summaryTouched: true });
  if (experience.length) cv.experience = experience;
  if (education.length) cv.education = education;
  if (skills.length) cv.skills = skills;
  if (languages.length) cv.languages = languages;
  if (certifications.length) cv.certifications = certifications;

  return {
    cv,
    found: {
      name: !!name,
      contact: [email, phoneRaw, city, linkedin].filter(Boolean).length,
      jobs: experience.length,
      education: education.length,
      skills: skills.length,
      summary: !!summary,
    },
  };
}
