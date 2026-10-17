# CV Wala

CV builder for job seekers in Pakistan: a short step-by-step form produces a scored, well-written CV in 8 PDF designs, plus a matching cover letter. One React + TypeScript codebase ships as a web app (PWA) and as iOS/Android apps through Capacitor 8. The look is iOS "Liquid Glass".

## Commands

```bash
npm run dev        # web (Vite, :5173) + API (Express via tsx, :8787); Vite proxies /api
npm test           # vitest: src/logic/__tests__
npx tsc -p .       # typecheck (there is no separate lint step)
npm run build      # typecheck + production build into dist/
npm start          # production: one server hosts dist/ and /api
npx cap sync       # copy dist/ into ios/ and android/ after a build
```

Android builds need JDK 17–21 (Java 25+ breaks this Gradle version):
`JAVA_HOME=~/Library/Java/JavaVirtualMachines/jbr-21.0.11/Contents/Home ./gradlew assembleDebug` in `android/`. iOS needs full Xcode (`npm run ios`).

## Layout

- `src/logic/` — all product logic as pure, tested functions. **Put new rules here, not in components.**
  - `score.ts`: weighted checks normalised to 100; checks that don't apply are left out of the total. `[placeholder]` text caps the score at 79.
  - `summary.ts`: auto-summary. It regenerates on every CV change until `summaryTouched` is set.
  - `bullets.ts`: weak-opener rewrites, per-point tips, repeated opening verbs.
  - `format.ts`: phone normalisation (+92), email typo fixes, years of experience (overlaps merged), date issues, 6+ month gaps.
  - `letter.ts`: job-ad skill matching, `tailorSkills` (matched skills first), the template-based cover letter.
  - `preflight.ts`: blocking/non-blocking issues shown before download.
  - `importer.ts`: turns a pasted (or PDF-extracted) old CV into form fields. It finds headings, date ranges ("Mar 2021 – Present"), job headers ("Title | Company, City"), degrees, grades, skills and languages, and guesses the job field.
  - `jobad.ts`: `analyzeAd` reads years required (its keyword list skips how-to-apply words like "subject line" or "attested copies"), degree level, city or remote, gender preference, deadline, salary and the ad's repeated words. It computes a fit score, capped at 55 when a hard requirement is clearly missed.
  - `tracker.ts`: what needs attention (deadlines, follow-ups after 7 days, upcoming interviews, offers), stats, the follow-up message, the weekly goal and streak (weeks start Monday), and reply-rate insights (only with 3+ applications per group).
  - `writing.ts`: misspellings (a fixed list of common CV typos), clichés ("hard-working", "team player"…), and tense (past tense for jobs the user has left). Built-in text (roles, summary, letter) must not use the clichés it flags.
  - `score.ts` → `isFresher`: the Fresh Graduate field, or only internships/projects. Freshers are scored on projects, grades and courses instead of jobs.
  - `interview.ts`: likely interview questions with answer outlines built from the CV and the job ad.
  - `salary.ts`: reads salary ranges ("60k", "1.2 lac", "Rs. 90,000 – 120,000") and suggests what to ask for. It never invents market rates.
  - `apply.ts`: file names (`Ali-Khan-CV.pdf`), the email/WhatsApp application text, and checklists (reference number, required subject, documents such as attested degrees or domicile) read from the ad.
  - `ats.ts`: checks the text pulled out of the real PDF (name, contact, section names, job titles, skills).
  - `tailor.ts`: "Make a CV version for this job". `planTailor` lists switchable changes (ad's job title — never a more senior one; matched skills first and long lists trimmed; most relevant points first; older jobs cut to 2 points on long CVs; summary — off by default if hand-written) plus skills to confirm. `applyTailor` builds the copy; `store.addVersion` saves it and re-links applications to the same company. It never adds anything the user didn't confirm.
  - `backup.ts`: one JSON file with everything. `history.ts`: earlier versions per CV (max 8, photo left out), taken daily and before import, AI rewrite and restore.
- `src/lib/pdf.ts` — jsPDF renderer for all 8 templates (text PDFs, ATS-readable). "Fit on one page" re-renders at densities 0.95 → 0.86.
- `src/lib/thumbs.ts` — pdf.js renders PDF pages to images. It is queued and cached; every on-screen CV preview is the real PDF.
- `src/data/` — `roles.ts` (14 fields: skills, example points, summary wording), `templates.ts` (template list; keep it free of jsPDF imports), `sample.ts` (showcase CV shown before the user types anything).
- `src/state/` — `store.ts` is a tiny external store saved to localStorage (`cvwala:v2`; migrates `v1`). It holds several CV versions (`docs`), each with its own `target` job and `letter`, plus `applications` for the tracker (each linked to the CV version sent), `history` (earlier versions) and `weeklyGoal`. `normalizeState` in `defaults.ts` fills in fields added later; it is used for saved state and for backups. `nav.ts` holds the current tab.
- `src/screens/` — Welcome (3D hero with floating score/fix cards, how-it-works, drifting template wall — 2D transforms only, so pages stay sharp), Home, Edit (5 steps), Design (coverflow + preview + download), Letter (job fit + track), Jobs (application tracker).
- `src/lib/pdftext.ts` — extracts text lines from an uploaded PDF CV for the importer (lazy-loaded).
- `src/data/pakistan.ts` — cities, degree list and degree levels shared by the editor, importer and job-ad reader.
- `src/state/theme.ts` — Light / Dark / Automatic. Sets `data-theme` on `<html>` (an inline script in `index.html` does this before first paint) and runs the circular View Transition when switching.
- `src/components/Backdrop.tsx` — the signature background: drifting studio-light beams, generated topographic contour lines (every 5th is a heavier index line) that draw in once per session, a vignette and grain, with slight pointer parallax.
- `src/components/` — `ApplySheet.tsx`, `InterviewSheet.tsx`, `BackupSheet.tsx`, `AtsSheet.tsx`, `ImportSheet.tsx`, `Appearance.tsx` (theme sheet), `ui.tsx` (Screen, Press, Field, Sheet, Segmented, Toggle, ScoreRing, toast), `Paper.tsx` (CvPaper, Tilt), `RolePicker.tsx`.
- `server/` — Express API. `ai.ts` calls Claude (`claude-opus-5-5`, structured JSON output, `fallbacks: "default"`). The key stays server-side, with a per-IP rate limit. Endpoints: `/api/health`, `/api/improve`, `/api/letter`.

## Rules

- **Everything must work offline and without an API key.** AI is an optional upgrade; hide AI buttons when `useAI()` is false.
- **No Urdu UI or translation features.** They were removed on purpose. (Urdu as a spoken language on a user's CV is just data.)
- **Keep jsPDF and pdf.js out of the main bundle.** Import `lib/pdf` and `lib/thumbs` dynamically (`await import(...)`). `data/templates.ts` exists for this reason.
- **Design system** (`src/styles/app.css`):
  - Glass (`.glass`) only on floating chrome: tab bar, sticky nav, docks, toast. Content uses solid `.card` / `.rows`.
  - Colours come from CSS variables. Dark mode overrides live under `[data-theme="dark"]`; never use `@media (prefers-color-scheme)`, which would ignore the user's in-app choice.
  - Icons come from `@phosphor-icons/react` (`XIcon` names): `fill` weight for active/inline glyphs, `regular` otherwise. No emoji in the UI.
- **Motion** (`src/lib/motion.ts`):
  - Use the shared springs (`snappy` for taps and toggles, `smooth` for sheets, `gentle` for hero entrances).
  - Taps go through `<Press>`. Respect reduced motion (`MotionConfig reducedMotion="user"` is set in App).
- **3D and sharp text:** never put `perspective` on a parent, and keep CV papers untransformed (`transform: none`) at rest. Chrome rasterizes 3D-transformed layers at low resolution and the CV text goes blurry. `Tilt`, the coverflow centre item and the Welcome front sheet all follow this.
- **When adding a PDF template:**
  1. Add it to `TemplateId` and `data/templates.ts`.
  2. Add a header in `pdf.ts` → `header`, and a case in `heading`.
  3. Check it renders on one page with `SAMPLE_CV`.
  4. Use `track()` for letter spacing. Spacing wider than 8% of the font size makes text readers split headings into single letters, and the ATS check fails.
- Copy is plain, specific English for people with limited English: short sentences, no jargon, no hype.
