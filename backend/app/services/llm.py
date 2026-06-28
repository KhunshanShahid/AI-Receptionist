import os
import re
import json
from groq import Groq

client = Groq(api_key=os.environ["GROQ_API_KEY"])


def generate_answer(context: str, question: str, history: list = None):
    history_text = ""
    if history:
        for msg in history:
            prefix = "Customer" if msg["role"] == "user" else "Receptionist"
            history_text += f"{prefix}: {msg['text']}\n"

    history_section = f"Previous conversation:\n{history_text}\n" if history_text else ""

    prompt = f"""You are a helpful AI receptionist. Answer the question using only the context below.
Give a complete answer in 1-3 sentences. Do not just say yes or no.
If the answer is not in the context, say "I don't have that information in our documents."

{history_section}Context:
{context}

Question:
{question}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=150,
        temperature=0.3
    )
    return response.choices[0].message.content.strip()


def generate_booking_response(query: str, history: list, upcoming_bookings: list):
    booked_text = ""
    if upcoming_bookings:
        booked_text = "\nUnavailable slots (do not double-book):\n"
        for b in upcoming_bookings:
            booked_text += f"  {b['date']} {b['time']} — {b['name']}, {b['party_size']} people\n"

    system_prompt = (
        "You are a restaurant receptionist collecting a table reservation.\n"
        "You need exactly 4 details: name, date, time, party size.\n"
        "- Ask for one missing detail at a time. Keep replies under 2 sentences.\n"
        "- Accept any time format (9pm, 9:00 PM, half 9). Never ask for 24-hour format.\n"
        "- Do NOT re-ask for something the customer already provided.\n"
        "- Do NOT ask the customer to confirm details you already have.\n"
        "- The moment you have all 4, output this on the final line with no extra text after it:\n"
        'BOOKING_CONFIRM:{"name":"Full Name","date":"YYYY-MM-DD","time":"HH:MM","party_size":N}\n'
        "(Convert time to 24-hour HH:MM in that marker.)"
        + booked_text
    )

    # Build proper chat message array so the LLM tracks context correctly
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg["text"]})
    messages.append({"role": "user", "content": query})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        max_tokens=200,
        temperature=0.1
    )
    text = response.choices[0].message.content.strip()

    match = re.search(r'BOOKING_CONFIRM:(\{[^}]+\})', text)
    booking_data = None
    if match:
        try:
            booking_data = json.loads(match.group(1))
            text = text[:match.start()].strip()
        except json.JSONDecodeError:
            pass

    return text, booking_data
