const express = require('express');
const session = require('express-session');
const multer  = require('multer');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Dirs ──────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_FILE   = path.join(__dirname, 'data.json');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ── In-memory DB (persisted to data.json) ─────────────
let db = {
  users: [],   // { id, username, password(hashed), role:'user'|'admin', createdAt }
  tracks: [],  // { id, title, artist, folderId, filename, uploadedBy, addedAt }
  folders: [
    { id: 'default', name: 'Bez mapes',   color: '#555555' },
    { id: 'f1',      name: 'Pop',         color: '#ff6b9d' },
    { id: 'f2',      name: 'Rap',         color: '#ffa502' },
    { id: 'f3',      name: 'Chill',       color: '#5352ed' },
    { id: 'f4',      name: 'Mans Upload', color: '#1db954' },
  ]
};

function loadDB() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed.users)   db.users   = parsed.users;
      if (parsed.tracks)  db.tracks  = parsed.tracks;
      if (parsed.folders) db.folders = parsed.folders;
      console.log(`✅ DB loaded: ${db.users.length} users, ${db.tracks.length} tracks`);
    }
  } catch (e) { console.error('DB load error:', e.message); }
}

function saveDB() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
  catch (e) { console.error('DB save error:', e.message); }
}

loadDB();

// Create default admin if no users exist
if (!db.users.length) {
  const hashed = bcrypt.hashSync('admin123', 10);
  db.users.push({ id: uuidv4(), username: 'admin', password: hashed, role: 'admin', createdAt: Date.now() });
  saveDB();
  console.log('👤 Default admin created: admin / admin123');
}

// ── Middleware ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'musicbox-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

// ── Auth helpers ───────────────────────────────────────
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Nav autorizēts' });
  next();
}
function requireAdmin(req, res, next) {
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Nav admin tiesību' });
  next();
}
function getUser(req) { return db.users.find(u => u.id === req.session.userId) || null; }

// ── Multer ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /audio\//i.test(file.mimetype) || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.originalname);
    cb(null, ok);
  },
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════

// Register
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Trūkst dati' });
  if (username.length < 3)    return res.status(400).json({ error: 'Vārds pārāk īss (min 3)' });
  if (password.length < 4)    return res.status(400).json({ error: 'Parole pārāk īsa (min 4)' });
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(400).json({ error: 'Lietotājvārds jau aizņemts' });
  const hashed = bcrypt.hashSync(password, 10);
  const user   = { id: uuidv4(), username, password: hashed, role: 'user', createdAt: Date.now() };
  db.users.push(user);
  saveDB();
  req.session.userId = user.id;
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole' });
  req.session.userId = user.id;
  res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role } });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Me
app.get('/api/auth/me', (req, res) => {
  const user = getUser(req);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: { id: user.id, username: user.username, role: user.role } });
});

// ══════════════════════════════════════════════════════
//  FOLDERS
// ══════════════════════════════════════════════════════
app.get('/api/folders', requireAuth, (req, res) => {
  const folders = db.folders.map(f => ({
    ...f,
    count: db.tracks.filter(t => t.folderId === f.id).length
  }));
  res.json({ folders });
});

app.post('/api/folders', requireAuth, (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Nosaukums obligāts' });
  const folder = { id: 'f_' + uuidv4().slice(0,8), name, color: color || '#1db954' };
  db.folders.push(folder);
  saveDB();
  res.json({ folder });
});

app.delete('/api/folders/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  if (id === 'default') return res.status(400).json({ error: 'Nevar dzēst noklusējuma mapi' });
  db.folders = db.folders.filter(f => f.id !== id);
  db.tracks.forEach(t => { if (t.folderId === id) t.folderId = 'default'; });
  saveDB();
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  TRACKS
// ══════════════════════════════════════════════════════
app.get('/api/tracks', requireAuth, (req, res) => {
  const { folder } = req.query;
  let tracks = folder ? db.tracks.filter(t => t.folderId === folder) : db.tracks;
  res.json({ tracks });
});

app.post('/api/upload', requireAuth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nav faila' });
  const user = getUser(req);
  const { title, artist, folderId } = req.body;
  const track = {
    id:          uuidv4(),
    title:       title || req.file.originalname.replace(/\.[^.]+$/, ''),
    artist:      artist || '',
    folderId:    folderId || 'default',
    filename:    req.file.filename,
    uploadedBy:  user.username,
    uploaderId:  user.id,
    addedAt:     Date.now(),
    size:        req.file.size
  };
  db.tracks.push(track);
  saveDB();
  res.json({ track });
});

app.put('/api/tracks/:id', requireAuth, (req, res) => {
  const track = db.tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Nav atrasts' });
  const user = getUser(req);
  if (user.role !== 'admin' && track.uploaderId !== user.id)
    return res.status(403).json({ error: 'Nav tiesību' });
  const { title, artist, folderId } = req.body;
  if (title)    track.title    = title;
  if (artist !== undefined) track.artist   = artist;
  if (folderId) track.folderId = folderId;
  saveDB();
  res.json({ track });
});

app.delete('/api/tracks/:id', requireAuth, (req, res) => {
  const track = db.tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Nav atrasts' });
  const user = getUser(req);
  if (user.role !== 'admin' && track.uploaderId !== user.id)
    return res.status(403).json({ error: 'Nav tiesību' });
  const filePath = path.join(UPLOADS_DIR, track.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.tracks = db.tracks.filter(t => t.id !== track.id);
  saveDB();
  res.json({ ok: true });
});

app.get('/api/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ results: [] });
  const results = db.tracks.filter(t =>
    t.title.toLowerCase().includes(q) ||
    (t.artist || '').toLowerCase().includes(q) ||
    (t.uploadedBy || '').toLowerCase().includes(q)
  );
  res.json({ results });
});

// ══════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  res.json({ users: db.users.map(u => ({ ...u, password: undefined })) });
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Nav atrasts' });
  if (user.role === 'admin') return res.status(400).json({ error: 'Nevar dzēst admin' });
  db.users = db.users.filter(u => u.id !== user.id);
  saveDB();
  res.json({ ok: true });
});

app.put('/api/admin/users/:id/role', requireAuth, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'Nav atrasts' });
  user.role = req.body.role === 'admin' ? 'admin' : 'user';
  saveDB();
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  SERVE FRONTEND
// ══════════════════════════════════════════════════════
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎵 MusicBox running on http://localhost:${PORT}`);
  console.log(`👤 Admin: admin / admin123\n`);
});
