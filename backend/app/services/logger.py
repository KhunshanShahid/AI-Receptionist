import sqlite3
import os
from datetime import datetime

DB_PATH = "./data/logs.db"


def _connect():
    os.makedirs("./data", exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_db():
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT    NOT NULL,
                question  TEXT    NOT NULL,
                answer    TEXT    NOT NULL
            )
        """)


def log_conversation(question: str, answer: str):
    with _connect() as conn:
        conn.execute(
            "INSERT INTO conversations (timestamp, question, answer) VALUES (?, ?, ?)",
            (datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"), question, answer)
        )


def get_logs(limit: int = 100):
    with _connect() as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT id, timestamp, question, answer FROM conversations ORDER BY id DESC LIMIT ?",
            (limit,)
        ).fetchall()
    return [dict(r) for r in rows]
