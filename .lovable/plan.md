# Biro-Test — Coding-based PDF→CBT + 3-Mode Creation Plan

## Current state (what I verified)

- `src/lib/biro-backend.ts` hardcodes `https://biro-backend.onrender.com`. There is no `.env` entry and no `localStorage` override anymore. If the URL is wrong / service down, every PDF silently falls back to Lovable AI and burns credits.
- No 90s timeout on backend fetch → cold-start hangs.
- `parser.py` regex misses NTA `(A)` option format on many papers.
- `ocr_pipeline.py` uses PaddleOCR → OOM on Render free tier.
- `diagram_cropper.py` uses naive equal horizontal bands → cuts questions mid-text (the "bad crop" case in your diagram).
- `ExamTimer` initialTime resets every tick → color warnings never fire.
- `QuestionTimer` never mounted → `timeSpent` always 0 → analytics broken.
- `storage.ts` swallows quota errors silently.
- `CreateTest.tsx` "Create Test" button is not debounced → double-tap creates two tests and wastes daily quota.
- `AnswerKeyInput.tsx` still calls Lovable AI edge fn even when backend URL is set.
- Admin panel has no UI to manage the "AI-activation password" separately from other passwords.
- No per-question "type" tag (MCQ / Integer / Numerical / Passage) surfaced in the manual crop tool.
- Original PDF preview in question palette shows the cropped image, not the source page.

---

## Plan (build order)

### 1. Backend URL — proper resolution + timeout

- `src/lib/biro-backend.ts`
  - `resolveBackendUrl()`: read `import.meta.env.VITE_BIRO_BACKEND_URL`, fall back to `localStorage.getItem('biro_backend_url')`, fall back to `undefined` (no hardcode).
  - Wrap `callBackend` with `AbortController` + 90s timeout so cold-starts don't hang.
  - Add `BIRO_BACKEND_STATUS` export used by UI to show "coding mode ready / unavailable".
- `.env` — add `VITE_BIRO_BACKEND_URL=` line (empty placeholder, user fills after Render deploy).
- `.env.example` — new file documenting all vars.
- `.gitignore` — add `.env`, `.env.local`, `.env.production`.

### 2. Python backend fixes (biro-backend/)

- `requirements.txt` — drop PaddleOCR/paddlepaddle, add `pytesseract`.
- `Dockerfile` — add `tesseract-ocr`, `tesseract-ocr-eng` apt packages.
- `app/services/ocr_pipeline.py` — rewrite to pdf2image + pytesseract (fits in 512 MB).
- `app/services/parser.py` — new option regex handling `(A)` / `A)` / `A.` / `(A).`, false-positive filter that requires options within 800 chars of a question start, per-question type inference (`MCQ` / `Numerical` / `Integer` / `AssertionReason`).
- `app/services/diagram_cropper.py` — replace equal-band split with contour/whitespace detection: render page, find horizontal whitespace bands, snap each diagram-flagged question to the band spanning from just above its Q-number line to just before the next Q-number line. Fallback = top-heavy 65/35 split only when there are exactly 2 questions on a page.
- `app/routers/extract.py` — accept `pdfBase64` in JSON body (already partially done), also expose `/api/extract-answer-key` and `/api/crop-region` — verify all three respond to CORS from the app origin.

### 3. Three-mode test creation UI (`src/pages/CreateTest.tsx`)

Add a mode selector on the Upload step with three cards matching your diagram:

```text
┌──────────────┬───────────────────┬─────────────────────┐
│ A. Manual    │ B. Auto-Crop      │ C. Lovable AI       │
│ crop         │ (code + Gemini)   │ (OCR + LaTeX)       │
│ No password  │ Admin AI-pw       │ Admin AI-pw         │
│ 0 credits    │ 0 credits or      │ Lovable credits     │
│              │ user's Gemini key │                     │
└──────────────┴───────────────────┴─────────────────────┘
```

Behavior per mode:

- **Manual** — go straight to `PDFCropTool`. User draws each crop AND picks a type dropdown per crop (MCQ / Numerical / Integer / Passage / Assertion-Reason) and subject/section tag. Creates blank `Question[]` with `diagramImage` = crop. 0 credits.
- **Auto-Crop** — call Python backend first. If backend errors OR returns fewer questions than expected AND user has a Gemini key saved in Settings, retry using their key (routed through `extract-questions` edge fn with `userApiKey` param — Lovable AI is NOT called in this branch, the edge fn already supports BYO key). If no user key, surface a toast telling them to add one in Settings.
- **Lovable AI** — current path: `extract-questions` edge fn with no user key (uses `LOVABLE_API_KEY`). Requires admin AI-activation password.

Password check runs in a `<TestCreationGate>` dialog before mode B or C actually fires.

