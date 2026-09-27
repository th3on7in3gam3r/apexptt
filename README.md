# ApexPTT

Tactical push-to-talk walkie-talkie: React + Express + WebSockets, with optional Gemini transcription.

Repo: https://github.com/th3on7in3gam3r/apexptt

## Run locally

**Prerequisites:** Node.js LTS

1. `npm install`
2. Copy `.env.example` to `.env.local` and set `GEMINI_API_KEY`
3. `npm run dev`
4. Open http://localhost:3001 (or 3002 if 3001 is taken)

Without a Gemini key, voice still works; transcripts fall back to canned radio text.

## Deploy on Render

1. Push this repo to GitHub (already configured as origin once you clone/push)
2. Open [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/th3on7in3gam3r/apexptt)
3. Paste your `GEMINI_API_KEY` when prompted
4. Apply the Blueprint

The free web service sleeps after about 15 minutes of inactivity. No database is required.
