import { describe, expect, it } from "vitest";
import { applyFix, checkWriting, cliches, fixSpelling, misspellings, toPast } from "../writing";
import { improveBullet } from "../bullets";
import { parseAmount, parseSalary, salaryAdvice } from "../salary";
import { interviewPrep } from "../interview";
import { applicationMessage, applyChecklist, documentsFor, fileName, findReference, findSubject } from "../apply";
import { atsReport } from "../ats";
import { makeBackup, readBackup } from "../backup";
import { addSnapshot, dailyDue, MAX_PER_DOC } from "../history";
import { insights, weekProgress } from "../tracker";
import { isFresher, scoreCV } from "../score";
import { emptyCV, emptyTarget, initialState, newDoc } from "../../state/defaults";
import type { Application, CV, Experience } from "../../state/types";

const job = (p: Partial<Experience>): Experience => ({ id: Math.random().toString(36), title: "Sales Officer", company: "Hum Mart", city: "", start: "2021-01", end: "2023-06", current: false, bullets: [], ...p });
const cvWith = (p: Partial<CV>): CV => ({ ...emptyCV(), name: "Ali Khan", ...p });

describe("writing checks", () => {
  it("finds and fixes common misspellings, keeping capitals", () => {
    expect(misspellings("Recieved managment award")).toEqual([{ from: "Recieved", to: "Received" }, { from: "managment", to: "management" }]);
    expect(fixSpelling("Handeled 40 costumers")).toBe("Handled 40 customers");
  });
  it("flags clichés but not plain words", () => {
    expect(cliches("A hard-working team player").map((c) => c.phrase)).toEqual(["hard-working", "team player"]);
    expect(cliches("Reliable cashier who works hard")).toEqual([]);
  });
  it("asks for past tense on jobs the user has left, and consistency on the current one", () => {
    const past = cvWith({ experience: [job({ bullets: ["Manage 3 stores", "Trained 5 staff"] })] });
    expect(checkWriting(past).find((w) => w.kind === "tense")?.text).toContain("“Manage” → “Managed”");
    const now = cvWith({ experience: [job({ current: true, end: "", bullets: ["Manage 3 stores", "Trained 5 staff"] })] });
    expect(checkWriting(now).find((w) => w.kind === "tense")?.text).toContain("mix past and present");
    const fine = cvWith({ experience: [job({ current: true, end: "", bullets: ["Manage 3 stores", "Train 5 staff"] })] });
    expect(checkWriting(fine).some((w) => w.kind === "tense")).toBe(false);
    expect(toPast("Oversees 12 cashiers")).toBe("Oversaw 12 cashiers");
  });
  it("applies a spelling fix across the whole CV", () => {
    const cv = cvWith({ summary: "Strong managment skills", experience: [job({ bullets: ["Improved managment of stock"] })] });
    const fixed = { ...cv, ...applyFix(cv, { from: "managment", to: "management" }) };
    expect(checkWriting(fixed).some((w) => w.kind === "spelling")).toBe(false);
  });
  it("the bullet coach fixes spelling and warns about clichés", () => {
    const r = improveBullet("hard-working member who recieved 3 awards");
    expect(r.text).toContain("received");
    expect(r.tips.some((t) => t.includes("hard-working"))).toBe(true);
  });
  it("lowers the score for typos", () => {
    const base = cvWith({ summary: "Sales officer with 3 years in retail who grew store sales by 20%, improved stock management and trained new staff across two branches in Lahore every quarter.", experience: [job({ bullets: ["Grew sales by 20%", "Trained 5 staff"] })] });
    const typo = { ...base, summary: base.summary.replace("management", "managment") };
    expect(scoreCV(typo).score).toBeLessThan(scoreCV(base).score);
    expect(scoreCV(typo).tips.some((t) => t.id === "spelling")).toBe(true);
  });
});

