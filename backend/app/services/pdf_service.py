import io
from pypdf import PdfReader

class PDFService:
    @staticmethod
    def extract_text_from_bytes(file_bytes: bytes) -> str:
        try:
            pdf_file = io.BytesIO(file_bytes)
            reader = PdfReader(pdf_file)
            extracted_text = []

            for page_index, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    extracted_text.append(f"--- Page {page_index + 1} ---\n{page_text.strip()}")

            return "\n\n".join(extracted_text)
        except Exception as e:
            print(f"Error extracting PDF text: {e}")
            return ""

pdf_service = PDFService()