### 4. Admin panel — password management (`src/pages/AdminPanel.tsx`)

Split into three named passwords in `app_settings`:

- `pw_ai_activation` — needed for modes B and C.
- `pw_test_creation` — optional gate on creating any test.
- `pw_public_publish` — needed to publish a test publicly.

Add UI to view/change each independently. All checked server-side via existing `verify-password` edge fn (extend it to take `{ scope, password }`).

### 5. Race-safe Create button (`CreateTest.tsx`)

- `useRef<boolean>(false)` `creatingRef` flag.
- Button `disabled={creating}` AND handler returns early if `creatingRef.current === true`.
- Wrap the entire "log-test-creation → save test → navigate" chain in try/finally that only clears the flag after navigation is committed.

### 6. Question palette shows source PDF page, not crop (`ExamInterface.tsx` / `QuestionPalette.tsx`)

- On question object, keep both `diagramImage` (crop) AND `pdfPageImage` (full rendered page at low DPI, produced by backend during extraction).
- Palette "View original PDF" button opens a dialog with `pdfPageImage` for the current question.
- For manual-crop tests, `pdfPageImage` = the full page the user cropped from (we already have the pdf.js page canvas — save it once when crop is drawn).

### 7. Timer + timeSpent fixes

- `ExamTimer.tsx` — accept `initialTime` (fixed total) and `currentRemaining` (live), only sync from parent on first mount, use `initialTime` as denominator in `getTimerClass`.
- `ExamInterface.tsx` — mount `<QuestionTimer key={q.id} …>` above `<QuestionDisplay>` and pipe `seconds` into `updateAttemptData({ timeSpent: seconds })`.

### 8. Storage full warning (`src/lib/storage.ts` + `App.tsx`)

- `setItem` catches `QuotaExceededError`, dispatches `biro:storage-full` CustomEvent.
- `App.tsx` listens once and shows a `sonner` toast pointing to Settings → Export.

### 9. Answer key extraction routed through backend (`AnswerKeyInput.tsx`)

- If backend URL resolves → `POST /api/extract-answer-key` (0 credits).
- Else → existing Lovable AI edge fn with `extractAnswerKeyOnly: true` and optional `userApiKey`.

---

## Technical notes / files touched

**Frontend**

- `.env`, `.env.example`, `.gitignore`
- `src/lib/biro-backend.ts`
- `src/lib/storage.ts`
- `src/App.tsx` (storage-full listener)
- `src/pages/CreateTest.tsx` (3-mode UI + race-safe button + type/section tagging)
- `src/pages/AdminPanel.tsx` (3 password fields)
- `src/pages/ExamInterface.tsx` (QuestionTimer wiring + palette source-PDF dialog)
- `src/components/exam/ExamTimer.tsx` (initialTime fix)
- `src/components/exam/PDFCropTool.tsx` (per-crop type + subject/section dropdown)
- `src/components/exam/AnswerKeyInput.tsx` (backend route)
- `src/components/exam/QuestionPalette.tsx` (source-PDF button)

**Backend**

- `biro-backend/requirements.txt`
- `biro-backend/Dockerfile`
- `biro-backend/app/services/ocr_pipeline.py`
- `biro-backend/app/services/parser.py`
- `biro-backend/app/services/diagram_cropper.py`
- `biro-backend/app/routers/extract.py` (CORS + response shape)

**Cloud (edge fns + migration)**

- `supabase/functions/verify-password/index.ts` — accept `scope`.
- `supabase/migrations/*.sql` — add `pw_ai_activation`, `pw_test_creation`, `pw_public_publish` columns to `app_settings` (or JSON blob), plus GRANTs.

---

## What I need from you before I build

1. **Render backend URL** — the exact `https://biro-backend-xxxx.onrender.com` URL so I can bake it into `.env`. If you don't have it yet, I'll leave `VITE_BIRO_BACKEND_URL` blank and you can set it via DevTools `localStorage.setItem('biro_backend_url', '<url>')` after deploy.
2. Confirm the **three password scopes** above are the split you want (AI-activation / test-creation / public-publish), or list the exact scopes you want instead.
3. Confirm **question type dropdown** options for the manual crop tool: MCQ, Numerical, Integer, Passage, Assertion-Reason — add/remove any?

Reply with the Render URL (or "leave blank") and answers to 2/3, and I'll implement all 9 sections in one build pass.

[https://biro-backend.onrender.com](https://biro-backend.onrender.com)

If it is biro backend url then pls set it(because i cant)

2. Yes i want three password...
3. Keep all these question types:MCQ, Numerical, Integer, Passage, Assertion-Reason,and also subject selection nd section selection(like maths/phy/chem subject have 2-3 etc sections)