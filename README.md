# Playbook — AI Storybooks for Kids

One sentence → a beautifully illustrated children's storybook. TypeScript-only,
single-process Next.js app: story planning (Groq), cover + page illustrations
(Cloudflare Workers AI), live narration (ElevenLabs), and PDF/ePub composition
all run as Next.js route handlers. No Python, no object storage, no database —
every asset lives in a local `data/` folder.

## Stack

- Next.js 16 (App Router, Route Handlers, SSE streaming)
- React 19 + TypeScript + Tailwind CSS 4
- `pdf-lib` (PDF), `jszip` (ePub), `react-pageflip` (3D flipbook preview)
- Providers called via plain `fetch`:
  - Story planning — Groq (`llama-3.3-70b-versatile`)
  - Images — Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`)
  - Narration — ElevenLabs (`eleven_flash_v2_5`)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your API keys
npm run dev                        # http://localhost:3000
```

## API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/plan` | POST | Plan a story from a prompt → `{ spec, plan_key, generation_id }` |
| `/api/generate` | POST | SSE stream: A.plan → B0.cover → B1.illustrations → C.compose |
| `/api/tts` | POST | Synthesize narration audio for a page of text |
| `/api/history` | GET | List this session's generations |
| `/api/history/[id]` | GET/DELETE | Fetch or delete a generation |
| `/api/generations/[id]/download/pdf` | POST | Build + download the book as PDF |
| `/api/generations/[id]/download/epub` | POST | Build + download the book as ePub |
| `/api/assets/[...key]` | GET | Serve generated images/spec from disk |
| `/api/health` | GET | Storage + provider key status |

## How it works

1. **Plan** — Groq turns your prompt into a `BookSpec` JSON (title, style,
   cover, 6–12 pages with illustration prompts + story text), stored at
   `data/generations/<id>/book.json`.
2. **Cover + illustrations** — each prompt is sent to Cloudflare Workers AI;
   the PNG is written to `data/generations/<id>/` and served through
   `/api/assets/...`.
3. **Narration** — read-aloud audio is generated live in the flipbook reader
   via `/api/tts` (ElevenLabs).
4. **Compose** — PDF (pdf-lib) and ePub (jszip) are built on demand from the
   stored spec + images.

All assets are local — swap `src/lib/store.ts` if you ever want cloud storage.

## Scripts

- `npm run dev` — dev server on :3000
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
