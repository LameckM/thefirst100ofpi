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

## Main experiences

- **Create:** encode a number, choose 2–4 digits per word, swap alternative images, regenerate the story and copy the result.
- **Learn:** understand the Major System sound map, learn the rules and decode a word sound by sound.
- **Practice:** complete 10-question rounds across sound, digit, word and number exercises at easy or medium difficulty.

## API endpoints

- `GET /api/encode?number=3141592&target=3`
- `GET /api/words?digits=141&limit=40`
- `POST /api/story`
- `GET /api/decode?word=phone`
- `GET /api/check-word?word=tulip&digits=159`
- `GET /api/quiz?kind=mix&level=easy`

The API contract is intentionally kept stable so the React client does not require a rewrite of the Python memory engine.
