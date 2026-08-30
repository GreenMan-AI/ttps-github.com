const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const validTokens = new Map(); // token -> derīguma termiņš (ms)
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 stundas

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const correctUser = process.env.ADMIN_USER || 'admin';
  const correctPass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;

  if (!correctPass) {
    return res.status(500).json({ error: 'Serverim nav iestatīta ADMIN_PASS vides mainīgā.' });
  }
  // Lietotājvārds ir neobligāts (atpakaļsaderībai) — ja sūtīts, jāsakrīt arī tam.
  if (username && username !== correctUser) {
    return res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole.' });
  }
  if (!password || password !== correctPass) {
    return res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole.' });
  }

  const token = generateToken();
  validTokens.set(token, Date.now() + TOKEN_TTL_MS);
  res.json({ ok: true, token, expiresInMs: TOKEN_TTL_MS });
});

router.post('/logout', (req, res) => {
  const token = req.header('x-admin-token');
  if (token) validTokens.delete(token);
  res.json({ ok: true });
});

function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  const expiry = token && validTokens.get(token);
  if (!expiry || expiry < Date.now()) {
    if (token) validTokens.delete(token);
    return res.status(401).json({ error: 'Nepieciešama admin autorizācija — ieej vēlreiz.' });
  }
  // pagarina sesiju katrā pieprasījumā (aktīviem adminiem nekrīt ārā)
  validTokens.set(token, Date.now() + TOKEN_TTL_MS);
  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of validTokens.entries()) {
    if (exp < now) validTokens.delete(token);
  }
}, 60 * 60 * 1000);

// GET /api/admin/stats — kopsavilkums admin panelim (vairāk pārskata iespēju adminam)
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const Song = require('../models/Song');
    const [songCount, plays, trendingCount] = await Promise.all([
      Song.countDocuments(),
      Song.aggregate([{ $group: { _id: null, total: { $sum: '$playCount' } } }]),
      Song.countDocuments({ trending: true }),
    ]);
    res.json({
      songCount,
      totalPlays: plays[0]?.total || 0,
      trendingCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās ielādēt statistiku' });
  }
});

module.exports = { router, requireAdmin };