describe("fresh graduates", () => {
  it("is a fresher by field or when every entry is an internship or project", () => {
    expect(isFresher(cvWith({ roleId: "fresh" }))).toBe(true);
    expect(isFresher(cvWith({ experience: [job({ title: "Marketing Intern" }), job({ title: "Final Year Project" })] }))).toBe(true);
    expect(isFresher(cvWith({ experience: [job({ title: "Marketing Intern" }), job({ title: "Sales Officer" })] }))).toBe(false);
  });
  it("asks freshers for a project and grades instead of a job", () => {
    const tips = scoreCV(cvWith({ roleId: "fresh" })).tips.map((t) => t.id);
    expect(tips).toContain("jobs");
    expect(tips).toContain("grade");
    const graded = cvWith({ roleId: "fresh", education: [{ id: "e", degree: "BBA", institute: "IBA", year: "2025", grade: "CGPA 3.5" }] });
    expect(scoreCV(graded).tips.map((t) => t.id)).not.toContain("grade");
  });
});

describe("salary", () => {
  it("reads amounts in Pakistani formats", () => {
    expect(parseAmount("80k")).toBe(80000);
    expect(parseAmount("1.2 lac")).toBe(120000);
    expect(parseAmount("Rs. 65,000")).toBe(65000);
  });
  it("finds a range in an ad and ignores years", () => {
    expect(parseSalary("3 years experience. Salary: PKR 60,000 - 80,000 per month")).toEqual({ min: 60000, max: 80000, yearly: false });
    expect(parseSalary("Package Rs. 1.2 lakh to 1.5 lakh")).toMatchObject({ min: 120000, max: 150000 });
    expect(parseSalary("Must have 5 years experience")).toBeNull();
  });
  it("aims for the upper part of the range and warns when far off", () => {
    const a = salaryAdvice("Salary: 60,000 - 80,000", "");
    expect(a.ask).toBe(75000);
    expect(salaryAdvice("Salary: 60,000 - 80,000", "150000").warning).toContain("well above");
    expect(salaryAdvice("Salary: 60,000 - 80,000", "50k").warning).toContain("below");
    expect(salaryAdvice("No salary given here", "").reply).toContain("budget");
  });
});

describe("interview prep", () => {
  it("builds questions from the CV and the job ad", () => {
    const cv = cvWith({ headline: "Sales Officer", skills: ["Retail Sales", "MS Excel"], experience: [job({ current: true, start: "2024-01", end: "", bullets: ["Grew store sales by 30% in 6 months"] })] });
    const qs = interviewPrep(cv, { ...emptyTarget(), company: "Hum Mart", jobAd: "Sales Manager needed in Karachi. Minimum 5 years experience. Skills: Retail Sales, Team Leadership, SAP. Salary Rs. 90,000 - 120,000" });
    const ids = qs.map((q) => q.id);
    expect(ids).toEqual(expect.arrayContaining(["about", "proof-0", "why-us", "leaving", "salary", "years", "ask"]));
    expect(qs.find((q) => q.id === "proof-0")!.q).toContain("Grew store sales");
    expect(qs.find((q) => q.id === "salary")!.points[0]).toContain("Rs.");
  });
});

describe("sending an application", () => {
  const ad = "Sales Officer (Ref: HR-2026-14). Send your CV and cover letter to jobs@hummart.pk. Subject line should be: Sales Officer - Lahore. Attested copies of degrees, domicile and 2 passport-size photographs required. Last date: 30 Oct 2026. HEC attested degree.";
  it("uses safe file names", () => {
    expect(fileName({ name: "Muhammad  Ali Khan" }, "CV")).toBe("Muhammad-Ali-Khan-CV.pdf");
    expect(fileName({ name: "" }, "Cover Letter")).toBe("My-Cover-Letter.pdf");
  });
  it("reads the reference, email and required subject", () => {
    expect(findReference(ad)).toBe("HR-2026-14");
    expect(findReference("Please refer to our website. References available.")).toBeUndefined();
    expect(findSubject(ad)).toBe("Sales Officer - Lahore");
  });
  it("writes the email and WhatsApp text", () => {
    const cv = cvWith({ phone: "0300 1234567", experience: [job({ current: true, end: "", start: "2022-01" })] });
    const m = applicationMessage(cv, { ...emptyTarget(), jobTitle: "Sales Officer", company: "Hum Mart", jobAd: ad }, true);
    expect(m.to).toBe("jobs@hummart.pk");
    expect(m.subject).toBe("Sales Officer - Lahore");
    expect(m.body).toContain("CV and cover letter");
    expect(m.body).toContain("(Ref: HR-2026-14)");
    expect(m.whatsapp).toContain("Ali Khan");
  });
  it("lists what the ad asks for, and the documents", () => {
    const ids = applyChecklist(cvWith({}), { ...emptyTarget(), jobAd: ad }).map((i) => i.id);
    expect(ids).toEqual(expect.arrayContaining(["cv", "letter", "ref", "subject", "email", "deadline", "photo"]));
    const docs = documentsFor(cvWith({}), ad);
    expect(docs.map((d) => d.id)).toEqual(expect.arrayContaining(["cnic", "degrees", "photos", "domicile"]));
    expect(docs.find((d) => d.id === "degrees")!.text).toContain("Attested");
    expect(docs.find((d) => d.id === "degrees")!.detail).toContain("HEC");
  });
});

