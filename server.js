require('dotenv').config();
const express    = require('express');
const http       = require('http');
const socketio   = require('socket.io');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app    = express();
const server = http.createServer(app);
const io     = socketio(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'https://musicbox.lv',
      'https://greenman-ai.onrender.com',  // ✅ FIX 1: Render.com domēns pievienots
    ],
    credentials: true
  }
});
const PORT = process.env.PORT || 3000;

// ══════════════════════════════════════════════════
//  SECURITY HEADERS
// ══════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// ══════════════════════════════════════════════════
//  CORS  (✅ FIX 1: Render.com domēns pievienots)
// ══════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://musicbox.lv',
  'https://greenman-ai.onrender.com',
];
const cors = require('cors');
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// ══════════════════════════════════════════════════
//  RATE LIMITING (without external package)
// ══════════════════════════════════════════════════
const rateLimitMap = new Map();
function rateLimit(maxReq, windowMs) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = ip;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    rateLimitMap.set(key, entry);
    if (entry.count > maxReq) return res.status(429).json({ error: 'Pārāk daudz pieprasījumu. Mēģini vēlāk.' });
    next();
  };
}
// Clean up old entries every 5 min
setInterval(() => { const now=Date.now(); for(const [k,v] of rateLimitMap) if(now>v.reset) rateLimitMap.delete(k); }, 300000);

const authLimiter   = rateLimit(10,  60000);  // 10 login attempts/min
const uploadLimiter = rateLimit(20, 300000);  // 20 uploads per 6 min
const apiLimiter    = rateLimit(200, 60000);  // 200 api calls/min

// ── CORS — atļauj Expo Go un web piekļuvi ──
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (!origin || origin.startsWith('exp://') || origin.startsWith('http://192.168.') ||
      origin.startsWith('http://localhost') || origin === 'https://greenman-ai.onrender.com') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use('/api/', apiLimiter);

// ══════════════════════════════════════════════════
//  CLOUDINARY
// ══════════════════════════════════════════════════
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Audio storage
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        'musicbox/audio',
    resource_type: 'video',
    public_id:     'track_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex'),
  }),
});

// Image storage (bg images)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        'musicbox/backgrounds',
    resource_type: 'image',
    public_id:     'bg_' + (req.user?.username || 'anon') + '_' + Date.now(),  // ✅ FIX: optional chaining
    transformation: [{ width: 1920, height: 1080, crop: 'fill', quality: 'auto' }],
  }),
});

const audioFilter = (req, file, cb) => {
  const ok = ['.mp3','.wav','.ogg','.flac','.m4a','.aac'];
  ok.includes(path.extname(file.originalname).toLowerCase()) ? cb(null,true) : cb(new Error('Tikai audio faili'));
};
const imageFilter = (req, file, cb) => {
  const ok = ['.jpg','.jpeg','.png','.webp','.gif'];
  ok.includes(path.extname(file.originalname).toLowerCase()) ? cb(null,true) : cb(new Error('Tikai attēli: JPG, PNG, WEBP'));
};

// Cover image storage (album art)
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        'musicbox/covers',
    resource_type: 'image',
    public_id:     'cover_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }],
  }),
});

// Avatar storage
const avatarStorage = new CloudinaryStorage({  // ✅ FIX 4: Avatar storage pievienots
  cloudinary,
  params: async (req, file) => ({
    folder:        'musicbox/avatars',
    resource_type: 'image',
    public_id:     'avatar_' + (req.user?.username || 'anon') + '_' + Date.now(),
    transformation: [{ width: 256, height: 256, crop: 'fill', quality: 'auto' }],
  }),
});

const uploadCover  = multer({ storage: coverStorage,  fileFilter: imageFilter, limits: { fileSize: 10*1024*1024 } });
const uploadImage  = multer({ storage: imageStorage,  fileFilter: imageFilter, limits: { fileSize: 10*1024*1024 } });
const uploadAvatar = multer({ storage: avatarStorage, fileFilter: imageFilter, limits: { fileSize: 5*1024*1024 } });  // ✅ FIX 4
// ── Upload limits konfigurācija ──
const MAX_FILE_MB      = 25;
const MAX_DURATION_SEC = 360;
const MAX_PER_USER_DAY = 10;
const dailyUploads     = new Map();

