import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Pulls readable lines out of a PDF CV. Text items are grouped into lines by
 * their vertical position and ordered left to right, which keeps headings,
 * dates and bullets on their own lines for the importer.
 */
export async function pdfToText(file: Blob): Promise<string> {
  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const out: string[] = [];
  try {
    for (let p = 1; p <= Math.min(pdf.numPages, 5); p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const rows = new Map<number, { x: number; s: string; w: number }[]>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        const y = Math.round(item.transform[5] / 3) * 3;
        const row = rows.get(y) ?? [];
        row.push({ x: item.transform[4], s: item.str, w: item.width });
        rows.set(y, row);
      }
      for (const y of [...rows.keys()].sort((a, b) => b - a)) {
        const parts = rows.get(y)!.sort((a, b) => a.x - b.x);
        let line = "";
        let end = -Infinity;
        for (const part of parts) {
          // A wide horizontal gap usually separates columns ("Title      Jan 2020 – Present").
          line += line && part.x - end > 18 ? "  |  " : line && part.x - end > 2 ? " " : "";
          line += part.s;
          end = part.x + part.w;
        }
        out.push(line.trim());
      }
      out.push("");
    }
  } finally {
    await task.destroy();
  }
  return out.join("\n");
}
