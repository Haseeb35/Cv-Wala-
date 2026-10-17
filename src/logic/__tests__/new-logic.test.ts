import { describe, expect, it } from "vitest";
import { importCV, parseDate } from "../importer";
import { analyzeAd, findDeadline } from "../jobad";
import { attention, followUpMessage, stats } from "../tracker";
import { buildLetter } from "../letter";
import { emptyCV, emptyLetter, emptyTarget } from "../../state/defaults";
import type { Application, CV } from "../../state/types";

const OLD_CV = `CURRICULUM VITAE
Muhammad Bilal Ahmed
Accountant
House 12, Street 4, Gulberg III, Lahore
Cell: 0321-4567890
Email: bilal.ahmed92@gmail.com

CAREER OBJECTIVE
To work in a challenging environment where I can use my accounting skills for the growth of the organisation.

WORK EXPERIENCE
Accounts Officer | Hashoo Group Pvt Ltd, Islamabad | March 2021 - Present
• Prepared monthly bank reconciliations for 6 accounts
• Managed accounts payable of PKR 4M per month
Junior Accountant
Al-Rehman Traders, Lahore
Jan 2018 – Feb 2021
- Maintained ledgers in QuickBooks
- Filed sales tax returns on the FBR portal

EDUCATION
B.Com (Hons) - University of the Punjab, 2017, CGPA 3.2
Intermediate (ICom) | Punjab College | 2013 | 78%

SKILLS
MS Excel, QuickBooks, Tally, Bank Reconciliation • Tax Filing

LANGUAGES
English (Fluent), Urdu (Native), Punjabi

REFERENCES
Available on request`;

describe("importer", () => {
  const { cv, found } = importCV(OLD_CV);
  it("reads the header", () => {
    expect(cv.name).toBe("Muhammad Bilal Ahmed");
    expect(cv.headline).toBe("Accountant");
    expect(cv.phone).toBe("+92 321 4567890");
    expect(cv.email).toBe("bilal.ahmed92@gmail.com");
    expect(cv.city).toBe("Lahore");
    expect(cv.roleId).toBe("accounts");
  });
  it("reads both jobs, with dates and bullets", () => {
    expect(found.jobs).toBe(2);
    const [a, b] = cv.experience!;
    expect(a).toMatchObject({ title: "Accounts Officer", company: "Hashoo Group Pvt Ltd", city: "Islamabad", start: "2021-03", current: true });
    expect(a.bullets).toEqual(["Prepared monthly bank reconciliations for 6 accounts", "Managed accounts payable of PKR 4M per month"]);
    expect(b).toMatchObject({ title: "Junior Accountant", company: "Al-Rehman Traders", start: "2018-01", end: "2021-02", current: false });
    expect(b.bullets).toHaveLength(2);
  });
  it("reads education", () => {
    expect(cv.education).toHaveLength(2);
    expect(cv.education![0]).toMatchObject({ degree: "B.Com (Hons)".replace(/[()]/g, " ").replace(/\s+/g, " ").trim(), institute: "University of the Punjab", year: "2017", grade: "CGPA 3.2" });
    expect(cv.education![1]).toMatchObject({ institute: "Punjab College", year: "2013", grade: "78%" });
  });
  it("reads skills, languages and objective; skips references", () => {
    expect(cv.skills).toEqual(["MS Excel", "QuickBooks", "Tally", "Bank Reconciliation", "Tax Filing"]);
    expect(cv.languages!.map((l) => `${l.name}:${l.level}`)).toEqual(["English:Fluent", "Urdu:Native", "Punjabi:Professional"]);
    expect(cv.summary).toMatch(/^To work in a challenging environment/);
    expect(JSON.stringify(cv)).not.toMatch(/Available on request/);
  });
  it("parses date formats", () => {
    expect(parseDate("Sept 2019")).toBe("2019-09");
    expect(parseDate("03/2020")).toBe("2020-03");
    expect(parseDate("2016")).toBe("2016-01");
  });
});

