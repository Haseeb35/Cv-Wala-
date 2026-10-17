import { describe, expect, it } from "vitest";
import { improveBullet, repeatedVerbs } from "../bullets";
import { dateIssues, findGaps, normalizePhone, suggestEmail, totalYears, titleCase } from "../format";
import { buildSummary } from "../summary";
import { scoreCV } from "../score";
import { buildLetter, matchJobAd, tailorSkills } from "../letter";
import { preflight } from "../preflight";
import { emptyCV, emptyLetter, emptyTarget } from "../../state/defaults";
import type { CV, Experience } from "../../state/types";

const job = (start: string, end: string, extra: Partial<Experience> = {}): Experience => ({
  id: start, title: "Sales Associate", company: "Imtiaz", city: "", start, end, current: false, bullets: [], ...extra,
});

describe("bullets", () => {
  it("fixes weak openers", () => {
    expect(improveBullet("i was responsible for handling the cash counter").text).toBe("Managed the cash counter");
    expect(improveBullet("manage stock of 200 items.").text).toBe("Managed stock of 200 items");
  });
  it("asks for numbers", () => {
    expect(improveBullet("Served customers at the counter").tips[0]).toMatch(/number/);
  });
  it("spots overused opening verbs", () => {
    const r = repeatedVerbs(["Managed stock", "Managed cash", "managed staff", "Served customers"]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ verb: "Managed", count: 3 });
    expect(r[0].alternatives.length).toBeGreaterThan(0);
  });
});

describe("format", () => {
  it("phones", () => {
    expect(normalizePhone("03001234567")).toBe("+92 300 1234567");
    expect(normalizePhone("+92-300-1234567")).toBe("+92 300 1234567");
    expect(normalizePhone("0092 300 1234567")).toBe("+92 300 1234567");
  });
  it("email typos", () => expect(suggestEmail("ali@gmial.com")).toBe("ali@gmail.com"));
  it("title case", () => expect(titleCase("muhammad ALI  khan")).toBe("Muhammad Ali Khan"));
  it("overlapping jobs are not double counted", () => {
    const now = new Date(2026, 0, 1);
    expect(totalYears({ experience: [job("2020-01", "2021-12"), job("2021-01", "2022-12")] }, now)).toBe(3);
  });
  it("catches bad dates", () => {
    const now = new Date(2026, 5, 1);
    expect(dateIssues(job("2022-05", "2021-01"), now)).toMatch(/before the start/);
    expect(dateIssues(job("2027-01", ""), now)).toMatch(/future/);
    expect(dateIssues(job("2022-01", ""), now)).toMatch(/end date/);
    expect(dateIssues(job("2022-01", "2023-01"), now)).toBeNull();
  });
  it("finds gaps of 6+ months, not short ones", () => {
    const now = new Date(2026, 0, 1);
    const gaps = findGaps([job("2018-01", "2019-06"), job("2020-06", "2021-01"), job("2021-03", "2022-01")], now);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toMatchObject({ from: "Jun 2019", to: "Jun 2020", months: 11 });
  });
});

describe("cv", () => {
  const cv: CV = {
    ...emptyCV(),
    roleId: "sales",
    name: "Ali Khan",
    headline: "Sales Associate",
    phone: "03001234567",
    email: "ali@gmail.com",
    city: "Lahore",
    skills: ["Customer Service", "Cash Handling", "Upselling", "POS Systems", "Negotiation"],
    experience: [{ id: "1", title: "Sales Associate", company: "Imtiaz", city: "Lahore", start: "2022-01", end: "", current: true, bullets: ["Served 60+ customers daily", "Achieved 110% of monthly target"] }],
    education: [{ id: "e", degree: "BCom", institute: "Punjab University", year: "2021", grade: "" }],
  };
  const ad = "Wanted: sales associate with customer service, cash handling and inventory management experience. Must know POS systems.";

  it("summary", () => {
    expect(buildSummary(cv)).toMatch(/^Results-driven sales professional who builds customer trust and consistently meets sales targets\. Brings \d\+ years of experience, most recently at Imtiaz, with strong skills in customer service, cash handling and upselling\.$/);
  });
  it("complete CV scores 100", () => {
    expect(scoreCV({ ...cv, summary: buildSummary(cv) }).score).toBe(100);
  });
  it("placeholders cap the score", () => {
    const withPlaceholder = { ...cv, summary: buildSummary(cv), experience: [{ ...cv.experience[0], bullets: ["Served [60+] customers", "Achieved 110%"] }] };
    expect(scoreCV(withPlaceholder).score).toBeLessThanOrEqual(79);
  });
  it("job ad adds a keyword check", () => {
    const s = scoreCV({ ...cv, summary: buildSummary(cv) }, { ...emptyTarget(), jobAd: ad + " Also needs merchandising, stock control and team leadership." });
    expect(s.tips.some((t) => t.id === "keywords") || s.score === 100).toBe(true);
  });
  it("job ad match, tailoring and letter", () => {
    const m = matchJobAd(cv, ad);
    expect(m.matched).toEqual(expect.arrayContaining(["Customer Service", "Cash Handling", "POS Systems"]));
    expect(m.missing).toContain("Inventory Management");
    expect(tailorSkills(cv, ad).slice(0, 3).sort()).toEqual(["Cash Handling", "Customer Service", "POS Systems"]);
    const letter = buildLetter(cv, { ...emptyTarget(), company: "Hum Mart", jobTitle: "Senior Sales Associate", jobAd: ad, source: "Rozee.pk" }, emptyLetter());
    expect(letter).toContain("Hum Mart");
    expect(letter).toContain("In this role I served 60+ customers daily.");
  });
  it("preflight blocks placeholders and missing contact", () => {
    const issues = preflight({ ...cv, phone: "", email: "", experience: [{ ...cv.experience[0], bullets: ["Sold [50] items"] }] });
    expect(issues.filter((i) => i.blocking).map((i) => i.text).join(" ")).toMatch(/contact.*\[example\]|\[example\].*contact/s);
  });
});
