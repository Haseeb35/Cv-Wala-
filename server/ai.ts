import Anthropic from "@anthropic-ai/sdk";

export const aiEnabled = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const client = aiEnabled ? new Anthropic() : null;

const MODEL = "claude-opus-5-5";

const STYLE = `You help job seekers in Pakistan write their CVs and cover letters in clear, professional English.
Many users have limited English. Keep their meaning exactly; never invent employers, numbers, degrees or achievements they did not mention.
Use simple, strong international English that a Pakistani recruiter expects (British spelling, e.g. "organised"). CV points start with a past-tense action verb, have no "I", and stay under 25 words.`;

type Schema = Record<string, unknown>;

async function ask<T>(opts: { prompt: string; schema: Schema; effort: "low" | "medium"; maxTokens?: number }): Promise<T> {
  if (!client) throw Object.assign(new Error("AI is not configured on the server."), { status: 503 });
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: STYLE,
    output_config: { effort: opts.effort, format: { type: "json_schema", schema: opts.schema } },
    messages: [{ role: "user", content: opts.prompt }],
  });
  if (response.stop_reason === "refusal") throw new Error("The AI could not help with this text. Please rephrase it.");
  if (response.stop_reason === "max_tokens") throw new Error("The AI response was cut off. Please try a shorter text.");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return JSON.parse(text) as T;
}

const strArr = (min: number, max: number) => ({ type: "array", items: { type: "string" }, minItems: min, maxItems: max });

export function improveBullets(bullets: string[], jobTitle: string) {
  return ask<{ bullets: string[] }>({
    effort: "low",
    prompt: `Rewrite these CV points${jobTitle ? ` for a ${jobTitle}` : ""} so each one is stronger and clearer. Keep the same order and count, the same facts, and keep any numbers. Fix grammar. If a point has no measurable result, add a short [placeholder] for one.

${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { bullets: strArr(1, 8) },
      required: ["bullets"],
    },
  });
}

export function writeLetter(cvJson: string, letterJson: string) {
  return ask<{ body: string }>({
    effort: "medium",
    maxTokens: 8000,
    prompt: `Write a cover letter for this candidate. Use only facts from the CV. If a job ad is included, connect the candidate's real skills and experience to its main requirements.

Tone: the "tone" field (formal / warm / confident). Length: "short" is ~120 words, "standard" is ~220 words. Start with the greeting (use "manager" if given, otherwise "Dear Hiring Manager,"), end with "Sincerely," and the candidate's name on its own line. Plain text with blank lines between paragraphs; no address block, no date, no placeholders.

<cv>
${cvJson}
</cv>

<job>
${letterJson}
</job>`,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { body: { type: "string" } },
      required: ["body"],
    },
  });
}
