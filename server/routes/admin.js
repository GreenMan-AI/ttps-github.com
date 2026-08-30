// server/routes/admin.js
const express = require('express');
const { readDb, mutate } = require('../lib/store');
const { requireAuth, generateTotpSecret, totpQrDataUrl, verifyTotpToken } = require('../lib/auth');

const router = express.Router();

// Change the secret word that unlocks the login form on the public site.
router.put('/secret-word', requireAuth, async (req, res) => {
  const { newWord } = req.body || {};
  if (!newWord || newWord.trim().length < 4) {
    return res.status(400).json({ error: 'The secret word must be at least 4 characters long.' });
  }
  await mutate((db) => { db.config.secretWord = newWord.trim(); });
  res.json({ ok: true });
});

// Re-roll 2FA: generates a fresh secret + QR, but does NOT activate it
// until the admin confirms one valid code (prevents locking yourself out
// with a mistyped/unscanned QR).
router.post('/2fa/reroll', requireAuth, async (req, res) => {
  const db = readDb();
  const secret = generateTotpSecret(db.admin.username);
  await mutate((d) => {
    d.admin.pendingTotpSecret = secret.base32;
  });
  const qr = await totpQrDataUrl(secret.otpauth_url);
  res.json({ ok: true, qr, manualKey: secret.base32 });
});

router.post('/2fa/confirm', requireAuth, async (req, res) => {
  const db = readDb();
  const { token } = req.body || {};
  if (!db.admin.pendingTotpSecret) {
    return res.status(400).json({ error: 'Generate a new 2FA key first.' });
  }
  const valid = verifyTotpToken(db.admin.pendingTotpSecret, token);
  if (!valid) return res.status(401).json({ error: 'Incorrect code. Scan the QR code again and try once more.' });

  await mutate((d) => {
    d.admin.totpSecret = d.admin.pendingTotpSecret;
    d.admin.pendingTotpSecret = null;
    d.admin.totpEnabled = true;
  });
  res.json({ ok: true });
});

module.exports = router;
