// Offline bullet-point coach: rewrites weak openings into action verbs,
// cleans grammar and tells the user what's still missing.

import { PRESENT_TO_PAST, cliches, fixSpelling } from "./writing";

const WEAK_OPENERS: [RegExp, string][] = [
  [/^(i was |was )?responsible for (managing|handling)\s+/i, "Managed "],
  [/^(i was |was )?responsible for\s+/i, "Handled "],
  [/^(i )?(was )?in charge of\s+/i, "Led "],
  [/^(i )?worked on\s+/i, "Delivered "],
  [/^(i )?worked (as|in|at)\s+/i, "Worked $2 "],
  [/^(i )?helped (to )?/i, "Supported "],
  [/^(i )?did\s+/i, "Completed "],
  [/^(i )?made\s+/i, "Created "],
  [/^(i )?handled\s+/i, "Handled "],
  [/^(i )?took care of\s+/i, "Managed "],
  [/^(i )?dealt with\s+/i, "Resolved "],
  [/^(i )?talked to\s+/i, "Communicated with "],
  [/^(i )?sold\s+/i, "Sold "],
  [/^(i )?taught\s+/i, "Taught "],
  [/^(i )?(used to |would )?(do|make)\s+/i, "Delivered "],
  [/^duties included\s+/i, ""],
  [/^my (job|duty|work) was (to )?/i, ""],
];

export type BulletReview = { text: string; tips: string[]; changed: boolean };

export function improveBullet(input: string): BulletReview {
  let t = input.trim().replace(/^[-•*·]\s*/, "").replace(/\s+/g, " ");
  if (!t) return { text: "", tips: [], changed: false };
  const original = t;

  for (const [re, rep] of WEAK_OPENERS) {
    if (re.test(t)) {
      t = t.replace(re, rep);
      break;
    }
  }
  // Present tense opener -> past tense ("manage stock" -> "Managed stock")
  const first = t.split(" ")[0].toLowerCase();
  if (PRESENT_TO_PAST[first]) t = PRESENT_TO_PAST[first] + t.slice(first.length);

  t = fixSpelling(t);
  t = t.replace(/\bi\b/g, "I").replace(/\s+([,.])/g, "$1").replace(/[.]+$/, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);

  const tips: string[] = [];
  if (!/\d/.test(t)) tips.push("Add a number — how many customers, how much, how often? Numbers make CVs 2× stronger.");
  if (t.split(" ").length < 5) tips.push("Too short. Say what you did and the result.");
  if (t.split(" ").length > 28) tips.push("Too long. Keep each point to one line (under 25 words).");
  if (/\b(I|me|my)\b/.test(t)) tips.push("Remove 'I' and 'my' — CV points start with an action word.");
  if (/\[[^\]]+\]/.test(t)) tips.push("Replace the [brackets] with your real numbers.");
  for (const c of cliches(t)) tips.push(`“${c.phrase}” proves nothing. ${c.advice}`);

  return { text: t, tips, changed: t !== original };
}

// Synonyms so a CV doesn't start every point with the same word.
const ALTERNATIVES: Record<string, string[]> = {
  managed: ["Oversaw", "Ran", "Coordinated", "Directed", "Supervised"],
  handled: ["Processed", "Resolved", "Managed", "Took charge of"],
  supported: ["Assisted", "Enabled", "Backed", "Partnered with"],
  helped: ["Supported", "Enabled", "Contributed to"],
  worked: ["Collaborated", "Delivered", "Operated"],
  created: ["Built", "Designed", "Developed", "Launched"],
  led: ["Headed", "Guided", "Directed", "Spearheaded"],
  maintained: ["Kept", "Preserved", "Upheld", "Organised"],
  served: ["Assisted", "Looked after", "Attended to"],
  delivered: ["Completed", "Achieved", "Produced"],
  prepared: ["Drafted", "Compiled", "Produced"],
  achieved: ["Exceeded", "Reached", "Hit", "Earned"],
};

export type VerbRepeat = { verb: string; count: number; alternatives: string[] };

/** Opening verbs used 3+ times across the whole CV. */
export function repeatedVerbs(bullets: string[]): VerbRepeat[] {
  const counts = new Map<string, number>();
  for (const b of bullets) {
    const v = b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, n]) => n >= 3)
    .map(([verb, count]) => ({ verb: verb[0].toUpperCase() + verb.slice(1), count, alternatives: ALTERNATIVES[verb] ?? [] }));
}

export const hasPlaceholder = (s: string) => /\[[^\]]+\]/.test(s);
