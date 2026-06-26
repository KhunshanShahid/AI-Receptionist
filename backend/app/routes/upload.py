from fastapi import APIRouter, UploadFile, File
from pypdf import PdfReader
import uuid

from app.services.vector_store import add_documents, clear_collection

router = APIRouter()


def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start = end - overlap

    return chunks


@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    doc_id = str(uuid.uuid4())

    reader = PdfReader(file.file)

    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""

    chunks = chunk_text(text)

    clear_collection()
    add_documents(doc_id, chunks, file.filename)

    return {
        "doc_id": doc_id,
        "chunks_stored": len(chunks)
    }