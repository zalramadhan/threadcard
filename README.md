# ThreadCard

[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React 19](https://img.shields.io/badge/React-19-087ea4?logo=react&logoColor=white)](https://react.dev)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%C2%B7%20Auth%20%C2%B7%20Storage-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![GitHub stars](https://img.shields.io/badge/GitHub-stars-black?logo=github)](https://github.com/zalramadhan/threadcard/stargazers)

Turn a public Threads post into a customisable image card you can download as PNG. Start free; the lifetime plan unlocks clean 1080 px exports.

![ThreadCard editor: a post preview on the left, theme and text controls on the right](docs/editor.png)

## Features

### Editor

- **Paste and go** — accepts the usual public link shapes (see below). Share links are resolved server-side through Threads' redirect chain, restricted to Threads hosts.
- **Manual fallback** — if scraping is blocked or the post is private, fill in the text, name and handle yourself.
- **Editable everything** — each card's text, display name, handle, timestamp, counts and avatar (upload up to 2 MB) can be overridden before export.
- **Multi-slide threads** — up to 10 slides in one thread (same author), with a slide switcher and "download all".
- **8 themes** — plus full control over background, text colour, accent colour, font family, font size and padding.
- **Aspect ratios** — auto (1080–2400 px tall), 1:1 (1080×1080), 4:5 (1080×1350) and 9:16 (1080×1920).
- **Card layout** — scale the card from 40% to 120% and move it freely on the canvas with horizontal/vertical offset sliders.
- **PNG export** — rendered client-side at 2× and downscaled, plus copy-to-clipboard.
- **Video background** — upload an MP4/WebM (max 25 MB) and it loops behind the card. PNG export uses the frame on screen, and "Download video" records the whole length of the background video to MP4 (H.264) when the browser supports it, WebM otherwise.
- **Background music** — attach an MP3/M4A/WAV (max 20 MB) to that video export.
- **Watermark** — a small ThreadCard badge in the bottom-right corner.
- **Card toggles** — avatar, verified badge, timestamp, engagement counts and media.
- **Rich text** — mentions and hashtags are coloured, long posts truncate with a "See more" line.
- **Bilingual UI** — Indonesian and English.
- **Dark mode** — follows the system preference on first load, remembers your choice.

### Accounts and plans

- **Accounts** — Supabase Auth with email/password, cookie-backed sessions refreshed in `proxy.ts`.
- **Email verification** — Supabase sends a 24-hour confirmation link. Export stays locked until the email is confirmed; an admin can confirm manually from `/admin`.
- **Free plan** — 720 px PNG export with a watermark, up to 3 slides, and a 5-second sponsored unlock before every export.
- **Lifetime plan** — 1080 px export, no watermark, no unlock ads, up to 10 slides, and video export.
- **Orders** — press *Upgrade lifetime* in the account menu to get a `TC-XXXXXX` code, then message the admin on WhatsApp. Payment and activation are manual.
- **Saved projects** — one project slot per account, including slides, styling, background video/audio, and export settings. Media used by a saved project is pinned in Storage.
- **Rate limits** — login, registration, orders, and verification resend are throttled in Postgres with `Retry-After`.
- **Admin dashboard** at `/admin` — user stats, search and filters, manual email verification, lifetime activation, suspension, order cancellation, Shopee unlock link, storage usage, and an audit log.
- **Private media** — uploads go straight from the browser to a private Supabase Storage bucket; `/api/media/[id]` checks ownership and streams the object with Range support.

## Accepted links

```
https://www.threads.com/@user/post/{code}
https://www.threads.com/@user/post/{code}/{slug}
https://www.threads.com/t/{code}
https://www.threads.com/share/{code}
```

`threads.net` works too, and the protocol can be omitted.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Storage) · `modern-screenshot`

## Getting started

Requires Node.js 20.9 or newer.

