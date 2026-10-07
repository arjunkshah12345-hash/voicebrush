# Voicebrush

Soundbrush. Let sound paint beautiful art.

Voicebrush is an AI-powered creative canvas that turns sound into living visuals in real time. Speak, hum, clap, or play music — your voice and audio become fluid, gestural brush strokes that flow across the screen.

## How it works
- Real-time audio analysis (Web Audio API): RMS amplitude + FFT frequency bands (low/mid/high) drive brush motion, thickness, energy, and color.
- Organic path-based strokes: FFT-driven radial bursts form smooth, liquid trails with screen-blended glow.
- Instant feedback: responsive, low-latency, full-screen HiDPI canvas.
- Zero friction: click "Start mic", allow mic permission, create art instantly.

## Demo
[Live Demo](https://voicebrush-deploy.vercel.app)

## Tech Stack
- **Frontend**: React + TypeScript + Vite, HTML5 Canvas, Framer Motion
- **Audio**: Web Audio API (AnalyserNode, time/frequency domain)
- **Backend**: FastAPI (Python) serverless on Vercel
- **Deploy**: Vercel (full-stack: static + API)

## Features
- Sound-responsive painting (speech, humming, clapping, ambient music)
- Dynamic color hue that reacts to energy
- Smooth quadratic bezier trails with glow/compositing
- Fully responsive, full-screen immersive canvas
- Lightweight, fast, beautiful

## Dev
```bash
# frontend
cd web && npm i && npm run dev

# backend
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

## Deploy
```bash
vercel --prod
```

## Inspiration
The intersection of AI + Creativity — turning sound into visual expression.
