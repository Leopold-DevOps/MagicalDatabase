# Magical Database

A purple-themed Magic: The Gathering card explorer, inspired by Scryfall.

- **Stack:** Next.js (App Router) · TypeScript · Tailwind CSS
- **Data:** [Scryfall API](https://scryfall.com/docs/api)
- **Deploy:** Render (free tier) via `render.yaml`
- **Future:** Supabase for accounts, decks, and wishlists

## Pages

- `/` — Home with hero search and quick links.
- `/cards?q=...&page=N` — Search results from Scryfall (supports their query syntax).
- `/cards/[id]` — Card detail with oracle text, faces, legalities, price, and Scryfall link.

## Develop locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Deploy on Render (free tier)

1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at this repo. Render reads
   `render.yaml` and provisions a free Node web service.
3. Click **Apply**. First build takes ~3 minutes.

### Notes & gotchas

- The blueprint sets `NPM_CONFIG_PRODUCTION=false` so build-time
  devDependencies (Tailwind, PostCSS, TypeScript) install correctly. Without
  this Render's build-time `NODE_ENV=production` makes `npm` skip devDeps and
  the Turbopack build dies with `Cannot find module 'tailwindcss'`.
- The free plan sleeps after ~15 min of inactivity; first request after a sleep
  takes a few seconds to wake.
- Start command uses `next start` on Render's `$PORT`.

## Hooking up Supabase

Supabase will be our database for accounts, saved decks, and wishlists.

### 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new project.
   Pick a region close to your Render region (e.g. both `us-east`).
2. Once the project is ready, grab three values from
   **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` *(server-only — never
     ship to the client)*

### 2. Add env vars to Render

In your Render service: **Environment → Add Environment Variable** and add the
three vars above. After saving, trigger a manual deploy.

For local dev, create a `.env.local` (gitignored):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # only for server-side code
```

### 3. Install the SDK

```bash
npm install @supabase/supabase-js @supabase/ssr
```

### 4. Wire up clients

Create two helpers — one for the browser (anon key, RLS-protected) and one for
the server (uses the service role only when truly needed):

```ts
// src/lib/supabase/browser.ts
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```ts
// src/lib/supabase/server.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (xs) =>
          xs.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
}
```

### 5. Run the schema

Open `supabase/schema.sql` and paste it into the Supabase SQL editor, then
click Run. It creates `collections` (binder / bulk / deck) and
`collection_cards`, with row-level security so each user only sees their own
data.

### 6. Configure auth redirect URLs

In Supabase: **Authentication → URL Configuration** add your Render URL to
**Site URL** and to **Redirect URLs** (e.g.
`https://magical-database.onrender.com/auth/callback`). For local dev also
add `http://localhost:3000/auth/callback`.

That's it — sign in via the **Sign in** button, then visit `/collections` to
start adding cards. Cards themselves stay on Scryfall; we only persist
references (the Scryfall card `id` + display fields) plus user-owned data.

## Attribution

Card data and images are provided by Scryfall. Magic: The Gathering is © Wizards
of the Coast. This project is unofficial and not affiliated with Wizards.
