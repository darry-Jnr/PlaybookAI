# Playbook

Type a story idea, get a beautifully illustrated children's storybook.

Playbook plans the story, generates a cover and page illustrations, reads it
aloud, and exports it as a PDF or ePub — all in one Next.js app.

## What it does

- Turn a one-sentence idea into a complete story
- AI-generated cover and illustrations for every page
- Live read-aloud narration
- 3D flipbook preview
- Download as PDF or ePub
- Saved history — pick up where you left off

## Getting started

```bash
npm install
cp .env.local.example .env.local   # add your API keys
npm run dev                        # open http://localhost:3000
```

## Scripts

- `npm run dev` — dev server on :3000
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript

## Render Workflows (optional)

Image generation can run as a distributed workflow on Render instead of inline
in the API route. Workflow mode turns on only when `RENDER_API_KEY` and
`PLAYBOOK_WORKFLOW_SLUG` are set — otherwise the inline pipeline is used.

Tasks live in `workflows/tasks.ts`: `generateBook` fans out to `generateCover`
plus one `generatePage` per page, and each task uploads its PNG to the web
service via `POST /api/internal/ingest`.

Setup on Render (blueprints can't create workflow services, so do this once in
the dashboard):

1. Deploy this branch as a web service with `render.yaml` (or the existing
   service). Add env vars: `RENDER_API_KEY`, `PLAYBOOK_WORKFLOW_SLUG`,
   `INGEST_SECRET`, `GROQ_API_KEY`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`,
   `ELEVENLABS_API_KEY`. Generate the secret with `openssl rand -hex 24`.
2. Create a new **Workflow** service (not Private Service) pointing at this
   repo/branch with start command `npx tsx workflows/tasks.ts`. Give it
   `INGEST_SECRET` and `WEB_SERVICE_URL` (the web service URL), plus the
   `CF_ACCOUNT_ID` / `CF_API_TOKEN` used by the image provider.
3. Set `PLAYBOOK_WORKFLOW_SLUG` on the web service to the workflow service's
   owner/task namespace slug.
