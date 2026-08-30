// server/lib/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is not set. Copy .env.example to .env and set a long random JWT_SECRET before starting the server.'
  );
}

const SESSION_COOKIE = 'wave_admin_session';
const PENDING_COOKIE = 'wave_admin_pending'; // set after password check, before 2FA

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function generateTotpSecret(username) {
  return speakeasy.generateSecret({
    name: `WAVE Admin (${username})`,
    length: 20
  });
}

async function totpQrDataUrl(otpauthUrl) {
  return qrcode.toDataURL(otpauthUrl);
}

function verifyTotpToken(secretBase32, token) {
  if (!token || !/^\d{6}$/.test(token)) return false;
  return speakeasy.totp.verify({
    secret: secretBase32,
    encoding: 'base32',
    token,
    window: 1 // allow ±30s clock drift
  });
}

// Short-lived token proving "password was correct", required before /verify-2fa.
function signPendingToken(username) {
  return jwt.sign({ username, stage: 'pending-2fa' }, JWT_SECRET, { expiresIn: '5m' });
}

// Full session token, issued only after password + TOTP both pass.
function signSessionToken(username) {
  return jwt.sign({ username, stage: 'authenticated' }, JWT_SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE];
  const payload = token && verifyToken(token);
  if (!payload || payload.stage !== 'authenticated') {
    return res.status(401).json({ error: 'Not authorized. Please log in again.' });
  }
  req.admin = payload;
  next();
}

module.exports = {
  SESSION_COOKIE,
  PENDING_COOKIE,
  cookieOpts,
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  totpQrDataUrl,
  verifyTotpToken,
  signPendingToken,
  signSessionToken,
  verifyToken,
  requireAuth
};
