import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.PersistentClient(path="./data/chroma")

collection = client.get_or_create_collection(
    name="business_docs",
    metadata={"hnsw:space": "cosine"}
)

model = SentenceTransformer("multi-qa-MiniLM-L6-cos-v1")


def clear_collection():
    all_ids = collection.get()["ids"]
    if all_ids:
        collection.delete(ids=all_ids)


def add_documents(doc_id: str, chunks: list[str], filename: str):
    embeddings = model.encode(chunks).tolist()
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    collection.add(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=[{"doc_id": doc_id, "filename": filename} for _ in chunks]
    )


def search(query: str, k: int = 5):
    query_embedding = model.encode([query]).tolist()
    return collection.query(
        query_embeddings=query_embedding,
        n_results=k,
        include=["documents", "distances", "metadatas"]
    )