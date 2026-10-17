import type { CV, Doc, Snapshot } from "../state/types";
import { uid } from "./format";

// Earlier versions of each CV: taken before big changes (import, AI rewrite,
// restore) and once a day while editing, so any change can be undone.

export const MAX_PER_DOC = 8;
const DAY = 86_400_000;

// Photos are large and rarely change; snapshots leave them out to save space.
const strip = (cv: CV): CV => ({ ...cv, photo: "" });
const same = (a: CV, b: CV) => JSON.stringify({ ...strip(a), updatedAt: 0 }) === JSON.stringify({ ...strip(b), updatedAt: 0 });
const hasContent = (cv: CV) => !!(cv.name.trim() || cv.experience.length || cv.skills.length);

export function addSnapshot(list: Snapshot[], doc: Doc, reason: string, now = Date.now()): Snapshot[] {
  if (!hasContent(doc.cv)) return list;
  const latest = list.find((s) => s.docId === doc.id);
  if (latest && same(latest.cv, doc.cv)) return list;
  const next = [{ id: uid(), docId: doc.id, at: now, reason, cv: strip(doc.cv) }, ...list];
  let kept = 0;
  return next.filter((s) => s.docId !== doc.id || ++kept <= MAX_PER_DOC);
}

/** A daily safety copy: due when this CV has no snapshot from the last 24 hours. */
export const dailyDue = (list: Snapshot[], docId: string, now = Date.now()) =>
  !list.some((s) => s.docId === docId && now - s.at < DAY);

export const snapshotsOf = (list: Snapshot[], docId: string) => list.filter((s) => s.docId === docId);
