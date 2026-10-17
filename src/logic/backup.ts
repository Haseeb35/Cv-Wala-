import type { AppState } from "../state/types";
import { normalizeState } from "../state/defaults";

// One file holding every CV, letter and application, so nothing is lost when
// the user clears their browser or changes phone.

export const backupFileName = (d = new Date()) =>
  `CV-Wala-backup-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;

export function makeBackup(state: AppState, now = new Date()): string {
  return JSON.stringify({ app: "cvwala", version: 1, exportedAt: now.toISOString(), data: state });
}

export type Restored = { ok: true; state: AppState; cvs: number; applications: number; exportedAt?: string } | { ok: false; error: string };

export function readBackup(text: string): Restored {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "This file is not a CV Wala backup." };
  }
  const file = raw as { app?: string; data?: Partial<AppState>; exportedAt?: string };
  if (file?.app !== "cvwala" || !file.data) return { ok: false, error: "This file is not a CV Wala backup." };
  const docs = file.data.docs;
  if (!Array.isArray(docs) || !docs.length || !docs.every((d) => d && typeof d.id === "string" && d.cv && typeof d.cv === "object"))
    return { ok: false, error: "This backup is damaged and can't be used." };
  const state = normalizeState(file.data as AppState);
  return { ok: true, state: { ...state, onboarded: true }, cvs: state.docs.length, applications: state.applications.length, exportedAt: file.exportedAt };
}
