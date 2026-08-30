// server/routes/auth.js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { readDb, mutate } = require('../lib/store');
const {
  SESSION_COOKIE,
  PENDING_COOKIE,
  cookieOpts,
  verifyPassword,
  verifyTotpToken,
  signPendingToken,
  signSessionToken,
  verifyToken,
  requireAuth
} = require('../lib/auth');

const router = express.Router();

// Slow down brute-force attempts on the password + 2FA steps.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 10 minutes.' }
});

// STEP 1 — secret word gate. The public site already hides the login
// trigger behind the secret word (client-side UX gate); this endpoint
// double-checks it server-side so the login form itself can't be reached
// by guessing the route without ever having seen the word.
router.post('/check-secret', loginLimiter, (req, res) => {
  const db = readDb();
  const { word } = req.body || {};
  const ok = typeof word === 'string' && word.trim().toLowerCase() === (db.config.secretWord || '').toLowerCase();
  res.json({ ok });
});

// STEP 2 — username + password.
router.post('/login', loginLimiter, async (req, res) => {
  const db = readDb();
  const { username, password } = req.body || {};

  if (!db.admin) {
    return res.status(400).json({ error: 'No admin account has been created yet. Run: npm run setup-admin' });
  }
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }
  if (username !== db.admin.username) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const valid = await verifyPassword(password, db.admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const pendingToken = signPendingToken(username);
  res.cookie(PENDING_COOKIE, pendingToken, { ...cookieOpts, maxAge: 5 * 60 * 1000 });
  res.json({ ok: true, next: 'totp' });
});

// STEP 3 — 6-digit authenticator code.
router.post('/verify-2fa', loginLimiter, (req, res) => {
  const db = readDb();
  const pendingToken = req.cookies && req.cookies[PENDING_COOKIE];
  const pending = pendingToken && verifyToken(pendingToken);

  if (!pending || pending.stage !== 'pending-2fa') {
    return res.status(401).json({ error: 'Session expired. Please start logging in again.' });
  }
  if (!db.admin || !db.admin.totpSecret) {
    return res.status(400).json({ error: '2FA is not configured for this account.' });
  }

  const { token } = req.body || {};
  const valid = verifyTotpToken(db.admin.totpSecret, token);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect authenticator code.' });
  }

  res.clearCookie(PENDING_COOKIE, cookieOpts);
  const sessionToken = signSessionToken(db.admin.username);
  res.cookie(SESSION_COOKIE, sessionToken, { ...cookieOpts, maxAge: 12 * 60 * 60 * 1000 });
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, cookieOpts);
  res.clearCookie(PENDING_COOKIE, cookieOpts);
  res.json({ ok: true });
});

router.get('/session', requireAuth, (req, res) => {
  res.json({ ok: true, username: req.admin.username });
});

module.exports = router;
