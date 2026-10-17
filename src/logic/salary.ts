// Salary: reads the range from a job ad and turns it into a safe answer to
// "What salary do you expect?". It never invents market rates.

export type Range = { min: number; max?: number; yearly: boolean };

/** "50k", "1.2 lac", "Rs. 85,000" -> 50000, 120000, 85000. */
export function parseAmount(raw: string): number | null {
  const m = raw.toLowerCase().replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|thousand|lacs?|lakhs?|m|million)?\b/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const mult = !m[2] ? 1 : m[2].startsWith("k") || m[2] === "thousand" ? 1e3 : m[2].startsWith("la") ? 1e5 : 1e6;
  const v = Math.round(n * mult);
  return v >= 1000 ? v : null;
}

/** Finds the salary range in a job ad, e.g. "Salary: PKR 60,000 – 80,000 per month". */
export function parseSalary(ad: string): Range | null {
  const text = ad.replace(/\s+/g, " ");
  const num = String.raw`\d[\d,]*(?:\.\d+)?(?:\s*(?:k|lacs?|lakhs?|thousand)\b)?`;
  const re = new RegExp(String.raw`\b(?:salary|pay|package|compensation|rs\.?|pkr)[^\d\n]{0,20}(${num})(?:\s*(?:-|–|to)\s*(?:rs\.?|pkr)?\s*(${num}))?`, "gi");
  for (const m of text.matchAll(re)) {
    const min = parseAmount(m[1]);
    if (!min) continue; // "pay 2 visits" and the like
    const max = m[2] ? parseAmount(m[2]) ?? undefined : undefined;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 30);
    return { min, max: max && max > min ? max : undefined, yearly: /annum|annual|yearly|per year|\/year|p\.a/i.test(after) };
  }
  return null;
}

export const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString("en-US")}`;
const roundTo = (n: number, step = 5000) => Math.round(n / step) * step;

export type SalaryAdvice = { range: Range | null; ask: number | null; reply: string; warning?: string; tip: string };

/**
 * What to say when asked for an expected salary. With a range in the ad, aim
 * for the upper part of it; without one, ask for their budget first.
 */
export function salaryAdvice(ad: string, expected: string): SalaryAdvice {
  const range = parseSalary(ad);
  const mine = expected.trim() ? parseAmount(expected) : null;
  const per = range?.yearly ? "a year" : "a month";
  let ask: number | null = mine;
  let warning: string | undefined;

  if (range) {
    const top = range.max ?? range.min * 1.15;
    const target = roundTo(range.min + (top - range.min) * 0.7);
    if (mine === null) ask = target;
    else if (mine > top * 1.15) warning = `${rs(mine)} is well above their range (${rs(range.min)}${range.max ? ` – ${rs(range.max)}` : ""}). They may not call you. Around ${rs(target)} is safer.`;
    else if (mine < range.min) warning = `${rs(mine)} is below what they offer. You can ask for at least ${rs(range.min)}.`;
  }

  const reply = ask
    ? `I am looking for around ${rs(ask)} ${per}, but I am flexible for the right role and the full package.`
    : "I would like a fair salary for this role and my experience. Could you tell me the budget for this position?";
  const tip = range
    ? "Say one number, not a range — they will pick the lowest part of any range you give."
    : "Before the interview, look at similar jobs on Rozee.pk in your city to see what they pay.";
  return { range, ask, reply, warning, tip };
}
