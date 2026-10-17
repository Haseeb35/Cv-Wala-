import type { CV, Experience } from "../state/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Normalises Pakistani mobile numbers to "+92 3XX XXXXXXX". Other numbers are left as typed. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  let local = "";
  if (/^03\d{9}$/.test(digits)) local = digits.slice(1);
  else if (/^\+?923\d{9}$/.test(digits)) local = digits.replace(/^\+?92/, "");
  else if (/^00923\d{9}$/.test(digits)) local = digits.slice(4);
  else if (/^3\d{9}$/.test(digits)) local = digits;
  if (!local) return raw.trim();
  return `+92 ${local.slice(0, 3)} ${local.slice(3)}`;
}

export const isValidPhone = (p: string) => /^\+92 3\d{2} \d{7}$/.test(normalizePhone(p)) || /^\+?[\d\s-]{8,16}$/.test(p.trim());

export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim());

/** Fixes common email typos like "gmail.con" or "gmial.com". */
export function suggestEmail(e: string): string | null {
  const m = e.trim().toLowerCase().match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return null;
  const fixes: Record<string, string> = {
    "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmail.con": "gmail.com", "gmail.co": "gmail.com",
    "gamil.com": "gmail.com", "gmail.cm": "gmail.com", "yahoo.con": "yahoo.com", "yaho.com": "yahoo.com",
    "hotmail.con": "hotmail.com", "hotmial.com": "hotmail.com", "outlook.con": "outlook.com",
  };
  const fixed = fixes[m[2]];
  return fixed ? `${m[1]}@${fixed}` : null;
}

/** "Muhammad ali KHAN" -> "Muhammad Ali Khan" */
export const titleCase = (s: string) =>
  s.trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

export function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  if (!y) return "";
  return m ? `${MONTHS[Number(m) - 1]} ${y}` : y;
}

export function dateRange(x: Pick<Experience, "start" | "end" | "current">): string {
  const s = fmtMonth(x.start);
  const e = x.current ? "Present" : fmtMonth(x.end);
  if (!s && !e) return "";
  if (!s) return e;
  return `${s} – ${e || "Present"}`;
}

function monthsOf(x: Experience, now = new Date()): number {
  if (!x.start) return 0;
  const [sy, sm] = x.start.split("-").map(Number);
  let ey: number, em: number;
  if (x.current || !x.end) [ey, em] = [now.getFullYear(), now.getMonth() + 1];
  else [ey, em] = x.end.split("-").map(Number);
  return Math.max(0, (ey - sy) * 12 + (em - (sm || 1)) + 1);
}

/** Total experience in years, merging overlapping jobs so they aren't double-counted. */
export function totalYears(cv: Pick<CV, "experience">, now = new Date()): number {
  const ranges = cv.experience
    .filter((x) => x.start)
    .map((x) => {
      const [sy, sm] = x.start.split("-").map(Number);
      const start = sy * 12 + (sm || 1);
      return [start, start + monthsOf(x, now) - 1] as const;
    })
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let cur: [number, number] | null = null;
  for (const [s, e] of ranges) {
    if (!cur || s > cur[1] + 1) {
      if (cur) total += cur[1] - cur[0] + 1;
      cur = [s, e];
    } else cur[1] = Math.max(cur[1], e);
  }
  if (cur) total += cur[1] - cur[0] + 1;
  return Math.round((total / 12) * 10) / 10;
}

/** Newest job first; current jobs on top. */
export function sortedExperience(list: Experience[]): Experience[] {
  const key = (x: Experience) => (x.current ? "9999-99" : x.end || x.start || "0000");
  return [...list].sort((a, b) => key(b).localeCompare(key(a)));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

const ym = (s: string) => {
  const [y, m] = s.split("-").map(Number);
  return y * 12 + ((m || 1) - 1);
};

/** Date mistakes that make a CV look careless. */
export function dateIssues(x: Experience, now = new Date()): string | null {
  const today = now.getFullYear() * 12 + now.getMonth();
  if (x.start && ym(x.start) > today) return "Start date is in the future.";
  if (!x.current && x.start && x.end && ym(x.end) < ym(x.start)) return "End date is before the start date.";
  if (!x.current && x.end && ym(x.end) > today) return "End date is in the future — is this your current job?";
  if (x.start && !x.current && !x.end) return "Add an end date, or switch on “I currently work here”.";
  return null;
}

/** Gaps of 6+ months between jobs, newest first. Recruiters ask about these. */
export function findGaps(list: Experience[], now = new Date()): { from: string; to: string; months: number }[] {
  const today = now.getFullYear() * 12 + now.getMonth();
  const spans = list
    .filter((x) => x.start)
    .map((x) => [ym(x.start), x.current || !x.end ? today : ym(x.end)] as const)
    .sort((a, b) => a[0] - b[0]);
  const gaps: { from: string; to: string; months: number }[] = [];
  let reach = -Infinity;
  for (const [s, e] of spans) {
    if (reach > -Infinity && s - reach > 6) {
      const f = (v: number) => `${MONTHS[v % 12]} ${Math.floor(v / 12)}`;
      gaps.push({ from: f(reach), to: f(s), months: s - reach - 1 });
    }
    reach = Math.max(reach, e);
  }
  return gaps.reverse();
}
