# Cure v2

Patient health app for Iraq: a React Native client and a NestJS API. Patients verify their
identity from a photo of their national ID, share results from a lab with a one-time code, and
read a plain-language summary of each lab result.

Same UI as the original Cure app. This is a rewrite: there is no Frappe and no legacy backend —
the database is the source of truth.

- `app/` — Expo (React Native) patient app
- `backend/` — NestJS + Prisma + MariaDB API, plus the lab technician portal

## Flows

**Sign up and verify.** Signup is an Iraqi phone number plus a password, confirmed with a 6-digit
code sent over WhatsApp (UltraMSG). The account is not usable until the national ID is verified:
the patient photographs the front and back of the card, the backend sends both images to the AI
provider, the provider reads the fields and fills the profile, and the account becomes verified.
The gate is enforced server-side — `AuthGuard` returns `403 ID verification required` for any
patient route not marked `@AllowUnverified()`. Hiding screens is not the control.

**Lab results.** The patient opens the Lab Code screen and gets a single-use 6-character code
(ambiguous characters removed), shown as a QR code and as text, valid for 10 minutes. The code
carries no patient data. The lab technician signs in to the portal at `http://<server>/lab/`,
enters the code, confirms the patient's name, and creates an order; later they upload the result
PDF. The patient gets a notification and the result screen shows an AI summary plus four
suggested questions they can tap.

That is not a chat. The backend only answers a question that is already in the suggestion list
for that result; anything else is rejected. Answers are cached on the order, so a question is
answered once and re-reads are free.

**Directory.** Hospitals, labs and doctors are display-only. There is no booking. Rows come from
`backend/prisma/seed.ts` or the database directly.

Create a lab and its login (the password is generated and printed once):

```bash
cd backend
npm run lab:create -- --name "مختبر النور" --username alnoor --location "بغداد" --phone "+964 770 000 0000"
npm run lab:create -- --lab-id <id> --username alnoor2   # another login for the same lab
```

## Repo layout

```
app/                     Expo app
  src/app/               Expo Router routes (root layout is src/app/_layout.tsx)
  src/components/        Reusable UI
  src/lib/               Helpers, auth store, secure storage
  src/lib/api/           API client; api.js is the fetch wrapper
  CLAUDE.md              App conventions — read before changing anything under app/
backend/                 NestJS API
  prisma/schema.prisma   Database schema (source of truth)
  prisma/seed.ts         Directory and demo lab user
  public/lab/index.html  Lab technician portal (plain HTML/JS)
  src/*.controller.ts    Controllers, registered in AppModule in src/main.ts
  src/ai/                AiService, the AiProvider interface, provider files
  src/common/            Auth guard, OTP store, Prisma service, storage, WhatsApp
  storage/               ID scans and result PDFs (never served statically)
```

## Local setup

### Backend

The backend uses **npm** (there is a `package-lock.json`); the app uses **bun**.

```bash
cd backend
cp .env.example .env      # fill in DB_* , DATABASE_URL, GEMINI_API_KEY
docker compose up -d db   # or point DATABASE_URL at any MariaDB
npm install
npx prisma db push
npm run db:seed
npm run build && npm run start:prod
```

Serves on port 3000 (set `PORT`). In development, leaving `ULTRAMSG_API_URL` and
`ULTRAMSG_TOKEN` empty means WhatsApp codes are printed to the server log instead of sent.

```bash
npm test          # node --test over src/common/*.test.ts
```

### App

```bash
cd app
bun install
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000/api bun start
```

Use the machine's LAN IP, not `localhost`, when running on a physical device.

```bash
bun test
bun run typecheck
bun run lint
```

## Demo server

Runs on the E2NEXT demo VPS (`ssh e2next-demo`) at
`https://cure-v2.148-230-111-16.sslip.io` (API under `/api`, lab portal at `/lab/`).

- Checkout `~/cure-v2`, backend `.env` in `~/cure-v2/backend/.env` (mode 600, holds the DB,
  Gemini, UltraMSG and seed lab credentials).
- Own Node 24 in `~/cure-v2/.node` (Prisma 7 does not support the system Node 23; the other
  apps on the box keep using it).
- Database `cure_v2` on the server's MariaDB; pm2 process `cure-v2` on port 3020; nginx vhost
  `cure-v2.148-230-111-16.sslip.io` with a Let's Encrypt certificate (`proxy_read_timeout 180s`,
  `client_max_body_size 25m`).

Update (the repo is public, so the server pulls without GitHub credentials):

```bash
ssh e2next-demo
cd ~/cure-v2 && git pull --ff-only
cd backend && export PATH=$HOME/cure-v2/.node/bin:$PATH
npm ci && npx prisma generate && npx prisma db push && npm run build
pm2 restart cure-v2
```

