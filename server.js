const express = require('express');
const multer  = require('multer');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path    = require('path');
const fs      = require('fs');
const crypto  = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── TOKEN AUTH (no sessions — works perfectly on Railway!) ──
const tokens = new Map(); // token -> userId

function makeToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  tokens.set(token, userId);
  return token;
}
function getUserFromToken(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return null;
  const userId = tokens.get(token);
  if (!userId) return null;
  return db.users.find(u => u.id === userId) || null;
}

// ── DIRS ──────────────────────────────────────────────
const UPLOADS_DIR = process.env.RAILWAY_ENVIRONMENT
  ? '/tmp/mb_uploads'
  : path.join(__dirname, 'uploads');
const DATA_FILE = process.env.RAILWAY_ENVIRONMENT
  ? '/tmp/mb_data.json'
  : path.join(__dirname, 'data.json');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── DB ─────────────────────────────────────────────────
let db = {
  users: [],
  tracks: [],
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
      const p = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (p.users)   db.users   = p.users;
      if (p.tracks)  db.tracks  = p.tracks;
      if (p.folders && p.folders.length) db.folders = p.folders;
      console.log(`DB: ${db.users.length} users, ${db.tracks.length} tracks`);
    }
  } catch (e) { console.error('DB load error:', e.message); }
}

function saveDB() {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2)); }
  catch (e) { console.error('DB save error:', e.message); }
}

loadDB();

if (!db.users.find(u => u.role === 'admin')) {
  db.users.push({
    id: uuidv4(),
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: Date.now()
  });
  saveDB();
  console.log('Admin created: admin / admin123');
}

// ── MIDDLEWARE ─────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(__dirname));

const requireAuth = (req, res, next) => {
  req.user = getUserFromToken(req);
  if (!req.user) return res.status(401).json({ error: 'Nav autorizēts' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin')
    return res.status(403).json({ error: 'Nav admin tiesību' });
  next();
};

// ── MULTER ─────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext  = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext)
        .replace(/[^a-z0-9]/gi, '_').toLowerCase();
      cb(null, `${Date.now()}_${base}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ok = /audio\//i.test(file.mimetype) ||
               /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.originalname);
    cb(null, ok);
  },
  limits: { fileSize: 100 * 1024 * 1024 }
});

// ══════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Trūkst dati' });
  if (username.trim().length < 3)
    return res.status(400).json({ error: 'Vārds pārāk īss (min 3)' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Parole pārāk īsa (min 4)' });
  if (db.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.status(400).json({ error: 'Lietotājvārds jau aizņemts' });

  const user = {
    id: uuidv4(),
    username: username.trim(),
    password: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: Date.now()
  };
  db.users.push(user);
  saveDB();
  const token = makeToken(user.id);
  res.json({ ok: true, token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Aizpildi visus laukus' });
  const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole' });
  const token = makeToken(user.id);
  res.json({ ok: true, token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post('/api/auth/logout', (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  tokens.delete(token);
  res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const user = getUserFromToken(req);
  if (!user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: { id: user.id, username: user.username, role: user.role } });
});

// ══════════════════════════════════════════════════════
//  FOLDERS
// ══════════════════════════════════════════════════════
app.get('/api/folders', requireAuth, (req, res) => {
  res.json({
    folders: db.folders.map(f => ({
      ...f, count: db.tracks.filter(t => t.folderId === f.id).length
    }))
  });
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
  if (req.params.id === 'default')
    return res.status(400).json({ error: 'Nevar dzēst noklusējuma mapi' });
  db.folders = db.folders.filter(f => f.id !== req.params.id);
  db.tracks.forEach(t => { if (t.folderId === req.params.id) t.folderId = 'default'; });
  saveDB();
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════
//  TRACKS
// ══════════════════════════════════════════════════════
app.get('/api/tracks', requireAuth, (req, res) => {
  const { folder } = req.query;
  res.json({ tracks: folder ? db.tracks.filter(t => t.folderId === folder) : db.tracks });
});

app.post('/api/upload', requireAuth, upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nav faila' });
  const track = {
    id:         uuidv4(),
    title:      req.body.title || req.file.originalname.replace(/\.[^.]+$/, ''),
    artist:     req.body.artist || '',
    folderId:   req.body.folderId || 'default',
    filename:   req.file.filename,
    uploadedBy: req.user.username,
    uploaderId: req.user.id,
    addedAt:    Date.now(),
    size:       req.file.size
  };
  db.tracks.push(track);
  saveDB();
  res.json({ track });
});

app.put('/api/tracks/:id', requireAuth, (req, res) => {
  const track = db.tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Nav atrasts' });
  if (req.user.role !== 'admin' && track.uploaderId !== req.user.id)
    return res.status(403).json({ error: 'Nav tiesību' });
  const { title, artist, folderId } = req.body;
  if (title)               track.title    = title;
  if (artist !== undefined) track.artist  = artist;
  if (folderId)            track.folderId = folderId;
  saveDB();
  res.json({ track });
});

app.delete('/api/tracks/:id', requireAuth, (req, res) => {
  const track = db.tracks.find(t => t.id === req.params.id);
  if (!track) return res.status(404).json({ error: 'Nav atrasts' });
  if (req.user.role !== 'admin' && track.uploaderId !== req.user.id)
    return res.status(403).json({ error: 'Nav tiesību' });
  try { fs.unlinkSync(path.join(UPLOADS_DIR, track.filename)); } catch(e) {}
  db.tracks = db.tracks.filter(t => t.id !== track.id);
  saveDB();
  res.json({ ok: true });
});

app.get('/api/search', requireAuth, (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json({ results: [] });
  res.json({
    results: db.tracks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.artist || '').toLowerCase().includes(q) ||
      (t.uploadedBy || '').toLowerCase().includes(q)
    )
  });
});

// ══════════════════════════════════════════════════════
//  ADMIN
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

// ── Serve frontend ─────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎵 MusicBox running on port ${PORT}`);
});
