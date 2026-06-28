from fastapi import APIRouter
from pydantic import BaseModel

from app.services.vector_store import search
from app.services.llm import generate_answer, generate_booking_response
from app.services.query_cleaner import clean_query
from app.services.logger import log_conversation
from app.services.booking import create_booking, get_upcoming_bookings, is_slot_taken

router = APIRouter()

BOOKING_KEYWORDS = {
    'book', 'reserve', 'reservation', 'booking',
    'table for', 'appointment', 'schedule', 'slot'
}

BOOKING_FOLLOWUP_PHRASES = [
    'your name', 'how many', 'party size', 'what time',
    'which date', 'what date', 'for the reservation', 'for the booking'
]

_PLEASANTRIES = {
    'thanks', 'thank you', 'thank you!', 'thanks!',
    'great', 'perfect', 'awesome', 'ok', 'okay', 'cool', 'bye', 'goodbye'
}

_FOLLOWUP_STARTERS = ('what about', 'how about', 'and ', 'is it ', 'are they', 'do you', 'what is', 'when is')


class HistoryMessage(BaseModel):
    role: str
    text: str


class ChatRequest(BaseModel):
    query: str
    history: list[HistoryMessage] = []


def _is_booking_intent(query: str, history: list[HistoryMessage]) -> bool:
    q = query.lower()
    if any(kw in q for kw in BOOKING_KEYWORDS):
        return True
    last_bot = next((m for m in reversed(history) if m.role == 'assistant'), None)
    if last_bot and any(p in last_bot.text.lower() for p in BOOKING_FOLLOWUP_PHRASES):
        return True
    return False


def _is_pleasantry_after_booking(query: str, history: list[HistoryMessage]) -> bool:
    if query.lower().strip().rstrip('!.,') not in _PLEASANTRIES:
        return False
    last_bot = next((m for m in reversed(history) if m.role == 'assistant'), None)
    return bool(last_bot and ('confirmed' in last_bot.text.lower() or '#bk-' in last_bot.text.lower()))


def _expand_query(query: str, history: list) -> str:
    q = query.lower().strip()
    if len(q) < 35 or any(q.startswith(s) for s in _FOLLOWUP_STARTERS):
        last_user = next((m for m in reversed(history) if m['role'] == 'user'), None)
        if last_user:
            return f"{last_user['text']} {query}"
    return query


@router.post("/chat")
def chat(request: ChatRequest):
    history = [{"role": m.role, "text": m.text} for m in request.history[-6:]]

    # ── Pleasantry after confirmed booking ───────────────────────────────────
    if _is_pleasantry_after_booking(request.query, request.history):
        answer = "You're welcome! Looking forward to seeing you. Have a great day!"
        log_conversation(request.query, answer)
        return {"question": request.query, "answer": answer, "sources": [], "type": "booking"}

    # ── Booking flow ─────────────────────────────────────────────────────────
    if _is_booking_intent(request.query, request.history):
        upcoming = get_upcoming_bookings()
        text, booking_data = generate_booking_response(request.query, history, upcoming)

        if booking_data:
            if is_slot_taken(booking_data["date"], booking_data["time"]):
                text = (f"Sorry, {booking_data['time']} on {booking_data['date']} "
                        f"is already booked. Please choose a different time.")
            else:
                booking_id = create_booking(
                    name=booking_data["name"],
                    date=booking_data["date"],
                    time=booking_data["time"],
                    party_size=int(booking_data["party_size"])
                )
                text += f" Your booking is confirmed! Reference: #BK-{booking_id:04d}"

        log_conversation(request.query, text)
        return {"question": request.query, "answer": text, "sources": [], "type": "booking"}

    # ── RAG flow ─────────────────────────────────────────────────────────────
    expanded = _expand_query(request.query, history)
    results = search(clean_query(expanded))

    docs      = results.get("documents", [[]])[0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    filtered = []
    for doc, dist, meta in zip(docs, distances, metadatas):
        if (1 - dist) > 0.10:
            filtered.append({"text": doc, "filename": meta.get("filename", "document")})

    if not filtered:
        answer = "I don't have enough relevant information in the documents."
        log_conversation(request.query, answer)
        return {"question": request.query, "answer": answer, "sources": [], "type": "rag"}

    context = "\n\n".join(item["text"] for item in filtered[:2])
    answer  = generate_answer(context, request.query, history or None)

    if not answer or not answer.strip():
        answer = "I couldn't generate a proper answer from the provided documents."

    log_conversation(request.query, answer)

    sources = [
        {"document": item["filename"], "snippet": item["text"][:180].strip() + "…"}
        for item in filtered[:2]
    ]

    return {"question": request.query, "answer": answer, "sources": sources, "type": "rag"}
