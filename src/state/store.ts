import { useSyncExternalStore } from "react";
import type { AppState, Application, CV, Doc, Letter, Target } from "./types";
import { emptyCV, emptyTarget, initialState, newDoc, normalizeState } from "./defaults";
import { buildSummary } from "../logic/summary";
import { uid } from "../logic/format";
import { addSnapshot, dailyDue } from "../logic/history";

const KEY = "cvwala:v2";
const LEGACY_KEY = "cvwala:v1";

/** Loads saved state, upgrading v1 (single CV) data and filling fields added later. */
function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as AppState;
      if (s.docs?.length) return normalizeState(s);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      const cv: CV = { ...emptyCV(), ...old.cv, template: "aurora", accent: emptyCV().accent };
      const { company = "", jobTitle = "", manager = "", source = "", jobAd = "", tone = "formal", length = "standard" } = old.letter ?? {};
      const doc: Doc = { ...newDoc("My CV", cv), target: { ...emptyTarget(), company, jobTitle, manager, source, jobAd }, letter: { tone, length, body: "", touched: false } };
      return { ...initialState(), docs: [doc], activeId: doc.id, step: old.step ?? 0, onboarded: !!old.onboarded };
    }
  } catch {
    /* private mode or corrupted data: start fresh */
  }
  return initialState();
}

let state: AppState = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked; the session still works */
    }
  }, 250);
}

function set(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

const active = () => state.docs.find((d) => d.id === state.activeId) ?? state.docs[0];

function patchDoc(p: Partial<Doc> | ((d: Doc) => Partial<Doc>)) {
  set({
    ...state,
    docs: state.docs.map((d) => (d.id === active().id ? { ...d, ...(typeof p === "function" ? p(d) : p) } : d)),
  });
}

export const store = {
  get: () => state,
  active,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  patch(p: Partial<AppState>) {
    set({ ...state, ...p });
  },
  /** Updates the active CV and keeps the auto-summary in sync until the user writes their own. */
  cv(p: Partial<CV> | ((cv: CV) => Partial<CV>)) {
    // Keep a daily copy of the CV as it was before today's edits.
    if (dailyDue(state.history, active().id)) state = { ...state, history: addSnapshot(state.history, active(), "Start of the day") };
    patchDoc((d) => {
      const delta = typeof p === "function" ? p(d.cv) : p;
      let cv: CV = { ...d.cv, ...delta, updatedAt: Date.now() };
      if (!cv.summaryTouched && !("summary" in delta)) cv = { ...cv, summary: buildSummary(cv) };
      return { cv };
    });
  },
  target(p: Partial<Target>) {
    patchDoc((d) => ({ target: { ...d.target, ...p } }));
  },
  letter(p: Partial<Letter>) {
    patchDoc((d) => ({ letter: { ...d.letter, ...p } }));
  },
  rename(id: string, label: string) {
    set({ ...state, docs: state.docs.map((d) => (d.id === id ? { ...d, label } : d)) });
  },
  select(id: string) {
    set({ ...state, activeId: id });
  },
  /** Copies a CV so it can be tailored to another job without losing the original. */
  duplicate(id: string) {
    const src = state.docs.find((d) => d.id === id);
    if (!src) return;
    const copy: Doc = { ...structuredClone(src), id: uid(), label: `${src.label} (copy)` };
    copy.cv.updatedAt = Date.now();
    set({ ...state, docs: [...state.docs, copy], activeId: copy.id });
  },
  /**
   * Adds a CV version aimed at one job and switches to it. The original is left
   * untouched, and any application to the same company now points at the new version.
   */
  addVersion(label: string, cv: CV, target: Target): string {
    const doc: Doc = { ...newDoc(label, cv), target: { ...target } };
    const company = target.company.trim().toLowerCase();
    const applications = company
      ? state.applications.map((a) => (a.company.trim().toLowerCase() === company && a.status !== "rejected" ? { ...a, docId: doc.id, updatedAt: Date.now() } : a))
      : state.applications;
    set({ ...state, docs: [...state.docs, doc], applications, activeId: doc.id });
    return doc.id;
  },
  remove(id: string) {
    const docs = state.docs.filter((d) => d.id !== id);
    if (!docs.length) return set({ ...initialState(), applications: state.applications, weeklyGoal: state.weeklyGoal, onboarded: state.onboarded });
    set({ ...state, docs, history: state.history.filter((h) => h.docId !== id), activeId: state.activeId === id ? docs[0].id : state.activeId });
  },
  /** Saves a CV (the active one by default) as an earlier version, e.g. "Before import". */
  snapshot(reason: string, docId = active().id) {
    const doc = state.docs.find((d) => d.id === docId);
    if (doc) set({ ...state, history: addSnapshot(state.history, doc, reason) });
  },
  /** Brings back an earlier version. The current one is saved first, so this can be undone too. */
  restoreSnapshot(id: string) {
    const snap = state.history.find((h) => h.id === id);
    const doc = state.docs.find((d) => d.id === snap?.docId);
    if (!snap || !doc) return;
    const history = addSnapshot(state.history, doc, "Before going back");
    const cv = { ...snap.cv, photo: doc.cv.photo, updatedAt: Date.now() };
    set({ ...state, history, activeId: doc.id, docs: state.docs.map((d) => (d.id === doc.id ? { ...d, cv } : d)) });
  },
  /** Replaces everything with a backup. */
  restoreAll(next: AppState) {
    set(normalizeState(next));
  },
  /** Fills the active CV from an imported one; anything not found keeps its current value. */
  importCV(found: Partial<CV>) {
    store.snapshot("Before import");
    store.cv((cv) => {
      const next: Partial<CV> = { ...found };
      if (!found.summary) next.summaryTouched = false;
      if (!found.education?.length) delete next.education;
      return { ...next, photo: cv.photo };
    });
  },
  addApplication(p: Partial<Application>): string {
    const now = Date.now();
    const app: Application = { id: uid(), docId: active().id, company: "", jobTitle: "", source: "", contact: "", status: "applied", notes: "", createdAt: now, updatedAt: now, ...p };
    set({ ...state, applications: [app, ...state.applications] });
    return app.id;
  },
  updateApplication(id: string, p: Partial<Application>) {
    set({ ...state, applications: state.applications.map((a) => (a.id === id ? { ...a, ...p, updatedAt: Date.now() } : a)) });
  },
  removeApplication(id: string) {
    set({ ...state, applications: state.applications.filter((a) => a.id !== id) });
  },
  reset() {
    set(initialState());
  },
};

export function useApp<T>(select: (s: AppState) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

const pick = (s: AppState) => s.docs.find((d) => d.id === s.activeId) ?? s.docs[0];
export const useDoc = () => useApp(pick);
export const useCV = () => useApp((s) => pick(s).cv);
