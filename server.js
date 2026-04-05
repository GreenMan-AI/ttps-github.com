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

const uploadAudio = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 100*1024*1024 } });
const uploadImage = multer({ storage: imageStorage, fileFilter: imageFilter, limits: { fileSize: 10*1024*1024  } });
const uploadMulti = multer({ storage: audioStorage, fileFilter: audioFilter, limits: { fileSize: 100*1024*1024 } });

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
}, { timestamps: true });

const TrackSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  artist:   { type: String, default: '', trim: true },
  cloudUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  size:     { type: Number, default: 0 },
  uploader: { type: String, required: true },
  folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
  plays:    { type: Number, default: 0 },
}, { timestamps: true });

const FolderSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  color:     { type: String, default: '#00d4ff' },
  createdBy: { type: String, required: true },
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

const User     = mongoose.model('User',     UserSchema);
const Track    = mongoose.model('Track',    TrackSchema);
const Folder   = mongoose.model('Folder',   FolderSchema);
const Playlist = mongoose.model('Playlist', PlaylistSchema);
const Session  = mongoose.model('Session',  SessionSchema);

if (!fs.existsSync('public')) fs.mkdirSync('public', { recursive: true });

// ── middleware ────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public', { maxAge: '7d' }));

// ── helpers ───────────────────────────────────────
function hashPwd(pwd, salt) {
  return crypto.pbkdf2Sync(pwd, salt, 200000, 64, 'sha512').toString('hex');
}
function makeToken() { return crypto.randomBytes(48).toString('hex'); }

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
app.post('/api/register', async (req, res) => {
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

app.post('/api/login', async (req, res) => {
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
  res.json({ username: user.username, role: user.role, bgUrl: user.bgUrl||'', favorites: user.favorites||[] });
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
  try { res.json({ folders: await Folder.find().sort({ createdAt: 1 }) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/folders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, color='#00d4ff' } = req.body||{};
    if (!name?.trim()) return res.status(400).json({ error: 'Nosaukums obligāts' });
    res.status(201).json({ folder: await Folder.create({ name:name.trim(), color, createdBy:req.user.username }) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/folders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Folder.findByIdAndDelete(req.params.id);
    await Track.updateMany({ folderId: req.params.id }, { $set: { folderId: null } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  TRACKS
// ══════════════════════════════════════════════════
app.get('/api/tracks', async (req, res) => {
  try { res.json({ tracks: await Track.find().sort({ createdAt: -1 }) }); }
  catch(e) { res.status(500).json({ error: e.message }); }
});

// Single upload
app.post('/api/upload', requireAuth, (req, res) => {
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
      res.status(201).json({ track });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
});

// Multi upload — up to 20 files at once
app.post('/api/upload-multi', requireAuth, (req, res) => {
  uploadMulti.array('audio', 20)(req, res, async (err) => {
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
    // remove from playlist
    await Playlist.updateOne({}, { $pull: { trackIds: t._id } });
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tracks/:id/play', async (req, res) => {
  try { await Track.findByIdAndUpdate(req.params.id, { $inc: { plays: 1 } }); } catch(e){}
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════
//  SHARED PLAYLIST
// ══════════════════════════════════════════════════
app.get('/api/playlist', async (req, res) => {
  try {
    const pl = await Playlist.findOne();
    res.json({ trackIds: pl ? pl.trackIds : [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add track to shared playlist (any logged-in user)
app.post('/api/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    let pl = await Playlist.findOne();
    if (!pl) pl = await Playlist.create({ trackIds: [] });
    const tid = req.params.trackId;
    if (!pl.trackIds.map(String).includes(String(tid))) {
      pl.trackIds.push(tid);
      pl.updatedBy = req.user.username;
      await pl.save();
    }
    res.json({ ok: true, trackIds: pl.trackIds });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Remove from shared playlist
app.delete('/api/playlist/:trackId', requireAuth, async (req, res) => {
  try {
    const pl = await Playlist.findOne();
    if (pl) {
      pl.trackIds = pl.trackIds.filter(id => String(id) !== req.params.trackId);
      pl.updatedBy = req.user.username;
      await pl.save();
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Reorder playlist
app.put('/api/playlist', requireAuth, async (req, res) => {
  try {
    const { trackIds } = req.body;
    if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'trackIds obligāts' });
    await Playlist.findOneAndUpdate({}, { trackIds, updatedBy: req.user.username }, { upsert: true });
    res.json({ ok: true });
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

app.get('/api/health', (req, res) => res.json({ ok:true, time:new Date().toISOString() }));

mongoose.connection.once('open', async () => {
  await seedAdmin();
  app.listen(PORT, () => console.log(`
╔═══════════════════════════════════════════╗
║  MusicBox v5  —  Full Featured            ║
║  Playlist + Multi-Upload + BG + PwChange  ║
║  http://localhost:${PORT}                     ║
╚═══════════════════════════════════════════╝`));
});
