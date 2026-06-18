"""Detect whether a PDF has selectable text or is scanned (image-only)."""
import fitz  # PyMuPDF


def is_text_pdf(pdf_bytes: bytes, min_chars_per_page: int = 80) -> bool:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    try:
        sample = min(5, doc.page_count)
        total = 0
        for i in range(sample):
            total += len((doc[i].get_text("text") or "").strip())
        avg = total / max(1, sample)
        return avg >= min_chars_per_page
    finally:
        doc.close()
