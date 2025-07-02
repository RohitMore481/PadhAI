import os
from PIL import Image
import pytesseract
from io import BytesIO
import docx2txt
import fitz  # PyMuPDF

# Set tesseract path
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

def extract_text_from_file(filename: str, content: bytes) -> str:
    ext = os.path.splitext(filename)[1].lower()

    if ext in [".jpg", ".jpeg", ".png"]:
        return extract_from_image(content)
    elif ext == ".pdf":
        return extract_from_pdf(content)
    elif ext == ".docx":
        return extract_from_docx(content)
    elif ext == ".txt":
        return content.decode("utf-8", errors="ignore")

    return "Unsupported file type"

def extract_from_image(image_bytes: bytes) -> str:
    image = Image.open(BytesIO(image_bytes))  # ✅ Convert bytes to image
    return pytesseract.image_to_string(image).strip()

def extract_from_pdf(content: bytes) -> str:
    with fitz.open(stream=content, filetype="pdf") as doc:
        text = ""
        for page in doc:
            text += page.get_text()
        return text.strip()

def extract_from_docx(content: bytes) -> str:
    # Save docx content to temp file to use docx2txt
    import tempfile
    with tempfile.NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    text = docx2txt.process(tmp_path)

    os.remove(tmp_path)
    return text.strip()
