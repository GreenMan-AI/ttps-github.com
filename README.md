# WAVE — a music platform

A full-stack music homepage: modern design + Node.js/Express server + real
data storage + secure 3-step admin login (secret word → password → 2FA).

**Features:**
- Custom audio player with a **real Web Audio API visualizer** (falls back
  to a decorative animation if the audio source blocks cross-origin
  analysis) and a progress ring
- **Radio DJ mode** — shuffled playback with real "previous track" history,
  implemented as its own standalone module (`public/js/radio-dj.js`) so it's
  easy to test and extend without touching player code
- **Multi-file upload** — select several audio files at once in the admin
  panel and each becomes its own song automatically
- **Album covers, lyrics, and albums** — optional per-song metadata; covers
  show in the tracklist and now-playing panel, lyrics expand in a panel
  below the player, and the accent color of the whole page shifts to match
  the current cover's dominant color
- **Search and album filter** above the tracklist
- **Like button** (heart icon) — saved locally in the browser, no account needed
- **Shareable deep links** — every song has a "copy link" button; opening
  that link preselects the track and renders proper **Open Graph / Twitter
  Card** previews server-side, so sharing it on social media shows the right
  title, artist, and cover image
- **Drag-to-reorder** songs in the admin panel, and an inline **edit** panel
  per song (no need to delete and re-add to fix a typo)
- **Two background image slots** — one behind just the player card, one that
  covers the entire page
- **English by default, with a Latvian toggle** — every piece of UI text
  switches instantly via the language switch in the nav
- **Automatic script/language detection** for song titles and artists — a
  Cyrillic, Japanese, Arabic, or Latvian title renders with the correct
  reading direction and a small language tag, detected automatically
- **Installable as an app (PWA)** — manifest + service worker, with the app
  shell cached for fast repeat visits
- **Seekable audio** — uploaded files support HTTP Range requests out of the
  box, so scrubbing to any point in a track doesn't require downloading it
  from the start
- Secret-word-gated admin panel with password + TOTP two-factor auth

## What's inside

```
wave-platform/
├── server/                    # Node.js/Express backend
│   ├── index.js               # server entry point + Open Graph tag injection
│   ├── lib/
│   │   ├── store.js           # data storage (JSON file, atomic writes)
│   │   └── auth.js            # password hashing, JWT sessions, TOTP 2FA
│   ├── routes/
│   │   ├── auth.js            # /api/auth/* — login, 2FA, session
│   │   ├── config.js          # /api/config — title, tagline, both backgrounds
│   │   ├── songs.js           # /api/songs — tracklist CRUD + reorder
│   │   ├── admin.js           # /api/admin — secret word, 2FA re-enrollment
│   │   └── upload.js          # /api/upload — audio + image uploads
│   └── scripts/
│       └── setup-admin.js     # interactive admin account setup
├── public/                    # frontend (static files served by Express)
│   ├── index.html
│   ├── manifest.json          # PWA manifest
│   ├── service-worker.js      # PWA offline shell caching
│   ├── icons/                 # PWA icons
│   ├── css/style.css
│   └── js/
│       ├── i18n.js            # EN/LV string table + t(key) helper
│       ├── script-detect.js   # writing-system detection for song titles
│       ├── radio-dj.js        # standalone shuffle-mode module
│       ├── app.js             # public site + player + visualizer + theming
│       └── admin.js           # admin dashboard logic
├── uploads/                   # uploaded audio files and images (runtime)
├── data/db.json                # all data: config, songs, admin account (runtime)
├── Dockerfile
├── railway.json
├── render.yaml
└── .env.example
```

## How it works

1. **The public page** (`/`) — a modern player with a live waveform
   visualizer, a tracklist, everything loaded dynamically from `/api/config`
   and `/api/songs`.
2. **The secret word** — type it anywhere on the page (nothing to click), and
   the login form appears. It defaults to `polaris`, changeable from the
   admin panel's "Security" tab. The word itself is never sent to the
   browser — the nav hint shows dots, and the actual check happens
   server-side.
