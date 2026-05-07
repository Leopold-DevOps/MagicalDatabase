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
2. In Render, create a new **Blueprint** from the repo. Render reads `render.yaml`.
3. Confirm the service plan is `free` and deploy.

The free web service sleeps after inactivity; the first request after a sleep
will take a few seconds to wake.

## Adding Supabase later

When we need persistence (saved decks, user accounts), add `@supabase/supabase-js`
and the following env vars in Render:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only
```

## Attribution

Card data and images are provided by Scryfall. Magic: The Gathering is © Wizards
of the Coast. This project is unofficial and not affiliated with Wizards.
