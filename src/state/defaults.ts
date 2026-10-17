import type { AppState, CV, Doc, Education, Experience, Letter, Target } from "./types";
import { uid } from "../logic/format";

export const emptyExperience = (): Experience => ({
  id: uid(), title: "", company: "", city: "", start: "", end: "", current: false, bullets: [""],
});

export const emptyEducation = (): Education => ({ id: uid(), degree: "", institute: "", year: "", grade: "" });

export const emptyCV = (): CV => ({
  roleId: "",
  name: "",
  headline: "",
  phone: "",
  email: "",
  city: "",
  linkedin: "",
  photo: "",
  summary: "",
  summaryTouched: false,
  experience: [],
  education: [emptyEducation()],
  skills: [],
  languages: [{ name: "English", level: "Professional" }],
  certifications: [],
  template: "aurora",
  accent: "#0071E3",
  fitOnePage: true,
  showPhoto: true,
  updatedAt: Date.now(),
});

export const emptyTarget = (): Target => ({ company: "", jobTitle: "", manager: "", source: "", jobAd: "", expectedSalary: "" });

export const emptyLetter = (): Letter => ({ tone: "formal", length: "standard", body: "", touched: false });

export const newDoc = (label = "My CV", cv: CV = emptyCV()): Doc => ({
  id: uid(), label, cv, target: emptyTarget(), letter: emptyLetter(),
});

export const initialState = (): AppState => {
  const doc = newDoc();
  return { docs: [doc], applications: [], history: [], weeklyGoal: 5, activeId: doc.id, step: 0, onboarded: false };
};

/** Fills in fields added in later versions, so old saves and backups keep working. */
export function normalizeState(s: AppState): AppState {
  const docs = s.docs.map((d) => ({
    ...d,
    label: d.label || "My CV",
    cv: { ...emptyCV(), ...d.cv },
    target: { ...emptyTarget(), ...d.target },
    letter: { ...emptyLetter(), ...d.letter },
  }));
  const ids = new Set(docs.map((d) => d.id));
  return {
    ...initialState(),
    ...s,
    docs,
    applications: Array.isArray(s.applications) ? s.applications : [],
    history: Array.isArray(s.history) ? s.history.filter((h) => ids.has(h.docId)).map((h) => ({ ...h, cv: { ...emptyCV(), ...h.cv } })) : [],
    weeklyGoal: s.weeklyGoal > 0 ? s.weeklyGoal : 5,
    activeId: ids.has(s.activeId) ? s.activeId : docs[0].id,
  };
}
