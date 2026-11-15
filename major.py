"""Core Major System logic: sounds to digits, number segmentation, story building."""
import random
import re
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("major.db")

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


def decode_word(word):
    """Every way of saying `word`, as digits plus the sound-by-sound steps.

    Returns None if the dictionary doesn't know the word.
    """
    prons = pron().get(word.strip().lower())
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


def explain(word):
    """'tarot: t=1 · r=4 · t=1 -> 141'"""
    opts = decode_word(word)
    if not opts:
        return word
    o = opts[0]
    parts = " · ".join(f"{s['sound']}={s['digit']}" for s in o["steps"])
    return f"{word}: {parts} → {o['digits'] or 'no number'}"


def connect():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def words_for(conn, digits, limit=12):
    rows = conn.execute(
        "SELECT word, score FROM words WHERE digits = ? ORDER BY score DESC, word LIMIT ?",
        (digits, limit),
    ).fetchall()
    return [{"word": r["word"], "score": round(r["score"], 2)} for r in rows]


def clean_number(raw):
    return re.sub(r"\D", "", raw or "")


def segment(conn, digits, target=3, max_len=4, alt_count=12):
    """Split `digits` into chunks and pick a word for each.

    Cost per chunk = (11 - word score) + 3 * |len - target|, so the split
    leans toward `target` digits per word but will bend for a better word.
    """
    n = len(digits)
    cache = {}

    def cands(i, L):
        key = (i, L)
        if key not in cache:
            cache[key] = words_for(conn, digits[i:i + L], alt_count)
        return cache[key]

    INF = float("inf")
    best = [INF] * (n + 1)
    back = [None] * (n + 1)
    best[0] = 0.0
    for i in range(n):
        if best[i] == INF:
            continue
        for L in range(1, min(max_len, n - i) + 1):
            c = cands(i, L)
            if not c:
                continue
            weak = max(0.0, 6.0 - c[0]["score"])   # steer away from poor words when a split avoids them
            cost = (11 - c[0]["score"]) + 3 * abs(L - target) + weak * weak
            if best[i] + cost < best[i + L]:
                best[i + L] = best[i] + cost
                back[i + L] = (i, L)

    if best[n] == INF:
        return []

    spans = []
    j = n
    while j > 0:
        i, L = back[j]
        spans.append((i, L))
        j = i
    spans.reverse()

    chunks, used = [], set()
    for i, L in spans:
        alts = cands(i, L)
        pick = next((a for a in alts if a["word"] not in used), alts[0])
        used.add(pick["word"])
        chunks.append({
            "digits": digits[i:i + L],
            "word": pick["word"],
            "alternatives": [a["word"] for a in alts],
        })
    return chunks


# ---------------------------------------------------------------- stories

def _art(word):
    return ("an " if word[0] in "aeiou" else "a ") + word


def _mark(word, digits=""):
    return f"[[{word}|{digits}]]"


OPENERS = [
    "Start with {B}, as big as a bus, standing right in front of you.",
    "Picture {B} sitting in the middle of the room, glowing bright orange.",
    "Imagine {B} the size of a house blocking the doorway.",
]

LINKS = [
    "Then the {a} slams into {B} with a loud crash.",
    "Suddenly the {a} explodes, and out jumps {B}.",
    "The {a} is stuck to {B} with huge strips of sticky tape.",
    "{B_cap} is chasing the {a} around the room.",
    "The {a} is wearing {B} like a hat.",
    "Someone is hitting the {a} with {B}.",
    "Out of the {a} pours {B}, dripping wet.",
    "{B_cap} is balancing on top of the {a}.",
    "The {a} starts singing to {B}, very loudly.",
    "The {a} catches fire, and {B} tries to put it out.",
    "The {a} is being eaten by {B}.",
    "{B_cap} slides down the {a} like a slide.",
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

    def fill(template, prev, w, d):
        marked = _mark(w, d)
        return template.format(
            a=prev,
            B=f"{_art(w).split(' ')[0]} {marked}",
            B_cap=f"{_art(w).split(' ')[0].capitalize()} {marked}",
        )

    sentences = [fill(rng.choice(OPENERS), "", words[0], digits_list[0])]
    for k in range(1, len(words)):
        template = links[(k - 1) % len(links)]
        sentences.append(fill(template, words[k - 1], words[k], digits_list[k]))
    return sentences
