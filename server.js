const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = 3000;

// ── ensure dirs ──────────────────────────────────────────────
['uploads', 'public'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

// ── middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ══════════════════════════════════════════════════════════════
//  IN-MEMORY STORE  (replace with SQLite/Mongo in production)
// ══════════════════════════════════════════════════════════════
const db = {
  users:     {},   // { username: { passwordHash, salt, role:'user'|'admin', createdAt } }
  sessions:  {},   // { token: username }
  tracks:    [],   // [{ id, title, artist, filename, size, uploader, folderId, isPublic, plays, uploadedAt }]
  folders:   [],   // [{ id, name, description, createdBy, createdAt }]
  playlists: [],   // [{ id, name, ownerId, trackIds[], isPublic, createdAt }]
};

// ── seed admin account ───────────────────────────────────────
(function seedAdmin() {
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'admin1234';   // ← NOMAINĪT pirms produkcijas!
  const salt = crypto.randomBytes(16).toString('hex');
  db.users[ADMIN_USER] = {
    passwordHash: hashPwd(ADMIN_PASS, salt),
    salt, role: 'admin',
    createdAt: new Date().toISOString()
  };
  console.log(`  Admin: ${ADMIN_USER} / ${ADMIN_PASS}`);
})();

// ── helpers ──────────────────────────────────────────────────
function hashPwd(pwd, salt) {
  return crypto.pbkdf2Sync(pwd, salt, 100000, 64, 'sha512').toString('hex');
}
function makeToken() { return crypto.randomBytes(32).toString('hex'); }
function makeId()    { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function authMiddleware(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  const user  = token && db.sessions[token];
  if (!user) return res.status(401).json({ error: 'Nav autorizācijas' });
  req.username = user;
  req.role     = db.users[user]?.role || 'user';
  next();
}
function optionalAuth(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '');
  const user  = token && db.sessions[token];
  if (user) { req.username = user; req.role = db.users[user]?.role || 'user'; }
  next();
}
function adminOnly(req, res, next) {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Tikai adminam' });
  next();
}

// ── multer ───────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, 'uploads/'),
  filename:    (_, file, cb) => cb(null, makeId() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  fileFilter: (_, file, cb) => {
    const ok = ['.mp3','.wav','.ogg','.flac','.m4a','.aac'];
    if (ok.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Atļauts tikai audio'));
  },
  limits: { fileSize: 100 * 1024 * 1024 }   // 100 MB
});

// ══════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)         return res.status(400).json({ error: 'Nepieciešams lietotājvārds un parole' });
  if (username.length < 3)            return res.status(400).json({ error: 'Min. 3 rakstzīmes' });
  if (password.length < 6)            return res.status(400).json({ error: 'Parole min. 6 rakstzīmes' });
  if (db.users[username])             return res.status(409).json({ error: 'Lietotājvārds aizņemts' });
  const salt = crypto.randomBytes(16).toString('hex');
  db.users[username] = { passwordHash: hashPwd(password, salt), salt, role: 'user', createdAt: new Date().toISOString() };
  const token = makeToken();
  db.sessions[token] = username;
  res.json({ token, username, role: 'user' });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users[username];
  if (!user || hashPwd(password, user.salt) !== user.passwordHash)
    return res.status(401).json({ error: 'Nepareizi dati' });
  const token = makeToken();
  db.sessions[token] = username;
  res.json({ token, username, role: user.role });
});

app.post('/api/logout', authMiddleware, (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ', '');
  delete db.sessions[token];
  res.json({ ok: true });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({ username: req.username, role: req.role });
});

// ══════════════════════════════════════════════════════════════
//  FOLDERS  (admin only: create/delete)
// ══════════════════════════════════════════════════════════════
app.get('/api/folders', (req, res) => res.json({ folders: db.folders }));

app.post('/api/folders', authMiddleware, adminOnly, (req, res) => {
  const { name, description = '' } = req.body;
  if (!name) return res.status(400).json({ error: 'Nosaukums obligāts' });
  const folder = { id: makeId(), name, description, createdBy: req.username, createdAt: new Date().toISOString() };
  db.folders.push(folder);
  res.json({ folder });
});

app.delete('/api/folders/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = db.folders.findIndex(f => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nav atrasta' });
  db.folders.splice(idx, 1);
  // unlink tracks from this folder
  db.tracks.forEach(t => { if (t.folderId === req.params.id) t.folderId = null; });
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
//  TRACKS
// ══════════════════════════════════════════════════════════════
// GET /api/tracks  — public tracks always visible; private only to logged-in
app.get('/api/tracks', optionalAuth, (req, res) => {
  const list = db.tracks.filter(t => t.isPublic || req.username);
  res.json({ tracks: list });
});

// POST /api/upload  — admin only
app.post('/api/upload', authMiddleware, adminOnly, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nav faila' });
  const { title, artist, folderId, isPublic } = req.body;
  const track = {
    id:         makeId(),
    title:      title  || req.file.originalname.replace(/\.[^/.]+$/, ''),
    artist:     artist || 'Nezināms',
    filename:   req.file.filename,
    size:       req.file.size,
    uploader:   req.username,
    folderId:   folderId || null,
    isPublic:   isPublic !== 'false',
    plays:      0,
    uploadedAt: new Date().toISOString()
  };
  db.tracks.unshift(track);
  res.json({ track });
});

