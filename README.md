# Voicebrush

Speak → it paints. Natural language becomes gestural brush strokes in real time.

## Tech
- Frontend: React + Vite + Framer Motion, HTML5 Canvas (procedural strokes, low-latency)
- Backend: FastAPI (Python) on Vercel Serverless
- STT: Web Speech API (browser)

## Dev
```bash
# backend
cd voicebrush-deploy
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000

# frontend
cd web && npm i && npm run dev
```

## Deploy (Vercel)
1. Push to GitHub
2. Import repo in Vercel
3. Build settings:
   - Frontend: Build Command `npm run build`, Output Directory `web/dist`
   - Backend: Python functions via `/api`
4. Set `VITE_API_BASE` to your Vercel deployment URL + `/` (or leave relative if using same domain; with vercel.json routes we can call `/api/parse` relative)

With the included `vercel.json`, `/api/*` routes to Python backend.