describe("ATS view", () => {
  it("checks what software reads from the PDF", () => {
    const cv = cvWith({ email: "ali@gmail.com", phone: "+92 300 1234567", skills: ["MS Excel", "SAP"], experience: [job({})] });
    const text = "ALI KHAN\nSales Officer\n+92 300 1234567 · ali@gmail.com\nEXPERIENCE\nSales Officer | Hum Mart\nSKILLS\nMS Excel · Retail\n" + "x".repeat(200);
    const r = Object.fromEntries(atsReport(text, cv).map((c) => [c.label, c]));
    expect(r["Name at the top"].ok).toBe(true);
    expect(r["Email readable"].ok).toBe(true);
    expect(r["Phone number readable"].ok).toBe(true);
    expect(r["Skills readable"]).toMatchObject({ ok: false, detail: "Missing: SAP" });
  });
});

describe("backup", () => {
  it("round-trips the whole app and rejects other files", () => {
    const s = initialState();
    s.docs[0].cv.name = "Ali Khan";
    const back = readBackup(makeBackup(s));
    expect(back.ok && back.state.docs[0].cv.name).toBe("Ali Khan");
    expect(back.ok && back.state.onboarded).toBe(true);
    expect(readBackup("{}").ok).toBe(false);
    expect(readBackup("not json").ok).toBe(false);
    expect(readBackup(JSON.stringify({ app: "cvwala", data: { docs: [] } })).ok).toBe(false);
  });
  it("fills in fields from newer versions", () => {
    const old = { app: "cvwala", data: { docs: [{ id: "a", label: "Old", cv: { name: "Sara" }, target: {}, letter: {} }], activeId: "a" } };
    const r = readBackup(JSON.stringify(old));
    expect(r.ok && r.state.docs[0].cv.template).toBe("aurora");
    expect(r.ok && r.state.weeklyGoal).toBe(5);
    expect(r.ok && r.state.docs[0].target.expectedSalary).toBe("");
  });
});

describe("version history", () => {
  const doc = newDoc("Sales", cvWith({ photo: "data:image/png;base64,AAAA" }));
  it("skips empty CVs and unchanged copies, and leaves out the photo", () => {
    expect(addSnapshot([], newDoc(), "x")).toEqual([]);
    const one = addSnapshot([], doc, "Before import", 1000);
    expect(one).toHaveLength(1);
    expect(one[0].cv.photo).toBe("");
    expect(addSnapshot(one, { ...doc, cv: { ...doc.cv, updatedAt: 5 } }, "again", 2000)).toHaveLength(1);
  });
  it("keeps the newest few per CV and knows when a daily copy is due", () => {
    let list: ReturnType<typeof addSnapshot> = [];
    for (let i = 0; i < MAX_PER_DOC + 3; i++) list = addSnapshot(list, { ...doc, cv: { ...doc.cv, summary: `v${i}` } }, "edit", i);
    expect(list).toHaveLength(MAX_PER_DOC);
    expect(list[0].cv.summary).toBe(`v${MAX_PER_DOC + 2}`);
    expect(dailyDue(list, doc.id, MAX_PER_DOC + 3)).toBe(false);
    expect(dailyDue(list, doc.id, 86_400_000 * 2)).toBe(true);
  });
});

