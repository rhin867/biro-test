This is a large multi-part request. I'll ship it in priority order across a few turns. Here's the plan so you can confirm before I start coding.

## Priority 1 — Manual cropping (make it PDF2CBT-grade)

**Problems seen in your screenshots:**

- Metadata bar eats half the viewport → PDF area too small on mobile.
- No way to type a custom subject/section (only fixed dropdowns).
- No "Add question" button separate from the crop action.
- After test creation, no way to re-open the crop tool to fix mistakes or add diagrams.
- And also add zooming option when cropping so that que area can crop easially,because in one page if there 8-10 que then user can't crop que easily

**Fixes in `src/components/exam/PDFCropTool.tsx`:**

1. Collapse metadata bar into a compact single row + "More" popover; PDF area gets ~80% of dialog height.
2. Replace fixed Subject/Section selects with **combobox + free-text** (type "Section A", "Biology", etc.).
3. Explicit **"+ Add as Question"** button (in addition to drag→crop) that opens a question shell where the user pastes text or uploads an image from gallery.
4. **Per-crop editor**: click any crop → edit text (LaTeX), swap image, add extra diagram image from gallery, reorder, delete.
5. Gallery upload button inside each crop card (accepts JPG/PNG, stored as data URL).

## Priority 2 — Post-creation review & edit

New page `src/pages/TestReview.tsx` (accessible from MyTests → "Edit"):

- List of all questions with thumbnail, text, options, answer, type, subject.
- Inline edit for every field. Re-crop button opens `PDFCropTool` scoped to a single question.
- "Add extra diagram" per question (gallery upload).
- Save writes back to the same test record — no re-extraction needed.
  &nbsp;

## Priority 3 — Autocrop that actually crops (not just OCR text)

Current backend returns plain text blocks, which is why questions render as broken lines like `E = log / p / 3 / √`. Fix in `biro-backend/app/services/`:

- New `question_block_detector.py`: for each page, find y-coordinates of tokens matching `^\s*(\d+)\.` (question starts) and `^\s*\(?[a-dA-D1-4]\)` (option starts). Slice the page image between consecutive question starts → one cropped image per question.
- For Integer/Numerical (no options detected), crop from `N.` to next `N+1.`.
- Return `questionImage: data:image/jpeg;base64,...` alongside OCR'd text so the frontend can show the **image** (source of truth) and keep text only as a searchable fallback.
- Frontend `QuestionDisplay.tsx` prefers `questionImage` when present, falls back to LaTeX text.

## Priority 4 — Multi-Gemini-key rotation for autocrop

- Settings page: users can save up to **4 Gemini keys** in localStorage (encrypted with a user-chosen passphrase using WebCrypto AES-GCM — never plaintext, never sent to server).
- Autocrop flow tries key #1 → on quota/error → key #2 → … → coding backend fallback.
- Rotate button re-orders keys; "Test key" button pings Gemini with 1 token.
- Keys are read only inside the extraction call and cleared from memory after; no logging.

## Priority 5 — Real PDF viewer in test panel

- `ExamInterface.tsx` currently shows cropped page images. Store the original PDF (base64) with the test record.
- Add a floating "📄 View Original PDF" button that opens the full PDF in a `<iframe>` overlay (uses pdf.js viewer already bundled via `pdfjs-dist`).
- Per-question "View in PDF" jumps to that page.

## Priority 6 — Lovable-AI crop cutting text

Root cause: `attach_diagram_crops` uses fixed 0.62/0.55 bands. Replace with content-aware bands:

- Detect whitespace rows in the rendered page (rows where >98% of pixels are near-white).
- Snap crop top/bottom to nearest whitespace row → no more mid-line cuts.
- Add 40px padding top, 60px bottom (options usually sit below).

## Priority 7 — "I LOVE YOU BIRO" confirmation phrase

- Owner/admin sets a confirmation phrase in Admin Panel (default: `I LOVE YOU BIRO`), stored in `app_settings`.
- Required at three points, toggleable per-action from admin:
  - Final "Publish test" step
  - "Submit test" (end of exam)
  - "Save & share" export
- Wrong phrase → toast + block. Admin can change or disable each check.

## Priority 8 — Backend hardening

- Dockerfile: switch pip to venv to silence the root-user warning.
- Add `/warmup` cron-friendly endpoint; frontend pings on app load AND on route change to `/create-test`.

## Technical section (for reference)

- Storage of PDF base64 grows `localStorage` fast → move to IndexedDB (`idb-keyval`) keyed by testId; keep only metadata in localStorage.
- Manual-crop free-text subject: extend `CropSubject` type to `string`, but keep color mapping for the three canonical ones.
- Multi-key encryption: `crypto.subtle.deriveKey(PBKDF2, 250k iters)` → AES-GCM; salt+iv stored alongside ciphertext.
- Question-block detector: PyMuPDF `page.get_text("dict")` gives per-span bboxes; group by y, cluster into question blocks by regex on leading text.
- Real PDF in exam: `URL.createObjectURL(new Blob([bytes], {type:'application/pdf'}))` → `<iframe>`; revoke on unmount.

## Execution order

I'll ship in 3 turns to keep each change reviewable:

1. **Turn A** (this next reply): P1 manual-crop overhaul + P2 review page skeleton + P7 confirmation-phrase infra.
2. **Turn B**: P3 question-block detector (backend) + P5 real PDF viewer + P6 content-aware bands.
3. **Turn C**: P4 multi-key rotation + P8 Dockerfile venv + polish.

Confirm and I'll start Turn A. If you want a different order (e.g. autocrop first), tell me now.