"""OCR fallback for scanned PDFs using pdf2image + pytesseract (lightweight, no PaddleOCR)."""
from typing import List, Dict


def extract_pages_ocr(pdf_bytes: bytes, dpi: int = 200) -> List[Dict]:
    from pdf2image import convert_from_bytes
    import pytesseract

    images = convert_from_bytes(pdf_bytes, dpi=dpi)
    pages = []
    for i, img in enumerate(images):
        try:
            text = pytesseract.image_to_string(img, lang="eng", config="--psm 6")
        except Exception:
            text = ""
        pages.append({"page_number": i + 1, "text": text})
    return pages
