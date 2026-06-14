# Supabase Auth Migration — Design

**Date:** 2026-06-14
**Status:** Approved (pending spec review)

## Goal

Replace NextAuth (Auth.js) with **Supabase Auth (GoTrue)** as the authentication
system, managing all providers from the Supabase dashboard. Requirements:

- Demo user (`demo@forge.dev` / `forge`) must stay (non-production only).
- Users can self-register with email + password.
- OAuth sign-in via **Azure (Microsoft)** and **GitHub**, configured in the
  Supabase dashboard.
- Manage everything (auth, DB) from Supabase, including the Supabase MCP server.

Decisions taken during brainstorming:
- Existing `users`/`projects` data is demo/test only → **safe to reset**.
- Email/password signup uses **auto-confirm** (no email verification in dev).

## Architecture

### Auth engine
- Supabase Auth (GoTrue) replaces NextAuth entirely.
- Client integration via `@supabase/ssr` + `@supabase/supabase-js`:
  - `src/lib/supabase/client.ts` — browser client (`createBrowserClient`).
  - `src/lib/supabase/server.ts` — server client (`createServerClient`, reads/writes cookies).
  - `src/lib/supabase/middleware.ts` — session refresh helper for middleware.
- Project ref: `txltrdijhvrgecktjrfs` → URL `https://txltrdijhvrgecktjrfs.supabase.co`.

### Providers
- **Azure** and **GitHub** configured in the Supabase dashboard (Authentication → Providers).
- Both OAuth callbacks point at Supabase: `https://txltrdijhvrgecktjrfs.supabase.co/auth/v1/callback`.
- "Allow users without an email" = **off** (an email is required for the DB bridge).

### Data bridge (no FK changes)
The only foreign key into `users` is `projects.userId`; every other table
cascades through `projects`. To keep all FKs intact:

- GoTrue owns `auth.users` (UUID primary key).
- A Postgres trigger `on auth.users insert` upserts into `public.users` with the
  **same id**. App-specific columns (`plan`, `githubToken`, `jiraDomain`,
  `jiraEmail`, `jiraToken`, `linearToken`, `name`, `image`) live in
  `public.users`.
- `projects.userId → public.users.id` is unchanged.
- `getSessionUser().id` === `auth.users.id` === `public.users.id`.

### Schema changes
- Drop NextAuth adapter tables: `accounts`, `sessions`, `verification_tokens`.
- Drop `users.passwordHash` (GoTrue stores credentials in `auth.users`).
- Keep `users` as the public profile/settings table, synced from `auth.users`.
- Drizzle migration generated for the drops; trigger added via SQL migration.

### Demo user
- Seeded as a real Supabase user via the service-role admin API
  (`auth.admin.createUser`, `email_confirm: true`), email `demo@forge.dev`,
  password `forge`.
- Login through `supabase.auth.signInWithPassword`.
- Demo button gated to non-production (existing `NODE_ENV !== "production"` +
  `NEXT_PUBLIC_ALLOW_DEMO_LOGIN` guard carries over).

## Code changes (~10 files)

| File | Change |
|------|--------|
| `src/lib/supabase/client.ts` | **new** browser client |
| `src/lib/supabase/server.ts` | **new** server client (cookie-based) |
| `src/lib/supabase/middleware.ts` | **new** session refresh helper |
| `src/lib/api-auth.ts` | `getSessionUser()` uses `supabase.auth.getUser()`; same `{id,email}` shape, downstream unchanged |
| `src/middleware.ts` | refresh Supabase session + redirect unauthenticated to `/auth/signin` |
| `src/app/auth/callback/route.ts` | **new** — `exchangeCodeForSession` after OAuth |
| `src/app/auth/signin/page-client.tsx` | Azure/GitHub via `signInWithOAuth`; email/pass via `signInWithPassword`; demo button |
| `src/app/auth/register/page-client.tsx` | `signUp` (email/pass), OAuth buttons |
| `src/app/api/auth/register/route.ts` | **delete** — signup is client-side via `supabase.auth.signUp` |
| `src/actions/projects.ts`, `src/components/layout/sidebar.tsx`, `src/app/settings/page-client.tsx` | read session/user from Supabase |
| `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/app/api/auth/[...nextauth]/route.ts` | **delete** |
| `src/lib/auth-users.ts` | delete or trim (credential helpers no longer used) |
| `package.json` | remove `next-auth`, `@auth/core`, `@auth/drizzle-adapter`; add `@supabase/ssr`, `@supabase/supabase-js` |

## Environment variables

New:
- `NEXT_PUBLIC_SUPABASE_URL=https://txltrdijhvrgecktjrfs.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>`
- `SUPABASE_SERVICE_ROLE_KEY=<service role key>` (server-only; demo seed + admin)

Remove (after migration verified): `AUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_*`,
`AUTH_URL`. Keep `DATABASE_URL` (Drizzle still talks to the same Postgres).

## MCP server

Add the Supabase MCP server at project scope (`.mcp.json`):

```
https://mcp.supabase.com/mcp?project_ref=txltrdijhvrgecktjrfs&features=account,docs,database,debugging,development,functions,branching,storage
```

User authenticates with `claude /mcp` (cannot be done by the agent).

## Manual dashboard setup (user)

1. **Azure provider:** Application (client) ID, **Secret Value** (not Secret ID),
   Azure Tenant URL. Add Supabase callback URL to the Azure app registration.
2. **GitHub provider:** create a GitHub OAuth App with the Supabase callback URL,
   then paste Client ID + Client Secret.
3. "Allow users without an email" = **off** for both.
4. Authentication → disable "Confirm email" for dev.

## Error handling
- OAuth/callback errors redirect to `/auth/signin?error=<code>` with friendly
  messages (mirrors current UX).
- `getUser()` failures → treated as unauthenticated (401 from `requireUser`).

## Testing
- Manual: email signup → lands authenticated; signin; Azure; GitHub; demo button
  in dev; demo blocked in prod; project list scoped per user.
- Verify trigger: new `auth.users` row creates matching `public.users` row.
- Verify `projects.userId` FK resolves for a freshly signed-up user.

## Out of scope
- Email verification flow + SMTP (deferred; auto-confirm for now).
- Row Level Security policies (app enforces ownership in `api-auth.ts`; RLS can be
  a later hardening pass).
- Migrating existing real users (none — reset confirmed).
