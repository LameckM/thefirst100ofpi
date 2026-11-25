"""Build major.db: every usable English word stored under its Major System digits.

Sources (all installed with pip, no scraping):
  cmudict       word -> pronunciation
  wordfreq      how common each word is
  wn            WordNet, used to prefer concrete, picturable nouns
  better-profanity  keeps rude words out of the results

Run:  python build_db.py
"""
import sqlite3
import sys

import cmudict
from better_profanity import profanity
from wn import WordNet
from wordfreq import zipf_frequency

from major import DB_PATH, phones_to_digits

MIN_ZIPF = 2.5          # ignore words rarer than this
MAX_DIGITS = 4          # longest chunk we will ever ask for

# WordNet categories that are easy to picture
CONCRETE = {
    "noun.animal", "noun.artifact", "noun.body", "noun.food", "noun.plant",
    "noun.object", "noun.person", "noun.substance",
}
SEMI = {"noun.location", "noun.shape", "noun.phenomenon", "noun.event"}


# Function words make terrible mental pictures, even when WordNet has an obscure noun sense for them.
STOP = set("""
a an the and or but nor so yet if then than that this these those there here
i me my mine we us our ours you your yours he him his she her hers it its they them their theirs
who whom whose which what when where why how
am is are was were be been being do does did done doing have has had having
will would shall should can could may might must
at by for from in into of off on onto out over to up with without about above after again all
any are as because before below between both each few more most no not only other same some such
through under until very just also too own while during against among
say said says get got go goes went gone make made let put see saw seen
""".split())


# Extra words to keep out (insults and touchy topics). Add your own here.
STOP |= {"schmuck", "narc", "homophobia"}


def analyse(wn, word):
    """Return (kind, known, proper).

    kind:   2 = concrete noun, 1 = other noun, 0 = not a noun (verb, adjective...)
    known:  1 if WordNet has the word at all
    proper: 1 if WordNet only knows it as a capitalised name (Wilson, Malibu, Letitia)
    """
    syns = wn.synsets(word)
    if not syns:
        return 0, 0, 0

    matching = [
        n for s in syns for n in s.lemma_names()
        if n.lower().replace("_", " ") == word
    ]
    if matching and all(n[0].isupper() for n in matching):
        return 0, 1, 1

    first = syns[0]
    if first.pos() != "n":
        return 0, 1, 0
    lex = first.lexname()
    if lex in CONCRETE:
        return 2, 1, 0
    return 1, 1, 0


def word_mappings(word, pronunciations):
    """Yield every distinct, usable Major System mapping for a dictionary word."""
    seen = set()
    for phones in pronunciations:
        digits = phones_to_digits(phones)
        if digits and len(digits) <= MAX_DIGITS and digits not in seen:
            seen.add(digits)
            yield word, digits


def main():
    profanity.load_censor_words()
    wn = WordNet()
    pron = cmudict.dict()

    # Rebuild only the shared dictionary. Personal vocabulary lives in
    # personal.db and is therefore untouched by this rebuild.
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DROP TABLE IF EXISTS words")
    conn.execute(
        "CREATE TABLE words (word TEXT, digits TEXT, score REAL, zipf REAL, kind INTEGER,"
        " known INTEGER, proper INTEGER)"
    )

    rows = []
    for word, prons in pron.items():
        if not word.isalpha() or len(word) < 2 or word in STOP:
            continue
        if not any(ch in "aeiouy" for ch in word):   # acronyms like csv, ppm, nmr
            continue
        zipf = zipf_frequency(word, "en")
        if zipf < MIN_ZIPF:
            continue
        if profanity.contains_profanity(word):
            continue
        mappings = list(word_mappings(word, prons))
        if not mappings:
            continue
        kind, known, proper = analyse(wn, word)
        # concrete nouns get a big bump, non-nouns a penalty;
        # frequency is capped so very common words don't beat better pictures
        score = min(zipf, 5.5) + {2: 3.0, 1: 1.0, 0: -1.0}[kind]
        if proper:
            score -= 3.0
        if not known:
            score -= 1.5
        # Store every distinct valid pronunciation, not only the first one.
        rows.extend((word, digits, score, zipf, kind, known, proper)
                    for _, digits in mappings)

    conn.executemany("INSERT INTO words VALUES (?,?,?,?,?,?,?)", rows)
    conn.execute("CREATE INDEX idx_digits ON words (digits, score DESC)")
    conn.commit()

    covered = conn.execute("SELECT COUNT(DISTINCT digits) FROM words").fetchone()[0]
    print(f"{len(rows)} words stored, {covered} distinct digit strings covered")
    conn.close()


if __name__ == "__main__":
    sys.exit(main())
