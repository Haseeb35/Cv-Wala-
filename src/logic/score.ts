import type { CV, Target } from "../state/types";
import { dateIssues, findGaps, isValidEmail, isValidPhone } from "./format";
import { hasPlaceholder, repeatedVerbs } from "./bullets";
import { analyzeAd } from "./jobad";
import { checkWriting } from "./writing";

const STUDENT_WORK = /\b(intern(ship)?|trainee|project|volunteer|apprentice|student|teaching assistant)\b/i;

/**
 * Fresh graduates are judged on projects, internships and grades rather than
 * jobs: the "Fresh Graduate" field, or a CV whose only entries are internships and projects.
 */
export function isFresher(cv: CV): boolean {
  if (cv.roleId === "fresh") return true;
  const jobs = cv.experience.filter((x) => x.title.trim());
  return jobs.length > 0 && jobs.every((x) => STUDENT_WORK.test(x.title));
}

export type Tip = { id: string; text: string; step: number; weight: number };
export type Score = { score: number; label: string; tips: Tip[] };

/**
 * Scores the CV out of 100 the way a recruiter skims it, and returns the
 * fixes worth the most points first. Checks that don't apply (e.g. keyword
 * match without a job ad) are left out of the total instead of counting as 0.
 */
export function scoreCV(cv: CV, target?: Target): Score {
  const tips: Tip[] = [];
  let earned = 0;
  let possible = 0;
  const check = (id: string, ok: boolean, weight: number, text: string, step: number) => {
    possible += weight;
    if (ok) earned += weight;
    else tips.push({ id, text, step, weight });
  };

  check("name", cv.name.trim().split(/\s+/).length >= 2, 6, "Add your full name", 1);
  check("phone", isValidPhone(cv.phone), 8, "Add a working phone number", 1);
  check("email", isValidEmail(cv.email), 8, "Add a valid email address", 1);
  check("city", !!cv.city.trim(), 3, "Add your city", 1);
  check("headline", !!cv.headline.trim(), 5, "Add a job title under your name", 1);

  const fresher = isFresher(cv);
  const jobs = cv.experience.filter((x) => x.title.trim());
  const bullets = jobs.flatMap((x) => x.bullets.filter((b) => b.trim()));

  if (fresher) {
    // No job expected — but a project or internship is, and grades matter more.
    check("jobs", jobs.length > 0, 10, "Add your final-year project, an internship or volunteer work", 2);
    check("grade", cv.education.some((e) => e.degree.trim() && e.grade.trim()), 4, "Add your CGPA or marks — employers check them for fresh graduates", 3);
    check("courses", cv.certifications.some((c) => c.trim()), 2, "Add a course or certificate (e.g. DigiSkills, Google, Coursera)", 4);
  } else {
    check("jobs", jobs.length > 0, 14, "Add at least one job, internship or project", 2);
  }
  check("company", jobs.every((x) => x.company.trim() && x.start), 4, "Add the company and start date for every job", 2);
  check("dates", jobs.every((x) => !dateIssues(x)), 4, "Fix the dates on your jobs", 2);
  if (jobs.length) {
    check("points", jobs.every((x) => x.bullets.filter((b) => b.trim()).length >= 2), 10, "Add 2–4 points under each job", 2);
    check("numbers", bullets.filter((b) => /\d/.test(b)).length >= Math.ceil(bullets.length / 2), 8, "Use numbers in your points (e.g. 50+ customers daily)", 2);
    check("placeholders", !bullets.some(hasPlaceholder), 8, "Replace the [example] brackets with your real details", 2);
    const reps = repeatedVerbs(bullets);
    check("verbs", reps.length === 0, 3, reps.length ? `“${reps[0].verb}” starts ${reps[0].count} points — vary your wording` : "", 2);
    const gaps = findGaps(cv.experience);
    check("gaps", gaps.length === 0, 2, gaps.length ? `Explain the gap ${gaps[0].from} – ${gaps[0].to} (course, freelancing, family business)` : "", 2);
  }

  const writing = checkWriting(cv);
  const typo = writing.find((w) => w.kind === "spelling");
  const cliche = writing.find((w) => w.kind === "cliche");
  const tense = writing.find((w) => w.kind === "tense");
  check("spelling", !typo, 4, typo ? `Spelling: ${typo.text}` : "", typo?.step ?? 2);
  if (bullets.length || cv.summary.trim()) check("cliches", !cliche, 2, cliche ? `Replace ${cliche.text}` : "", cliche?.step ?? 4);
  if (jobs.length) check("tense", !tense, 2, tense?.text ?? "", 2);

  const words = cv.summary.trim().split(/\s+/).filter(Boolean).length;
  check("summary", words >= 25 && words <= 90, 8, "Write a 2–3 line summary", 4);
  check("education", cv.education.some((e) => e.degree.trim() && e.institute.trim()), 8, "Add your education", 3);
  check("skills", cv.skills.length >= 5, 7, "Add at least 5 skills", 4);
  check("skills-max", cv.skills.length <= 14, 1, "Keep it to your 14 strongest skills", 4);
  check("languages", cv.languages.some((l) => l.name.trim()), 2, "Add the languages you speak", 4);

  const ad = target ? analyzeAd(cv, target.jobAd) : null;
  if (ad) {
    if (ad.skills.matched.length + ad.skills.missing.length > 0)
      check("keywords", ad.skills.percent >= 60, 6, `Your CV covers ${ad.skills.percent}% of the skills in the job ad`, 4);
    if (ad.keywords.missing.length) check("ad-words", ad.keywords.missing.length <= 2, 3, `The job ad mentions “${ad.keywords.missing[0]}” — use it if it fits your experience`, 2);
    if (ad.degree && !ad.degree.ok && ad.degree.have === 0) check("degree", false, 4, "The job asks for a degree — add your education", 3);
  }

  let score = possible ? Math.round((earned / possible) * 100) : 0;
  // Example placeholders must never reach an employer.
  if (bullets.some(hasPlaceholder)) score = Math.min(score, 79);
  tips.sort((a, b) => b.weight - a.weight);
  const label = score >= 90 ? "Ready to send" : score >= 75 ? "Strong" : score >= 50 ? "Getting there" : "Just started";
  return { score, label, tips };
}
