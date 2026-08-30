// server/index.js
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const configRoutes = require('./routes/config');
const songsRoutes = require('./routes/songs');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const { readDb } = require('./lib/store');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the platform's reverse proxy (Railway/Render sit behind one) so
// secure cookies and rate-limit IPs behave correctly.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Static assets: the frontend, and uploaded audio/images.
// index:false so express.static never auto-serves index.html for "/" —
// that route is handled below so it can inject per-song Open Graph tags
// before the file goes out.
app.use(express.static(path.join(__dirname, '..', 'public'), { index: false }));
// express.static (via the `send` package) already honors Range headers,
// so audio files under /uploads/audio support seeking/partial requests
// out of the box — no extra streaming code needed here.
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API
app.use('/api/config', configRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/healthz', (req, res) => res.json({ ok: true }));

// ---------- HTML rendering with dynamic Open Graph tags ----------
const indexPath = path.join(__dirname, '..', 'public', 'index.html');

function escapeAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function setMetaContent(html, id, value) {
  const re = new RegExp(`(id="${id}"[^>]*content=")[^"]*(")`);
  return html.replace(re, `$1${escapeAttr(value)}$2`);
}

function setTitleText(html, value) {
  return html.replace(/(<title id="pageTitle">)[^<]*(<\/title>)/, `$1${escapeAttr(value)}$2`);
}

function toAbsoluteUrl(req, maybeRelative) {
  if (!maybeRelative) return '';
  if (/^https?:\/\//i.test(maybeRelative)) return maybeRelative;
  return `${req.protocol}://${req.get('host')}${maybeRelative.startsWith('/') ? '' : '/'}${maybeRelative}`;
}

function renderIndexHtml(req) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  const db = readDb();
  const { title, tagline, siteBackgroundUrl } = db.config;
  const songId = req.query.song;
  const song = songId ? db.songs.find((s) => s.id === songId) : null;

  const pageTitle = song ? `${song.title}${song.artist ? ' — ' + song.artist : ''} · ${title}` : `${title} — Sound that belongs only to you`;
  const description = song
    ? `Listen to "${song.title}"${song.artist ? ' by ' + song.artist : ''} on ${title}.`
    : (tagline || 'One player for your whole collection.');
  const image = toAbsoluteUrl(req, song ? song.coverUrl : siteBackgroundUrl);
  const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

  html = setTitleText(html, pageTitle);
  html = setMetaContent(html, 'metaDescription', description);
  html = setMetaContent(html, 'ogTitle', pageTitle);
  html = setMetaContent(html, 'ogDescription', description);
  html = setMetaContent(html, 'ogImage', image);
  html = setMetaContent(html, 'ogUrl', url);
  html = setMetaContent(html, 'twTitle', pageTitle);
  html = setMetaContent(html, 'twDescription', description);
  html = setMetaContent(html, 'twImage', image);
  return html;
}

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIndexHtml(req));
});

// Fallback to the SPA shell for any other non-API, non-upload route.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIndexHtml(req));
});

// Centralized error handler so unexpected exceptions return JSON, not an HTML stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`WAVE server running: http://localhost:${PORT}`);
});
