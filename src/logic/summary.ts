import type { CV } from "../state/types";
import { roleById } from "../data/roles";
import { sortedExperience, totalYears } from "./format";

const listJoin = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

// Keep acronyms and product names ("MS Excel", "SEO", "QuickBooks") as written.
const skillCase = (s: string) => (/^[A-Z]{2,}|^MS |[a-z][A-Z]|\.js$/.test(s) ? s : s.toLowerCase());

/**
 * Writes a two-sentence professional summary from what the user already entered.
 * Sentence 1 says who they are; sentence 2 gives the proof (experience or
 * education) plus their top skills.
 */
export function buildSummary(cv: CV): string {
  const role = roleById(cv.roleId);
  const years = totalYears(cv);
  const latest = sortedExperience(cv.experience).find((x) => x.title);
  const edu = cv.education.find((e) => e.degree);
  const skills = listJoin(cv.skills.slice(0, 3).map(skillCase));

  let lead = role.summaryLead.replace("{degree}", edu?.degree ?? "").replace(/\s+/g, " ").trim();
  if (role.id === "other" && cv.headline) lead = `Reliable ${cv.headline}`;
  const first = `${lead} ${role.summaryValue}.`;

  let second = "";
  if (years >= 1) {
    const y = years >= 2 ? `${Math.floor(years)}+ years` : "over a year";
    second = `Brings ${y} of experience${latest?.company ? `, most recently at ${latest.company}` : ""}`;
    second += skills ? `, with strong skills in ${skills}.` : ".";
  } else if (edu && role.id !== "fresh") {
    second = `Holds ${/^[aeiou]/i.test(edu.degree) ? "an" : "a"} ${edu.degree}${edu.institute ? ` from ${edu.institute}` : ""}`;
    second += skills ? `, with skills in ${skills}.` : ".";
  } else if (edu?.institute) {
    second = `Studied at ${edu.institute}${skills ? `, with skills in ${skills}` : ""}, and ready to start contributing straight away.`;
  } else if (skills) {
    second = `Skilled in ${skills}.`;
  }

  return `${first} ${second}`.replace(/\s+/g, " ").trim();
}
