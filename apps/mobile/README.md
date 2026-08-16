# @euda/mobile

EudaChat mobile client (Expo Router). This package absorbs Lime’s Expo app into the comms workspace: same shared Supabase project as `@euda/web`, English as the default language (Trinidadian Creole is opt-in later). It is a lean Phase 8 stub — real auth + feed/status reads, not a no-op README.

Do not add NestJS, Prisma, LiveKit, or VAPID secrets here. Channels stay on the web app.

## Run

From the repo root (after `pnpm install` at the workspace):

```bash
pnpm --filter @euda/mobile dev
```

Workspace scripts stay no-op so CI does not install Expo. From `apps/mobile`:

```bash
npx expo install
npx expo start
```

## Env

Copy `.env.example` to `.env` in this directory. Use the **same** Supabase project as `apps/web` (the `NEXT_PUBLIC_*` values), renamed for Expo:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Never put the service role key, LiveKit keys, or VAPID keys in `EXPO_PUBLIC_*`.

## Reviewer demo

Same public demo as the web app:

- Email: `eudachat-reviewer@example.com`
- Password: `EudaChat-Review-2026`

On the login screen, tap the hint to fill those fields.

## What this stub does

| Screen | Behavior |
|--------|----------|
| Login | Email/password against shared Supabase Auth; session stored in SecureStore |
| Feed | Public `posts` where `deleted_at` is null, newest first, limit 40 — body + like count |
| Status | Non-expired public `statuses` |
| Messages | Link-out to https://comms-joes9987.vercel.app (full chat is not reimplemented) |

`build`, `lint`, `test`, and `typecheck` are no-op `process.exit(0)` scripts so Turbo/CI that touches this package does not fail.