3. **Login in 3 steps**:
   - step 1: the secret word (done above)
   - step 2: username + password (checked server-side, password hashed with bcrypt)
   - step 3: a 6-digit code from an authenticator app (Google Authenticator,
     Authy, 1Password, etc.) — real TOTP, the same standard banking apps use
4. On success the server issues a signed (JWT) session cookie (`httpOnly`,
   `secure` in production), valid for 12 hours.
5. **The admin panel** lets you: change the site title/tagline/both
   background images, add songs (via file upload — single or multiple at
   once — or a pasted URL) and delete them, change the secret word, and
   re-enroll 2FA.
6. **Radio DJ**: a toggle above the player switches to shuffled playback.
   Turning it on immediately jumps to a random track so the effect is
   obvious. "Previous" retraces actual shuffle history rather than just
   going back one slot in the list.
7. **Language**: the whole UI (nav, player labels, admin panel, forms,
   toasts) is in English by default; the EN/LV switch in the nav re-renders
   every `data-i18n`-tagged string instantly, client-side, no reload.
8. **Song title language detection**: whenever a title or artist name is
   rendered, `script-detect.js` checks its Unicode ranges (Cyrillic,
   Japanese kana/kanji, Hangul, Arabic, Hebrew, Greek, Latvian diacritics,
   etc.) and sets the correct `lang`/`dir` attributes automatically — no
   manual tagging needed, and right-to-left scripts render correctly.

## Run it locally

```bash
npm install
cp .env.example .env
```

Open `.env` and set `JWT_SECRET` to a long random string. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create the admin account (it will ask for a username and password, then show
a 2FA QR code):

```bash
npm run setup-admin
```

Scan the QR code with an authenticator app on your phone, then start the
server:

```bash
npm start
```

Open `http://localhost:3000` — type `polaris` anywhere on the page to open
the admin login.

## Deploying to the cloud

### Railway

1. Create a new Railway project and connect this repository (or upload the
   files directly).
2. Railway will automatically detect `railway.json` and the `Dockerfile`.
3. Under **Environment Variables**, add:
   - `JWT_SECRET` — a long random string (see above)
   - `NODE_ENV` = `production`
4. **Important**: add a Railway **Volume** and mount it at `/app/data` and
   `/app/uploads` — otherwise data (songs, the admin account) is lost on
   every redeploy. Railway → Settings → Volumes → Add Volume.
5. After the first deploy, open a terminal (Railway lets you run commands
   inside the container) and run `npm run setup-admin` to create the admin
   account directly in the production database. If your plan doesn't
   include a terminal, create the account locally and copy `data/db.json`
   onto the volume, or ask for help setting up a one-time setup API route.

### Render

1. Create a new **Web Service** from the repository, choose the "Docker"
   environment — Render will pick up `render.yaml` automatically.
2. `render.yaml` already configures a persistent disk (`/app/data`) and
   auto-generates `JWT_SECRET`.
3. After the first deploy, use Render's **Shell** tab to run:
   ```bash
   npm run setup-admin
   ```

### Any other Node.js host

On any platform that supports a persistent Node.js process (not just
serverless functions):
```bash
npm install --omit=dev
npm run setup-admin
npm start
```
Make sure `/data` and `/uploads` live on persistent storage, not ephemeral —
otherwise data disappears on every restart.

## Security notes

- Passwords are never stored in plain text — only bcrypt hashes.
- 2FA uses the standard TOTP algorithm (the same one banking apps use).
- Login and 2FA routes are rate-limited (max 10 attempts / 10 min) to slow
  down brute-force attempts.
- The session cookie is `httpOnly` (not accessible from JavaScript) and
  `secure` in production (HTTPS only).
- If you lose access to your authenticator app: log in with your password,
  then either use "Generate new 2FA key" in the Security tab (if you can get
  that far), or remove the `totpSecret` field from `data/db.json` server-side
  to force re-enrollment.

## Where to go from here

- Swap `server/lib/store.js` for a real database (Postgres + Prisma) if you
  expect many concurrent writers or need more complex queries.
- Add chunked audio streaming (HTTP Range headers) for very large files —
  currently files are served in full via Express static serving, which
  works fine for typical track sizes.
- Add a CDN in front of `/uploads` if the library and traffic grow large.
