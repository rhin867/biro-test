"""OCR fallback for scanned PDFs using pdf2image + PaddleOCR (lazy-loaded)."""
from typing import List, Dict
from io import BytesIO

_ocr_engine = None


def _get_engine():
    global _ocr_engine
    if _ocr_engine is None:
        from paddleocr import PaddleOCR  # heavy import — only when needed
        _ocr_engine = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    return _ocr_engine


def extract_pages_ocr(pdf_bytes: bytes, dpi: int = 200) -> List[Dict]:
    from pdf2image import convert_from_bytes
    images = convert_from_bytes(pdf_bytes, dpi=dpi)
    engine = _get_engine()
    pages = []
    for i, img in enumerate(images):
        import numpy as np
        arr = np.array(img)
        result = engine.ocr(arr, cls=True)
        lines = []
        if result and result[0]:
            for line in result[0]:
                txt = line[1][0] if line and len(line) > 1 else ""
                if txt:
                    lines.append(txt)
        pages.append({"page_number": i + 1, "text": "\n".join(lines)})
    return pages
