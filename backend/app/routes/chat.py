from fastapi import APIRouter
from pydantic import BaseModel

from app.services.vector_store import search
from app.services.llm import generate_answer
from app.services.query_cleaner import clean_query
from app.services.logger import log_conversation

router = APIRouter()


class HistoryMessage(BaseModel):
    role: str
    text: str

class ChatRequest(BaseModel):
    query: str
    history: list[HistoryMessage] = []


@router.post("/chat")
def chat(request: ChatRequest):

    results = search(clean_query(request.query))

    docs      = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    filtered = []
    for doc, dist, meta in zip(docs, distances, metadatas):
        if (1 - dist) > 0.1:
            filtered.append({"text": doc, "filename": meta.get("filename", "document")})

    if not filtered:
        return {
            "question": request.query,
            "answer": "I don't have enough relevant information in the documents.",
            "sources": []
        }

    context = "\n\n".join(item["text"] for item in filtered[:2])
    history = [{"role": m.role, "text": m.text} for m in request.history[-6:]]
    answer  = generate_answer(context, request.query, history or None)

    if not answer or not answer.strip():
        answer = "I couldn't generate a proper answer from the provided documents."

    log_conversation(request.query, answer)

    sources = [
        {
            "document": item["filename"],
            "snippet":  item["text"][:180].strip() + "…"
        }
        for item in filtered[:2]
    ]

    return {
        "question": request.query,
        "answer":   answer,
        "sources":  sources
    }