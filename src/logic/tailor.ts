import type { CV, Target } from "../state/types";
import { analyzeAd } from "./jobad";
import { buildSummary } from "./summary";
import { sortedExperience } from "./format";
import { hasPlaceholder } from "./bullets";

// One tap: a copy of the CV aimed at one job ad. Nothing is invented — the plan
// only reorders, trims and re-words what the user already wrote, and new skills
// are added only when the user confirms they have them.

export type TailorChange = {
  id: "headline" | "skills" | "order" | "trim" | "summary";
  text: string;
  detail?: string;
  on: boolean; // switched on by default?
  apply: (cv: CV) => Partial<CV>; // works on the CV as changed so far
};

export type TailorPlan = {
  title: string; // the job, as named in the ad
  changes: TailorChange[];
  ask: string[]; // things the ad wants that the CV doesn't mention — added only if confirmed
  notes: string[]; // what was deliberately left alone, and why
  fitBefore: number;
};

const SENIOR = /\b(senior|sr|lead|head|manager|director|chief|principal|supervisor|incharge|in-charge)\b/i;
const FILLER = new Set(["and", "the", "for", "with", "officer", "executive", "associate", "assistant", "staff", "job", "role", "position", "required", "urgent"]);
const stem = (w: string) => w.toLowerCase().replace(/[^a-z0-9+#]/g, "").slice(0, 5);
const words = (s: string) => s.split(/[\s/,&()-]+/).filter((w) => w.length > 2 && !FILLER.has(w.toLowerCase())).map(stem);

/** The job title an ad is for: "We are hiring a Sales Officer", "Position: Accountant", or a short first line. */
export function adTitle(ad: string): string | undefined {
  const m = ad.match(/\b(?:hiring(?: an?)?|position|post|job title|vacancy|role|required|wanted)\s*(?:for|of)?\s*[:–-]?\s*(?:an?\s+)?([A-Z][A-Za-z&/ ]{2,40}?)(?=\s+(?:in|at|for|with|to|who)\b|[.,:;(\n]|$)/);
  if (m) return m[1].trim();
  const first = ad.trim().split("\n")[0].trim().replace(/[.:!]+$/, "");
  return first && first.split(/\s+/).length <= 5 && /^[A-Z]/.test(first) ? first : undefined;
}

/** Ad words a point can match: its skills, repeated words and the job title. */
function adTerms(cv: CV, ad: string, title: string): Set<string> {
  const a = analyzeAd(cv, ad);
  const raw = [...(a?.skills.matched ?? []), ...(a?.skills.missing ?? []), ...(a?.keywords.present ?? []), ...(a?.keywords.missing ?? []), title];
  return new Set(raw.flatMap(words));
}

const relevance = (point: string, terms: Set<string>) => {
  const mine = new Set(words(point));
  let n = 0;
  for (const t of terms) if (mine.has(t)) n++;
  return n + (/\d/.test(point) ? 0.5 : 0); // a number is worth half a match
};

/** Skills the ad asks for first, then the rest; at most 10 when the list is long. */
function skillsFor(cv: CV, ad: string): string[] {
  const matched = analyzeAd(cv, ad)?.skills.matched ?? [];
  const ordered = [...matched, ...cv.skills.filter((s) => !matched.includes(s))];
  return cv.skills.length > 10 ? ordered.slice(0, Math.max(10, matched.length)) : ordered;
}

export function planTailor(cv: CV, target: Target): TailorPlan | null {
  const ad = target.jobAd;
  const fit = analyzeAd(cv, ad);
  if (!fit) return null;
  const title = target.jobTitle.trim() || adTitle(ad) || "";
  const terms = adTerms(cv, ad, title);
  const changes: TailorChange[] = [];
  const notes: string[] = [];

  // 1. Job title under the name — only to a title in the same line of work, never a promotion.
  if (title && title.toLowerCase() !== cv.headline.trim().toLowerCase()) {
    const mine = [cv.headline, ...cv.experience.map((x) => x.title)].filter((t) => t.trim());
    const close = mine.some((t) => words(t).some((w) => words(title).includes(w)));
    const promotion = SENIOR.test(title) && !mine.some((t) => SENIOR.test(t));
    if (close && !promotion) changes.push({ id: "headline", text: `Use the ad's job title: “${title}”`, detail: cv.headline ? `Was “${cv.headline}”` : undefined, on: true, apply: () => ({ headline: title }) });
    else if (promotion) notes.push(`Kept your job title — “${title}” is a more senior role than you've held. Your letter can explain why you're ready.`);
  }

  // 2. Skills the ad asks for go first; unrelated ones are trimmed from long lists.
  const nextSkills = skillsFor(cv, ad);
  if (nextSkills.join("|") !== cv.skills.join("|")) {
    const dropped = cv.skills.filter((s) => !nextSkills.includes(s));
    changes.push({
      id: "skills",
      text: fit.skills.matched.length ? `Put ${fit.skills.matched.slice(0, 3).join(", ")} first in your skills` : "Reorder your skills for this job",
      detail: dropped.length ? `Leaves out ${dropped.length} the ad doesn't ask for: ${dropped.slice(0, 3).join(", ")}${dropped.length > 3 ? "…" : ""}` : undefined,
      on: true,
      apply: (c) => ({ skills: skillsFor(c, ad) }),
    });
  }

  // 3. The points that match the ad move to the top of each job.
  const reorder = (c: CV) =>
    c.experience.map((x) => ({
      ...x,
      bullets: x.bullets.map((b, i) => ({ b, i, r: b.trim() ? relevance(b, terms) : -1 })).sort((p, q) => q.r - p.r || p.i - q.i).map((p) => p.b),
    }));
  const moved = cv.experience.filter((x, j) => reorder(cv)[j].bullets.join("|") !== x.bullets.join("|"));
  if (moved.length)
    changes.push({ id: "order", text: "Move the points that match the ad to the top", detail: `In ${moved.map((x) => x.company || x.title).slice(0, 3).join(", ")}`, on: true, apply: (c) => ({ experience: reorder(c) }) });

  // 4. Long CVs: older jobs keep only their two most relevant points.
  const total = cv.experience.reduce((n, x) => n + x.bullets.filter((b) => b.trim()).length, 0);
  const older = sortedExperience(cv.experience).slice(2).filter((x) => x.bullets.filter((b) => b.trim()).length > 2);
  if (total > 12 && older.length) {
    const ids = new Set(older.map((x) => x.id));
    changes.push({
      id: "trim", text: "Shorten older jobs to their 2 best points", detail: "Keeps the CV to one or two pages", on: true,
      apply: (c) => ({ experience: c.experience.map((x) => (ids.has(x.id) ? { ...x, bullets: [...x.bullets].filter((b) => b.trim()).sort((p, q) => relevance(q, terms) - relevance(p, terms)).slice(0, 2) } : x)) }),
    });
  }

  // 5. Summary rewritten from the tailored CV. A summary the user wrote by hand is only replaced if they choose to.
  changes.push({
    id: "summary",
    text: cv.summaryTouched ? "Rewrite your summary for this job" : "Update your summary for this job",
    detail: cv.summaryTouched ? "Replaces the summary you wrote yourself" : "Leads with the skills the ad asks for",
    on: !cv.summaryTouched,
    apply: (c) => ({ summary: `${buildSummary(c)}${title ? ` Now looking for ${/^[aeiou]/i.test(title) ? "an" : "a"} ${title} role.` : ""}`, summaryTouched: true }),
  });

  if (cv.experience.some((x) => x.bullets.some(hasPlaceholder))) notes.push("Some points still have [example] text — replace it before you send this version.");

  const ask = [...fit.skills.missing, ...fit.keywords.missing.slice(0, 3).map((w) => w[0].toUpperCase() + w.slice(1))]
    .filter((s, i, all) => all.findIndex((x) => x.toLowerCase() === s.toLowerCase()) === i)
    .slice(0, 8);
  return { title, changes, ask, notes, fitBefore: fit.fit };
}

/** Builds the tailored CV from the changes the user kept and the skills they confirmed. */
export function applyTailor(cv: CV, target: Target, plan: TailorPlan, keep: Set<string>, confirmed: string[]): { cv: CV; fit: number } {
  let next: CV = { ...structuredClone(cv), skills: [...cv.skills, ...confirmed.filter((s) => !cv.skills.some((x) => x.toLowerCase() === s.toLowerCase()))] };
  for (const ch of plan.changes) if (keep.has(ch.id)) next = { ...next, ...ch.apply(next) };
  next.updatedAt = Date.now();
  return { cv: next, fit: analyzeAd(next, target.jobAd)?.fit ?? 0 };
}
