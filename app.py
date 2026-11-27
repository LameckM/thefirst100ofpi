"""FastAPI backend for Number Stories.

Run: uvicorn app:app --reload
"""
from pathlib import Path
import re
import sqlite3

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from major import (
    build_story, clean_number, compound_words, connect, decode_word, segment, words_for,
)
from quiz import make_question

MAX_DIGITS = 300
WORD_RE = r"^[A-Za-z'-]{1,40}$"
ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="Number Stories")


def get_db():
    """Provide one SQLite connection per request and always close it."""
    conn = connect()
    try:
        yield conn
    finally:
        conn.close()




class StoryRequest(BaseModel):
    words: list[str]
    digits: list[str] | None = None
    variant: int = 0


@app.get("/api/encode")
def encode(
    number: str = Query(..., min_length=1),
    target: int = Query(3, ge=2, le=4),
    compounds: bool = Query(True),
    conn: sqlite3.Connection = Depends(get_db),
):
    digits = clean_number(number)
    if not digits:
        raise HTTPException(400, "Enter at least one digit.")
    if len(digits) > MAX_DIGITS:
        raise HTTPException(400, f"Keep it to {MAX_DIGITS} digits or fewer.")
    chunks = segment(conn, digits, target=target, compounds=compounds, personal=False)
    if not chunks:
        raise HTTPException(422, "Could not find words for that number.")
    matched = [c for c in chunks if c["word"]]
    story = build_story([c["word"] for c in matched], [c["digits"] for c in matched])
    return {"digits": digits, "grouped": "-".join(c["digits"] for c in chunks),
            "chunks": chunks, "story": story}


@app.get("/api/words")
def more_words(
    digits: str = Query(..., pattern=r"^\d{1,4}$"),
    limit: int = Query(40, ge=1, le=100),
    conn: sqlite3.Connection = Depends(get_db),
):
    found = words_for(conn, digits, limit)
    if not found and len(digits) >= 3:
        # no single word for this number: offer blends of two real words instead
        found = compound_words(conn, digits, limit)
    hints = {w["word"]: " + ".join(w["parts"]) for w in found if "parts" in w}
    return {"digits": digits, "words": [w["word"] for w in found], "hints": hints}


@app.post("/api/story")
def story(req: StoryRequest):
    if req.digits is not None and len(req.digits) != len(req.words):
        raise HTTPException(400, "The digits list must contain one entry per word.")
    pairs = [
        (word.strip().lower(), req.digits[i] if req.digits is not None else "")
        for i, word in enumerate(req.words)
        if word and word.strip()
    ]
    if not pairs or len(pairs) > MAX_DIGITS // 2:
        raise HTTPException(400, "Send between 1 and 150 non-empty words.")
    words, digits = zip(*pairs)
    return {"story": build_story(list(words), list(digits), req.variant)}



@app.get("/api/decode")
def decode(word: str = Query(..., pattern=WORD_RE)):
    w = word.strip().lower()
    opts = decode_word(w, compound=True)
    return {"word": w, "found": opts is not None, "options": opts or []}


@app.get("/api/check-word")
def check_word(word: str = Query(..., pattern=WORD_RE), digits: str = Query(..., pattern=r"^\d{1,4}$")):
    w = word.strip().lower()
    opts = decode_word(w)
    if opts is None:
        return {"found": False, "ok": False, "word": w}
    match = next((o for o in opts if o["digits"] == digits), None)
    shown = match or opts[0]
    return {"found": True, "ok": match is not None, "word": w,
            "digits": shown["digits"], "steps": shown["steps"]}


@app.get("/api/quiz")
def quiz(
    kind: str = Query("mix", pattern="^(mix|sounds|digit|word|number)$"),
    level: str = Query("easy", pattern="^(easy|medium)$"),
    conn: sqlite3.Connection = Depends(get_db),
):
    return make_question(conn, kind, level)


@app.get("/")
def index():
    # Prefer the compiled React app once frontend/dist exists. Keep the old
    # static page as a no-build fallback so the API remains usable during setup.
    react_index = FRONTEND_DIST / "index.html"
    if react_index.is_file():
        return FileResponse(react_index)
    return FileResponse(STATIC / "index.html")


if FRONTEND_DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
app.mount("/static", StaticFiles(directory=STATIC), name="static")
# Last, so it never shadows the routes above: favicon, social image, privacy page.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST), name="public")
