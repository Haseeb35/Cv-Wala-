import type { Application, CV } from "../state/types";

// Turns a list of job applications into what to do next, and a few honest numbers.

const DAY = 86_400_000;
const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
const today = (now: Date) => new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
export const daysSince = (iso: string, now = new Date()) => Math.round((today(now) - day(iso)) / DAY);
export const isoDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const STATUS: Record<Application["status"], { label: string; color: string }> = {
  saved: { label: "To apply", color: "#8E8E93" },
  applied: { label: "Applied", color: "#0A84FF" },
  interview: { label: "Interview", color: "#AF52DE" },
  offer: { label: "Offer", color: "#30A46C" },
  rejected: { label: "Closed", color: "#C7473F" },
};

export type Attention = { app: Application; kind: "deadline" | "follow-up" | "interview-soon" | "interview-done" | "offer"; text: string; urgency: number };

/** The applications that need the user right now, most urgent first (an interview, then a closing deadline, then follow-ups). */
export function attention(apps: Application[], now = new Date()): Attention[] {
  const out: Attention[] = [];
  for (const app of apps) {
    const name = app.company || app.jobTitle || "this job";
    if (app.status === "saved" && app.deadline) {
      const left = -daysSince(app.deadline, now);
      if (left < 0) out.push({ app, kind: "deadline", text: `Deadline for ${name} has passed`, urgency: 1 });
      else if (left <= 3) out.push({ app, kind: "deadline", text: left === 0 ? `Apply to ${name} today — last day` : `Apply to ${name} — ${left} day${left > 1 ? "s" : ""} left`, urgency: 6 - left * 0.8 });
    }
    if (app.status === "applied" && app.appliedAt) {
      const since = daysSince(app.followedUpAt ?? app.appliedAt, now);
      if (since >= (app.followedUpAt ? 10 : 7)) out.push({ app, kind: "follow-up", text: `No reply from ${name} in ${daysSince(app.appliedAt, now)} days — follow up`, urgency: 3 });
    }
    if (app.status === "interview" && app.interviewAt) {
      const hours = (new Date(app.interviewAt).getTime() - now.getTime()) / 3_600_000;
      if (hours > 0 && hours <= 48) out.push({ app, kind: "interview-soon", text: `Interview with ${name} ${hours <= 24 ? "today or tomorrow" : "in 2 days"} — prepare`, urgency: 7 });
      else if (hours <= 0) out.push({ app, kind: "interview-done", text: `How did the ${name} interview go? Update it`, urgency: 2 });
    }
    if (app.status === "offer") out.push({ app, kind: "offer", text: `Reply to the offer from ${name}`, urgency: 4 });
  }
  return out.sort((a, b) => b.urgency - a.urgency);
}

export function stats(apps: Application[], now = new Date()) {
  const sent = apps.filter((a) => a.status !== "saved");
  const heardBack = sent.filter((a) => a.status === "interview" || a.status === "offer" || a.status === "rejected");
  return {
    thisWeek: sent.filter((a) => a.appliedAt && daysSince(a.appliedAt, now) < 7).length,
    sent: sent.length,
    interviews: apps.filter((a) => a.status === "interview" || a.status === "offer").length,
    offers: apps.filter((a) => a.status === "offer").length,
    // Only meaningful once a few applications are out.
    responseRate: sent.length >= 3 ? Math.round((heardBack.length / sent.length) * 100) : null,
  };
}

/** A short, polite follow-up the user can send on WhatsApp or email. */
export function followUpMessage(app: Application, cv: CV): string {
  const role = app.jobTitle || "the position";
  const when = app.appliedAt ? ` on ${new Date(app.appliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}` : "";
  const greet = app.contact ? `Dear ${app.contact},` : "Dear Hiring Manager,";
  return `${greet}\n\nI hope you are well. I applied for the ${role} role${app.company ? ` at ${app.company}` : ""}${when} and wanted to confirm that my application was received. I remain very interested in the role and would be glad to share anything else you need.\n\nThank you for your time.\n\nKind regards,\n${cv.name || ""}${cv.phone ? `\n${cv.phone}` : ""}`.trim();
}

/** Email subject line in the format Pakistani HR teams usually ask for. */
export const applicationSubject = (jobTitle: string, name: string) => `Application for ${jobTitle || "the position"} – ${name || "Applicant"}`;

/** Monday 00:00 of the week `d` falls in (Pakistani work weeks start on Monday). */
const weekStart = (d: Date) => {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  return t.getTime();
};

/** Applications sent this week against the user's goal, and how many weeks in a row they hit it. */
export function weekProgress(apps: Application[], goal: number, now = new Date()) {
  const perWeek = new Map<number, number>();
  for (const a of apps) {
    if (a.status === "saved" || !a.appliedAt) continue;
    const w = weekStart(new Date(`${a.appliedAt.slice(0, 10)}T00:00:00`));
    perWeek.set(w, (perWeek.get(w) ?? 0) + 1);
  }
  const thisWeek = weekStart(now);
  const done = perWeek.get(thisWeek) ?? 0;
  let streak = done >= goal ? 1 : 0;
  // Count back from last week; this week only breaks the streak once it's over.
  for (let w = new Date(thisWeek); ; ) {
    w.setDate(w.getDate() - 7);
    if ((perWeek.get(w.getTime()) ?? 0) >= goal) streak++;
    else break;
  }
  const daysLeft = 7 - ((now.getDay() + 6) % 7); // including today
  return { done, goal, left: Math.max(0, goal - done), streak, daysLeft };
}

/**
 * Honest patterns in the user's own results: which CV version and which job
 * site get the most replies. Needs at least 3 applications in a group to say anything.
 */
export function insights(apps: Application[], docLabel: (id: string) => string | undefined): string[] {
  const sent = apps.filter((a) => a.status !== "saved");
  const replied = (a: Application) => a.status === "interview" || a.status === "offer";
  const out: string[] = [];
  const best = (key: (a: Application) => string | undefined) => {
    const groups = new Map<string, { n: number; r: number }>();
    for (const a of sent) {
      const k = key(a);
      if (!k) continue;
      const g = groups.get(k) ?? { n: 0, r: 0 };
      g.n++;
      if (replied(a)) g.r++;
      groups.set(k, g);
    }
    const ranked = [...groups].filter(([, g]) => g.n >= 3).sort((a, b) => b[1].r / b[1].n - a[1].r / a[1].n);
    // Only worth saying when there's a real difference between at least two groups.
    if (ranked.length < 2 || ranked[0][1].r === 0 || ranked[0][1].r / ranked[0][1].n <= ranked[1][1].r / ranked[1][1].n) return null;
    return { name: ranked[0][0], ...ranked[0][1] };
  };
  const cv = best((a) => docLabel(a.docId));
  if (cv) out.push(`Your “${cv.name}” CV gets the most interviews: ${cv.r} of ${cv.n}.`);
  const site = best((a) => a.source || undefined);
  if (site) out.push(`Jobs from ${site.name} reply most often: ${site.r} of ${site.n} led to an interview.`);
  if (sent.length >= 8 && !sent.some(replied)) out.push("No interviews from 8+ applications. Try tailoring your CV to each job ad in the Letter tab.");
  return out;
}
