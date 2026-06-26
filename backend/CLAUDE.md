# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Server

```bash
uvicorn app.main:app --reload
```

The API runs on `http://localhost:8000` by default.

## Key Dependencies

- **FastAPI** — web framework
- **ChromaDB** — local vector database (persisted at `./data/chroma`)
- **sentence-transformers** (`all-MiniLM-L6-v2`) — embedding model for indexing and retrieval
- **transformers** (`google/flan-t5-base`) — text generation pipeline for answering questions
- **pypdf** — PDF text extraction

## Architecture

This is a **RAG (Retrieval-Augmented Generation)** backend for a document Q&A system ("AI Receptionist"). The data flow is:

1. **Upload** (`POST /upload`) — accepts a PDF, extracts text via `pypdf`, splits into overlapping chunks (500 chars, 100 char overlap), embeds each chunk with `all-MiniLM-L6-v2`, and stores embeddings + text in ChromaDB under the `business_docs` collection.

2. **Chat** (`POST /chat`) — embeds the user query, retrieves top-5 chunks from ChromaDB, filters by cosine similarity threshold (`similarity = 1 - distance > 0.65`), builds a context string, and passes it to `flan-t5-base` for answer generation (max 120 new tokens, greedy decoding).

3. **Health** (`GET /health`) — simple liveness check.

### Service Layer

- `app/services/vector_store.py` — owns the ChromaDB client and SentenceTransformer model; exposes `add_documents(doc_id, chunks)` and `search(query, k=5)`. Models are loaded at import time (module-level singletons).
- `app/services/llm.py` — owns the HuggingFace `pipeline`; exposes `generate_answer(context, question)`. Pipeline is also a module-level singleton loaded at import time.

### Important Behaviors

- The similarity threshold (`0.65`) in `chat.py:27` controls how aggressively irrelevant chunks are filtered — tune this if retrieval quality is off.
- ChromaDB data is persisted locally at `./data/chroma`; deleting this directory clears all uploaded documents.
- Both ML models (`all-MiniLM-L6-v2` and `flan-t5-base`) are downloaded automatically on first run via HuggingFace Hub and cached locally.
- CORS is fully open (`allow_origins=["*"]`).
