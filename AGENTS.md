# AGENTS.md

Rules for agents working in this repo. Read this before changing anything.

## The app has its own rules

`app/CLAUDE.md` is authoritative for everything under `app/`. Read it before touching app code
and follow it — package manager (bun, not npm), forbidden files, styling, routing and UX rules.
When this file and `app/CLAUDE.md` disagree about app code, `app/CLAUDE.md` wins.

## Backend conventions

- Controllers are plain files in `backend/src/*.controller.ts`. There are no Nest modules: every
  new controller must be imported and added to the `controllers` array in the `AppModule` in
  `backend/src/main.ts`, or it will not be served.
- The database schema is `backend/prisma/schema.prisma` and it is the source of truth. Change the
  schema first, then the code that queries it. After a schema change run `npx prisma db push`.
- All AI access goes through `AiService` (`backend/src/ai/ai.service.ts`). Do not call a model SDK
  or an AI endpoint directly from a controller. Prompts live in `ai.service.ts` only; a provider
  file just sends a prompt and returns parsed JSON.
- API responses use the global envelope in `main.ts`: `{ success, data }` / `{ success: false,
  statusCode, message }`. The app unwraps `data`, so do not change this shape casually.
- Patient identity comes from the national ID scan, never from user input. Keep the verification
  gate in `AuthGuard` (`backend/src/common/auth.ts`) server-side; do not rely on hiding screens.
- Files under `STORAGE_DIR` are not public. A result PDF is only served through
  `GET /api/reports/:id/file/result.pdf`, which checks ownership.
- The backend uses npm; the app uses bun. Do not mix them.

## Secrets and data safety

- Never commit `.env`, API keys, tokens or passwords. Only `.env.example` belongs in git.
- Never send real patient data — ID card images, lab result PDFs, names — to the free AI tier.
  Free-tier inputs may be used to improve the provider's products and read by human reviewers.
  Use fake data for demo and testing, and a paid tier or another provider for real patients.
- Keep patient data out of logs and error messages.

## Before handing back

Run these for whatever you touched:

```bash
cd backend && npm test
cd app && bun test && bun run typecheck && bun run lint
```

Report what you ran and what passed. Do not commit; the supervisor reviews and commits.

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`). No AI attribution lines, no
co-author or generated-by footers.