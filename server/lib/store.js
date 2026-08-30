// server/lib/store.js
//
// Minimal file-backed datastore. Deliberately avoids native modules
// (better-sqlite3, sqlite3, bcrypt) so the project installs and deploys
// cleanly on any Node host (Railway, Render, Fly.io, a plain VPS) without
// native build tooling. Writes are queued so concurrent requests never
// corrupt the file. If you outgrow this (many concurrent writers, heavy
// query needs), swap this module for Postgres + Prisma — every route
// only talks to the functions exported here, so that's a contained change.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULTS = {
  config: {
    title: 'WAVE',
    tagline: 'Music that gets listened to, not searched for',
    backgroundUrl: '',
    siteBackgroundUrl: '',
    secretWord: 'polaris'
  },
  admin: null, // { username, passwordHash, totpSecret, totpEnabled }
  songs: [] // { id, title, artist, url, coverUrl, addedAt }
};

let writeQueue = Promise.resolve();

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULTS, null, 2));
  }
}

function readRaw() {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (e) {
    // Corrupted file — back it up and start fresh rather than crash the server.
    fs.copyFileSync(DATA_FILE, DATA_FILE + '.corrupt-' + Date.now());
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function writeRaw(data) {
  // Atomic-ish write: write to a temp file then rename, so a crash mid-write
  // never leaves db.json half-written.
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function readDb() {
  const data = readRaw();
  return Object.assign(JSON.parse(JSON.stringify(DEFAULTS)), data);
}

// Serializes all writes so two near-simultaneous requests can't clobber
// each other (classic read-modify-write race).
function mutate(fn) {
  writeQueue = writeQueue.then(async () => {
    const db = readDb();
    const result = await fn(db);
    writeRaw(db);
    return result;
  });
  return writeQueue;
}

module.exports = { readDb, mutate, DATA_DIR };
