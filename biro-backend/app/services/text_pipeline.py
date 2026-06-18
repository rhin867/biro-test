"""Extract per-page text from a digital PDF using PyMuPDF."""
from typing import List, Dict
import fitz


def extract_pages_text(pdf_bytes: bytes) -> List[Dict]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        pages = []
        for i in range(doc.page_count):
            page = doc[i]
            text = page.get_text("text") or ""
            pages.append({"page_number": i + 1, "text": text})
        return pages
    finally:
        doc.close()