## AI provider

Every AI call goes through `AiService` in `backend/src/ai/ai.service.ts`. The provider and model
are chosen by env on the backend — the app never sees the key, and switching providers needs no
app rebuild:

```
AI_PROVIDER=gemini
AI_MODEL=gemini-3.8-flash
GEMINI_API_KEY=...
```

A provider's whole job is to send a prompt plus optional files and return parsed JSON:

```ts
import type { AiFile, AiProvider } from './ai.provider';

export class MyProvider implements AiProvider {
  private readonly apiKey = (process.env.MY_API_KEY ?? '').trim();
  private readonly model = (process.env.AI_MODEL ?? '').trim();

  async generateJson(prompt: string, files: AiFile[] = []): Promise<unknown> {
    // ...call the API with `prompt` and `files` ({ mimeType, base64 })...
    return JSON.parse(responseText);
  }
}
```

Adding one is that file plus one line in `PROVIDERS` in `backend/src/ai/ai.provider.ts`:

```ts
const PROVIDERS: Record<string, () => AiProvider> = {
  gemini: () => new GeminiProvider(),
  myprovider: () => new MyProvider(),
};
```

Prompts live only in `ai.service.ts` — do not put them in a provider file.

### Free-tier warning

The Gemini free tier is for demo and testing with **fake data only**. Google's terms allow
unpaid-tier inputs to be used to improve their products and read by human reviewers. ID card
images and lab result PDFs are exactly the kind of input that must not be sent to it. Before
real patients use this, switch to a paid tier or a different provider.

## Storage and files

ID scans and result PDFs are written under `STORAGE_DIR` and are not served statically. A PDF is
reachable only through an authenticated route that checks the order belongs to the caller:

```
GET /api/reports/:id/file/result.pdf
```

Profile photos are the exception: they are public under an unguessable UUID name under `/uploads`.

## API

Base URL `/api`. Every response is wrapped: `{ "success": true, "data": ... }`, or
`{ "success": false, "statusCode": n, "message": "..." }`. Authenticate with
`Authorization: Bearer <token>`.

Unless marked otherwise, routes require a verified patient; `@Roles('LAB')` routes are for lab
users and are scoped to their own lab.

### Auth and profile

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/signup/send` | Sends the WhatsApp code for a phone number |
| POST | `/api/auth/signup/confirm` | Phone + code + password; returns token and patient |
| POST | `/api/auth/login` | Patient by phone, lab/admin by username |
| POST | `/api/auth/logout` | Deletes the session |
| POST | `/api/auth/password-reset/send` | Same answer whether or not the number is registered |
| POST | `/api/auth/password-reset/confirm` | New password; ends all sessions |
| GET | `/api/users/me` | Current patient |
| PATCH | `/api/users/me` | Profile photo only; identity fields come from the ID card |

### Verification

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/verification/id` | Front + back of the national ID; AI reads it and fills the profile |

### Lab

| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| POST | `/api/lab-token` | patient | New single-use code, valid 10 minutes |
| GET | `/api/lab/tokens/:code` | lab | Looks up the patient so the tech can confirm the name |
| POST | `/api/lab/orders` | lab | Consumes the code, creates the order |
| GET | `/api/lab/orders` | lab | This lab's orders only |
| POST | `/api/lab/orders/:id/result` | lab | Uploads the result PDF, notifies the patient |

### Reports

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/reports` | `?type=laboratory&limit=` |
| GET | `/api/reports/recent` | `?limit=` |
| GET | `/api/reports/:id` | Includes summary and suggestions, generating them if missing |
| POST | `/api/reports/:id/ask` | One of the suggested questions only; answers are cached |
| GET | `/api/reports/:id/file/:name` | Authenticated PDF download |

### Notifications

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/notifications` | `?limit=` |
| GET | `/api/notifications/recent` | `?limit=` |
| GET | `/api/notifications/unread-count` | |
| PATCH | `/api/notifications/read-all` | |
| PATCH | `/api/notifications/:id/read` | |
| DELETE | `/api/notifications/:id` | |
| POST | `/api/notifications/push-token` | Registers an Expo push token |
| DELETE | `/api/notifications/push-token` | |

### Directory

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/hospitals` | Hospitals and labs together |
| GET | `/api/hospitals/:id` | |
| GET | `/api/doctors` | `?search=&specialty=` |
| GET | `/api/doctors/:id` | |

### Static

| Path | Notes |
| --- | --- |
| `/lab/` | Lab technician portal |
| `/uploads/` | Public profile photos (UUID names) |