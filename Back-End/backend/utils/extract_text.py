import fitz  # PyMuPDF
import docx
import pytesseract
from PIL import Image
import io

def extract_text_from_file(filename: str, content: bytes) -> str:
    ext = filename.lower().split('.')[-1]

    if ext == "pdf":
        return extract_from_pdf(content)
    elif ext in ["docx", "doc"]:
        return extract_from_docx(content)
    elif ext in ["png", "jpg", "jpeg", "webp"]:
        return extract_from_image(content)
    elif ext == "txt":
        return content.decode("utf-8")
    else:
        return "Unsupported file type."

def extract_from_pdf(content: bytes) -> str:
    text = ""
    with fitz.open(stream=content, filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text.strip()

def extract_from_docx(content: bytes) -> str:
    text = ""
    f = io.BytesIO(content)
    doc = docx.Document(f)
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text.strip()

def extract_from_image(content: bytes) -> str:
    image = Image.open(io.BytesIO(content))
    return pytesseract.image_to_string(image).strip()
