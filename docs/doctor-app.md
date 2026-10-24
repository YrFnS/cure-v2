# Cure Doctor / كيور دكتور

Standalone Expo SDK 54 doctor app in `doctor/`.
Bundle/package ID: `com.e2next.curedoctor`.

Uses the patient app's dependency version ranges for its required packages:
Expo Router (`src/app`), NativeWind/Tailwind 3, React Query, Zustand, and
lucide icons. No backend or patient-app changes are included here.

## Run

From the repository root:

```bash
cd doctor
bun install
# Fake clinic; no backend, WhatsApp service, or real credentials required:
EXPO_PUBLIC_API_MOCK=1 bun run start
# Or browser preview:
EXPO_PUBLIC_API_MOCK=1 bun run web
```

Open with an SDK-54-compatible Expo Go/development client, or the web browser.
No EAS project or build is required for the export checks below.

Demo login: any valid Iraqi mobile number, e.g. `07700000000`, and any password
of at least six characters. Demo signup code: `123456`. These are fake demo
values, not production credentials. The banner identifies mock mode.

Mock profile, weekly slots, appointments, and changes are **in memory** and
reset on reload. Only a separate demo session marker and the language preference
survive reload. Demo photo upload previews the selected photo locally; it does
not upload or persist it.

For the real backend:

```bash
EXPO_PUBLIC_API_MOCK=0 \
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api bun run start
```

Use the same `EXPO_PUBLIC_API_URL` as `app/`; the default is
`http://localhost:3000/api`. On a physical device, localhost means that device,
not the backend host. Use HTTPS outside local development. Environment variables
are bundled at build time: restart Expo after changing them.
`doctor/.env.example` documents the variables; never commit an actual `.env`
or credentials.

Real mode requires the backend implementation of
[doctor-api-contract.md](doctor-api-contract.md). Signup codes come from the
backend WhatsApp service; the app never creates or validates real codes locally.
Login uses phone/password, not OTP. Real mode never falls back to mock data.

## Screens

- `/`: Three swipeable welcome slides, wave decoration, skip/next, and
  login/register. Authenticated sessions redirect to Home.
- `/login`: Phone/password, error/retry, and doctor-only role validation through
  `users/me`.
- `/register`: First/last name, phone, password, valid birth date, gender,
  specialty, and terms dialog/acceptance. Signup send precedes six-box code
  confirmation, with paste/autofill, resend, and edit-details controls.
- `/home`: Greeting/profile shortcut, today's appointment/patient counts,
  Bookings/Patients cards, refresh, language choice, and logout confirmation.
- `/patients`: Appointment cards with name/gender/age, date/time, optional
  hospital, four status chips, search, date/time sort, refresh, and empty/error
  states. Start → OPEN, Done → CLOSED, Cancel → CANCELLED with confirmation.
  No reports or lab data are displayed.
- `/bookings`: Weekly schedule grouped Sunday–Saturday and a Manage tab.
  Add/remove day/from/to/max slots, validate times/capacity/overlaps, and save
  the whole week, and discard unsaved changes. Empty schedules can be saved.
  Failed saves retain the draft.
- `/profile`: Avatar, name/specialty, personal/contact rows, editable
  first/last/Arabic name, specialty, bio, and gender. JPG/PNG photo upload,
  active/inactive switch, language choice, and logout are included.

The schedule uses **local clinic time**, `HH:mm`; calendar dates use
`YYYY-MM-DD`, not UTC conversion. The profile hospital is displayed from the
backend. No hospital picker is invented because the shared contract has no
hospital-directory endpoint.

Arabic is the default regardless of device language. `src/lib/i18n/{ar,en}.ts`
contains both dictionaries; the language preference is persisted separately.
Screen direction, rows, and text follow Arabic RTL / English LTR immediately.
OS launcher names are localized through `locales/`. DIN Arabic is loaded as a
normal font, not italic. Cairo Regular/Medium/SemiBold/Bold supplies other text.

