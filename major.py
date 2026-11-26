"""Core Major System logic: sounds to digits, number segmentation, story building."""
import random
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("major.db")
PERSONAL_DB_PATH = Path(__file__).with_name("personal.db")

# ARPAbet phoneme -> Major System digit. Vowels, H, W, Y are ignored.
PHONE_TO_DIGIT = {
    "S": "0", "Z": "0",
    "T": "1", "D": "1", "TH": "1", "DH": "1",
    "N": "2", "NG": "2",
    "M": "3",
    "R": "4", "ER": "4",
    "L": "5",
    "SH": "6", "CH": "6", "JH": "6", "ZH": "6",
    "K": "7", "G": "7",
    "F": "8", "V": "8",
    "P": "9", "B": "9",
}


def phones_to_digits(phones):
    """['T','AA1','R','AH0','T'] -> '141'"""
    out = []
    for p in phones:
        p = re.sub(r"\d", "", p)
        d = PHONE_TO_DIGIT.get(p)
        if d:
            out.append(d)
    return "".join(out)


# How each sound is shown to a learner
PHONE_TO_LETTER = {
    "S": "s", "Z": "z", "T": "t", "D": "d", "TH": "th", "DH": "th",
    "N": "n", "NG": "ng", "M": "m", "R": "r", "ER": "r", "L": "l",
    "SH": "sh", "CH": "ch", "JH": "j", "ZH": "zh", "K": "k", "G": "g",
    "F": "f", "V": "v", "P": "p", "B": "b",
}

_PRON = None


def pron():
    """The CMU dictionary, loaded once on first use."""
    global _PRON
    if _PRON is None:
        import cmudict
        _PRON = cmudict.dict()
    return _PRON


def _steps(phones):
    out = []
    for p in phones:
        p = re.sub(r"\d", "", p)
        if p in PHONE_TO_DIGIT:
            out.append({"sound": PHONE_TO_LETTER[p], "digit": PHONE_TO_DIGIT[p]})
    return out


def _decode_compound(word):
    """'mapboy' -> every pronunciation of map + boy, for each way to split it in two."""
    d = pron()
    out = []
    for k in range(2, len(word) - 1):
        a, b = word[:k], word[k:]
        if a in d and b in d:
            out.extend(pa + pb for pa in d[a] for pb in d[b])
    return out


def decode_word(word, compound=False):
    """Every way of saying `word`, as digits plus the sound-by-sound steps.

    Returns None if the dictionary doesn't know the word. With compound=True,
    a word that is two dictionary words stuck together ('mapboy') is decoded
    as the two halves joined.
    """
    w = word.strip().lower()
    prons = pron().get(w)
    if not prons and compound:
        prons = _decode_compound(w) or None
    if not prons:
        return None
    seen, out = set(), []
    for p in prons:
        steps = _steps(p)
        digits = "".join(s["digit"] for s in steps)
        if digits in seen:
            continue
        seen.add(digits)
        out.append({"digits": digits, "steps": steps})
    return out


def validate_personal_word(word, digits):
    """Validate a saved mapping without rejecting words absent from CMU.

    Known words must match at least one recorded pronunciation. Unknown words
    may be saved as user-confirmed mappings; spelling alone is not treated as
    proof of pronunciation.
    """
    options = decode_word(word)
    if options is None:
        return True, "custom"
    if any(option["digits"] == digits for option in options):
        return True, "dictionary"
    mappings = sorted({option["digits"] for option in options if option["digits"]})
    shown = ", ".join(mappings) if mappings else "no digits"
    return False, shown


def explain(word):
    """'tarot: t=1 · r=4 · t=1 -> 141'"""
    opts = decode_word(word)
    if not opts:
        return word
    o = opts[0]
    parts = " · ".join(f"{s['sound']}={s['digit']}" for s in o["steps"])
    return f"{word}: {parts} → {o['digits'] or 'no number'}"


def connect():
    # Each request gets its own connection. check_same_thread=False is needed
    # because FastAPI may run a sync dependency and endpoint on different
    # worker threads; the connection is never shared between requests.
    conn = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("ATTACH DATABASE ? AS user_data", (str(PERSONAL_DB_PATH),))
    return conn


def words_for(conn, digits, limit=12):
    # A word may have more than one CMU pronunciation. Return it once per
    # digit sequence, keeping its best score.
    rows = conn.execute(
        "SELECT word, MAX(score) AS score FROM words "
        "WHERE digits = ? GROUP BY word ORDER BY score DESC, word LIMIT ?",
        (digits, limit),
    ).fetchall()
    return [{"word": r["word"], "score": round(r["score"], 2)} for r in rows]


def ensure_personal_words(conn):
    """Create the separate personal library and migrate legacy rows once."""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_data.personal_words ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "word TEXT NOT NULL, digits TEXT NOT NULL, "
        "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, "
        "UNIQUE(word, digits))"
    )
    legacy = conn.execute(
        "SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='personal_words'"
    ).fetchone()
    if legacy:
        conn.execute(
            "INSERT OR IGNORE INTO user_data.personal_words (word, digits, created_at) "
            "SELECT word, digits, created_at FROM main.personal_words"
        )
        conn.execute("DROP TABLE main.personal_words")
    conn.commit()


def personal_words_for(conn, digits, limit=40):
    rows = conn.execute(
        "SELECT word FROM user_data.personal_words WHERE digits = ? "
        "ORDER BY created_at DESC, word LIMIT ?", (digits, limit)
    ).fetchall()
    return [r["word"] for r in rows]


def save_personal_word(conn, word, digits):
    conn.execute(
        "INSERT OR IGNORE INTO user_data.personal_words (word, digits) VALUES (?, ?)",
        (word, digits),
    )
    conn.commit()


