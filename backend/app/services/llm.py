import os
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
