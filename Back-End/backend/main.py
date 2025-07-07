from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List
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

# ========================================================
# 0.  SHARED OLLAMA HELPERS
# ========================================================
OLLAMA_URL = "http://localhost:11434/api/generate"  # Ollama REST endpoint
MODEL_NAME = "llama3"                               # your local model name

def llama3_stream(prompt: str):
    """Yield tokens from Ollama (stream=True)."""
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": True}
    r = requests.post(OLLAMA_URL, json=payload, stream=True)
    for line in r.iter_lines():
        if line:
            try:
                data = json.loads(line.decode())
                token = data.get("response", "")
                if token:
                    yield token
            except json.JSONDecodeError:
                continue

def llama3_one_shot(prompt: str) -> str:
    """Return full response in one go (stream=False)."""
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
    r = requests.post(OLLAMA_URL, json=payload, timeout=120)
    r.raise_for_status()
    return r.json().get("response", "")

# ========================================================
# 1.  FILE UPLOAD & TEXT EXTRACTION
# ========================================================
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Extract raw text from pdf, docx, image, or txt."""
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

# ========================================================
# 2.  TOPIC‑WISE & QUESTION MODELS
# ========================================================
class SyllabusPayload(BaseModel):
    text: str

class TopicRequest(BaseModel):
    topic: str
    mode: str = "midsem"

class QuestionRequest(BaseModel):
    topic: str
    count: int
    mode: str = "midsem"

# ========================================================
# 3.  SPLIT TOPICS
# ========================================================
@app.post("/split_topics")
async def split_topics(payload: SyllabusPayload):
    """Return non‑blank lines as topics."""
    topics: List[str] = [ln.strip() for ln in payload.text.splitlines() if ln.strip()]
    return {"topics": topics}

MODE_PROMPTS = {
    "midsem": "Create short, precise revision notes for midsem based on this topic:\n\n",
    "endsem": "Generate detailed, structured study notes for endsem on this topic:\n\n",
    "viva":   "Generate Q‑A style preparation notes for viva on this topic:\n\n",
}

# ========================================================
# 4.  NOTE GENERATION  (single & streaming)
# ========================================================
@app.post("/generate_notes")
async def generate_single_topic(req: TopicRequest):
    """Non‑streaming single‑topic notes."""
    prefix = MODE_PROMPTS.get(req.mode, MODE_PROMPTS["midsem"])
    prompt = prefix + req.topic
    notes = llama3_one_shot(prompt)
    return {"content": notes}

@app.post("/generate_notes_stream")
async def generate_notes_stream(req: Request):
    """Stream notes for {topic} OR whole {text} (syllabus)."""
    data = await req.json()
    mode  = data.get("mode", "midsem")
    topic = data.get("topic")
    text  = data.get("text")

    prefix = MODE_PROMPTS.get(mode, MODE_PROMPTS["midsem"])
    prompt = prefix + (topic or text or "")
    if not (topic or text):
        return StreamingResponse(iter(["❌ No topic or text provided"]), media_type="text/plain")

    return StreamingResponse(llama3_stream(prompt), media_type="text/plain")

# ========================================================
# 5.  QUESTION GENERATION
# ========================================================
# 5a.  STREAMING version (optional)
@app.post("/generate_questions_stream")
async def generate_questions_stream(req: QuestionRequest):
    prefix = f"Generate {req.count} exam‑style questions on this topic for {req.mode} preparation:\n\n"
    prompt = prefix + req.topic
    return StreamingResponse(llama3_stream(prompt), media_type="text/plain")

# 5b.  NON‑STREAMING version (used by React)
@app.post("/generate_questions")
async def generate_questions(req: QuestionRequest
):
    prefix = f"Generate {req.count} exam‑style questions on this topic for {req.mode} preparation:\n\n"
    prompt = prefix + req.topic
    questions_text = llama3_one_shot(prompt)

    # Split into list by newlines & remove empties
    questions_list = [q.strip("-• ").strip() for q in questions_text.splitlines() if q.strip()]
    return {"questions": questions_list}
