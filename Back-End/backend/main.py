from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PyPDF2 import PdfReader
import docx2txt, io, json, requests, pytesseract
from PIL import Image

app = FastAPI()

# ---------------- CORS (React dev server) ----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- FILE UPLOAD: extract text -------------
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    blob = await file.read()
    text = ""

    if file.content_type == "application/pdf":
        reader = PdfReader(io.BytesIO(blob))
        for p in reader.pages:
            text += (p.extract_text() or "") + "\n"

    elif file.content_type in {
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }:
        tmp = "tmp.docx"
        open(tmp, "wb").write(blob)
        text = docx2txt.process(tmp)

    elif file.content_type.startswith("image/"):
        img = Image.open(io.BytesIO(blob))
        text = pytesseract.image_to_string(img)

    elif file.content_type == "text/plain":
        text = blob.decode("utf-8")

    return {"text": text.strip()}


# ---------------- STREAM NOTES VIA LLAMA 3 ---------------
def llama3_stream(prompt: str):
    url = "http://localhost:11434/api/generate"
    payload = {"model": "llama3", "prompt": prompt, "stream": True}
    r = requests.post(url, json=payload, stream=True)

    for line in r.iter_lines():
        if line:
            try:
                data = json.loads(line.decode())
                token = data.get("response", "")
                if token:
                    yield token
            except json.JSONDecodeError:
                continue


@app.post("/generate_notes_stream")
async def generate_notes_stream(req: Request):
    data = await req.json()
    syllabus = data.get("text", "")
    mode = data.get("mode", "midsem")  # ✅ default to midsem if not provided

    if not syllabus:
        return StreamingResponse(iter(["❌ No text provided"]), media_type="text/plain")

    # ✅ Custom prompts based on mode
    mode_prompts = {
        "midsem": "Create short, precise revision notes for midsem based on the following syllabus:\n\n",
        "endsem": "Generate detailed, structured study notes for endsem from this syllabus:\n\n",
        "viva": "Generate question-answer style preparation content for viva based on this syllabus:\n\n"
    }

    prompt_prefix = mode_prompts.get(mode, "Generate notes based on this syllabus:\n\n")
    prompt = prompt_prefix + syllabus

    return StreamingResponse(llama3_stream(prompt), media_type="text/plain")
