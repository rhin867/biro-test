# Deploy Biro Backend — Step by Step (No GitHub experience required)

This is the Python service that converts PDF → CBT JSON **without using any AI credits**. After deploying, set one env var in Lovable and the app stops needing AI for extraction.

---

## Option A — Render.com (recommended, free tier works)

### 1. Get the code onto GitHub

1. Go to **https://github.com/new**
2. Repo name: `biro-backend` → Public → **Create repository**.
3. On the next page, copy the URL — looks like `https://github.com/<your-user>/biro-backend.git`.
4. On your computer, open a terminal and run:
   ```bash
   git clone https://github.com/<your-user>/biro-backend.git
   cd biro-backend
   ```
   (Or if you don't want to use the terminal: open the repo on GitHub → **Add file → Upload files** → drag every file from this `biro-backend/` folder in.)
5. Copy these files into the folder (exact same structure as this `biro-backend/` directory in your Lovable project):
   ```
   Dockerfile
   requirements.txt
   render.yaml
   railway.toml
   README.md
   app/__init__.py
   app/main.py
   app/routers/__init__.py
   app/routers/extract.py
   app/services/__init__.py
   app/services/pdf_detector.py
   app/services/text_pipeline.py
   app/services/ocr_pipeline.py
   app/services/parser.py
   app/services/diagram_cropper.py
   ```
6. Commit + push (skip if you uploaded via the web UI):
   ```bash
   git add .
   git commit -m "Initial Biro backend"
   git push
   ```

> **How to copy files out of Lovable:** in the Lovable file tree, open each file under `biro-backend/`, click the **⋯** menu → **Download** (or just select-all + copy the contents into a new file on your computer with the same name).

### 2. Deploy on Render

1. Go to **https://render.com** → sign up with GitHub.
2. Top right → **New +** → **Web Service**.
3. **Connect** your `biro-backend` repo.
4. Settings:
   - **Name:** `biro-backend` (any)
   - **Region:** closest to you
   - **Branch:** `main`
   - **Runtime:** **Docker** (Render auto-detects the `Dockerfile`)
   - **Instance Type:** **Free**
5. Click **Create Web Service**. First build takes ~5–8 minutes (installs PyMuPDF, PaddleOCR).
6. When it's live you'll see a URL like `https://biro-backend-xxxx.onrender.com`. **Copy this URL.**
7. Test it: open `https://biro-backend-xxxx.onrender.com/health` in your browser → must return `{"ok": true, "service": "biro-backend"}`.

### 3. Tell Lovable about the URL — two ways

**Quick (no redeploy needed, recommended to test first):**
- Open your Lovable preview in the browser.
- Open DevTools console (F12).
- Run:
  ```js
  localStorage.setItem('biro_backend_url', 'https://biro-backend-xxxx.onrender.com')
  ```
- Refresh. Create a test from PDF — you should see *"Extracting via Biro backend (0 AI credits)…"*.

**Permanent (for all users of your app):**
- In Lovable project root, edit `.env` and add:
  ```
  VITE_BIRO_BACKEND_URL=https://biro-backend-xxxx.onrender.com
  ```
- Publish. Done.

> **Heads up about the free tier:** Render free dynos sleep after 15 min of no traffic. First request after a sleep takes ~30 s (cold start). If that bothers you, upgrade to Starter ($7/mo) or use Railway (Option B).

---

## Option B — Railway.app (faster cold start, $5 free credit/month)

1. **https://railway.app** → sign up with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick `biro-backend`.
3. Railway auto-detects the Dockerfile. Wait ~5 min.
4. Settings → **Networking** → **Generate Domain**. Copy the URL.
5. Test `/health` like above.
6. Set `biro_backend_url` in Lovable using either method from step 3 above.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| Toast says *"Using AI extraction (no self-hosted backend configured)"* | Backend URL isn't reaching the app. Re-run the `localStorage.setItem(...)` command and refresh. |
| `/health` returns 404 or HTML | Wrong URL — make sure you copied the **service URL**, not the dashboard URL. |
| Toast says *"Backend unavailable — falling back to AI extraction…"* | Backend is asleep (Render free) or crashed. First request wakes it; check Render → Logs for errors. |
| `paddleocr` install fails | Bump Render instance to **Starter** (free tier has 512 MB RAM; PaddleOCR install needs more). |
| Want to skip OCR entirely (lighter) | Edit `requirements.txt`, remove `paddleocr` and `paddlepaddle`. The backend will still handle digital PDFs perfectly; scanned PDFs will return empty. |

---

## What the backend does (zero AI credits path)

```
PDF → PyMuPDF text extract → Regex parser (Q.1 / (A)/(B) / Answer:) → JSON
              ↓ if scanned
        PaddleOCR → same parser
              ↓
        OpenCV/PyMuPDF crops diagrams → base64 → frontend IndexedDB
```

Only when this service is **down or unreachable** does the frontend fall back to the Lovable AI gateway.