const uploadAudio = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: MAX_FILE_MB * 1024 * 1024 } });
const uploadMulti = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: MAX_FILE_MB * 1024 * 1024 } });

function checkDailyLimit(req, res, next) {
  const today = new Date().toISOString().slice(0, 10);
  const key   = `${req.user.username}:${today}`;
  const count = dailyUploads.get(key) || 0;
  if (count >= MAX_PER_USER_DAY)
    return res.status(429).json({ error: `Dienas limits sasniegts (${MAX_PER_USER_DAY} augšupielādes/dienā)` });
  req._uploadKey = key;
  next();
}

// Notīra vecos ierakstus reizi dienā
setInterval(() => {
  const today = new Date().toISOString().slice(0, 10);
  for (const k of dailyUploads.keys()) {
    if (!k.endsWith(today)) dailyUploads.delete(k);
  }
}, 24 * 60 * 60 * 1000);

// ══════════════════════════════════════════════════
//  MONGODB
// ══════════════════════════════════════════════════
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB savienots'))
  .catch(e => { console.error('❌ MongoDB:', e.message); process.exit(1); });

// ── Schemas ──────────────────────────────────────
const UserSchema = new mongoose.Schema({
  username:     { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  salt:         { type: String, required: true },
  role:         { type: String, enum: ['user','admin'], default: 'user' },
  bgUrl:        { type: String, default: '' },
  bgPublicId:   { type: String, default: '' },
  favorites:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  myPlaylist:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  notifications:[{ message: String, createdAt: { type: Date, default: Date.now }, read: { type: Boolean, default: false } }],
}, { timestamps: true });

const TrackSchema = new mongoose.Schema({
  title:        { type: String, required: true, trim: true },
  artist:       { type: String, default: '', trim: true },
  lyrics:       { type: String, default: '' },
  coverUrl:     { type: String, default: '' },
  coverPublicId:{ type: String, default: '' },
  cloudUrl:     { type: String, required: true },
  publicId:     { type: String, required: true },
  size:         { type: Number, default: 0 },
  uploader:     { type: String, required: true },
  folderId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  plays:        { type: Number, default: 0 },
}, { timestamps: true });

const FolderSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  color:     { type: String, default: '#00d4ff' },
  createdBy: { type: String, required: true },
  isPrivate: { type: Boolean, default: false },
  ownerId:   { type: String, default: '' },
}, { timestamps: true });

// Shared playlist — one global queue that everyone sees
const PlaylistSchema = new mongoose.Schema({
  trackIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

const SessionSchema = new mongoose.Schema({
  token:     { type: String, required: true, unique: true, index: true },
  username:  { type: String, required: true },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 7*24*60*60*1000) },
});
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Ad banner — admin managed
const AdSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  text:      { type: String, default: '' },
  imageUrl:  { type: String, default: '' },
  linkUrl:   { type: String, default: '' },
  active:    { type: Boolean, default: true },
  createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

// Global ticker / announcement
const TickerSchema = new mongoose.Schema({
  text:      { type: String, default: '' },
  active:    { type: Boolean, default: false },
  updatedBy: { type: String, default: '' },
}, { timestamps: true });

// ✅ FIX 3: avatarUrl dublikāts noņemts
const ProfileSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true },
  bio:           { type: String, default: '', maxlength: 200 },
  mood:          { type: String, default: '' },
  avatarUrl:     { type: String, default: '' },
  avatarPublicId:{ type: String, default: '' },
  social:        { type: String, default: '' },
  nick:          { type: String, default: '', maxlength: 30 },
}, { timestamps: true });

// ✅ FIX 2: HomeAdSchema definēts PIRMS modeļu reģistrācijas
const HomeAdSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  imageUrl:  { type: String, default: '' },
  linkUrl:   { type: String, default: '' },
  text:      { type: String, default: '' },
  slot:      { type: Number, default: 1, min: 1, max: 6 },
  active:    { type: Boolean, default: true },
  createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