// PATCH /api/tracks/:id  — admin can edit meta
app.patch('/api/tracks/:id', authMiddleware, adminOnly, (req, res) => {
  const t = db.tracks.find(t => t.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Nav atrasts' });
  const { title, artist, folderId, isPublic } = req.body;
  if (title    !== undefined) t.title    = title;
  if (artist   !== undefined) t.artist   = artist;
  if (folderId !== undefined) t.folderId = folderId;
  if (isPublic !== undefined) t.isPublic = isPublic;
  res.json({ track: t });
});

// DELETE /api/tracks/:id  — admin only
app.delete('/api/tracks/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = db.tracks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nav atrasts' });
  const [removed] = db.tracks.splice(idx, 1);
  const fp = path.join('uploads', removed.filename);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  // remove from playlists
  db.playlists.forEach(pl => { pl.trackIds = pl.trackIds.filter(id => id !== removed.id); });
  res.json({ ok: true });
});

// POST /api/tracks/:id/play  — increment counter
app.post('/api/tracks/:id/play', optionalAuth, (req, res) => {
  const t = db.tracks.find(t => t.id === req.params.id);
  if (t) t.plays++;
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
//  PLAYLISTS
// ══════════════════════════════════════════════════════════════
app.get('/api/playlists', optionalAuth, (req, res) => {
  const list = db.playlists.filter(pl => pl.isPublic || pl.ownerId === req.username || req.role === 'admin');
  res.json({ playlists: list });
});

app.post('/api/playlists', authMiddleware, (req, res) => {
  const { name, isPublic = false } = req.body;
  if (!name) return res.status(400).json({ error: 'Nosaukums obligāts' });
  const pl = { id: makeId(), name, ownerId: req.username, trackIds: [], isPublic, createdAt: new Date().toISOString() };
  db.playlists.push(pl);
  res.json({ playlist: pl });
});

app.delete('/api/playlists/:id', authMiddleware, (req, res) => {
  const idx = db.playlists.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Nav atrasta' });
  if (db.playlists[idx].ownerId !== req.username && req.role !== 'admin')
    return res.status(403).json({ error: 'Nav tiesību' });
  db.playlists.splice(idx, 1);
  res.json({ ok: true });
});

// Add/remove track from playlist
app.post('/api/playlists/:id/tracks', authMiddleware, (req, res) => {
  const pl = db.playlists.find(p => p.id === req.params.id);
  if (!pl) return res.status(404).json({ error: 'Nav atrasta' });
  if (pl.ownerId !== req.username && req.role !== 'admin') return res.status(403).json({ error: 'Nav tiesību' });
  const { trackId } = req.body;
  if (!pl.trackIds.includes(trackId)) pl.trackIds.push(trackId);
  res.json({ playlist: pl });
});

app.delete('/api/playlists/:id/tracks/:trackId', authMiddleware, (req, res) => {
  const pl = db.playlists.find(p => p.id === req.params.id);
  if (!pl) return res.status(404).json({ error: 'Nav atrasta' });
  if (pl.ownerId !== req.username && req.role !== 'admin') return res.status(403).json({ error: 'Nav tiesību' });
  pl.trackIds = pl.trackIds.filter(id => id !== req.params.trackId);
  res.json({ playlist: pl });
});

// ══════════════════════════════════════════════════════════════
//  ADMIN: stats + user management
// ══════════════════════════════════════════════════════════════
app.get('/api/admin/stats', authMiddleware, adminOnly, (req, res) => {
  res.json({
    users:     Object.keys(db.users).length,
    tracks:    db.tracks.length,
    folders:   db.folders.length,
    playlists: db.playlists.length,
    totalPlays: db.tracks.reduce((s, t) => s + t.plays, 0),
    totalSize:  db.tracks.reduce((s, t) => s + (t.size || 0), 0),
  });
});

app.get('/api/admin/users', authMiddleware, adminOnly, (req, res) => {
  const list = Object.entries(db.users).map(([u, d]) => ({
    username: u, role: d.role, createdAt: d.createdAt
  }));
  res.json({ users: list });
});

app.delete('/api/admin/users/:username', authMiddleware, adminOnly, (req, res) => {
  const u = req.params.username;
  if (u === req.username) return res.status(400).json({ error: 'Nevar dzēst sevi' });
  if (!db.users[u])       return res.status(404).json({ error: 'Nav atrasts' });
  delete db.users[u];
  // remove their sessions
  Object.keys(db.sessions).forEach(t => { if (db.sessions[t] === u) delete db.sessions[t]; });
  res.json({ ok: true });
});

// ── start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   GREENMAN-AI  Music Platform  v2.0       ║
║   http://localhost:${PORT}                    ║
║   Admin: admin / admin1234                ║
╚═══════════════════════════════════════════╝`);
});
