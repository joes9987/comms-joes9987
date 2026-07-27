# AGENTS.md — comms-joes9987

## Project

Hult Cohort Project 2: **EudaChat**, an internal comms platform for the cohort — channels, direct
messages, an admin-only announcements channel, keyword search, and realtime updates.

## Agent roles used

| Role | Tool | Work |
|------|------|------|
| Research | Cursor | Reused auth/session patterns from `pm-joes9987` (Supabase SSR client/server/middleware) |
| Development | Cursor | Next.js App Router + Supabase schema, RLS, triggers, chat UI |
| QA | Cursor | Fresh-clone install, `npm run build`, manual smoke path for auth/channels/DMs |

## Conventions

- Small focused commits; one concern per commit.
- No secrets in repo; `.env.local` gitignored, `.env.example` is the committed template.
- `@supabase/ssr` cookie handling uses **only** `getAll`/`setAll` — never the deprecated
  `get`/`set`/`remove` per-cookie API.
- `firebase-admin`-style server/client split is not applicable here (Supabase project), but the
  same spirit applies: `src/lib/supabase/server.ts` (server-only) is never imported from
  `'use client'` components — client components use `src/lib/supabase/client.ts`.

## Data model quick reference

`profiles` (1:1 with `auth.users`, auto-created by trigger; shared with EudaPM) → `channels`
(public/announcements) → `messages` (exactly one of `channel_id` / `dm_thread_id`) →
`chat_notifications` (DM + `@mention` alerts via security-definer triggers; **not** PM’s
`notifications` table). Private DOB lives in `profile_private` (owner-only RLS).

See [supabase/migrations/](supabase/migrations/) for schema, RLS, and storage policies.

## Testing

```bash
npm test   # Vitest RLS suite — needs SUPABASE_SERVICE_ROLE_KEY in .env.local
```

Live cases create ephemeral `@eudachat-rls.test` users and delete them afterward. Without the
service role key, those cases skip. CI: `.github/workflows/ci.yml`.

## Deploy

Production: https://comms-joes9987.vercel.app  
Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) required in the
Vercel dashboard; same project as EudaPM (`vidprovlxevofniwyhgs`).
