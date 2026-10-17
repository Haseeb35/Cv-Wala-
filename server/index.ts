import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { aiEnabled, improveBullets, writeLetter } from "./ai";

const app = express();
app.use(cors()); // the iOS/Android apps call from capacitor:// and https://localhost origins
app.use(express.json({ limit: "64kb" }));

// Simple per-IP limit so a public deployment can't drain the API key.
const hits = new Map<string, { n: number; reset: number }>();
app.use("/api", (req, res, next) => {
  if (req.method === "GET") return next();
  const ip = req.ip ?? "unknown";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || h.reset < now) hits.set(ip, { n: 1, reset: now + 10 * 60_000 });
  else if (++h.n > 40) return res.status(429).json({ error: "Too many requests. Please wait a few minutes." });
  next();
});

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ai: aiEnabled });
});

app.post("/api/improve", async (req, res, next) => {
  try {
    const bullets = Array.isArray(req.body?.bullets) ? req.body.bullets.map((b: unknown) => str(b, 300)).filter(Boolean).slice(0, 8) : [];
    if (!bullets.length) return res.status(400).json({ error: "Add at least one point." });
    res.json(await improveBullets(bullets, str(req.body?.jobTitle, 80)));
  } catch (e) {
    next(e);
  }
});

app.post("/api/letter", async (req, res, next) => {
  try {
    const cv = req.body?.cv;
    const letter = req.body?.letter;
    if (!cv || !letter) return res.status(400).json({ error: "CV and job details are required." });
    res.json(await writeLetter(JSON.stringify(cv).slice(0, 12000), JSON.stringify(letter).slice(0, 6000)));
  } catch (e) {
    next(e);
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = (err as { status?: number })?.status;
  res.status(status === 503 ? 503 : 502).json({ error: (err as Error)?.message ?? "AI service failed" });
});

// In production the same server also hosts the web app.
if (process.env.NODE_ENV === "production") {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => console.log(`CV Wala API on http://localhost:${port} (AI ${aiEnabled ? "on" : "off — set ANTHROPIC_API_KEY"})`));
