const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// vienkārša atmiņas krātuve derīgiem admin sesijas tokeniem
// (pietiek nelielai lapai; restartējot serveri, visi jāpieslēdzas no jauna)
const validTokens = new Map(); // token -> derīguma termiņš (ms)
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 stundas

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

// POST /api/admin/login — pārbauda paroli, atgriež sesijas tokenu
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  const correct = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD;

  if (!correct) {
    return res.status(500).json({ error: 'Serverim nav iestatīta ADMIN_PASS (vai ADMIN_PASSWORD) vides mainīgā.' });
  }
  if (!password || password !== correct) {
    return res.status(401).json({ error: 'Nepareiza parole.' });
  }

  const token = generateToken();
  validTokens.set(token, Date.now() + TOKEN_TTL_MS);
  res.json({ ok: true, token, expiresInMs: TOKEN_TTL_MS });
});

// middleware citiem maršrutiem — pārbauda x-admin-token galveni
function requireAdmin(req, res, next) {
  const token = req.header('x-admin-token');
  const expiry = token && validTokens.get(token);
  if (!expiry || expiry < Date.now()) {
    if (token) validTokens.delete(token);
    return res.status(401).json({ error: 'Nepieciešama admin autorizācija — ieej vēlreiz.' });
  }
  next();
}

// reizi stundā iztīra novecojušos tokenus
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of validTokens.entries()) {
    if (exp < now) validTokens.delete(token);
  }
}, 60 * 60 * 1000);

module.exports = { router, requireAdmin };
