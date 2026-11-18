# Number Stories (Major System memorizer)

Type a number, get one picturable word per chunk of digits, plus a short story that chains the words together. Includes a lesson for people who don't know the Major System and a practice test.

## Run it

```
pip install -r requirements.txt
uvicorn app:app --reload
```

Open http://127.0.0.1:8000

The word database (`major.db`) is included. To rebuild it from scratch:

```
python build_db.py
```

## The three tabs

Create turns a number into words and a story. Click any small word under a card to swap it.

Learn teaches the system: the digit table with memory hooks, the four rules that trip people up, a live decoder (type any word, see its number sound by sound), and a worked example.

Practice runs 10-question rounds. Question types are digit to sounds, sound to digit, word to number, and number to word (pick from four, or type your own word and it is checked). Easy uses 1 and 2 digit numbers, Medium uses 3 digit numbers and tricky spellings like soft c and ph. Wrong answers are explained and listed at the end.

## How it works

1. `build_db.py` reads the CMU Pronouncing Dictionary and converts each word's sounds to Major System digits (T/D/TH = 1, N = 2, M = 3, R = 4, L = 5, SH/CH/J = 6, K/G = 7, F/V = 8, P/B = 9, S/Z = 0, vowels ignored).
2. Each word is scored by how common it is (wordfreq) and how easy it is to picture (WordNet: concrete nouns like animals, objects, food and people get a bonus, verbs and adjectives a penalty). Names (Wilson, Malibu), acronyms and words WordNet doesn't know are pushed to last resort, function words (have, at, it) are blocked, and rude words are filtered out. To block more words, add them to the `STOP` set in `build_db.py` and rebuild.
3. `major.py` splits your number into chunks (2, 3 or 4 digits per word, your choice) using a small dynamic program, picking the best-scoring word for each chunk and avoiding repeats. It also decodes any word back to digits with a sound-by-sound breakdown.
4. `quiz.py` builds the practice questions from the same database, and checks every answer against the dictionary.
5. A template builds the story that links the words in order.
6. Numbers with no single word (like 399) get a compound: two real words joined, such as map + boy = "mapboy". Both halves must be picturable words, the blend is never allowed if its spelling is already a different real word, and real words always rank above compounds. Every 3 digit number is covered this way, and all 4 digit numbers except 8989. The card shows the two halves under the compound, and the Learn decoder splits compounds back into sounds.

## API

- `GET /api/encode?number=3141592&target=3` returns chunks, alternatives and a story (add `compounds=false` to turn off the two-word blends)
- `GET /api/words?digits=141&limit=40` returns more words for one chunk (blends plus a `hints` map when the number has no single word)
- `POST /api/story` with `{"words": [...], "digits": [...], "variant": 0}` rebuilds the story
- `GET /api/decode?word=phone` returns the number for any word, sound by sound
- `GET /api/check-word?word=tulip&digits=159` checks whether a word stands for a number
- `GET /api/quiz?kind=mix&level=easy` returns one practice question (kind: mix, sounds, digit, word, number)

## Next steps

- Replace the template story with an AI-written one (one API call per request, so add rate limits first)
- Let users type their own word for a chunk on the Create tab
- Add a memory-palace mode that groups the words into stops
- Save quiz scores so people can see their progress
