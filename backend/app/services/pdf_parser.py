import io
from pypdf import PdfReader
from typing import Tuple

def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, int]:
    """
    Extract raw text content from uploaded PDF bytes.
    Returns (extracted_text, total_pages).
    """
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            pages_text.append(f"--- Page {i + 1} ---\n{text}")
        full_text = "\n\n".join(pages_text).strip()
        return full_text, len(reader.pages)
    except Exception as e:
        raise ValueError(f"Failed to process PDF file: {str(e)}")