// ── Modeļi ───────────────────────────────────────
const User     = mongoose.model('User',     UserSchema);
const Track    = mongoose.model('Track',    TrackSchema);
const Folder   = mongoose.model('Folder',   FolderSchema);
const Playlist = mongoose.model('Playlist', PlaylistSchema);
const Session  = mongoose.model('Session',  SessionSchema);
const Ad       = mongoose.model('Ad',       AdSchema);
const Ticker   = mongoose.model('Ticker',   TickerSchema);
const Profile  = mongoose.model('Profile',  ProfileSchema);
const HomeAd   = mongoose.model('HomeAd',   HomeAdSchema);

if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });

// ── middleware ────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public', { maxAge: '7d' }));

// ── helpers ───────────────────────────────────────
function hashPwd(pwd, salt) {
  return crypto.pbkdf2Sync(pwd, salt, 200000, 64, 'sha512').toString('hex');
}
function makeToken() { return crypto.randomBytes(48).toString('hex'); }
function sanitize(str) {
  return String(str||'').replace(/<[^>]*>/g,'').replace(/[<>"'`]/g,'').trim().slice(0,500);
}

async function requireAuth(req, res, next) {
  try {
    const token = (req.headers['authorization']||'').replace('Bearer ','').trim();
    if (!token) return res.status(401).json({ error: 'Nepieciešama autorizācija' });
    const sess = await Session.findOne({ token, expiresAt:{$gt:new Date()} });
    if (!sess) return res.status(401).json({ error: 'Sesija beigusies — ielogojies vēlreiz' });
    const user = await User.findOne({ username: sess.username });
    if (!user) return res.status(401).json({ error: 'Lietotājs neeksistē' });
    req.user = { username: user.username, role: user.role };
    next();
  } catch(e) { res.status(500).json({ error: 'Servera kļūda' }); }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin')
    return res.status(403).json({ error: 'Tikai adminam atļauts' });
  next();
}

async function seedAdmin() {
  const u = process.env.ADMIN_USER || 'admin';
  const p = process.env.ADMIN_PASS || 'admin123';
  if (!await User.findOne({ username: u })) {
    const salt = crypto.randomBytes(32).toString('hex');
    await User.create({ username: u, passwordHash: hashPwd(p, salt), salt, role: 'admin' });
    console.log(`✅ Admin izveidots: ${u}`);
  }
  if (!await Playlist.findOne()) {
    await Playlist.create({ trackIds: [] });
    console.log('✅ Kopīgā playliste izveidota');
  }
}

// ══════════════════════════════════════════════════
//  SOCKET.IO — reāllaika paziņojumi
// ══════════════════════════════════════════════════
io.on('connection', socket => {
  socket.on('ticker-update', txt => io.emit('ticker', txt));
  socket.on('new-track', data => io.emit('track-added', data));
});

// ══════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════
app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password)
      return res.status(400).json({ error: 'Aizpildi abi laukus' });
    if (username.trim().length < 3)
      return res.status(400).json({ error: 'Lietotājvārds — min. 3 rakstzīmes' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Parole — min. 6 rakstzīmes' });
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(username.trim()))
      return res.status(400).json({ error: 'Lietotājvārds — tikai burti, cipari, _ -' });
    if (await User.findOne({ username: username.trim() }))
      return res.status(409).json({ error: 'Lietotājvārds aizņemts' });
    const salt = crypto.randomBytes(32).toString('hex');
    await User.create({ username: username.trim(), passwordHash: hashPwd(password, salt), salt });
    const token = makeToken();
    await Session.create({ token, username: username.trim() });
    res.status(201).json({ token, username: username.trim(), role: 'user', bgUrl: '' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password)
      return res.status(400).json({ error: 'Aizpildi abi laukus' });
    const user = await User.findOne({ username: username.trim() });
    if (!user || hashPwd(password, user.salt) !== user.passwordHash)
      return res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole' });
    const token = makeToken();
    await Session.create({ token, username: user.username });
    res.json({ token, username: user.username, role: user.role, bgUrl: user.bgUrl || '' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/logout', requireAuth, async (req, res) => {
  const token = req.headers['authorization'].replace('Bearer ','').trim();
  await Session.deleteOne({ token });
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  const user = await User.findOne({ username: req.user.username });
  const unread = (user.notifications||[]).filter(n=>!n.read).length;
  res.json({ username: user.username, role: user.role, bgUrl: user.bgUrl||'', favorites: user.favorites||[], myPlaylist: user.myPlaylist||[], unreadNotifications: unread });
});

// ── Change password ───────────────────────────────
app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Aizpildi abi paroles laukus' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Jaunā parole — min. 6 rakstzīmes' });
    const user = await User.findOne({ username: req.user.username });
    if (hashPwd(currentPassword, user.salt) !== user.passwordHash)
      return res.status(401).json({ error: 'Pašreizējā parole ir nepareiza' });
    const newSalt = crypto.randomBytes(32).toString('hex');
    user.passwordHash = hashPwd(newPassword, newSalt);
    user.salt = newSalt;
    await user.save();
    const curToken = req.headers['authorization'].replace('Bearer ','').trim();
    await Session.deleteMany({ username: req.user.username, token: { $ne: curToken } });
    res.json({ ok: true, message: 'Parole mainīta veiksmīgi' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Admin: reset another user's password
app.post('/api/admin/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, newPassword } = req.body || {};
    if (!username || !newPassword)
      return res.status(400).json({ error: 'Aizpildi visus laukus' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Parole — min. 6 rakstzīmes' });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    const salt = crypto.randomBytes(32).toString('hex');
    user.passwordHash = hashPwd(newPassword, salt);
    user.salt = salt;
    await user.save();
    await Session.deleteMany({ username });
    res.json({ ok: true, message: `Parole atiestatīta lietotājam ${username}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  BACKGROUND IMAGE
// ══════════════════════════════════════════════════
app.post('/api/me/background', requireAuth, (req, res) => {
  uploadImage.single('bg')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav faila' });
      const user = await User.findOne({ username: req.user.username });
      if (user.bgPublicId) {
        try { await cloudinary.uploader.destroy(user.bgPublicId, { resource_type: 'image' }); } catch(e){}
      }
      user.bgUrl = req.file.path;
      user.bgPublicId = req.file.filename;
      await user.save();
      res.json({ bgUrl: user.bgUrl });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/me/background', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (user.bgPublicId) {
      try { await cloudinary.uploader.destroy(user.bgPublicId, { resource_type: 'image' }); } catch(e){}
    }
    user.bgUrl = ''; user.bgPublicId = '';
    await user.save();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ✅ FIX 5: /api/me/background-url — fons no URL (izmanto index.html setBgFromUrl())
app.post('/api/me/background-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url?.trim()) return res.status(400).json({ error: 'URL obligāts' });
    // Validē ka ir URL formāts
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url.trim()))
      return res.status(400).json({ error: 'Ievadi derīgu attēla URL (.jpg .png .webp)' });
    const user = await User.findOne({ username: req.user.username });
    // Dzēš veco Cloudinary fonu ja tāds ir
    if (user.bgPublicId) {
      try { await cloudinary.uploader.destroy(user.bgPublicId, { resource_type: 'image' }); } catch(e){}
    }
    user.bgUrl = url.trim();
    user.bgPublicId = '';
    await user.save();
    res.json({ bgUrl: user.bgUrl });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  FAVORITES
// ══════════════════════════════════════════════════
app.post('/api/me/favorites/:trackId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const tid = req.params.trackId;
    const has = user.favorites.map(String).includes(String(tid));
    if (has) user.favorites = user.favorites.filter(f => String(f) !== String(tid));
    else user.favorites.push(tid);
    await user.save();
    res.json({ favorites: user.favorites, added: !has });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  FOLDERS
// ══════════════════════════════════════════════════
app.get('/api/folders', async (req, res) => {
  try {
    const token = (req.headers['authorization']||'').replace('Bearer ','').trim();
    let username = null;
    if (token) {
      const sess = await Session.findOne({ token, expiresAt:{ $gt: new Date() } });
      if (sess) username = sess.username;
    }
    const query = username
      ? { $or: [{ isPrivate: { $ne: true } }, { isPrivate: true, ownerId: username }] }
      : { isPrivate: { $ne: true } };
    res.json({ folders: await Folder.find(query).sort({ createdAt: 1 }) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/folders', requireAuth, async (req, res) => {
  try {
    const { name, color='#00d4ff', isPrivate=false } = req.body||{};
    if (!name?.trim()) return res.status(400).json({ error: 'Nosaukums obligāts' });
    if (!isPrivate && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Tikai admins var veidot publiskas mapes' });
    const folder = await Folder.create({
      name: name.trim(), color,
      createdBy: req.user.username,
      isPrivate: !!isPrivate,
      ownerId: isPrivate ? req.user.username : '',
    });
    if (!isPrivate) {
      await User.updateMany(
        { username: { $ne: req.user.username } },
        { $push: { notifications: { message: `📁 Jauna mape: "${name.trim()}" pievienoja ${req.user.username}` } } }
      );
    }
    res.status(201).json({ folder });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ error: 'Nav atrasta' });
    if (req.user.role !== 'admin' && folder.ownerId !== req.user.username)
      return res.status(403).json({ error: 'Nav tiesību' });
    await Folder.findByIdAndDelete(req.params.id);
    await Track.updateMany({ folderId: req.params.id }, { $set: { folderId: null } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  UPLOAD LIMITS — /api/upload/limits
// ══════════════════════════════════════════════════
const UPLOAD_LIMITS = {
  maxSizeMB:      25,
  maxDurationMin: 6,
  allowedTypes:   ['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/mp4','audio/m4a','audio/x-m4a'],
  uploadsPerDay:  10,
};
const uploadCountMap = new Map();
function getUploadCount(username) {
  const today = new Date().toDateString();
  const e = uploadCountMap.get(username);
  if (!e || e.date !== today) { uploadCountMap.set(username, { count: 0, date: today }); return 0; }
  return e.count;
}
function incrementUploadCount(username) {
  const today = new Date().toDateString();
  const e = uploadCountMap.get(username);
  if (!e || e.date !== today) uploadCountMap.set(username, { count: 1, date: today });
  else e.count++;
}

app.get('/api/upload/limits', requireAuth, (req, res) => {
  const used = getUploadCount(req.user.username);
  const remaining = Math.max(0, UPLOAD_LIMITS.uploadsPerDay - used);
  res.json({
    maxSizeMB:      UPLOAD_LIMITS.maxSizeMB,
    maxDurationMin: UPLOAD_LIMITS.maxDurationMin,
    allowedTypes:   UPLOAD_LIMITS.allowedTypes,
    uploadsPerDay:  UPLOAD_LIMITS.uploadsPerDay,
    usedToday:      used,
    remaining:      remaining,
    canUpload:      remaining > 0,
  });
});

// ══════════════════════════════════════════════════
//  TRACKS
// ══════════════════════════════════════════════════
app.get('/api/tracks', async (req, res) => {
  try {
    const { sort='createdAt', order='desc' } = req.query;
    const allowed = ['createdAt','title','artist','plays'];
    const sortField = allowed.includes(sort) ? sort : 'createdAt';
    const sortDir = order === 'asc' ? 1 : -1;
    res.json({ tracks: await Track.find().sort({ [sortField]: sortDir }) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Edit track (title, artist, lyrics, folderId)
app.patch('/api/tracks/:id', requireAuth, async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Nav atrasts' });
    if (t.uploader !== req.user.username && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Nav tiesību' });
    const { title, artist, lyrics, folderId } = req.body||{};
    if (title?.trim()) t.title = title.trim();
    if (artist !== undefined) t.artist = artist.trim();
    if (lyrics !== undefined) t.lyrics = lyrics;
    if (folderId !== undefined) t.folderId = folderId||null;
    await t.save();
    res.json({ track: t });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Upload cover for track
app.post('/api/tracks/:id/cover', requireAuth, (req, res) => {
  uploadCover.single('cover')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const t = await Track.findById(req.params.id);
      if (!t) return res.status(404).json({ error: 'Nav atrasts' });
      if (t.uploader !== req.user.username && req.user.role !== 'admin')
        return res.status(403).json({ error: 'Nav tiesību' });
      if (t.coverPublicId) {
        try { await cloudinary.uploader.destroy(t.coverPublicId, { resource_type: 'image' }); } catch(e){}
      }
      t.coverUrl = req.file.path;
      t.coverPublicId = req.file.filename;
      await t.save();
      res.json({ coverUrl: t.coverUrl });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// Single upload
app.post('/api/upload', requireAuth, uploadLimiter, (req, res) => {
  uploadAudio.single('audio')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav faila' });
      const { title, artist='', folderId='' } = req.body;
      const track = await Track.create({
        title:    title?.trim() || req.file.originalname.replace(/\.[^/.]+$/,''),
        artist:   artist?.trim()||'',
        cloudUrl: req.file.path,
        publicId: req.file.filename,
        size:     req.file.size||0,
        uploader: req.user.username,
        folderId: folderId||null,
      });
      incrementUploadCount(req.user.username);
      res.status(201).json({ track });
      // Notify all other users
      await User.updateMany(
        { username: { $ne: req.user.username } },
        { $push: { notifications: { message: `🎵 "${track.title}" pievienoja ${req.user.username}` } } }
      );
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// Multi upload — up to 20 files at once
app.post('/api/upload-multi', requireAuth, uploadLimiter, (req, res) => {
  uploadAudio.array('audio', 20)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.files?.length) return res.status(400).json({ error: 'Nav failu' });
      const { folderId='' } = req.body;
      const tracks = await Promise.all(req.files.map(f =>
        Track.create({
          title:    f.originalname.replace(/\.[^/.]+$/,''),
          artist:   '',
          cloudUrl: f.path,
          publicId: f.filename,
          size:     f.size||0,
          uploader: req.user.username,
          folderId: folderId||null,
        })
      ));
      incrementUploadCount(req.user.username);
      res.status(201).json({ tracks, count: tracks.length });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/tracks/:id', requireAuth, async (req, res) => {
  try {
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Nav atrasts' });
    if (t.uploader !== req.user.username && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Nav tiesību dzēst šo dziesmu' });
    try { await cloudinary.uploader.destroy(t.publicId, { resource_type:'video' }); } catch(e){}
    await t.deleteOne();
    await Playlist.updateOne({}, { $pull: { trackIds: t._id } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tracks/:id/play', async (req, res) => {
  try { await Track.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }); } catch(e){}
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════
//  PERSONAL PLAYLIST
// ══════════════════════════════════════════════════
app.get('/api/me/playlist', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    res.json({ trackIds: user.myPlaylist || [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/me/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const tid = req.params.trackId;
    if (!user.myPlaylist.map(String).includes(String(tid))) {
      user.myPlaylist.push(tid);
      await user.save();
    }
    res.json({ ok: true, trackIds: user.myPlaylist });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/me/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    user.myPlaylist = user.myPlaylist.filter(id => String(id) !== req.params.trackId);
    await user.save();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/me/playlist', requireAuth, async (req, res) => {
  try {
    const { trackIds=[] } = req.body||{};
    await User.findOneAndUpdate({ username: req.user.username }, { myPlaylist: trackIds });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/me/playlist/clear', requireAuth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ username: req.user.username }, { myPlaylist: [] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════
app.get('/api/me/notifications', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    const notifs = (user.notifications||[]).slice(-50).reverse();
    res.json({ notifications: notifs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/me/notifications/read', requireAuth, async (req, res) => {
  try {
    await User.findOneAndUpdate(
      { username: req.user.username },
      { $set: { 'notifications.$[].read': true } }
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  USER STATS
// ══════════════════════════════════════════════════
app.get('/api/me/stats', requireAuth, async (req, res) => {
  try {
    const [uploaded, user] = await Promise.all([
      Track.find({ uploader: req.user.username }),
      User.findOne({ username: req.user.username }),
    ]);
    const totalPlays = uploaded.reduce((s,t)=>s+t.plays,0);
    const totalSize  = uploaded.reduce((s,t)=>s+t.size,0);
    res.json({
      uploaded: uploaded.length,
      totalPlays,
      totalSize,
      favorites: (user.favorites||[]).length,
      playlist:  (user.myPlaylist||[]).length,
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  ADMIN
// ══════════════════════════════════════════════════
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const [users, tracks, folders] = await Promise.all([
      User.countDocuments(), Track.countDocuments(), Folder.countDocuments()
    ]);
    const agg = await Track.aggregate([{ $group:{_id:null, plays:{$sum:'$plays'}, size:{$sum:'$size'}} }]);
    res.json({ users, tracks, folders, totalPlays:agg[0]?.plays||0, totalSize:agg[0]?.size||0 });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json({ users: await User.find({}, 'username role createdAt').sort({ createdAt:-1 }) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/users/:username/role', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Loma: user vai admin' });
    if (req.params.username === req.user.username) return res.status(400).json({ error: 'Nevar mainīt sev lomu' });
    await User.findOneAndUpdate({ username: req.params.username }, { role });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.username === req.user.username) return res.status(400).json({ error: 'Nevar dzēst sevi' });
    await User.deleteOne({ username: req.params.username });
    await Session.deleteMany({ username: req.params.username });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  TRENDING
// ══════════════════════════════════════════════════
app.get('/api/trending', async (req, res) => {
  try {
    const tracks = await Track.find().sort({ plays: -1 }).limit(20);
    res.json({ tracks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  FEED
// ══════════════════════════════════════════════════
app.get('/api/feed', async (req, res) => {
  try {
    const tracks = await Track.find().sort({ createdAt: -1 }).limit(30);
    const feed = tracks.map(t => ({
      type: 'track',
      _id: t._id,
      title: t.title,
      artist: t.artist,
      uploader: t.uploader,
      coverUrl: t.coverUrl,
      plays: t.plays,
      createdAt: t.createdAt,
    }));
    res.json({ feed });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  ADS
// ══════════════════════════════════════════════════
app.get('/api/ads', async (req, res) => {
  try { res.json({ ads: await Ad.find({ active: true }).sort({ createdAt: -1 }) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/ads', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, text, imageUrl, linkUrl } = req.body||{};
    if (!title?.trim()) return res.status(400).json({ error: 'Virsraksts obligāts' });
    const ad = await Ad.create({
      title: sanitize(title), text: sanitize(text||''),
      imageUrl: sanitize(imageUrl||''), linkUrl: sanitize(linkUrl||''),
      createdBy: req.user.username,
    });
    res.status(201).json({ ad });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, text, imageUrl, linkUrl, active } = req.body||{};
    const upd = {};
    if (title !== undefined) upd.title = sanitize(title);
    if (text  !== undefined) upd.text  = sanitize(text);
    if (imageUrl !== undefined) upd.imageUrl = sanitize(imageUrl);
    if (linkUrl  !== undefined) upd.linkUrl  = sanitize(linkUrl);
    if (active   !== undefined) upd.active   = !!active;
    await Ad.findByIdAndUpdate(req.params.id, upd);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await Ad.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/ads', requireAuth, requireAdmin, async (req, res) => {
  try { res.json({ ads: await Ad.find().sort({ createdAt: -1 }) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  PROFILES
// ══════════════════════════════════════════════════
app.get('/api/profiles/:username', async (req, res) => {
  try {
    const profile = await Profile.findOne({ username: req.params.username }) || { username: req.params.username, bio:'', mood:'', avatarUrl:'', social:'', nick:'' };
    const tracks  = await Track.find({ uploader: req.params.username }).sort({ plays: -1 }).limit(10);
    res.json({ profile, tracks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/me/profile', requireAuth, async (req, res) => {
  try {
    const { bio, mood, social, nick } = req.body||{};
    const upd = {
      bio:    sanitize(bio||'').slice(0,200),
      mood:   sanitize(mood||'').slice(0,50),
      social: sanitize(social||'').slice(0,100),
      nick:   sanitize(nick||'').slice(0,30),
    };
    const profile = await Profile.findOneAndUpdate(
      { username: req.user.username },
      { ...upd, username: req.user.username },
      { upsert: true, new: true }
    );
    res.json({ profile });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ✅ FIX 4: Avatar upload endpoint
app.post('/api/me/avatar', requireAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav faila' });
      const profile = await Profile.findOne({ username: req.user.username });
      // Dzēš veco avataru
      if (profile?.avatarPublicId) {
        try { await cloudinary.uploader.destroy(profile.avatarPublicId, { resource_type: 'image' }); } catch(e){}
      }
      const updated = await Profile.findOneAndUpdate(
        { username: req.user.username },
        { avatarUrl: req.file.path, avatarPublicId: req.file.filename, username: req.user.username },
        { upsert: true, new: true }
      );
      res.json({ avatarUrl: updated.avatarUrl });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// ══════════════════════════════════════════════════
//  TICKER
// ══════════════════════════════════════════════════
app.get('/api/ticker', async (req, res) => {
  try {
    const t = await Ticker.findOne({ active: true });
    res.json({ ticker: t ? t.text : '', active: !!t });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/ticker', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text } = req.body||{};
    if (!text?.trim()) return res.status(400).json({ error: 'Teksts obligāts' });
    await Ticker.updateMany({}, { active: false });
    const t = await Ticker.create({ text: sanitize(text).slice(0,300), active: true, updatedBy: req.user.username });
    await User.updateMany(
      { username: { $ne: req.user.username } },
      { $push: { notifications: { message: `📢 Paziņojums: ${sanitize(text).slice(0,100)}` } } }
    );
    // Socket.io — reāllaika broadcast visiem
    io.emit('ticker', t.text);
    res.json({ ticker: t });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/ticker', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Ticker.updateMany({}, { active: false });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  HOME SCREEN ADS
// ══════════════════════════════════════════════════
app.get('/api/home-ads', async (req, res) => {
  try {
    const ads = await HomeAd.find({ active: true }).sort({ slot: 1 });
    res.json({ ads });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/home-ads', requireAuth, requireAdmin, async (req, res) => {
  try { res.json({ ads: await HomeAd.find().sort({ slot: 1 }) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/home-ads', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, text, slot } = req.body||{};
    if (!title?.trim()) return res.status(400).json({ error: 'Virsraksts obligāts' });
    const ad = await HomeAd.create({
      title: sanitize(title), imageUrl: sanitize(imageUrl||''),
      linkUrl: sanitize(linkUrl||''), text: sanitize(text||''),
      slot: parseInt(slot)||1, createdBy: req.user.username,
    });
    res.status(201).json({ ad });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/admin/home-ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, text, slot, active } = req.body||{};
    const upd = {};
    if (title !== undefined)    upd.title    = sanitize(title);
    if (imageUrl !== undefined) upd.imageUrl = sanitize(imageUrl);
    if (linkUrl !== undefined)  upd.linkUrl  = sanitize(linkUrl);
    if (text !== undefined)     upd.text     = sanitize(text);
    if (slot !== undefined)     upd.slot     = parseInt(slot)||1;
    if (active !== undefined)   upd.active   = !!active;
    await HomeAd.findByIdAndUpdate(req.params.id, upd);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/home-ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await HomeAd.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  HEALTH + PWA
// ══════════════════════════════════════════════════
app.get('/api/health', (req, res) => res.json({ ok:true, time:new Date().toISOString() }));

app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'MusicBox',
    short_name: 'MusicBox',
    description: 'Tava personīgā mūzikas bibliotēka',
    start_url: '/',
    display: 'standalone',
    background_color: '#d4e9f8',
    theme_color: '#1565a0',
    orientation: 'portrait-primary',
    icons: [
      { src: 'https://i.pinimg.com/1200x/0c/f9/5a/0cf95a12ec2d42ef15df2727a16ef208.jpg', sizes: '192x192', type: 'image/jpeg', purpose: 'any maskable' },
      { src: 'https://i.pinimg.com/1200x/0c/f9/5a/0cf95a12ec2d42ef15df2727a16ef208.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' }
    ],
    categories: ['music','entertainment'],
    lang: 'lv'
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  const sw = `const CACHE='musicbox-v1';const STATIC=['/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||u.pathname.match(/\\.(mp3|wav|ogg|flac|m4a|aac)$/i))return;e.respondWith(caches.match(e.request).then(cached=>{if(cached)return cached;return fetch(e.request).then(res=>{if(res&&res.status===200&&e.request.method==='GET'){const cl=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}return res;}).catch(()=>caches.match('/index.html'));}));});`;
  res.send(sw);
});

// ══════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════
mongoose.connection.once('open', async () => {
  await seedAdmin();
  server.listen(PORT, () => console.log(`
╔═══════════════════════════════════════════╗
║  MusicBox v7  —  Full Security Edition    ║
║  i18n + Trending + Feed + Ads + Profiles  ║
║  Socket.IO + Avatar + BG-URL + CORS fix   ║
║  http://localhost:${PORT}                     ║
╚═══════════════════════════════════════════╝`));
});
