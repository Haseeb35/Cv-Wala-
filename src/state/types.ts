export type Experience = {
  id: string;
  title: string;
  company: string;
  city: string;
  start: string; // "2022-03" or ""
  end: string; // "" with current = true means present
  current: boolean;
  bullets: string[];
};

export type Education = {
  id: string;
  degree: string;
  institute: string;
  year: string;
  grade: string;
};

export type Language = { name: string; level: "Native" | "Fluent" | "Professional" | "Basic" };

export type TemplateId = "aurora" | "sidebar" | "executive" | "minimal" | "classic" | "bold" | "elegant" | "compact";

export type CV = {
  roleId: string;
  name: string;
  headline: string;
  phone: string;
  email: string;
  city: string;
  linkedin: string;
  photo: string; // circular PNG data URL, or ""
  summary: string;
  summaryTouched: boolean; // once edited by hand, stop auto-regenerating
  experience: Experience[];
  education: Education[];
  skills: string[];
  languages: Language[];
  certifications: string[];
  template: TemplateId;
  accent: string;
  fitOnePage: boolean;
  showPhoto: boolean;
  updatedAt: number;
};

/** The job this CV is aimed at. Shared by CV tailoring and the cover letter. */
export type Target = {
  company: string;
  jobTitle: string;
  manager: string;
  source: string;
  jobAd: string;
  expectedSalary: string; // what the user plans to ask for, e.g. "80,000"
};

export type Letter = {
  tone: "formal" | "warm" | "confident";
  length: "short" | "standard";
  body: string;
  touched: boolean;
};

/** One CV version, e.g. "Sales — Hum Mart". */
export type Doc = { id: string; label: string; cv: CV; target: Target; letter: Letter };

export type Application = {
  id: string;
  docId: string; // which CV version was sent
  company: string;
  jobTitle: string;
  source: string;
  contact: string; // hiring manager, for follow-ups
  status: "saved" | "applied" | "interview" | "offer" | "rejected";
  appliedAt?: string; // YYYY-MM-DD
  deadline?: string; // YYYY-MM-DD, read from the job ad
  interviewAt?: string; // YYYY-MM-DDTHH:mm
  followedUpAt?: string; // YYYY-MM-DD
  notes: string;
  createdAt: number;
  updatedAt: number;
};

/** An earlier version of one CV, for undo. Photos are left out to save space. */
export type Snapshot = { id: string; docId: string; at: number; reason: string; cv: CV };

export type AppState = {
  docs: Doc[];
  applications: Application[];
  history: Snapshot[];
  weeklyGoal: number; // applications per week
  activeId: string;
  step: number;
  onboarded: boolean;
};
