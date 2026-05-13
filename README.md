# Top 100 — Scratch-Off

A "scratch-off poster" web version of the IMDB Top 100 Fan Favorites and Letterboxd Top 500. Enter your Letterboxd username; watched films show in color, unwatched are greyed out and slightly smaller. The site scrapes your public `/films` page and re-checks daily.

## Stack
- Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4
- MongoDB Atlas (free M0 tier)
- Deploys to Vercel (with built-in daily Cron)

## First-time setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Create `.env.local`** — copy `.env.example` and fill in:
   - `MONGODB_URI` — your Atlas connection string
   - `TMDB_API_KEY` — only needed for the one-time list-build step
   - `CRON_SECRET` — any random string

3. **Seed the lists** (one-time)
   Drop the 100 titles from your scratch-off poster into `scripts/raw/imdb-top-100.txt` (one `Title (YYYY)` per line). Then:
   ```bash
   # Scrape Letterboxd's Top 500 list page first
   npm run build-lists -- --scrape-letterboxd
   # Then enrich both lists with TMDB ids, posters, and canonical Letterboxd slugs
   npm run build-lists
   ```
   Output goes to `src/data/imdb-top-100.json` and `src/data/letterboxd-top-500.json`.

4. **Run locally**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## Deploy to Vercel

1. Push to a GitHub repo, import into Vercel.
2. In Vercel project settings → Environment Variables, add `MONGODB_URI` and `CRON_SECRET`.
3. The daily cron job is registered in [vercel.json](vercel.json) at `0 4 * * *` UTC.

## Routes

- `/` — landing, username input
- `/u/[username]?list=imdb-top-100|letterboxd-top-500` — user's grid view
- `POST /api/scrape` — `{ "username": "..." }` triggers a re-scrape of page 1
- `POST /api/upload-csv` — multipart form with `username` + `file` (watched.csv) — full backfill
- `GET /api/cron/refresh` — re-scrapes all known users (cron-only, requires `Authorization: Bearer $CRON_SECRET`)

## How watched-history works

Letterboxd actively 403s server-side pagination on user `/films/` pages — we can only scrape page 1 (~72 most-recent watches). To get a user's *full* watched history we use their CSV export:

1. On first visit, we scrape page 1 to seed the user's record with their ~72 most recent watches.
2. The user uploads `watched.csv` (from Letterboxd → Settings → Import &amp; Export → Export Your Data) to backfill the full history.
3. The daily cron (`0 4 * * *` UTC) re-scrapes page 1 for all known users and merges new slugs in. The CSV import never gets stale unless the user re-uploads.

The CSV file ships inside a `.zip`; users unzip it and upload just `watched.csv`. The parser reads the "Letterboxd URI" column and extracts canonical slugs.
