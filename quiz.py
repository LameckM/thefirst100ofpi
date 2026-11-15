"""Practice questions for learning the Major System."""
import random

from major import decode_word, explain

GROUPS = {
    "0": "s, z", "1": "t, d, th", "2": "n", "3": "m", "4": "r",
    "5": "l", "6": "j, ch, sh", "7": "k, g", "8": "f, v", "9": "p, b",
}

HOOKS = {
    "0": "zero starts with z.",
    "1": "t has one downstroke.",
    "2": "n has two legs.",
    "3": "m has three legs.",
    "4": "r is the last letter of four.",
    "5": "L is the Roman numeral for 50.",
    "6": "a flipped 6 looks like a j.",
    "7": "a capital K is built from two 7s.",
    "8": "a handwritten f has two loops, like an 8.",
    "9": "a flipped 9 looks like a p.",
}

SINGLES = [
    ("s", "0"), ("z", "0"), ("t", "1"), ("d", "1"), ("th", "1"), ("n", "2"),
    ("m", "3"), ("r", "4"), ("l", "5"), ("j", "6"), ("ch", "6"), ("sh", "6"),
    ("k", "7"), ("g", "7"), ("f", "8"), ("v", "8"), ("p", "9"), ("b", "9"),
]

# (letters, word, digit, note): spelling that does not match the sound
TRICKY = [
    ("c", "city", "0", "A soft c sounds like s."),
    ("c", "cat", "7", "A hard c sounds like k."),
    ("g", "giant", "6", "A soft g sounds like j."),
    ("g", "goat", "7", "A hard g sounds like the g in go."),
    ("ph", "phone", "8", "ph sounds like f."),
    ("ck", "duck", "7", "ck sounds like k."),
    ("q", "queen", "7", "q sounds like k."),
    ("ch", "chair", "6", "ch is one sound, like sh and j."),
    ("th", "thumb", "1", "th counts as 1, the same as t and d."),
    ("z", "zoo", "0", "z is a 0, just like s."),
]


def _span(level):
    return (1, 2) if level == "easy" else (3, 3)


def _pick_word(conn, lo, hi):
    row = conn.execute(
        "SELECT word, digits FROM words WHERE kind = 2 AND zipf >= 3.8 AND length(word) >= 3 "
        "AND length(digits) BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1",
        (lo, hi),
    ).fetchone()
    return row["word"], row["digits"]


def q_sounds():
    d = random.choice(list(GROUPS))
    correct = GROUPS[d]
    wrong = random.sample([v for k, v in GROUPS.items() if k != d], 3)
    options = wrong + [correct]
    random.shuffle(options)
    return {
        "kind": "sounds", "type": "choice",
        "prompt": f"Which sounds stand for the digit {d}?",
        "options": options, "answer": correct,
        "explanation": f"{d} = {correct}. Memory hook: {HOOKS[d]}",
    }


def q_digit(level):
    if level == "medium" and random.random() < 0.6:
        letters, word, digit, note = random.choice(TRICKY)
        return {
            "kind": "digit", "type": "digit-grid",
            "prompt": f"In the word “{word}”, which digit does “{letters}” make?",
            "answer": digit,
            "explanation": f"{note} So {word} uses the digit {digit} here.",
        }
    letters, digit = random.choice(SINGLES)
    return {
        "kind": "digit", "type": "digit-grid",
        "prompt": f"Which digit does the sound “{letters}” stand for?",
        "answer": digit,
        "explanation": f"{letters} belongs to {digit} ({GROUPS[digit]}). Memory hook: {HOOKS[digit]}",
    }


def q_word_to_number(conn, level):
    lo, hi = _span(level)
    word, digits = _pick_word(conn, lo, hi)
    accepted = [o["digits"] for o in decode_word(word)]
    return {
        "kind": "word", "type": "number-input",
        "prompt": f"What number does “{word}” stand for?",
        "answer": digits, "accepted": accepted,
        "explanation": explain(word),
    }


def q_number_to_word(conn, level):
    lo, hi = _span(level)
    word, digits = _pick_word(conn, lo, hi)
    rows = conn.execute(
        "SELECT word, digits FROM words WHERE kind = 2 AND zipf >= 3.8 AND length(word) >= 3 "
        "AND length(digits) = ? AND digits != ? ORDER BY RANDOM() LIMIT 30",
        (len(digits), digits),
    ).fetchall()
    others = []
    for r in rows:
        opts = decode_word(r["word"]) or []
        if any(o["digits"] == digits for o in opts):
            continue   # this word could also be read as the target number
        others.append((r["word"], r["digits"]))
        if len(others) == 3:
            break
    options = [word] + [w for w, _ in others]
    random.shuffle(options)
    also = ", ".join(f"{w} = {d}" for w, d in others)
    return {
        "kind": "number", "type": "choice", "own_word": True, "digits": digits,
        "prompt": f"Which word stands for {digits}?",
        "options": options, "answer": word,
        "explanation": f"{explain(word)}. The others: {also}.",
    }


def make_question(conn, kind="mix", level="easy"):
    if kind == "mix":
        kind = random.choice(["sounds", "digit", "word", "number", "word", "number"])
    if kind == "sounds":
        return q_sounds()
    if kind == "digit":
        return q_digit(level)
    if kind == "word":
        return q_word_to_number(conn, level)
    return q_number_to_word(conn, level)
