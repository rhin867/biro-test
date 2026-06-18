# Biro-Test: Zero-Credit PDF → CBT Pipeline + Bug Fixes

## Goal

Stop depending on Lovable AI / Gemini credits for PDF extraction. Move the heavy lifting to a **self-hosted Python (FastAPI) backend** that uses PyMuPDF + PaddleOCR + Regex + pix2tex, so conversion keeps working even when AI credits are 0. Also fix the broken manual cropping flow and remaining frontend bugs.(make sure if it is not working then for loses it will direct work on lovable ai/gemini [and it is writing on the ui which is working ai/coding] so that pdf should convert into cbt and also dont it will stop also after fallback).

---

## Architecture (final)

```text
Frontend (Lovable/Vercel)
   │  PDF upload
   ▼
Python FastAPI backend (Render/Railway free tier)
   │
   ├─ PDF Detector (PyMuPDF)
   │     ├─ has selectable text? → TEXT PIPELINE
   │     └─ scanned?            → OCR PIPELINE (PaddleOCR)
   │
   ├─ Regex/NLP Question Parser
   │     Q.1 / 1. / Q1 → question
   │     (A) (B) (C) (D) → options
   │     "Answer: X"   → answer key
   │
   ├─ Diagram pipeline
   │     PyMuPDF embedded images + OpenCV contour crop
   │     → returned as base64, stored in IndexedDB on frontend
   │
   └─ Math pipeline
         pix2tex on math-region crops → LaTeX strings
         (frontend already renders with KaTeX)

Output JSON → Supabase `public_tests` / local IndexedDB
```

No Lovable AI / Gemini call in the default path. AI gateway becomes an **optional fallback** only when user toggles it.

---

## What we deliver in this project

### A. Python backend (`biro-backend/` folder added to repo, deployed separately)

Files:

- `biro-backend/app/main.py` — FastAPI app, CORS
- `biro-backend/app/services/pdf_detector.py` — text vs scanned check
- `biro-backend/app/services/text_pipeline.py` — PyMuPDF text + image extraction
- `biro-backend/app/services/ocr_pipeline.py` — pdf2image + PaddleOCR
- `biro-backend/app/services/parser.py` — regex question/option/answer parser, subject/chapter heuristics, `hasDiagram` flag, page number tracking
- `biro-backend/app/services/diagram_cropper.py` — OpenCV contour-based diagram crop attached to nearest question
- `biro-backend/app/services/math_pipeline.py` — optional pix2tex (lazy-load, off by default to keep memory low on free tier)
- `biro-backend/app/routers/extract.py` — `POST /api/extract`, `POST /api/extract-answer-key`, `POST /api/crop-region`
- `biro-backend/requirements.txt`, `Dockerfile`, `render.yaml` / `railway.toml`, `README.md` deploy guide

Output JSON matches existing frontend shape (`questionNumber`, `subject`, `chapter`, `question`, `options{A..D}`, `correctAnswer`, `type`, `hasDiagram`, `pdfPageNumber`, plus `diagramImage` base64 when cropped).

### B. Frontend integration

- New `src/lib/biro-backend.ts` client: calls `VITE_BIRO_BACKEND_URL` first; on network failure falls back to the existing `extract-questions` edge function.
- `src/pages/CreateTest.tsx`: route extraction through the new client, show real per-page progress logs, attach returned diagrams to the matching question (by `questionNumber`), persist diagrams in IndexedDB (already wired).
- `src/components/exam/PDFCropTool.tsx`: rewrite the manual crop so the selection rectangle uses the **actual rendered image's bounding rect** (currently uses container coords → wrong crop). Call backend `/api/crop-region` with `{pageNumber, x, y, w, h, scale}` or, when offline, do the crop in-browser with canvas using the corrected coords. Replace currently-broken div-overlay math.
- `src/pages/ExamInterface.tsx`: render `question.diagramImage` (base64) directly under the question text when present, ensuring diagrams appear **below** the question they belong to.
- `.env.example`: add `VITE_BIRO_BACKEND_URL=`.

### C. Bug sweep (small focused fixes)

- Biro-Brain: pin model to `google/gemini-2.5-flash` (the `gemini-3-flash-preview` reference still in `extract-questions` is gated; switch its default to `gemini-2.5-flash` too so the AI fallback path doesn't 404).
- `storage.ts`: ensure answer-key application matches by `questionNumber` (verify, already partially done).
- `ExamInterface.tsx`: confirm autosave uses `useRef` and doesn't reset on every answer change.
- `CreateTest.tsx`: quota check runs **before** any extraction call; show remaining daily/monthly count.
- Move test-creation password + admin passwords fully server-side: ensure no plaintext or hash appears in any frontend bundle (audit `app-settings.ts`, `TestCreationGate.tsx`, `AdminPanel.tsx`). Only the edge function `verify-password` ever sees the secret.
- Add `.env` to `.gitignore` confirmation.

### D. Deploy guide (in `biro-backend/README.md`)

1. Push `biro-backend/` to a new GitHub repo (or subfolder deploy).
2. Render.com → New Web Service → Docker → free tier. Auto-detects `Dockerfile`.
3. Copy the deployed URL → set `VITE_BIRO_BACKEND_URL` in Lovable Cloud env (and Vercel for the GitHub mirror).
4. Done — extraction now runs on Render, 0 AI credits used.

---

## Why this is robust

- **PyMuPDF** handles 90% of JEE PDFs (NTA, Allen, Resonance, Aakash digital PDFs all have selectable text).
- **PaddleOCR** kicks in only for scanned image PDFs — ~92% accuracy, free, no API key.
- **Regex parser** is deterministic: JEE numbering (`Q.1`, `1.`, `(A)…(D)`, `Answer: B`) is stable enough that we don't need an LLM to parse it.
- **OpenCV crop + PyMuPDF image extract** gives real diagrams under each question without AI.
- AI gateway becomes optional → no monthly credit cliff.

---

## Scope NOT included (call out)

- I cannot push to your GitHub `rhin867/Biro-tests` repo directly — I'll add the files in this Lovable project; you copy/push them to GitHub.
- pix2tex math-image → LaTeX is wired but **off by default** (heavy model, ~400MB). Enable with `ENABLE_PIX2TEX=true` env var on the backend once you upgrade Render tier. Until then math stays as plain text + KaTeX rendering of any `$...$` already present.
- Render free tier sleeps after 15min idle → first extraction after sleep takes ~30s cold start. Acceptable for solo use; upgrade to $7/mo for always-on.

---

## Order of work after approval

1. Scaffold `biro-backend/` (all Python files + Dockerfile + README).
2. Add `src/lib/biro-backend.ts` client and wire `CreateTest.tsx`.
3. Rewrite `PDFCropTool.tsx` selection math.
4. Render diagrams under questions in `ExamInterface.tsx`.
5. Pin Gemini model fallback, audit password leakage.
6. Commit. You push `biro-backend/` to GitHub and deploy on Render, then paste the URL into the env var.

Approve and I'll build it.