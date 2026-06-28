# AI Receptionist

A full-stack AI receptionist that answers questions from your business documents, handles table bookings through natural conversation, and supports live voice calls — all in a clean web interface.

## Features

- **Document Q&A** — Upload a PDF and ask anything about it. Uses RAG (Retrieval-Augmented Generation) to find and answer from the right sections.
- **Table Booking** — AI collects name, date, time, and party size through natural conversation, checks for conflicts, and confirms with a reference number.
- **Voice Call Demo** — Full voice call experience using browser speech recognition and Microsoft Edge neural TTS.
- **Admin Dashboard** — View all conversation logs and bookings in real time.

## Tech Stack

**Backend**
- [FastAPI](https://fastapi.tiangolo.com/) — REST API
- [ChromaDB](https://www.trychroma.com/) — Local vector database
- [sentence-transformers](https://www.sbert.net/) (`all-MiniLM-L6-v2`) — Document embeddings
- [Groq](https://groq.com/) (`llama-3.1-8b-instant`) — LLM for Q&A and booking conversations
- [edge-tts](https://github.com/rany2/edge-tts) (`en-US-JennyNeural`) — Microsoft neural text-to-speech
- [pypdf](https://pypdf.readthedocs.io/) — PDF text extraction
- SQLite — Conversation logs and bookings

**Frontend**
- React + Vite
- Browser Web Speech API (SpeechRecognition)

## Project Structure

```
advance-ai-projects/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── chat.py       # Q&A + booking endpoint
│   │   │   ├── upload.py     # PDF ingestion
│   │   │   ├── tts.py        # Edge TTS audio endpoint
│   │   │   ├── admin.py      # Logs + bookings endpoints
│   │   │   └── health.py     # Health + debug endpoints
│   │   └── services/
│   │       ├── llm.py        # Groq LLM calls
│   │       ├── vector_store.py  # ChromaDB + embeddings
│   │       ├── booking.py    # Booking CRUD (SQLite)
│   │       ├── logger.py     # Conversation logging (SQLite)
│   │       └── query_cleaner.py  # Query normalisation
│   └── data/                 # ChromaDB + SQLite files (gitignored)
└── frontend/
    └── src/
        ├── App.jsx
        └── components/
            ├── Chat.jsx        # Text chat
            ├── KnowledgeBase.jsx  # PDF upload
            ├── CallDemo.jsx    # Voice call
            └── Admin.jsx       # Dashboard
```

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq](https://console.groq.com/) API key (free)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install fastapi uvicorn chromadb sentence-transformers pypdf groq edge-tts
export GROQ_API_KEY=your_key_here
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Usage

1. Go to the **Knowledge Base** tab and upload your business PDF
2. Switch to **Chat** and start asking questions
3. Try **Call Demo** for a voice call experience (use earphones for best results)
4. Check **Admin** for conversation logs and bookings

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/upload` | Upload and index a PDF |
| `POST` | `/chat` | Ask a question or make a booking |
| `GET` | `/tts?text=...` | Generate speech audio (MP3) |
| `GET` | `/admin/logs` | All conversation logs |
| `GET` | `/booking/all` | All bookings |
| `GET` | `/health` | Server status |
| `GET` | `/debug?q=...` | ChromaDB similarity scores |

## How It Works

### RAG Pipeline
1. PDF is extracted and split into 200-character overlapping chunks
2. Each chunk is embedded using `all-MiniLM-L6-v2` and stored in ChromaDB
3. On each query, the question is embedded and the top matching chunks are retrieved
4. Relevant chunks are passed to Groq's LLM with conversation history to generate an answer

### Booking Flow
The LLM collects all four required fields (name, date, time, party size) through natural conversation. Once all details are confirmed, it outputs a structured marker which the backend parses, validates against existing bookings, and writes to SQLite.

### Voice Call
Browser SpeechRecognition captures user speech → sent to `/chat` → response sent to `/tts` → Edge TTS audio plays back → loops automatically.

## Reset Data

To clear all stored data before a demo:

```bash
cd backend
rm -rf data/chroma data/logs.db data/bookings.db
```

Then restart the server and re-upload your PDF.
