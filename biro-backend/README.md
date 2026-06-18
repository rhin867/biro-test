# Biro Backend — Zero-AI-Credit PDF → CBT Extractor

FastAPI service that converts JEE/NEET question PDFs into CBT-ready JSON using **PyMuPDF + PaddleOCR + Regex** — no Gemini / OpenAI calls in the default path. Lovable AI is used only as a soft fallback by the frontend when this service is unreachable.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| GET  | `/health` | — | `{ok: true}` |
| POST | `/api/extract` | multipart `file=@paper.pdf` *or* JSON `{pdfBase64, mimeType}` | `{examTitle, questions[], totalExtracted, subjectCounts}` |
| POST | `/api/extract-answer-key` | same as `/extract` | `{answerKey: {"1":"A", ...}}` |
| POST | `/api/crop-region` | JSON `{pdfBase64, pageNumber, x, y, width, height, scale}` (coords in PDF points) | `{imageBase64}` |

Output question shape matches the existing frontend:

```json
{
  "questionNumber": 1,
  "subject": "Physics",
  "chapter": "Mechanics",
  "question": "A block of mass ...",
  "options": {"A":"...","B":"...","C":"...","D":"..."},
  "correctAnswer": "B",
  "type": "MCQ",
  "hasDiagram": true,
  "pdfPageNumber": 1,
  "diagramImage": "data:image/png;base64,..."
}
```

## How it works

```
PDF in
  │
  ├─ PyMuPDF: try extract selectable text per page
  │     ├─ enough text → TEXT pipeline
  │     └─ scanned     → OCR pipeline (pdf2image + PaddleOCR)
  │
  ├─ Regex parser: detect Q. numbering, (A)–(D) options, "Answer: X" key,
  │   tag subject/chapter heuristically, flag hasDiagram from keywords
  │
  └─ Diagram cropper: PyMuPDF embedded images; if none, OpenCV contour
      detection on the page raster, attached to the nearest question on
      the same page
```

`pix2tex` (math → LaTeX) hook is included but **disabled by default** to keep memory under the free-tier limit. Enable with `ENABLE_PIX2TEX=true`.

## Local run

```bash
cd biro-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Deploy on Render (free)

1. Push this `biro-backend/` folder to a GitHub repo (or use the existing repo and set Root Directory = `biro-backend`).
2. Render.com → **New +** → **Web Service** → connect repo → **Runtime: Docker** → Free plan.
3. After deploy, copy the URL (e.g. `https://biro-backend.onrender.com`).
4. In your Lovable project, set env var **`VITE_BIRO_BACKEND_URL`** to that URL.
5. Redeploy frontend. Done — extraction now runs here, 0 AI credits used.

> Free tier sleeps after 15 min idle → first request after sleep ~30 s cold start. Upgrade to Starter ($7/mo) for always-on.

## Deploy on Railway

Same idea — `railway up` from the folder, then set `VITE_BIRO_BACKEND_URL`.