1. Create a project at [supabase.com](https://supabase.com/dashboard/projects).
2. Copy the environment file and fill in the keys:

   ```bash
   npm install
   cp .env.example .env.local
   ```

3. Run the database migration (creates the tables, RPCs, and the private `media` bucket):

   ```bash
   npm run db:migrate
   ```

   Alternatively, paste `supabase/migrations/0001_init.sql` into the Supabase SQL editor.

4. In **Authentication → URL Configuration**, set:
   - Site URL: `http://localhost:3000` (and your production URL later)
   - Redirect URL: `http://localhost:3000/auth/confirm` (and `https://your-domain/auth/confirm`)

5. Optional but recommended: configure **Authentication → SMTP Settings** with Resend so confirmation email limits are not the shared Supabase default.

6. Start the app:

   ```bash
   npm run dev
   ```

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # production build
npm run db:migrate  # apply supabase/migrations
```

### Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=          # https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # publishable key, safe in the browser
SUPABASE_SERVICE_ROLE_KEY=         # secret key, server only
SUPABASE_DB_URL=                   # Session pooler URI, only for db:migrate
APP_URL=http://localhost:3000      # used in confirmation email redirects
ADMIN_EMAIL=                       # comma-separated; these emails become admins
WHATSAPP_NUMBER=                   # international format without +
LIFETIME_PRICE=49000               # rupiah
THREADCARD_PASSWORD=               # optional HTTP Basic gate
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. Keep it server-side and never add a `NEXT_PUBLIC_` prefix. RLS is enabled on every table with no client policies; the anon key is only used for Supabase Auth.

### Email confirmation template

The default Supabase email works for the browser that signed up. For cross-device confirmation, change the **Confirm signup** template to:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

`/auth/confirm` supports both `token_hash` and the default PKCE `code` redirect.

## Deploy to Vercel

The repo ships with `vercel.json` (Next.js framework, functions in `hnd1` Tokyo next to the Supabase project) and `scripts/vercel-env.mjs` for pushing production variables.

1. Import the repository in Vercel, or link it from the CLI:

   ```bash
   npx vercel login
   npx vercel link
   ```

2. Create the production env file and fill it in:

   ```bash
   cp .env.production.example .env.production.local
   ```

3. Deploy once to get the URL, then push the variables (replace the URL with the real one):

   ```bash
   npx vercel --prod
   node scripts/vercel-env.mjs --file .env.production.local --app-url https://your-project.vercel.app
   npx vercel --prod
   ```

   The script checks for missing values, rejects a non-`https` `APP_URL`, verifies that `SUPABASE_SERVICE_ROLE_KEY` is really a `service_role` key, and replaces existing production variables instead of failing on duplicates.

4. In Supabase **Authentication → URL Configuration**, add `https://your-domain/auth/confirm` to the redirect URLs and set the Site URL to the production domain.
5. Redeploy after any environment change: public variables are inlined at build time.

No persistent disk is needed: Postgres, Auth, and Storage all live in Supabase. `SUPABASE_DB_URL` is only for `npm run db:migrate` and must not be added to Vercel.

Notes:
- Uploads bypass Vercel Functions through signed Storage URLs, so the 25 MB background video is not limited by the 4.5 MB request-body cap.
- `/api/media/[id]` proxies media through a Function for same-origin exports; keep videos short or upgrade the plan if bandwidth matters.
- Vercel Hobby is for non-commercial projects. Selling lifetime access means a paid Vercel plan.
- Supabase free projects pause after a week of inactivity and have database/storage quotas. Backups are handled by Supabase, not by the app.

## How it works

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Shell for the editor; loads the user, saved project, and unlock link |
| `app/api/fetch-post/route.ts` | Resolves share links, scrapes the post, returns normalised slides |
| `app/api/image/route.ts` | Proxies avatar/media images (https only, host allow-list, max 8 MB, 4 redirect hops) |
| `app/api/auth/*` | Register, login, logout, session, verification resend |
| `app/auth/confirm/route.ts` | Exchanges the Supabase confirmation token or code for a session |
| `app/api/orders/route.ts` | Creates the pending lifetime order and WhatsApp link |
| `app/api/projects/route.ts` | Saves one project per account and pins its media |
| `app/api/media/route.ts` | Creates a media row and a signed Storage upload URL |
| `app/api/media/[id]/route.ts` | Streams private media with Range support; deletes unused uploads |
| `app/api/admin/*` | Users, orders, lifetime activation, and Shopee link settings |
| `app/admin/page.tsx` | Admin dashboard |
| `lib/supabase/*` | Server, service-role, and proxy clients |
| `lib/server/db.ts` | Profiles, orders, projects, media, settings, audit, and rate limits |
| `lib/server/auth.ts` | Reads the Supabase session and syncs the app profile |
| `lib/server/verification.ts` | Resends Supabase confirmation email |
| `lib/server/storage.ts` | Upload limits, MIME allow-lists, and object paths |
| `lib/plan.ts` | Free/lifetime limits shared by client and server |
| `supabase/migrations/` | Postgres schema, RPCs, RLS, and the private bucket |
| `components/` | Editor UI, card mockup, preview, controls, account and admin screens |

Scraping uses a crawler user agent and reads the JSON already embedded in the public page.

### Limitations

Threads changes its markup regularly and rate-limits anonymous traffic, so scraping can fail. When it does, the app says why (not found, private/blocked, rate limited, timeout) and offers manual entry. Only public posts by a single author can be turned into a card.

PNG and video export run in the browser, so the free/lifetime limits are enforced by the UI: a determined user can bypass the watermark and width lock with developer tools. The server still owns accounts, plans, saved projects, orders, and media.

Video export tries MP4 (H.264) first and falls back to WebM, depending on what the browser can record. Chrome/Edge record MP4, Firefox records WebM only, and Safari records MP4 but not WebM. Recordings run for the full length of the background video (played back in real time) and encode video at 8 Mbps with audio at 128 kbps.

Background music is only mixed into the video export, so the "Download video" button appears once a background video is loaded. AAC is used for the audio track when the browser ships an AAC encoder (branded Chrome/Edge, Safari); open-source Chromium builds such as Brave on Linux often do not, and then the MP4 carries Opus audio instead — playable in Chrome, Firefox, VLC and most players, but not in QuickTime or iOS Photos.

## Note

Unofficial project, not affiliated with Threads or Meta. Only use it with public content, and credit the original author.