const sales: CV = {
  ...emptyCV(),
  roleId: "sales",
  name: "Ali Khan",
  city: "Lahore",
  skills: ["Customer Service", "Cash Handling", "POS Systems"],
  experience: [{ id: "1", title: "Sales Associate", company: "Imtiaz", city: "", start: "2023-01", end: "", current: true, bullets: ["Served 60+ customers daily"] }],
  education: [{ id: "e", degree: "Intermediate (ICom)", institute: "Punjab College", year: "2019", grade: "" }],
};
const AD = `Hum Mart is hiring a Senior Sales Associate in Karachi.
Requirements: Bachelor's or Master's degree. Minimum 5 years of retail experience.
Must have strong merchandising and customer service skills. Merchandising experience is essential.
Male candidates preferred. Salary: PKR 60,000 - 80,000. Last date to apply: 25 Oct 2026.`;

describe("job ad", () => {
  const a = analyzeAd(sales, AD)!;
  it("reads requirements and compares them with the CV", () => {
    expect(a.years).toMatchObject({ required: 5, ok: false });
    expect(a.degree).toMatchObject({ required: 3, have: 2, ok: false });
    expect(a.city).toMatchObject({ cities: ["Karachi"], ok: false, remote: false });
    expect(a.gender).toBe("male");
    expect(a.salary).toBe("PKR 60,000 – 80,000");
    expect(a.deadline).toBe("2026-10-25");
    expect(a.keywords.missing).toContain("merchandising");
    expect(a.fit).toBeLessThan(60);
  });
  it("handles other deadline formats", () => {
    expect(findDeadline("Apply before October 3, 2026")).toBe("2026-10-03");
    expect(findDeadline("Deadline: 07/11/2026")).toBe("2026-11-07");
  });
  it("letter offers to relocate when the job is elsewhere", () => {
    expect(buildLetter(sales, { ...emptyTarget(), company: "Hum Mart", jobAd: AD }, emptyLetter())).toContain("I am based in Lahore and happy to relocate to Karachi.");
  });
  it("doesn't mistake 'Ms.' for a master's degree", () => {
    expect(analyzeAd(sales, "Send your CV to Ms. Sara Khan at our Lahore office. We need a cashier with good customer service.")?.degree).toBeUndefined();
  });
});

describe("tracker", () => {
  const now = new Date(2026, 9, 20, 10, 0);
  const base = { docId: "d", company: "Hum Mart", jobTitle: "Cashier", source: "", contact: "", notes: "", createdAt: 0, updatedAt: 0 };
  const apps: Application[] = [
    { ...base, id: "1", status: "applied", appliedAt: "2026-10-10" },
    { ...base, id: "2", status: "saved", deadline: "2026-10-22", company: "Daraz" },
    { ...base, id: "3", status: "interview", interviewAt: "2026-10-21T11:00", company: "Khaadi" },
    { ...base, id: "4", status: "applied", appliedAt: "2026-10-18", company: "Gul Ahmed" },
    { ...base, id: "5", status: "rejected", appliedAt: "2026-10-01", company: "Engro" },
  ];
  it("lists what needs doing, most urgent first", () => {
    const list = attention(apps, now);
    expect(list.map((a) => a.kind)).toEqual(["interview-soon", "deadline", "follow-up"]);
    expect(list[2].text).toBe("No reply from Hum Mart in 10 days — follow up");
  });
  it("counts honestly", () => {
    expect(stats(apps, now)).toEqual({ thisWeek: 1, sent: 4, interviews: 1, offers: 0, responseRate: 50 });
  });
  it("writes a follow-up", () => {
    expect(followUpMessage(apps[0], { ...sales, phone: "+92 300 1234567" })).toMatch(/applied for the Cashier role at Hum Mart on 10 October/);
  });
});
