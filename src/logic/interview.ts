import type { CV, Target } from "../state/types";
import { analyzeAd } from "./jobad";
import { findGaps, sortedExperience, totalYears } from "./format";
import { salaryAdvice } from "./salary";
import { isFresher } from "./score";

// Likely interview questions for this CV and this job, each with an answer
// outline built from the user's own CV, so they practise with real examples.

export type Question = {
  id: string;
  group: "about" | "experience" | "job" | "tricky" | "ask";
  q: string;
  points: string[]; // what to say, in order
};

export const GROUPS: Record<Question["group"], string> = {
  about: "About you",
  experience: "Your experience",
  job: "This job",
  tricky: "Hard questions",
  ask: "Questions to ask them",
};

const short = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}…` : s);
const yearsText = (y: number) => (y >= 2 ? `${Math.floor(y)} years` : y >= 1 ? "over a year" : "some");

export function interviewPrep(cv: CV, target: Target): Question[] {
  const ad = analyzeAd(cv, target.jobAd);
  const out: Question[] = [];
  const company = target.company.trim() || "the company";
  const role = target.jobTitle.trim() || cv.headline.trim() || "this role";
  const years = totalYears(cv);
  const fresher = isFresher(cv);
  const jobs = sortedExperience(cv.experience).filter((x) => x.title.trim());
  const latest = jobs[0];
  const proof = jobs.flatMap((x) => x.bullets.filter((b) => /\d/.test(b) && !/\[/.test(b)).map((b) => ({ b, job: x })));
  const strengths = [...(ad?.skills.matched ?? []), ...cv.skills.filter((s) => !ad?.skills.matched.includes(s))].slice(0, 3);
  const edu = cv.education.find((e) => e.degree.trim());

  out.push({
    id: "about", group: "about", q: "Tell me about yourself.",
    points: [
      fresher || !latest
        ? `Start with your studies: ${edu ? `${edu.degree}${edu.institute ? ` from ${edu.institute}` : ""}` : "what you studied and where"}.`
        : `Start with now: ${latest.title}${latest.company ? ` at ${latest.company}` : ""}, with ${yearsText(years)} of experience.`,
      proof[0] ? `Give your best result: “${short(proof[0].b, 80)}”.` : "Give one thing you did well, with a number if you can.",
      `End with why you want this job at ${company}. Keep the whole answer under one minute.`,
    ],
  });
  out.push({
    id: "strengths", group: "about", q: "What are your strengths?",
    points: strengths.length
      ? [...strengths.map((s) => `${s} — have one short example ready.`), "Pick the ones the job ad asks for."]
      : ["Name 2–3 skills the job needs, each with a short example."],
  });
  out.push({
    id: "weakness", group: "about", q: "What is your biggest weakness?",
    points: [
      ad?.skills.missing[0] ? `Choose something real but small — for example, you are still learning ${ad.skills.missing[0]}.` : "Choose something real but small, that doesn't stop you doing this job.",
      "Say what you are doing to improve it (a course, practice, asking for feedback).",
      "Don't say “I work too hard” — interviewers hear it every day.",
    ],
  });

  for (const [i, { b, job }] of proof.slice(0, 2).entries()) {
    out.push({
      id: `proof-${i}`, group: "experience", q: `Tell me more about this: “${short(b)}”`,
      points: [
        `The situation: where you were (${job.title}${job.company ? ` at ${job.company}` : ""}) and what the problem or goal was.`,
        "What you did, step by step. Say “I”, not “we”.",
        "The result, with the number from your CV.",
        "What you learned or would do better next time.",
      ],
    });
  }
  if (fresher) {
    out.push({
      id: "project", group: "experience", q: "Tell me about your final-year project.",
      points: ["What the project was and why you chose it.", "Your part in it — the tools and skills you used.", "The result: grade, demo, or who used it."],
    });
    out.push({
      id: "no-exp", group: "tricky", q: "Why should we hire you without experience?",
      points: ["You learn quickly — give one example from university or a project.", strengths[0] ? `You already have ${strengths[0]}, which this job needs.` : "Name a skill the job needs that you already have.", "You are ready to start and grow with the company."],
    });
  }

  out.push({
    id: "why-us", group: "job", q: `Why do you want to work at ${company}?`,
    points: [`Look at ${company}'s website or social media before the interview. Mention one thing you liked.`, `Connect it to your own goals as a ${role}.`],
  });
  for (const s of ad?.skills.missing.slice(0, 2) ?? []) {
    out.push({
      id: `skill-${s}`, group: "job", q: `Have you worked with ${s}?`,
      points: ["Be honest. If not, say so.", "Mention the closest thing you have done.", `Say how you would learn it quickly — for example, a short online course on ${s}.`],
    });
  }
  if (ad?.years && !ad.years.ok)
    out.push({
      id: "years", group: "tricky", q: `We asked for ${ad.years.required}+ years. Why should we choose you?`,
      points: [`You have ${yearsText(years)} of experience, but you did ${proof[0] ? `things like “${short(proof[0].b, 60)}”` : "real work with real results"}.`, "Show that you learn fast and need little training."],
    });
  if (ad?.city && !ad.city.ok)
    out.push({ id: "relocate", group: "job", q: `Can you move to ${ad.city.cities[0]}?`, points: ["Give a clear answer and a date you could start.", "If you need help with moving, ask about it after the offer, not now."] });

  const gaps = findGaps(cv.experience);
  if (gaps[0])
    out.push({
      id: "gap", group: "tricky", q: `What did you do between ${gaps[0].from} and ${gaps[0].to}?`,
      points: ["Answer calmly and briefly — studies, family, freelancing or a course are all fine.", "Say what you learned in that time, then move on to why you're ready now."],
    });
  if (latest?.current)
    out.push({
      id: "leaving", group: "tricky", q: "Why do you want to leave your current job?",
      points: ["Talk about growth: more responsibility, new skills, a bigger team.", "Never criticise your current employer or manager."],
    });

  const salary = salaryAdvice(target.jobAd, target.expectedSalary ?? "");
  out.push({ id: "salary", group: "tricky", q: "What salary do you expect?", points: [`“${salary.reply}”`, ...(salary.warning ? [salary.warning] : []), salary.tip] });
  out.push({
    id: "join", group: "job", q: "When can you join?",
    points: latest?.current
      ? ["Check the notice period in your contract (often one month) and say it clearly.", "Offer to finish your handover properly — employers respect that."]
      : ["Say you can join straight away, or give the exact date."],
  });

  out.push({
    id: "ask", group: "ask", q: "Do you have any questions for us?",
    points: ["What does a normal day look like in this job?", "How will my work be judged in the first three months?", "What are the next steps after this interview?"],
  });
  return out;
}
