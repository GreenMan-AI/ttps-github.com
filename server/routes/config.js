// server/routes/config.js
const express = require('express');
const { readDb, mutate } = require('../lib/store');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

// Public: anyone visiting the site needs this to render the homepage.
router.get('/', (req, res) => {
  const db = readDb();
  const { title, tagline, backgroundUrl, siteBackgroundUrl } = db.config;
  // Deliberately omit secretWord from the public response.
  res.json({ title, tagline, backgroundUrl, siteBackgroundUrl });
});

// Admin only: update site chrome. Changing the secret word is separate
// (routes/admin.js) since it's more sensitive than title/tagline copy.
router.put('/', requireAuth, async (req, res) => {
  const { title, tagline, backgroundUrl, siteBackgroundUrl } = req.body || {};
  await mutate((db) => {
    if (typeof title === 'string') db.config.title = title.trim().slice(0, 80) || 'WAVE';
    if (typeof tagline === 'string') db.config.tagline = tagline.trim().slice(0, 160);
    if (typeof backgroundUrl === 'string') db.config.backgroundUrl = backgroundUrl.trim().slice(0, 500);
    if (typeof siteBackgroundUrl === 'string') db.config.siteBackgroundUrl = siteBackgroundUrl.trim().slice(0, 500);
  });
  const db = readDb();
  res.json({
    ok: true,
    config: {
      title: db.config.title,
      tagline: db.config.tagline,
      backgroundUrl: db.config.backgroundUrl,
      siteBackgroundUrl: db.config.siteBackgroundUrl
    }
  });
});

module.exports = router;
