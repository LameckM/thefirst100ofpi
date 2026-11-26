# Number Stories

Number Stories is a general-purpose memory-training application built around the **Major System**. It turns numbers into consonant sounds, memorable words and linked mental images. Use it to remember Pi, phone numbers, dates, codes and other numeric sequences.

## Stack

- **Backend:** Python + FastAPI; existing Major System encoder, pronunciation decoder, word database and quiz endpoints are preserved.
- **Frontend:** React + Vite.
- **Data:** SQLite word database generated from CMU Pronouncing Dictionary and word-scoring resources.

## Run the backend

From the repository root:

```bash
pip install -r requirements.txt
uvicorn app:app --reload
```

The API is available at http://127.0.0.1:8000.

## Run the React frontend in development

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite address printed in the terminal (normally http://localhost:5173). The Vite development server proxies `/api` requests to FastAPI at http://127.0.0.1:8000.

## Build for production

```bash
cd frontend
npm run build
```

Vite writes the production bundle to `frontend/dist`. FastAPI automatically serves that React build from `/` when it exists. Until a build is present, the original static page remains as a compatibility fallback.

## Dictionary and Personal Word Library

The generated word database now stores every distinct usable pronunciation for a word, rather than only its first pronunciation. This improves coverage for number groups with alternate spoken forms.

To rebuild the dictionary after updating the project dependencies:

```bash
python build_db.py
```

The rebuild replaces only the shared dictionary.

## Personal Word Library

When a suggested word is missing or does not suit you, add a custom word to that number group in the Create view. Dictionary words are checked against the exact digit group before saving. Saved words stay in the visitor's browser only, so visitors never see each other's words, and clearing site data removes them. The server has no endpoint that writes data.

## Compound words for numbers with no word

Some digit groups (like 399) have no single dictionary word. When a group of 3 or 4 digits has none, the engine joins two real, picturable words whose sounds add up to the group: map + boy = "mapboy". Group boundaries never move, real words and your saved personal words always rank first, and a blend is skipped if its spelling is already a different real word. The card shows the two halves, and the Learn decoder splits a compound back into sounds.

## Main experiences

- **Create:** encode a number, choose 2–4 digits per word, swap alternative images, regenerate the story and copy the result.
- **Your own story:** write text before, between and after your images. The images stay locked in order. Start from the suggested story, edit freely, and your text is saved in the browser per number. Swapping a word keeps your text and flags the spot to recheck.
- **History:** save a story with a title, then find, search, rename, copy, reopen or delete it on the History tab. Everything is stored in the browser only (no account), so clearing site data removes it.
- **Learn:** understand the Major System sound map, learn the rules and decode a word sound by sound.
- **Practice:** complete 10-question rounds across sound, digit, word and number exercises at easy or medium difficulty.

## API endpoints

- `GET /api/encode?number=3141592&target=3` (add `compounds=false` to turn off two-word blends)
- `GET /api/words?digits=141&limit=40` (returns a `hints` map when a number only has blends)
- `POST /api/story`
- `GET /api/decode?word=phone`
- `GET /api/check-word?word=tulip&digits=159`
- `GET /api/quiz?kind=mix&level=easy`

The API contract is intentionally kept stable so the React client does not require a rewrite of the Python memory engine.
