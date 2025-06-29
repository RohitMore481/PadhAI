from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from utils.extract_text import extract_text_from_file

app = FastAPI()

# Allow all origins (change in production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    contents = await file.read()
    text = extract_text_from_file(file.filename, contents)
    return {"filename": file.filename, "text": text}
