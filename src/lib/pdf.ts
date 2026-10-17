import { jsPDF } from "jspdf";
import type { CV, TemplateId } from "../state/types";
import { dateRange, normalizePhone, sortedExperience } from "../logic/format";
import { tailorSkills } from "../logic/letter";
import { templateMeta } from "../data/templates";

export { TEMPLATES, templateMeta } from "../data/templates";

// Real text PDFs (not screenshots), so recruiters' ATS software can read them.

type RGB = [number, number, number];
type Face = "helvetica" | "times";
type Weight = "normal" | "bold" | "italic";

const hex = (h: string): RGB => {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;

const INK: RGB = [29, 29, 31];
const MUTED: RGB = [110, 110, 115];
const RULE: RGB = [214, 214, 219];
const WHITE: RGB = [255, 255, 255];

/** Fresh graduates show education first; everyone else leads with experience. */
export function sectionOrder(cv: CV) {
  const hasJobs = cv.experience.some((x) => x.title.trim());
  return hasJobs && cv.roleId !== "fresh"
    ? (["summary", "experience", "education", "skills", "certifications", "languages"] as const)
    : (["summary", "education", "experience", "skills", "certifications", "languages"] as const);
}

type Options = { jobAd?: string };

/**
 * Renders the CV. With "fit to one page" on, it tightens type and spacing in
 * small steps until the CV fits one page, but never below a readable size.
 */
export function cvPdf(cv: CV, opts: Options = {}): { doc: jsPDF; pages: number; fitted: boolean } {
  const first = render(cv, 1, opts);
  const pages = first.getNumberOfPages();
  if (!cv.fitOnePage || pages === 1) return { doc: first, pages, fitted: false };
  for (const d of [0.95, 0.9, 0.86]) {
    const doc = render(cv, d, opts);
    if (doc.getNumberOfPages() === 1) return { doc, pages: 1, fitted: true };
  }
  return { doc: first, pages, fitted: false };
}

function render(cv: CV, d: number, opts: Options): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const t = cv.template;
  const A = hex(cv.accent || "#0071E3");
  const face: Face = t === "executive" || t === "elegant" ? "times" : "helvetica";
  const body = (t === "compact" ? 9.3 : t === "minimal" ? 9.6 : face === "times" ? 10.8 : 10) * d;
  const lh = body * 1.46;
  const M = (t === "compact" ? 38 : t === "minimal" ? 54 : 46) * (0.6 + 0.4 * d);
  const space = (n: number) => n * d;
  const photo = cv.showPhoto && cv.photo && templateMeta(t).photo ? cv.photo : "";
  const skills = opts.jobAd ? tailorSkills(cv, opts.jobAd) : cv.skills;
  const contacts = [normalizePhone(cv.phone), cv.email, cv.city, cv.linkedin.replace(/^https?:\/\/(www\.)?/, "")].filter(Boolean);

  const font = (f: Face, w: Weight, size: number, c: RGB = INK) => {
    doc.setFont(f, w);
    doc.setFontSize(size);
    doc.setTextColor(c[0], c[1], c[2]);
  };

  // A text column that flows across pages.
  const flow = { x: M, w: W - 2 * M, y: M, top: M, bottom: M, newPage: undefined as undefined | ((page: number) => void) };
  const ensure = (h: number) => {
    if (flow.y + h <= H - flow.bottom) return;
    const cur = doc.getCurrentPageInfo().pageNumber;
    if (cur < doc.getNumberOfPages()) doc.setPage(cur + 1);
    else {
      doc.addPage();
      flow.newPage?.(cur + 1);
    }
    flow.y = flow.top;
  };
  const para = (text: string, size = body, c: RGB = INK, w: Weight = "normal", f: Face = face, align: "left" | "center" = "left") => {
    font(f, w, size, c);
    for (const line of doc.splitTextToSize(text, flow.w) as string[]) {
      ensure(size * 1.46);
      doc.text(line, align === "center" ? flow.x + flow.w / 2 : flow.x, flow.y + size, { align });
      flow.y += size * 1.46;
    }
  };
  const circlePhoto = (x: number, y: number, s: number, ring?: RGB) => {
    if (ring) {
      doc.setFillColor(...ring);
      doc.circle(x + s / 2, y + s / 2, s / 2 + 2.5, "F");
    }
    try {
      doc.addImage(photo, "PNG", x, y, s, s);
    } catch {
      /* unreadable image: skip it rather than fail the CV */
    }
  };

  // Letter spacing is capped at 8% of the font size. Wider gaps make text readers (and the
  // screening software companies use) split headings into letters: "E X P E R I E N C E".
  const track = (cs: number) => Math.min(cs, doc.getFontSize() * 0.08);
  // jsPDF centres letter-spaced text without counting the spacing, so centre it ourselves.
  const spacedWidth = (text: string, cs: number) => doc.getTextWidth(text) + Math.max(0, text.length - 1) * track(cs);
  const centerSpaced = (text: string, cx: number, y: number, cs: number) => doc.text(text, cx - spacedWidth(text, cs) / 2, y, { charSpace: track(cs) });

  /** A wrapped list where separators only sit between items on the same line. */
  const inlineList = (items: string[], sep: string, align: "left" | "center" = "left", size = body) => {
    font(face, "normal", size);
    const sepW = doc.getTextWidth(sep);
    const lines: string[][] = [[]];
    let w = 0;
    for (const it of items) {
      const iw = doc.getTextWidth(it);
      const cur = lines[lines.length - 1];
      if (cur.length && w + sepW + iw > flow.w) {
        lines.push([it]);
        w = iw;
      } else {
        w += (cur.length ? sepW : 0) + iw;
        cur.push(it);
      }
    }
    for (const l of lines) {
      ensure(size * 1.46);
      doc.text(l.join(sep), align === "center" ? flow.x + flow.w / 2 : flow.x, flow.y + size, { align });
      flow.y += size * 1.46;
    }
  };

  // ---------- Sidebar layout ----------
  const sideW = t === "sidebar" ? 178 : 0;
  const sideBg = mix(A, [12, 12, 14], 0.18);
  if (t === "sidebar") {
    const paint = () => {
      doc.setFillColor(...sideBg);
      doc.rect(0, 0, sideW, H, "F");
    };
    paint();
    flow.newPage = paint;
    flow.x = sideW + 34;
    flow.w = W - flow.x - 40;
    flow.top = 40;
    flow.y = 46;
  }

  // ---------- Headers ----------
  const header: Record<TemplateId, () => void> = {
    aurora() {
      const bandH = space(112);
      doc.setFillColor(...A);
      doc.rect(0, 0, W, bandH, "F");
      const right = photo ? W - M - 74 : W - M;
      font("helvetica", "bold", 25 * d, WHITE);
      doc.text(cv.name || "Your Name", M, bandH * 0.42);
      font("helvetica", "normal", 12 * d, mix(WHITE, A, 0.15));
      if (cv.headline) doc.text(cv.headline, M, bandH * 0.42 + 19 * d);
      font("helvetica", "normal", 9 * d, mix(WHITE, A, 0.1));
      doc.text(doc.splitTextToSize(contacts.join("     "), right - M) as string[], M, bandH * 0.42 + 40 * d);
      if (photo) circlePhoto(W - M - 70, (bandH - 70) / 2, 70, WHITE);
      flow.y = bandH + space(24);
    },
    sidebar() {
      font("helvetica", "bold", 26 * d, INK);
      for (const line of doc.splitTextToSize(cv.name || "Your Name", flow.w) as string[]) {
        doc.text(line, flow.x, flow.y + 22 * d);
        flow.y += 28 * d;
      }
      font("helvetica", "normal", 12.5 * d, A);
      if (cv.headline) {
        doc.text(cv.headline, flow.x, flow.y + 10 * d);
        flow.y += 18 * d;
      }
      flow.y += space(14);
    },
    executive() {
      font("times", "bold", 26 * d, INK);
      doc.text(cv.name || "Your Name", M, flow.y + 20 * d);
      font("times", "italic", 13 * d, A);
      if (cv.headline) doc.text(cv.headline, M, flow.y + 38 * d);
      font("times", "normal", 9.5 * d, MUTED);
      contacts.slice(0, 4).forEach((c, i) => doc.text(c, W - M, flow.y + 8 * d + i * 12 * d, { align: "right" }));
      flow.y += Math.max(48, contacts.length * 12 + 10) * d;
      doc.setDrawColor(...A);
      doc.setLineWidth(1.6);
      doc.line(M, flow.y, W - M, flow.y);
      doc.setLineWidth(0.5);
      doc.line(M, flow.y + 3, W - M, flow.y + 3);
      flow.y += space(16);
    },
    minimal() {
      font("helvetica", "normal", 28 * d, INK);
      doc.text(cv.name || "Your Name", M, flow.y + 24 * d);
      flow.y += 34 * d;
      font("helvetica", "normal", 11.5 * d, MUTED);
      if (cv.headline) {
        doc.text(cv.headline, M, flow.y + 10 * d);
        flow.y += 16 * d;
      }
      font("helvetica", "normal", 9 * d, MUTED);
      doc.text(contacts.join("   /   "), M, flow.y + 12 * d);
      flow.y += space(40);
      // Content sits in a column right of the section labels.
      flow.x = M + 104;
      flow.w = W - flow.x - M;
    },
    classic() {
      font("helvetica", "bold", 22 * d, INK);
      doc.text(cv.name || "Your Name", W / 2, flow.y + 18 * d, { align: "center" });
      flow.y += 30 * d;
      if (cv.headline) {
        font("helvetica", "normal", 12 * d, A);
        doc.text(cv.headline, W / 2, flow.y + 10 * d, { align: "center" });
        flow.y += 18 * d;
      }
      font("helvetica", "normal", 9.5 * d, MUTED);
      doc.text(contacts.join("  |  "), W / 2, flow.y + 10 * d, { align: "center" });
      flow.y += space(22);
      doc.setDrawColor(...INK);
      doc.setLineWidth(1.1);
      doc.line(M, flow.y, W - M, flow.y);
      flow.y += space(12);
    },
    bold() {
      const p = photo ? 76 : 0;
      if (photo) circlePhoto(M, flow.y, p);
      const x = M + (p ? p + 18 : 0);
      font("helvetica", "bold", 32 * d, INK);
      doc.text(cv.name || "Your Name", x, flow.y + 28 * d);
      font("helvetica", "bold", 13 * d, A);
      if (cv.headline) doc.text(cv.headline, x, flow.y + 48 * d);
      font("helvetica", "normal", 9.2 * d, MUTED);
      doc.text(doc.splitTextToSize(contacts.join("   ·   "), W - M - x) as string[], x, flow.y + 66 * d);
      flow.y += Math.max(p, 72 * d) + space(14);
      doc.setFillColor(...A);
      doc.rect(M, flow.y, W - 2 * M, 4, "F");
      flow.y += space(14);
    },
    elegant() {
      if (photo) {
        circlePhoto(W / 2 - 32, flow.y, 64);
        flow.y += 76;
      }
      font("times", "normal", 27 * d, INK);
      centerSpaced((cv.name || "Your Name").toUpperCase(), W / 2, flow.y + 22 * d, 2.4);
      flow.y += 34 * d;
      if (cv.headline) {
        font("times", "italic", 12 * d, A);
        doc.text(cv.headline, W / 2, flow.y + 8 * d, { align: "center" });
        flow.y += 18 * d;
      }
      font("times", "normal", 9.5 * d, MUTED);
      doc.text(contacts.join("  ·  "), W / 2, flow.y + 9 * d, { align: "center" });
      flow.y += space(20);
      doc.setDrawColor(...A);
      doc.setLineWidth(0.8);
      doc.line(W / 2 - 24, flow.y, W / 2 + 24, flow.y);
      flow.y += space(12);
    },
    compact() {
      font("helvetica", "bold", 20 * d, INK);
      doc.text(cv.name || "Your Name", M, flow.y + 16 * d);
      font("helvetica", "normal", 11 * d, A);
      if (cv.headline) doc.text(cv.headline, W - M, flow.y + 16 * d, { align: "right" });
      flow.y += 26 * d;
      font("helvetica", "normal", 8.8 * d, MUTED);
      doc.text(contacts.join("  ·  "), M, flow.y + 8 * d);
      flow.y += space(18);
    },
  };

  // ---------- Section headings ----------
  const heading = (title: string) => {
    ensure(lh * 4);
    flow.y += space(t === "compact" ? 6 : 12);
    const size = (t === "bold" ? 13 : t === "minimal" ? 8.4 : face === "times" ? 11.5 : 10.5) * d;
    switch (t) {
      case "aurora":
      case "sidebar":
        font("helvetica", "bold", size, A);
        doc.text(title.toUpperCase(), flow.x, flow.y + size, { charSpace: track(1.2) });
        flow.y += size + 5;
        doc.setDrawColor(...A);
        doc.setLineWidth(1.4);
        doc.line(flow.x, flow.y, flow.x + 26, flow.y);
        flow.y += space(9);
        break;
      case "executive":
        font("times", "bold", size, A);
        doc.text(title.toUpperCase(), flow.x, flow.y + size, { charSpace: track(1.6) });
        flow.y += size + 5;
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.5);
        doc.line(flow.x, flow.y, flow.x + flow.w, flow.y);
        flow.y += space(9);
        break;
      case "minimal":
        // Label in the left gutter, level with the first line of content.
        font("helvetica", "bold", size, A);
        doc.text(title.toUpperCase(), M, flow.y + body, { charSpace: track(1.3) });
        break;
      case "classic":
        font("helvetica", "bold", size, INK);
        doc.text(title.toUpperCase(), flow.x, flow.y + size, { charSpace: track(1) });
        flow.y += size + 5;
        doc.setDrawColor(...RULE);
        doc.setLineWidth(0.6);
        doc.line(flow.x, flow.y, flow.x + flow.w, flow.y);
        flow.y += space(8);
        break;
      case "bold": {
        font("helvetica", "bold", size, INK);
        doc.text(title, flow.x, flow.y + size);
        const tw = doc.getTextWidth(title);
        doc.setDrawColor(...A);
        doc.setLineWidth(1);
        doc.line(flow.x + tw + 10, flow.y + size * 0.62, flow.x + flow.w, flow.y + size * 0.62);
        flow.y += size + space(9);
        break;
      }
      case "elegant": {
        font("times", "normal", size, INK);
        const label = title.toUpperCase();
        centerSpaced(label, W / 2, flow.y + size, 2.2);
        const half = spacedWidth(label, 2.2) / 2 + 12;
        doc.setDrawColor(...mix(A, WHITE, 0.35));
        doc.setLineWidth(0.6);
        doc.line(flow.x, flow.y + size * 0.62, W / 2 - half, flow.y + size * 0.62);
        doc.line(W / 2 + half, flow.y + size * 0.62, flow.x + flow.w, flow.y + size * 0.62);
        flow.y += size + space(10);
        break;
      }
      case "compact":
        doc.setFillColor(...A);
        doc.rect(flow.x, flow.y + 1, 3, size + 1, "F");
        font("helvetica", "bold", size, INK);
        doc.text(title.toUpperCase(), flow.x + 9, flow.y + size, { charSpace: track(0.8) });
        flow.y += size + space(8);
        break;
    }
  };

  const bullets = (items: string[]) => {
    const indent = 11;
    for (const b of items) {
      font(face, "normal", body);
      const lines = doc.splitTextToSize(b.replace(/[.]+$/, ""), flow.w - indent) as string[];
      ensure(lines.length * lh);
      doc.setFillColor(...(t === "classic" || t === "executive" || t === "elegant" ? INK : A));
      doc.circle(flow.x + 3, flow.y + body * 0.66, 1.25 * d, "F");
      font(face, "normal", body);
      lines.forEach((line, i) => doc.text(line, flow.x + indent, flow.y + body + i * lh));
      flow.y += lines.length * lh + space(2);
    }
  };

  const entry = (title: string, right: string, sub: string) => {
    ensure(lh * 3);
    font(face, "bold", body + 0.6);
    doc.text(title, flow.x, flow.y + body);
    font(face, "normal", body - 1, MUTED);
    if (right) doc.text(right, flow.x + flow.w, flow.y + body, { align: "right" });
    flow.y += lh;
    if (sub) para(sub, body - 0.4, t === "aurora" || t === "bold" ? A : MUTED, face === "times" ? "italic" : "normal");
  };

  const pills = (items: string[]) => {
    font("helvetica", "normal", body - 0.6);
    const padX = 7 * d;
    const h = body + 7 * d;
    let x = flow.x;
    ensure(h);
    for (const s of items) {
      const w = doc.getTextWidth(s) + padX * 2;
      if (x + w > flow.x + flow.w) {
        x = flow.x;
        flow.y += h + 5 * d;
        ensure(h);
      }
      doc.setFillColor(...mix(A, WHITE, 0.88));
      doc.roundedRect(x, flow.y, w, h, h / 2, h / 2, "F");
      font("helvetica", "normal", body - 0.6, mix(A, INK, 0.45));
      doc.text(s, x + padX, flow.y + h / 2 + (body - 0.6) * 0.35);
      x += w + 5 * d;
    }
    flow.y += h + space(4);
  };

  const sections = {
    summary() {
      if (!cv.summary.trim()) return;
      heading(t === "executive" || t === "elegant" ? "Profile" : "Summary");
      para(cv.summary.trim(), body, INK, "normal", face, t === "elegant" ? "center" : "left");
    },
    experience() {
      const jobs = sortedExperience(cv.experience).filter((x) => x.title.trim());
      if (!jobs.length) return;
      heading("Experience");
      jobs.forEach((x, i) => {
        if (i) flow.y += space(t === "compact" ? 4 : 8);
        entry(x.title, dateRange(x), [x.company, x.city].filter(Boolean).join(", "));
        flow.y += space(2);
        bullets(x.bullets.filter((b) => b.trim()));
      });
    },
    education() {
      const eds = cv.education.filter((e) => e.degree.trim());
      if (!eds.length) return;
      heading("Education");
      eds.forEach((e, i) => {
        if (i) flow.y += space(5);
        entry(e.degree, e.year, [e.institute, e.grade].filter(Boolean).join("  ·  "));
      });
    },
    skills() {
      if (!skills.length || t === "sidebar") return;
      heading("Skills");
      if (t === "aurora" || t === "bold") pills(skills);
      else inlineList(skills, t === "minimal" ? ",  " : "   •   ", t === "elegant" ? "center" : "left");
    },
    certifications() {
      const certs = cv.certifications.filter((c) => c.trim());
      if (!certs.length) return;
      heading("Certifications");
      bullets(certs);
    },
    languages() {
      const langs = cv.languages.filter((l) => l.name.trim());
      if (!langs.length || t === "sidebar") return;
      heading("Languages");
      inlineList(langs.map((l) => `${l.name} (${l.level})`), "   •   ", t === "elegant" ? "center" : "left");
    },
  };

  header[t]();
  for (const s of sectionOrder(cv)) sections[s]();

  // Sidebar panel goes in after the main column, starting on page 1.
  if (t === "sidebar") {
    doc.setPage(1);
    Object.assign(flow, { x: 26, w: sideW - 52, y: 40, top: 40, newPage: undefined });
    const label = (s: string) => {
      ensure(40);
      flow.y += space(16);
      font("helvetica", "bold", 8.4 * d, mix(WHITE, sideBg, 0.3));
      doc.text(s.toUpperCase(), flow.x, flow.y + 8, { charSpace: track(1.4) });
      flow.y += space(16);
    };
    const line = (s: string, size = 9 * d, c: RGB = WHITE) => para(s, size, c, "normal", "helvetica");
    if (photo) {
      circlePhoto((sideW - 96) / 2, flow.y, 96, mix(WHITE, sideBg, 0.75));
      flow.y += 108;
    }
    if (contacts.length) {
      label("Contact");
      contacts.forEach((c) => {
        line(c);
        flow.y += 3;
      });
    }
    if (skills.length) {
      label("Skills");
      skills.forEach((s) => line(s));
    }
    const langs = cv.languages.filter((l) => l.name.trim());
    if (langs.length) {
      label("Languages");
      langs.forEach((l) => {
        line(l.name);
        line(l.level, 8 * d, mix(WHITE, sideBg, 0.35));
        flow.y += 2;
      });
    }
  }
  return doc;
}

export function letterPdf(cv: CV, body: string): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 66;
  const A = hex(cv.accent || "#0071E3");
  const face: Face = cv.template === "executive" || cv.template === "elegant" ? "times" : "helvetica";
  let y = M;
  doc.setFont(face, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(cv.name || "Your Name", M, y);
  y += 16;
  doc.setFont(face, "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text([normalizePhone(cv.phone), cv.email, cv.city].filter(Boolean).join("   ·   "), M, y);
  y += 14;
  doc.setDrawColor(...A);
  doc.setLineWidth(1.4);
  doc.line(M, y, M + 36, y);
  y += 34;
  doc.setTextColor(...INK);
  doc.setFontSize(10.5);
  doc.text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), M, y);
  y += 30;
  doc.setFontSize(face === "times" ? 12 : 11);
  for (const p of body.split(/\n{2,}/)) {
    const lines = doc.splitTextToSize(p.trim(), W - 2 * M) as string[];
    doc.text(lines, M, y, { lineHeightFactor: 1.5 });
    y += lines.length * 16.5 + 11;
  }
  return doc;
}

export { fileName } from "../logic/apply";