describe("weekly goal and insights", () => {
  const app = (p: Partial<Application>): Application => ({ id: Math.random().toString(36), docId: "a", company: "X", jobTitle: "", source: "", contact: "", status: "applied", notes: "", createdAt: 0, updatedAt: 0, ...p });
  it("counts this week from Monday and the streak of weeks that hit the goal", () => {
    const now = new Date("2026-10-21T12:00:00"); // Wednesday
    const apps = [
      ...["2026-10-19", "2026-10-20"].map((d) => app({ appliedAt: d })), // this week: 2
      ...["2026-10-12", "2026-10-14", "2026-10-18"].map((d) => app({ appliedAt: d })), // last week: 3
      ...["2026-10-05", "2026-10-06", "2026-10-07"].map((d) => app({ appliedAt: d })), // week before: 3
      app({ appliedAt: "2026-10-20", status: "saved" }),
    ];
    expect(weekProgress(apps, 3, now)).toMatchObject({ done: 2, left: 1, streak: 2, daysLeft: 5 });
    expect(weekProgress(apps, 2, now).streak).toBe(3);
  });
  it("only names a winner when there's a real difference", () => {
    const label = (id: string) => ({ a: "Sales", b: "Admin" })[id];
    const apps = [
      ...[1, 2, 3].map(() => app({ docId: "a", source: "Rozee.pk", status: "interview" })),
      ...[1, 2, 3].map(() => app({ docId: "b", source: "LinkedIn" })),
    ];
    const out = insights(apps, label);
    expect(out[0]).toContain("“Sales” CV");
    expect(out[1]).toContain("Rozee.pk");
    expect(insights(apps.slice(0, 3), label)).toEqual([]);
  });
});

import { adTitle, applyTailor, planTailor } from "../tailor";

describe("tailor a CV to one job", () => {
  const cv = cvWith({
    roleId: "sales", headline: "Sales Associate", summary: "My own words.", summaryTouched: true,
    skills: ["Customer Service", "Cash Handling", "MS Excel", "Retail Sales"],
    experience: [job({ current: true, end: "", start: "2021-01", bullets: ["Kept the shop floor clean and tidy", "Served 80+ customers daily", "Grew retail sales by 25% through upselling"] })],
  });
  const target = { ...emptyTarget(), company: "Hum Mart", jobAd: "We are hiring a Sales Officer in Lahore. Requirements: 2+ years retail sales experience, upselling, MS Excel, inventory management. Inventory counts weekly." };

  it("reads the job title from the ad", () => {
    expect(adTitle(target.jobAd)).toBe("Sales Officer");
    expect(adTitle("Accountant\nWe need an accountant with 3 years experience.")).toBe("Accountant");
  });
  it("plans the changes and keeps a hand-written summary unless chosen", () => {
    const plan = planTailor(cv, target)!;
    const ids = plan.changes.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(["headline", "skills", "order", "summary"]));
    expect(plan.changes.find((c) => c.id === "summary")!.on).toBe(false);
    expect(plan.ask.map((a) => a.toLowerCase())).toEqual(expect.arrayContaining(["inventory management"]));
  });
  it("applies only the kept changes, and confirmed skills raise the fit", () => {
    const plan = planTailor(cv, target)!;
    const keep = new Set(plan.changes.filter((c) => c.on).map((c) => c.id));
    const out = applyTailor(cv, target, plan, keep, []);
    expect(out.cv.headline).toBe("Sales Officer");
    expect(out.cv.skills.slice(0, 2)).toEqual(["MS Excel", "Retail Sales"]);
    expect(out.cv.experience[0].bullets[0]).toContain("retail sales");
    expect(out.cv.summary).toBe("My own words.");
    expect(cv.headline).toBe("Sales Associate"); // the original is untouched
    const more = applyTailor(cv, target, plan, keep, ["Inventory Management"]);
    expect(more.fit).toBeGreaterThan(out.fit);
  });
  it("doesn't ask about how-to-apply words", () => {
    const ad = target.jobAd + " Send CV with subject line Sales. Attested copies of degrees, domicile and passport-size photographs. Send CV by email. Subject line must match.";
    const ask = planTailor(cv, { ...target, jobAd: ad })!.ask.map((a) => a.toLowerCase());
    for (const w of ["subject", "line", "copies", "domicile", "passport-size", "email"]) expect(ask).not.toContain(w);
  });
  it("never promotes the user to a more senior title", () => {
    const plan = planTailor(cv, { ...target, jobAd: target.jobAd.replace("Sales Officer", "Sales Manager") })!;
    expect(plan.changes.some((c) => c.id === "headline")).toBe(false);
    expect(plan.notes[0]).toContain("more senior");
  });
});
