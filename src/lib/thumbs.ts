import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { CV } from "../state/types";
import { cvPdf } from "./pdf";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const cache = new Map<string, string[]>();
let queue: Promise<unknown> = Promise.resolve();

/**
 * Renders CV pages to images. Calls are queued (pdf.js work is heavy) and
 * cached by content, so the gallery, home card and preview share results.
 */
export function renderPages(cv: CV, width: number, opts: { jobAd?: string; maxPages?: number } = {}): Promise<string[]> {
  const key = JSON.stringify([cv, width, opts]);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const job = queue.then(async () => {
    // An identical request queued earlier may have finished while this one waited.
    const done = cache.get(key);
    if (done) return done;
    const { doc } = cvPdf(cv, { jobAd: opts.jobAd });
    const task = pdfjs.getDocument({ data: doc.output("arraybuffer") });
    const pdf = await task.promise;
    const out: string[] = [];
    const n = Math.min(pdf.numPages, opts.maxPages ?? 99);
    for (let i = 1; i <= n; i++) {
      const page = await pdf.getPage(i);
      const scale = (width * Math.min(devicePixelRatio || 1, 2.5)) / page.getViewport({ scale: 1 }).width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
      out.push(canvas.toDataURL("image/jpeg", 0.9));
    }
    await task.destroy();
    if (cache.size > 60) cache.delete(cache.keys().next().value!);
    cache.set(key, out);
    return out;
  });
  queue = job.catch(() => {});
  return job;
}
