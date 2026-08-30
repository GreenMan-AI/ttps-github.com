// server/routes/songs.js
const express = require('express');
const crypto = require('crypto');
const { readDb, mutate } = require('../lib/store');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const db = readDb();
  res.json({ songs: db.songs });
});

// Admin: register a song. The audio/cover files themselves are uploaded
// separately via /api/upload (multipart), which returns a URL to put here —
// keeps this endpoint a simple JSON write.
router.post('/', requireAuth, async (req, res) => {
  const { title, artist, url, coverUrl } = req.body || {};
  if (!title || !url) {
    return res.status(400).json({ error: 'A title and an audio URL are required.' });
  }
  const song = {
    id: crypto.randomUUID(),
    title: String(title).trim().slice(0, 120),
    artist: String(artist || '').trim().slice(0, 120),
    url: String(url).trim(),
    coverUrl: coverUrl ? String(coverUrl).trim() : '',
    addedAt: new Date().toISOString()
  };
  await mutate((db) => { db.songs.push(song); });
  res.status(201).json({ ok: true, song });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  let found = false;
  await mutate((db) => {
    const before = db.songs.length;
    db.songs = db.songs.filter((s) => s.id !== id);
    found = db.songs.length !== before;
  });
  if (!found) return res.status(404).json({ error: 'Song not found.' });
  res.json({ ok: true });
});

// Reorder the whole playlist in one shot (drag-and-drop friendly).
router.put('/reorder', requireAuth, async (req, res) => {
  const { orderedIds } = req.body || {};
  if (!Array.isArray(orderedIds)) {
    return res.status(400).json({ error: 'orderedIds must be an array.' });
  }
  await mutate((db) => {
    const byId = new Map(db.songs.map((s) => [s.id, s]));
    const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean);
    // Keep any songs not mentioned (defensive) appended at the end.
    for (const s of db.songs) if (!orderedIds.includes(s.id)) reordered.push(s);
    db.songs = reordered;
  });
  res.json({ ok: true });
});

module.exports = router;
