import { useEffect, useState } from "react";
import type { CV, Letter, Target } from "../state/types";

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data as T;
}

let aiStatus: Promise<boolean> | null = null;

/** True when the server is reachable and has an API key. Checked once per session. */
export function aiAvailable(): Promise<boolean> {
  aiStatus ??= fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(4000) })
    .then((r) => r.json())
    .then((d) => Boolean(d.ai))
    .catch(() => false);
  return aiStatus;
}

export function useAI() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    aiAvailable().then(setOn);
  }, []);
  return on;
}

export const ai = {
  improve: (bullets: string[], jobTitle: string) => post<{ bullets: string[] }>("improve", { bullets, jobTitle }),
  letter: (cv: CV, target: Target, letter: Letter) => {
    // Send only what the letter needs; never the photo.
    const { template: _t, accent: _a, updatedAt: _u, summaryTouched: _s, photo: _p, showPhoto: _sp, fitOnePage: _f, ...cvData } = cv;
    return post<{ body: string }>("letter", { cv: cvData, letter: { ...target, tone: letter.tone, length: letter.length } });
  },
};
