import sqlite3
import os

DB_PATH = "./data/bookings.db"


def _conn():
    os.makedirs("./data", exist_ok=True)
    return sqlite3.connect(DB_PATH)


def init_bookings_db():
    with _conn() as con:
        con.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                name      TEXT NOT NULL,
                date      TEXT NOT NULL,
                time      TEXT NOT NULL,
                party_size INTEGER NOT NULL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        """)


def create_booking(name: str, date: str, time: str, party_size: int) -> int:
    with _conn() as con:
        cur = con.execute(
            "INSERT INTO bookings (name, date, time, party_size) VALUES (?, ?, ?, ?)",
            (name, date, time, party_size)
        )
        return cur.lastrowid


def is_slot_taken(date: str, time: str) -> bool:
    with _conn() as con:
        row = con.execute(
            "SELECT 1 FROM bookings WHERE date=? AND time=?", (date, time)
        ).fetchone()
        return row is not None


def get_upcoming_bookings() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT name, date, time, party_size FROM bookings ORDER BY date, time LIMIT 20"
        ).fetchall()
    return [{"name": r[0], "date": r[1], "time": r[2], "party_size": r[3]} for r in rows]


def get_all_bookings() -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            "SELECT id, name, date, time, party_size, created_at FROM bookings ORDER BY date DESC, time DESC"
        ).fetchall()
    return [
        {"id": r[0], "name": r[1], "date": r[2], "time": r[3], "party_size": r[4], "created_at": r[5]}
        for r in rows
    ]
