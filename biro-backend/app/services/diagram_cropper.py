"""Render PDF page to image; attach diagram crops to questions that need them."""
from typing import List, Dict, Optional
from io import BytesIO
import base64
import fitz


def _render_page_png(doc: fitz.Document, page_index: int, scale: float = 2.0) -> bytes:
    mat = fitz.Matrix(scale, scale)
    pix = doc[page_index].get_pixmap(matrix=mat, alpha=False)
    return pix.tobytes("png")


def attach_diagram_crops(pdf_bytes: bytes, questions: List[Dict], scale: float = 1.8) -> List[Dict]:
    """For each question with hasDiagram=True, attach a band crop of its page."""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        # Group by page
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
            # Slice page into N horizontal bands, one per question with diagram
            from PIL import Image
            img = Image.open(BytesIO(png))
            w, h = img.size
            n = max(1, len(idxs))
            band_h = h // n
            for i, q_idx in enumerate(idxs):
                top = max(0, i * band_h - int(band_h * 0.05))
                bottom = min(h, (i + 1) * band_h + int(band_h * 0.15))
                crop = img.crop((int(w * 0.03), top, int(w * 0.97), bottom))
                buf = BytesIO()
                crop.save(buf, format="JPEG", quality=82)
                b64 = base64.b64encode(buf.getvalue()).decode("ascii")
                questions[q_idx]["diagramImage"] = f"data:image/jpeg;base64,{b64}"
        return questions
    finally:
        doc.close()


def crop_region(pdf_bytes: bytes, page_number: int, x: float, y: float,
                width: float, height: float, scale: float = 2.0) -> str:
    """Crop a rectangle (in rendered-image pixel coords at given scale) from a page → data URL."""
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