def delete_personal_word(conn, word, digits):
    conn.execute(
        "DELETE FROM user_data.personal_words WHERE word = ? AND digits = ?",
        (word, digits),
    )
    conn.commit()


MIN_PART_SCORE = 5.0       # both halves of a compound must be decent, picturable words
COMPOUND_PENALTY = 1.0     # a compound always ranks below a real word of similar quality


def compound_words(conn, digits, limit=12, per_side=6):
    """Blends of two real words for digit strings that have no single word.

    399 has no word, but 3 + 99 -> 'ma' + 'pie' and 39 + 9 -> 'map' + 'boy'.
    Joined, they become 'mapboy': two clear pictures that still decode back to 399.
    Returns [{"word", "score", "parts"}], best first.
    """
    out, seen = [], set()
    real = pron()
    for k in range(1, len(digits)):
        left = [w for w in words_for(conn, digits[:k], per_side) if w["score"] >= MIN_PART_SCORE]
        right = [w for w in words_for(conn, digits[k:], per_side) if w["score"] >= MIN_PART_SCORE]
        for a in left:
            for b in right:
                if a["word"] in b["word"] or b["word"] in a["word"]:
                    continue   # 'house' + 'houses' is one picture, not two
                word = a["word"] + b["word"]
                if word in seen or word in real:
                    continue   # already a real word, and it may sound different ('mom' + 'ma' = 'momma')
                seen.add(word)
                out.append({
                    "word": word,
                    "score": round((a["score"] + b["score"]) / 2 - COMPOUND_PENALTY, 2),
                    "parts": [a["word"], b["word"]],
                })
    out.sort(key=lambda c: (-c["score"], c["word"]))
    return out[:limit]


def clean_number(raw):
    return re.sub(r"\D", "", raw or "")


def segment(conn, digits, target=3, max_len=4, alt_count=12, compounds=True, personal=True):
    """Split digits into consecutive, fixed-width chunks.

    The selected target is a grouping size, not a scoring preference:
    target=2 gives 14-15-92..., target=3 gives 141-592..., etc.
    A final short chunk is retained when the input length is not divisible
    by target. Every word candidate must encode that exact chunk.

    If a chunk of 3 or more digits has no real word, and `compounds` is on,
    a blend of two real words (399 -> 'mapboy' = map + boy) fills the gap.
    The group boundaries never move.
    """
    if target not in (2, 3, 4):
        raise ValueError("target must be 2, 3, or 4")

    chunks = []
    used = set()
    for i in range(0, len(digits), target):
        chunk_digits = digits[i:i + target]
        mine = [
            {"word": word, "score": 10_000.0}
            for word in (personal_words_for(conn, chunk_digits, alt_count) if personal else [])
        ]
        candidates = mine + [
            item for item in words_for(conn, chunk_digits, alt_count)
            if item["word"] not in {saved["word"] for saved in mine}
        ]
        if not candidates and compounds and len(chunk_digits) >= 3:
            candidates = compound_words(conn, chunk_digits, alt_count)
        pick = next((item for item in candidates if item["word"] not in used), candidates[0] if candidates else None)
        if pick:
            used.add(pick["word"])
        chunk = {
            "digits": chunk_digits,
            # Preserve the exact number boundary even without a dictionary match.
            "word": pick["word"] if pick else "",
            "alternatives": [item["word"] for item in candidates],
        }
        hints = {item["word"]: " + ".join(item["parts"]) for item in candidates if "parts" in item}
        if hints:
            chunk["hints"] = hints
        chunks.append(chunk)
    return chunks


# ---------------------------------------------------------------- stories
#
# A word is only ever written once in a story, as its own marker, and the text
# around it never names another word or puts "a/an" in front of it. The previous
# image is called "it", and every word gets "the". That keeps a story correct
# when someone swaps a word, and lets the editor cut it cleanly at each word.


def _mark(word, digits=""):
    return f"[[{word}|{digits}]]"


OPENERS = [
    "Start with the {B}, as big as a bus, standing right in front of you.",
    "Picture the {B} sitting in the middle of the room, glowing bright orange.",
    "Imagine the {B} the size of a house, blocking the doorway.",
]

# "it" is the image from the sentence before.
LINKS = [
    "Then it slams into the {B} with a loud crash.",
    "Suddenly it explodes, and out jumps the {B}.",
    "It is stuck to the {B} with huge strips of sticky tape.",
    "The {B} is chasing it around the room.",
    "It is wearing the {B} like a hat.",
    "Someone is hitting it with the {B}.",
    "Out of it pours the {B}, dripping wet.",
    "The {B} is balancing on top of it.",
    "It starts singing to the {B}, very loudly.",
    "It catches fire, and the {B} tries to put it out.",
    "It is being eaten by the {B}.",
    "The {B} slides down it like a slide.",
    "It swallows the {B} whole, and starts to hiccup.",
    "It tows the {B} down the street.",
    "The {B} wraps around it and squeezes tight.",
    "It paints the {B} bright green.",
]


def build_story(words, digits_list=None, variant=0):
    """Chain the words into a short, physical, slightly silly scene."""
    words = [w for w in words if w]
    if not words:
        return []
    digits_list = digits_list or [""] * len(words)
    rng = random.Random(f"{'-'.join(words)}:{variant}")
    links = LINKS[:]
    rng.shuffle(links)

    sentences = [rng.choice(OPENERS).format(B=_mark(words[0], digits_list[0]))]
    for k in range(1, len(words)):
        template = links[(k - 1) % len(links)]
        sentences.append(template.format(B=_mark(words[k], digits_list[k])))
    return sentences
