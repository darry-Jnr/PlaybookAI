# PlaybookAI

Type a kid's idea, get an illustrated storybook.

PlaybookAI turns one sentence — "a dragon who's scared of homework" — into a
fully illustrated children's storybook: an AI writes the story, draws the cover
and every page, reads it aloud, and exports it as a PDF or ePub.

## Live demo

https://playbook-ai.onrender.com

## Design decisions

- **Groq (LLM)** — writes the structured story spec (title, art style, per-page
  text and illustration prompts). A one-line idea isn't a book; the LLM turns it
  into a real story and a blueprint for the images in seconds.
- **Cloudflare Workers AI (FLUX.1 Schnell)** — draws the cover and every page
  from that spec. No artist needed, and it renders fast enough for a whole book
  in about a minute.
- **Style prompt** — every image prompt is prefixed with the same art style so
  the pages look like one artist drew them.
- **ElevenLabs (TTS)** — reads the book aloud, because the audience is young
  kids who can't read yet.
- **Live progress (SSE)** — the generate route streams plan → cover →
  illustrations → compose to the UI, so generation never feels frozen and the
  book can be watched being built.
- **Per-step error handling** — a failed image is skipped instead of killing the
  whole book, so you get a mostly-finished book instead of nothing.

## What was built

- **Foundation** — Next.js scaffold, disk-based storage, Groq story planner,
  Cloudflare image provider, ElevenLabs TTS, PDF/ePub composers.
- **Product** — the API layer (`/api/plan`, `/api/generate` with live SSE, TTS,
  history, assets, downloads) and the frontend (landing page, create flow with
  live progress and a 3D flipbook, saved history).
- **Polish & deploy** — UI polish, lint/typecheck cleanup, docs, and deployment
  to Render with auto-deploys from GitHub.

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your API keys
npm run dev                        # open http://localhost:3000
```

## Deployment

Deployed on Render as a web service with automatic deploys from GitHub. No
persistent disk on the free plan, so generated books reset when the service
sleeps or redeploys.
