const express    = require('express');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── JSON / form body parsing — PIRMS visiem maršrutiem ──
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ── Kopē index.html un design.css uz public/ nekavējoties pie starta ──
if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });
const _idxSrc  = path.join(__dirname, 'index.html');
const _idxDest = path.join(__dirname, 'public', 'index.html');
if (fs.existsSync(_idxSrc)) fs.copyFileSync(_idxSrc, _idxDest);

const _cssSrc  = path.join(__dirname, 'design.css');
const _cssDest = path.join(__dirname, 'public', 'design.css');
if (fs.existsSync(_cssSrc)) fs.copyFileSync(_cssSrc, _cssDest);

// ── CORS ──────────────────────────────────────────────
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const allowed = [
    'https://greenman-ai.onrender.com',
    'http://localhost:3000',
    'http://localhost:8081',
    'http://192.168.1',
    'exp://',
  ];
  const isAllowed = !origin ||
    allowed.some(a => origin.startsWith(a)) ||
    origin.startsWith('exp://') ||
    origin.match(/^http:\/\/192\.168\./);
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : 'https://greenman-ai.onrender.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ── Static files — PIRMS maršrutiem ──────────────────
app.use(express.static('public', { maxAge: '1d' }));

// ══════════════════════════════════════════════════
//  SECURITY HEADERS
// ══════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // CSP — atļauj visus vajadzīgos ārējos resursus
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob: https: https://*.cloudinary.com https://res.cloudinary.com; " +
    "connect-src 'self' https://*.cloudinary.com https://api.cloudinary.com https://res.cloudinary.com https://greenman-ai.onrender.com; " +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'none';"
  );
  next();
});

// ══════════════════════════════════════════════════
//  RATE LIMITING (without external package)
// ══════════════════════════════════════════════════
const rateLimitMap = new Map();
function rateLimit(maxReq, windowMs, prefix) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = (prefix || 'api') + ':' + ip;
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

const authLimiter   = rateLimit(10,   60000, 'auth');    // 10 login attempts/min
const uploadLimiter = rateLimit(20,  300000, 'upload');  // 20 uploads per 5 min
const apiLimiter    = rateLimit(200,  60000, 'api');     // 200 api calls/min
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
    public_id:     'bg_' + req.user.username + '_' + Date.now(),
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
const uploadCover = multer({ storage: coverStorage, fileFilter: imageFilter, limits: { fileSize: 10*1024*1024 } });

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:        'musicbox/avatars',
    resource_type: 'image',
    public_id:     'avatar_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 300, height: 300, crop: 'fill', quality: 'auto' }],
  }),
});
const uploadAvatar = multer({ storage: avatarStorage, fileFilter: imageFilter, limits: { fileSize: 5*1024*1024 } });

const uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter, limits: { fileSize: 10*1024*1024  } });
const uploadMulti = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 100*1024*1024 } });
const uploadAudio = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 100*1024*1024 } });

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

// Global settings (ticker, etc.) — admin managed
const SettingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, default: '' },
  updatedBy: { type: String, default: 'admin' },
}, { timestamps: true });

// Ad banner — admin managed
const AdSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  text:      { type: String, default: '' },
  imageUrl:  { type: String, default: '' },
  linkUrl:   { type: String, default: '' },
  active:    { type: Boolean, default: true },
  createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

// Home page ads (slots 1-6)
const HomeAdSchema = new mongoose.Schema({
  title:     { type: String, required: true },
  imageUrl:  { type: String, default: '' },
  linkUrl:   { type: String, default: '' },
  text:      { type: String, default: '' },
  slot:      { type: Number, default: 1, min: 1, max: 6, unique: true },
  active:    { type: Boolean, default: true },
  createdBy: { type: String, default: 'admin' },
}, { timestamps: true });

// User profile bio/mood
const ProfileSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  bio:      { type: String, default: '', maxlength: 200 },
  mood:     { type: String, default: '' },
  avatarUrl:{ type: String, default: '' },
  social:   { type: String, default: '' },
  nick:     { type: String, default: '', maxlength: 30 },
}, { timestamps: true });

