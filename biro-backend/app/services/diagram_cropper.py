"""Render PDF page to image; attach diagram crops with smarter bands."""
from typing import List, Dict
from io import BytesIO
import base64
import fitz


def _render_page_png(doc: fitz.Document, page_index: int, scale: float = 2.0) -> bytes:
    mat = fitz.Matrix(scale, scale)
    pix = doc[page_index].get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("png")


def attach_diagram_crops(pdf_bytes: bytes, questions: List[Dict], scale: float = 1.8) -> List[Dict]:
    """For each question with hasDiagram=True, attach a smart crop of its page."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        page_to_qs: Dict[int, List[int]] = {}
        for idx, q in enumerate(questions):
            pn = q.get("pdfPageNumber")
            if not pn or not q.get("hasDiagram"):
                continue
            page_to_qs.setdefault(pn, []).append(idx)

        page_cache: Dict[int, bytes] = {}
        for pn, idxs in page_to_qs.items():
            if pn < 1 or pn > doc.page_count:
                continue
            if pn not in page_cache:
                page_cache[pn] = _render_page_png(doc, pn - 1, scale=scale)
            png = page_cache[pn]

            from PIL import Image
            img = Image.open(BytesIO(png))
            w, h = img.size
            n = max(1, len(idxs))

            for i, q_idx in enumerate(idxs):
                if n == 1:
                    top, bottom = 0, h
                elif n == 2:
                    # Top-heavy split: diagrams tend to be in the top ~60% of a JEE page.
                    if i == 0:
                        top, bottom = 0, int(h * 0.62)
                    else:
                        top, bottom = int(h * 0.55), h
                else:
                    band = h // n
                    top = max(0, i * band - int(band * 0.12))
                    bottom = min(h, (i + 1) * band + int(band * 0.18))

                top = max(0, top - 20)
                bottom = min(h, bottom + 20)

                crop = img.crop((int(w * 0.02), top, int(w * 0.98), bottom))
                buf = BytesIO()
                crop.save(buf, format="JPEG", quality=85)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                questions[q_idx]["diagramImage"] = f"data:image/jpeg;base64,{b64}"
        return questions
    finally:
        doc.close()


def crop_region(pdf_bytes: bytes, page_number: int, x: float, y: float,
                width: float, height: float, scale: float = 2.0) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        if page_number < 1 or page_number > doc.page_count:
            raise ValueError("page out of range")
        png = _render_page_png(doc, page_number - 1, scale=scale)
        from PIL import Image
        img = Image.open(BytesIO(png))
        W, H = img.size
        left = max(0, int(x))
        top = max(0, int(y))
        right = min(W, int(x + width))
        bottom = min(H, int(y + height))
        if right - left < 5 or bottom - top < 5:
            raise ValueError("region too small")
        crop = img.crop((left, top, right, bottom))
        buf = BytesIO()
        crop.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")
    finally:
        doc.close()
