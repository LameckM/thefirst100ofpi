"""FastAPI backend for Number Stories.

Run: uvicorn app:app --reload
"""
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from major import build_story, clean_number, connect, decode_word, segment, words_for
from quiz import make_question

MAX_DIGITS = 300
ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
FRONTEND_DIST = ROOT / "frontend" / "dist"

app = FastAPI(title="Number Stories")
conn = connect()


class StoryRequest(BaseModel):
    words: list[str]
    digits: list[str] | None = None
    variant: int = 0


@app.get("/api/encode")
def encode(number: str = Query(..., min_length=1), target: int = Query(3, ge=2, le=4)):
    digits = clean_number(number)
    if not digits:
        raise HTTPException(400, "Enter at least one digit.")
    if len(digits) > MAX_DIGITS:
        raise HTTPException(400, f"Keep it to {MAX_DIGITS} digits or fewer.")
    chunks = segment(conn, digits, target=target)
    if not chunks:
        raise HTTPException(422, "Could not find words for that number.")
    matched = [c for c in chunks if c["word"]]
    story = build_story([c["word"] for c in matched], [c["digits"] for c in matched])
    return {"digits": digits, "grouped": "-".join(c["digits"] for c in chunks),
            "chunks": chunks, "story": story}


@app.get("/api/words")
def more_words(digits: str = Query(..., pattern=r"^\d{1,4}$"), limit: int = Query(40, ge=1, le=100)):
    return {"digits": digits, "words": [w["word"] for w in words_for(conn, digits, limit)]}


@app.post("/api/story")
def story(req: StoryRequest):
    if req.digits is not None and len(req.digits) != len(req.words):
        raise HTTPException(400, "The digits list must contain one entry per word.")
    pairs = [
        (word.strip().lower(), req.digits[i] if req.digits is not None else "")
        for i, word in enumerate(req.words)
        if word and word.strip()
    ]
    if not pairs or len(pairs) > 120:
        raise HTTPException(400, "Send between 1 and 120 non-empty words.")
    words, digits = zip(*pairs)
    return {"story": build_story(list(words), list(digits), req.variant)}


WORD_RE = r"^[A-Za-z'\-]{1,40}$"


@app.get("/api/decode")
def decode(word: str = Query(..., pattern=WORD_RE)):
    w = word.strip().lower()
    opts = decode_word(w)
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