const User     = mongoose.model('User',     UserSchema);
const Track    = mongoose.model('Track',    TrackSchema);
const Folder   = mongoose.model('Folder',   FolderSchema);
const Playlist = mongoose.model('Playlist', PlaylistSchema);
const Session  = mongoose.model('Session',  SessionSchema);
const Ad       = mongoose.model('Ad',       AdSchema);
const Settings = mongoose.model('Settings',  SettingsSchema);
const Profile  = mongoose.model('Profile',  ProfileSchema);
const HomeAd   = mongoose.model('HomeAd',   HomeAdSchema);

// ── helpers ───────────────────────────────────────
function hashPwd(pwd, salt) {
  return crypto.pbkdf2Sync(pwd, salt, 200000, 64, 'sha512').toString('hex');
}
function makeToken() { return crypto.randomBytes(48).toString('hex'); }

// ── ObjectId validācija ───────────────────────────
function isValidId(id) {
  return mongoose.isValidObjectId(id);
}
function badId(res) {
  return res.status(400).json({ error: 'Nederīgs ID' });
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
  // ensure global playlist exists
  if (!await Playlist.findOne()) {
    await Playlist.create({ trackIds: [] });
    console.log('✅ Kopīgā playliste izveidota');
  }
}

// ══════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════
function sanitize(str) {
  return String(str||'').replace(/<[^>]*>/g,'').replace(/[<>"'`]/g,'').trim().slice(0,500);
}

// Notifikāciju helpers — ierobežo līdz 100 uz lietotāju ar $slice
function makeNotifPush(msg) {
  const notif = { message: String(msg).slice(0,300), createdAt: new Date(), read: false };
  return { $push: { notifications: { $each: [notif], $slice: -100 } } };
}

app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username?.trim() || !password)
      return res.status(400).json({ error: 'Aizpildi abi laukus' });
    if (username.trim().length < 3)
      return res.status(400).json({ error: 'Lietotājvārds — min. 3 rakstzīmes' });
    if (username.trim().length > 30)
      return res.status(400).json({ error: 'Lietotājvārds — maks. 30 rakstzīmes' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Parole — min. 6 rakstzīmes' });
    if (password.length > 128)
      return res.status(400).json({ error: 'Parole — maks. 128 rakstzīmes' });
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
    // invalidate all other sessions
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
      // delete old bg from cloudinary
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

// ══════════════════════════════════════════════════
//  AVATAR UPLOAD
// ══════════════════════════════════════════════════
app.post('/api/me/avatar', requireAuth, (req, res) => {
  uploadAvatar.single('avatar')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav faila' });
      await Profile.findOneAndUpdate(
        { username: req.user.username },
        { username: req.user.username, avatarUrl: req.file.path },
        { upsert: true, new: true }
      );
      res.json({ avatarUrl: req.file.path });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// ══════════════════════════════════════════════════
//  BACKGROUND FROM URL
// ══════════════════════════════════════════════════
app.post('/api/me/background-url', requireAuth, async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url?.trim()) return res.status(400).json({ error: 'URL obligāts' });
    // Basic URL validation
    if (!/^https?:\/\/.+/.test(url.trim())) return res.status(400).json({ error: 'Nederīgs URL' });
    const user = await User.findOne({ username: req.user.username });
    user.bgUrl = url.trim().slice(0, 500);
    await user.save();
    res.json({ bgUrl: user.bgUrl });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  FAVORITES
// ══════════════════════════════════════════════════
app.post('/api/me/favorites/:trackId', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.trackId)) return badId(res);
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
    // Only admin can create public folders
    if (!isPrivate && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Tikai admins var veidot publiskas mapes' });
    const folder = await Folder.create({
      name: name.trim(), color,
      createdBy: req.user.username,
      isPrivate: !!isPrivate,
      ownerId: isPrivate ? req.user.username : '',
    });
    // Notify all users about new public folder
    if (!isPrivate) {
      await User.updateMany(
        { username: { $ne: req.user.username } },
        makeNotifPush(`📁 Jauna mape: "${name.trim()}" pievienoja ${req.user.username}`)
      );
    }
    res.status(201).json({ folder });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/folders/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return badId(res);
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
    if (!isValidId(req.params.id)) return badId(res);
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
  if (!isValidId(req.params.id)) return badId(res);
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
      const { title, artist='', folderId='' } = req.body || {};
      const trackTitle = title?.trim() || req.file.originalname.replace(/\.[^/.]+$/,'');
      // Pārbauda vai dziesma ar šādu nosaukumu jau eksistē (no šī paša augšupielādētāja)
      const existing = await Track.findOne({ title: trackTitle, uploader: req.user.username });
      if (existing) {
        return res.status(409).json({ error: `Dziesma "${trackTitle}" jau eksistē tavā bibliotēkā` });
      }
      const track = await Track.create({
        title:    trackTitle,
        artist:   artist?.trim()||'',
        cloudUrl: req.file.path,
        publicId: req.file.filename,
        size:     req.file.size||0,
        uploader: req.user.username,
        folderId: folderId||null,
      });
      res.status(201).json({ track });
      // Notify all other users
      await User.updateMany(
        { username: { $ne: req.user.username } },
        makeNotifPush(`🎵 "${track.title}" pievienoja ${req.user.username}`)
      );
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// Multi upload — up to 20 files at once
app.post('/api/upload-multi', requireAuth, uploadLimiter, (req, res) => {
  uploadMulti.array('audio', 20)(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.files?.length) return res.status(400).json({ error: 'Nav failu' });
      const { folderId='' } = req.body || {};
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
      res.status(201).json({ tracks, count: tracks.length });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/tracks/:id', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return badId(res);
    const t = await Track.findById(req.params.id);
    if (!t) return res.status(404).json({ error: 'Nav atrasts' });
    if (t.uploader !== req.user.username && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Nav tiesību dzēst šo dziesmu' });
    try { await cloudinary.uploader.destroy(t.publicId, { resource_type:'video' }); } catch(e){}
    if (t.coverPublicId) {
      try { await cloudinary.uploader.destroy(t.coverPublicId, { resource_type:'image' }); } catch(e){}
    }
    await t.deleteOne();
    await Playlist.updateOne({}, { $pull: { trackIds: t._id } });
    await User.updateMany({}, { $pull: { myPlaylist: t._id, favorites: t._id } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tracks/:id/play', async (req, res) => {
  if (isValidId(req.params.id)) {
    try { await Track.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }); } catch(e){}
  }
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════
//  PERSONAL PLAYLIST (katram lietotājam sava)
// ══════════════════════════════════════════════════

app.get('/api/me/playlist', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    res.json({ trackIds: user.myPlaylist || [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/me/playlist', requireAuth, async (req, res) => {
  try {
    const { trackIds=[] } = req.body||{};
    await User.findOneAndUpdate({ username: req.user.username }, { myPlaylist: trackIds });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Notīrīt visu manu playlisti — PIRMS /:trackId lai Express to neiztulko kā ID
app.delete('/api/me/playlist/clear', requireAuth, async (req, res) => {
  try {
    await User.findOneAndUpdate({ username: req.user.username }, { myPlaylist: [] });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Pievienot dziesmu manai playliste
app.post('/api/me/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.trackId)) return badId(res);
    const user = await User.findOne({ username: req.user.username });
    const tid = req.params.trackId;
    if (!user.myPlaylist.map(String).includes(String(tid))) {
      user.myPlaylist.push(tid);
      await user.save();
    }
    res.json({ ok: true, trackIds: user.myPlaylist });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Noņemt dziesmu no manas playlistes
app.delete('/api/me/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    if (!isValidId(req.params.trackId)) return badId(res);
    const user = await User.findOne({ username: req.user.username });
    user.myPlaylist = user.myPlaylist.filter(id => String(id) !== req.params.trackId);
    await user.save();
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

// Admin: nosūtīt paziņojumu konkrētam lietotājam vai visiem
app.post('/api/admin/send-notification', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { message, target } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Teksts obligāts' });
    const msg = sanitize(message.trim());
    if (target && target !== 'all') {
      const updated = await User.findOneAndUpdate(
        { username: target },
        makeNotifPush(msg),
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    } else {
      await User.updateMany({}, makeNotifPush(msg));
    }
    res.json({ ok: true });
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
    const { role } = req.body || {};
    if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Loma: user vai admin' });
    if (req.params.username === req.user.username) return res.status(400).json({ error: 'Nevar mainīt sev lomu' });
    await User.findOneAndUpdate({ username: req.params.username }, { role });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/admin/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    if (username === req.user.username) return res.status(400).json({ error: 'Nevar dzēst sevi' });
    // Atrod un dzēš visas lietotāja dziesmas no Cloudinary
    const tracks = await Track.find({ uploader: username });
    for (const t of tracks) {
      try { await cloudinary.uploader.destroy(t.publicId, { resource_type: 'video' }); } catch(e){}
      if (t.coverPublicId) {
        try { await cloudinary.uploader.destroy(t.coverPublicId, { resource_type: 'image' }); } catch(e){}
      }
    }
    const trackIds = tracks.map(t => t._id);
    // Noņem dziesmas no visu citu lietotāju playlistes un favorītiem
    if (trackIds.length) {
      await User.updateMany({}, { $pull: { myPlaylist: { $in: trackIds }, favorites: { $in: trackIds } } });
      await Track.deleteMany({ uploader: username });
    }
    // Dzēš lietotāja privātās mapes
    await Folder.deleteMany({ ownerId: username, isPrivate: true });
    // Dzēš profilu
    await Profile.deleteOne({ username });
    // Dzēš lietotāju un sesijas
    await User.deleteOne({ username });
    await Session.deleteMany({ username });
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
//  FEED (jaunākās aktivitātes)
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
//  ADS (reklāmas — admin pārvalda)
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
//  TICKER (slīdošais ziņojums — visiem redzams)
// ══════════════════════════════════════════════════

// GET ticker — visi redz
app.get('/api/ticker', async (req, res) => {
  try {
    const [t, c] = await Promise.all([
      Settings.findOne({ key: 'ticker' }),
      Settings.findOne({ key: 'ticker_color' }),
    ]);
    res.json({ text: t?.value || '', active: t ? t.value.length > 0 : false, color: c?.value || '#0d47a1' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// SET ticker — tikai admins
app.post('/api/admin/ticker', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text, color } = req.body || {};
    await Settings.findOneAndUpdate(
      { key: 'ticker' },
      { key: 'ticker', value: sanitize(text || ''), updatedBy: req.user.username },
      { upsert: true, new: true }
    );
    // Saglabā krāsu
    if (color) {
      await Settings.findOneAndUpdate(
        { key: 'ticker_color' },
        { key: 'ticker_color', value: sanitize(color), updatedBy: req.user.username },
        { upsert: true, new: true }
      );
    }
    // Nosūti visiem lietotājiem paziņojumu zvaniņā
    if (text?.trim()) {
      await User.updateMany({}, makeNotifPush('📢 ' + sanitize(text.trim())));
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// CLEAR ticker
app.delete('/api/admin/ticker', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Settings.findOneAndUpdate({ key: 'ticker' }, { value: '' }, { upsert: true });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  HOME ADS (sākuma ekrāna reklāmas — 6 sloti)
// ══════════════════════════════════════════════════

// GET aktīvās home reklāmas — visi redz
app.get('/api/home-ads', async (req, res) => {
  try {
    const ads = await HomeAd.find({ active: true }).sort({ slot: 1 });
    res.json({ ads });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET visas home reklāmas — tikai admins
app.get('/api/admin/home-ads', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ads = await HomeAd.find().sort({ slot: 1 });
    res.json({ ads });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// CREATE / UPSERT home reklāma pēc slota
app.post('/api/admin/home-ads', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, text, slot } = req.body || {};
    if (!title?.trim()) return res.status(400).json({ error: 'Virsraksts obligāts' });
    const slotNum = Math.min(6, Math.max(1, parseInt(slot)||1));
    // upsert pēc slota — viens slots = viena reklāma
    const ad = await HomeAd.findOneAndUpdate(
      { slot: slotNum },
      {
        title:     sanitize(title),
        imageUrl:  sanitize(imageUrl||''),
        linkUrl:   sanitize(linkUrl||''),
        text:      sanitize(text||''),
        slot:      slotNum,
        active:    true,
        createdBy: req.user.username,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ ad });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// UPDATE home reklāma
app.patch('/api/admin/home-ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, imageUrl, linkUrl, text, slot, active } = req.body || {};
    const upd = {};
    if (title    !== undefined) upd.title    = sanitize(title);
    if (imageUrl !== undefined) upd.imageUrl = sanitize(imageUrl);
    if (linkUrl  !== undefined) upd.linkUrl  = sanitize(linkUrl);
    if (text     !== undefined) upd.text     = sanitize(text);
    if (slot     !== undefined) upd.slot     = Math.min(6, Math.max(1, parseInt(slot)||1));
    if (active   !== undefined) upd.active   = !!active;
    await HomeAd.findByIdAndUpdate(req.params.id, upd);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE home reklāma
app.delete('/api/admin/home-ads/:id', requireAuth, requireAdmin, async (req, res) => {
  try { await HomeAd.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  PROFILES
// ══════════════════════════════════════════════════
// Dalītā playliste — publiski pieejama pēc lietotājvārda
app.get('/api/shared-playlist/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    const trackIds = user.myPlaylist || [];
    if (!trackIds.length) return res.json({ tracks: [], username: req.params.username });
    const tracks = await Track.find({ _id: { $in: trackIds } });
    // Saglabā playlistes secību
    const ordered = trackIds
      .map(id => tracks.find(t => String(t._id) === String(id)))
      .filter(Boolean);
    res.json({ tracks: ordered, username: req.params.username });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

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
    // Pārbauda nick unikalitāti
    if (nick && nick.trim()) {
      const cleanNick = sanitize(nick.trim()).slice(0,30);
      const existingNick = await Profile.findOne({
        nick: { $regex: new RegExp('^' + cleanNick.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i') },
        username: { $ne: req.user.username },
      });
      if (existingNick) return res.status(409).json({ error: `Nick "${cleanNick}" jau tiek izmantots` });
    }
    const upd = {
      bio:    sanitize(bio||'').slice(0,200),
      mood:   sanitize(mood||'').slice(0,50),
      social: sanitize(social||'').slice(0,100),
    };
    if (nick !== undefined) upd.nick = sanitize(nick||'').slice(0,30);
    const profile = await Profile.findOneAndUpdate(
      { username: req.user.username },
      { ...upd, username: req.user.username },
      { upsert: true, new: true }
    );
    res.json({ profile });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ══════════════════════════════════════════════════
//  ČATS — reāllaika (polling katras 3 sekundes)
// ══════════════════════════════════════════════════
const ChatMsgSchema = new mongoose.Schema({
  username: { type: String, required: true },
  text:     { type: String, required: true, maxlength: 500 },
  color:    { type: String, default: '#00cfff' },
}, { timestamps: true });
const ChatMsg = mongoose.model('ChatMsg', ChatMsgSchema);

// GET /api/chat/history — pēdējos 80 ziņojumus
app.get('/api/chat/history', async (req, res) => {
  try {
    const msgs = await ChatMsg.find()
      .sort({ createdAt: -1 }).limit(80).lean();
    res.json({ msgs: msgs.reverse() });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// GET /api/chat/poll?since=<ISO> — jaunie ziņojumi kopš laika
app.get('/api/chat/poll', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(0);
    const msgs = await ChatMsg.find({ createdAt: { $gt: since } })
      .sort({ createdAt: 1 }).limit(50).lean();
    res.json({ msgs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/chat — nosūtīt ziņojumu
const chatLimiter = rateLimit(30, 60000, 'chat'); // 30 ziņas/min
app.post('/api/chat', requireAuth, chatLimiter, async (req, res) => {
  try {
    const { text, color } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: 'Teksts obligāts' });
    if (text.trim().length > 500) return res.status(400).json({ error: 'Maks. 500 rakstzīmes' });
    const msg = await ChatMsg.create({
      username: req.user.username,
      text:     sanitize(text.trim()).slice(0, 500),
      color:    /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#00cfff',
    });
    res.status(201).json({ msg });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/chat/:id — admin dzēš ziņojumu
app.delete('/api/chat/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!isValidId(req.params.id)) return badId(res);
    await ChatMsg.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Tīra vecos čata ziņojumus (>7 dienas) reizi dienā
setInterval(async () => {
  try {
    const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const r = await ChatMsg.deleteMany({ createdAt: { $lt: week } });
    if (r.deletedCount > 0) console.log('🧹 Čats: dzēsti', r.deletedCount, 'veci ziņojumi');
  } catch(e) {}
}, 24 * 60 * 60 * 1000);


// ── Nick pārbaude reāllaika — GET /api/check/nick?value=xxx ──
app.get('/api/check/nick', async (req, res) => {
  try {
    const { value, exclude } = req.query;
    if (!value?.trim()) return res.json({ available: true });
    const clean = sanitize(value.trim()).slice(0, 30);
    const existing = await Profile.findOne({
      nick: { $regex: new RegExp('^' + clean.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '$', 'i') },
      ...(exclude ? { username: { $ne: exclude } } : {}),
    });
    res.json({ available: !existing, nick: clean });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Lietotājvārda pārbaude ── GET /api/check/username?value=xxx
app.get('/api/check/username', async (req, res) => {
  try {
    const { value } = req.query;
    if (!value?.trim()) return res.json({ available: false });
    const existing = await User.findOne({ username: value.trim().toLowerCase() });
    res.json({ available: !existing });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ── Admin: brīdināt lietotāju ──
app.post('/api/admin/warn/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { message, type } = req.body || {};
    if (!message?.trim()) return res.status(400).json({ error: 'Ziņojums obligāts' });
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    await User.findOneAndUpdate(
      { username: req.params.username },
      makeNotifPush(`⚠️ Brīdinājums (${sanitize(type||'other')}): ${sanitize(message)}`)
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: bloķēt lietotāju (dzēš sesijas) ──
app.post('/api/admin/ban/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    if (user.username === req.user.username) return res.status(400).json({ error: 'Nevar bloķēt sevi' });
    await Session.deleteMany({ username: req.params.username });
    res.json({ ok: true, message: `Lietotājs "${req.params.username}" izlogots` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Admin: dzēst lietotāju ──
app.delete('/api/admin/users/:username', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ error: 'Lietotājs nav atrasts' });
    if (user.username === req.user.username) return res.status(400).json({ error: 'Nevar dzēst sevi' });
    await User.deleteOne({ username: req.params.username });
    await Session.deleteMany({ username: req.params.username });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Upload limits ──
app.get('/api/upload/limits', requireAuth, (req, res) => {
  res.json({
    maxSizeMB: 25, maxDurationMin: 6,
    uploadsPerDay: 10, remaining: 10, canUpload: true,
    allowedTypes: ['audio/mpeg','audio/wav','audio/ogg','audio/flac','audio/m4a'],
  });
});

// ── /api/ticker POST alias ──
app.post('/api/ticker', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { text, active } = req.body || {};
    if (active === false || !text?.trim()) {
      await Settings.findOneAndUpdate({ key: 'ticker' }, { value: '' }, { upsert: true });
      return res.json({ ok: true });
    }
    await Settings.findOneAndUpdate(
      { key: 'ticker' },
      { key: 'ticker', value: sanitize(text).slice(0,300), updatedBy: req.user.username },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ ok:true, time:new Date().toISOString() }));

// PWA files
app.get('/manifest.json', (req, res) => {
  res.json({
    name: 'SoundForge',
    short_name: 'SoundForge',
    description: 'SoundForge — Latvijas mūzikas platforma',
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
  const sw = `const CACHE='soundforge-v2';const STATIC=['/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC).catch(()=>{})));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/')||u.pathname.match(/\\.(mp3|wav|ogg|flac|m4a|aac)$/i))return;e.respondWith(caches.match(e.request).then(cached=>{if(cached)return cached;return fetch(e.request).then(res=>{if(res&&res.status===200&&e.request.method==='GET'){const cl=res.clone();caches.open(CACHE).then(c=>c.put(e.request,cl));}return res;}).catch(()=>caches.match('/index.html'));}));});`;
  res.send(sw);
});

// SPA catch-all — atgriež index.html visiem non-API pieprasījumiem
app.get('*', (req, res) => {
  const idx = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(idx)) {
    res.sendFile(idx);
  } else {
    res.status(404).send('index.html nav atrasts public/ mapē');
  }
});

mongoose.connection.once('open', async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`
╔═══════════════════════════════════════════╗
║  SoundForge v3.0  —  Full Edition    ║
║  i18n + Trending + Feed + Ads + Profiles  ║
║  http://localhost:${PORT}                     ║
╚═══════════════════════════════════════════╝`));
});