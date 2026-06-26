from fastapi import APIRouter
from app.services.vector_store import collection, model

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Server is running"
    }

@router.get("/debug")
def debug(q: str = "what are your hours"):
    count = collection.count()
    if count == 0:
        return {"documents_in_db": 0, "problem": "ChromaDB is empty — re-upload your PDF"}

    embedding = model.encode([q]).tolist()
    results = collection.query(
        query_embeddings=embedding,
        n_results=min(5, count),
        include=["documents", "distances"]
    )
    docs      = results["documents"][0]
    distances = results["distances"][0]
    scores = [{"similarity": round(1 - d, 3), "snippet": doc[:80]} for doc, d in zip(docs, distances)]

    return {
        "documents_in_db": count,
        "query": q,
        "scores": scores,
        "threshold": 0.1,
        "passing": [s for s in scores if s["similarity"] > 0.1]
    }