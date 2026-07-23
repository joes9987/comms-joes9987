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

`profiles` (1:1 with `auth.users`, auto-created by trigger) → `channels` (public/announcements) →
`messages` (belongs to exactly one of `channel_id` / `dm_thread_id`) → `notifications` (DM +
`@mention` alerts, populated by DB triggers, never written directly by the client).

See [supabase/migrations/001_init.sql](supabase/migrations/001_init.sql) for the full schema, RLS
policies, and triggers.

## Deploy

Vercel project (not yet linked). Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) required in the Vercel dashboard for a live deploy; the build
itself succeeds without them (see README "Known limitations").