## API/session boundaries

- Network calls live in `doctor/src/lib/api.ts`, typed by `types.ts` from the
  shared contract. The client unwraps `{ success, data }`, handles HTTP/envelope
  errors, and times out requests after 15 seconds.
- Native session tokens use Expo SecureStore, with doctor-specific real/demo
  keys. Profile and appointment data remain in React Query memory, never
  AsyncStorage. Hydration/role validation precedes protected routes; 401s end
  the local session and remove cached authenticated data.
- Logout calls the backend before deleting local state. If the server cannot
  be reached, the dialog offers explicitly device-only logout. This does
  **not** revoke the server session.
- The **web demo** stores its token in browser localStorage.
  Use httpOnly-cookie authentication before a public web launch. Web preview
  authentication is not production-ready.
- Photo upload uses multipart field `photo`; real avatars use the backend's
  private/expiring URL, refreshed with the profile. The picker accepts JPG/PNG
  up to 5 MB; backend validation/authorization remains authoritative.
- Mutation retries are not automatic. Successful mutations update/invalidate
  shared queries. Existing data stays visible during refetch errors, with
  explicit retry controls.
- Mock traffic is intercepted locally and returns contract envelopes and DTOs.
  No Flutter tokens, provider constants, client OTP implementation, TLS
  overrides, hardcoded service units, OCR, PhotoRoom, or OneSignal code were
  copied.

## Copied assets

Read-only source: `/home/e2next/cure-doctor`.
Destinations below are relative to `doctor/assets/`.

- `assets/fount/DINNEXTLTARABIC-LIGHT-2-2.ttf`
  → `fonts/din-next-arabic.ttf`.
- `assets/Cairo/static/Cairo-{Regular,Medium,SemiBold,Bold}.ttf`
  → `fonts/cairo-{regular,medium,semibold,bold}.ttf`.
- `assets/Cairo/OFL.txt` → `fonts/cairo-license.txt`.
- `assets/lllogo.png` → `images/logo.png`.
- `assets/splash_screen.png` → `images/splash-screen.png`.
- `assets/Screenshot_2025-02-06_at_15.44.56-removebg-preview.png`
  → `images/login-hero.png`.
- `assets/Screenshot 2025-02-21 at 12.56.07.png`
  → `images/welcome-patients.png`.
- `assets/Screenshot 2025-02-21 at 13.01.47.png`
  → `images/welcome-bookings.png`.
- `assets/Screenshot 2025-01-29 at 18.54.30.png`
  → `images/welcome-care.png`.
- `images/reservation.png` → `images/reservation.png`.
- `images/user.png` → `images/user.png`.

The app retains the old doctor's blue/indigo palette, pale backgrounds, white
rounded cards, soft shadows, chips, and illustrations. Welcome copy describes
only v1-supported appointments/patient lists rather than promising access to
reports. Asset/font rights are inherited from the reference project; verify
distribution rights before release.

## Checks

```bash
cd doctor
bun install
bun test
bunx tsc --noEmit
bun run lint
EXPO_PUBLIC_API_MOCK=1 bunx expo export --platform android
EXPO_PUBLIC_API_MOCK=1 bunx expo export --platform web
```

Unit tests cover input/schedule validation, status transitions, mock contract
behavior, auth role rejection/session restore/cache clearing, bearer headers,
malformed envelopes, multipart upload, and exact request payloads.

Mock web smoke testing exercises onboarding, failed signup/code recovery,
session reload, appointment actions/search, schedule overlap/recovery/save,
profile editing/photo selection, status toggle, and logout confirmation.

Native keyboard/safe-area/photo-permission behavior and live backend/WhatsApp
integration still need device/integration QA. Backend concurrency, ownership,
directory visibility, and notifications must be verified in the backend worker's
implementation; the app does not replace those server-side checks.
No EAS build, submission, commit, or push was performed.
