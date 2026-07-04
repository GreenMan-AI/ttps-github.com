require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const crypto     = require('crypto');
const mongoose   = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', credentials: true } });
const PORT   = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// ══════════════════════════════════════════════════
//  CORS
// ══════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// ══════════════════════════════════════════════════
//  SECURITY HEADERS
// ══════════════════════════════════════════════════
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src 'self' data: blob: https:; " +
    "media-src 'self' blob: https: https://*.cloudinary.com https://res.cloudinary.com; " +
    "connect-src 'self' https://*.cloudinary.com https://api.cloudinary.com https://res.cloudinary.com; " +
    "worker-src 'self' blob:; " +
    "frame-ancestors 'self';"
  );
  next();
});

// Static files — no-cache priekš CSS/JS/HTML, lai pēc katra deploy pārlūks
// vienmēr paņem jaunāko versiju (nevis veco no kešatmiņas)
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate');
}}));

// ══════════════════════════════════════════════════
//  RATE LIMITING (bez ārējas bibliotēkas)
// ══════════════════════════════════════════════════
const rateLimitMap = new Map();
function rateLimit(maxReq, windowMs, prefix) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const key = prefix + ':' + ip;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count++;
    rateLimitMap.set(key, entry);
    if (entry.count > maxReq) return res.status(429).json({ error: 'Pārāk daudz pieprasījumu. Mēģini vēlāk.' });
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [k, v] of rateLimitMap) if (now > v.reset) rateLimitMap.delete(k); }, 300000);

const authLimiter   = rateLimit(10, 60000, 'auth');
const uploadLimiter = rateLimit(30, 300000, 'upload');
const apiLimiter    = rateLimit(300, 60000, 'api');
app.use('/api/', apiLimiter);

// ══════════════════════════════════════════════════
//  CLOUDINARY
// ══════════════════════════════════════════════════
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const imageFilter = (req, file, cb) => {
  const ok = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  ok.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Tikai attēli: JPG, PNG, WEBP, GIF'));
};
const audioFilter = (req, file, cb) => {
  const ok = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
  ok.includes(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Tikai audio faili'));
};

const galleryStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'SoundPulse/gallery',
    resource_type: 'image',
    public_id: 'gal_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
  }),
});
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'SoundPulse/covers',
    resource_type: 'image',
    public_id: 'cover_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }],
  }),
});
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'SoundPulse/audio',
    resource_type: 'video', // Cloudinary glabā audio zem "video" resursa tipa
    public_id: 'track_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex'),
  }),
});
const bgStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'SoundPulse/background',
    resource_type: 'image',
    public_id: 'bg_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 1920, height: 1920, crop: 'limit', quality: 'auto' }],
  }),
});

const uploadGalleryImg = multer({ storage: galleryStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadTrackFiles = multer({ storage: audioStorage, fileFilter: (req, file, cb) => {
  if (file.fieldname === 'cover') return imageFilter(req, file, cb);
  return audioFilter(req, file, cb);
}, limits: { fileSize: 30 * 1024 * 1024 } });
const uploadBgImg = multer({ storage: bgStorage, fileFilter: imageFilter, limits: { fileSize: 12 * 1024 * 1024 } });

// ══════════════════════════════════════════════════
//  MONGODB
// ══════════════════════════════════════════════════
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ KĻŪDA: MONGODB_URI nav iestatīts Environment Variables!');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB savienots!'))
  .catch(e => console.error('❌ MongoDB kļūda:', e.message));

// ── Schemas ──────────────────────────────────────
const ContentSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: '' },
}, { timestamps: true });

const GalleryImageSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  caption: { type: String, default: '' },
  category: { type: String, default: 'Citas', trim: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: String, default: '', trim: true },
  cloudUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  coverUrl: { type: String, default: '' },
  coverPublicId: { type: String, default: '' },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const Content = mongoose.model('Content', ContentSchema);
const GalleryImage = mongoose.model('GalleryImage', GalleryImageSchema);
const Track = mongoose.model('Track', TrackSchema);

// Noklusējuma satura lauki — admins tos var mainīt no admin paneļa.
// Tulkojamie lauki tiek glabāti divreiz — ar _lv un _en galotni.
const DEFAULT_CONTENT = {
  siteTitle: 'SoundPulse',
  tagline_lv: 'Mana mūzika. Mana pasaule.',
  tagline_en: 'My music. My world.',
  heroTitle_lv: 'Sveiki, esmu SoundPulse!',
  heroTitle_en: 'Hi, I\'m SoundPulse!',
  heroSubtitle_lv: 'Šeit klausies manu pašsacerēto mūziku un skaties bildes.',
  heroSubtitle_en: 'Listen to my original music and browse photos here.',
  aboutText_lv: 'Šeit vēlāk būs stāsts par mani un manu mūziku.',
  aboutText_en: 'A story about me and my music will go here.',
  contactEmail: '',
  socialLink: '',
  bgImageUrl: '',
  bgImagePublicId: '',
  bgPosition: 'center',
  bgSize: 'cover',
  bgOverlayOpacity: '0.4',
  heroTitleColor: '',
  heroSubtitleColor: '',
};

async function seedContent() {
  for (const [key, value] of Object.entries(DEFAULT_CONTENT)) {
    await Content.findOneAndUpdate({ key }, { $setOnInsert: { key, value } }, { upsert: true });
  }
}

// ══════════════════════════════════════════════════
//  ADMIN AUTH — viens vienīgs admin konts (no .env)
// ══════════════════════════════════════════════════
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

// tokens glabājas atmiņā — pietiek, jo admin ir tikai viens
const sessions = new Map(); // token -> expiresAt
function makeToken() { return crypto.randomBytes(32).toString('hex'); }
function isValidSession(token) {
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(token); return false; }
  return true;
}
function requireAdmin(req, res, next) {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token || !isValidSession(token)) return res.status(401).json({ error: 'Nepieciešama admin autorizācija' });
  // atjauno sesijas termiņu
  sessions.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
  next();
}
setInterval(() => { const now = Date.now(); for (const [t, exp] of sessions) if (now > exp) sessions.delete(t); }, 600000);

function sanitize(str) {
  return String(str || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

// Multer/busboy multipart teksta laukus pēc noklusējuma atkodē kā "latin1",
// kas latviešu burtus (ā,č,ē,ģ,ī,ķ,ļ,ņ,š,ū,ž) un emocijzīmes sabojā ("mojibake").
// Šī funkcija UTF-8 baitus, kas kļūdaini nolasīti kā Latin-1, pārkodē pareizi.
function fixMojibake(str) {
  if (typeof str !== 'string' || !str) return str;
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    // ja pārkodējot rodas "replacement char" (U+FFFD), oriģināls droši vien
    // jau bija pareizs UTF-8 — tad paturam sākotnējo vērtību
    return fixed.includes('\uFFFD') ? str : fixed;
  } catch (e) { return str; }
}

app.post('/api/admin/login', authLimiter, (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = makeToken();
    sessions.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000);
    return res.json({ token });
  }
  res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  sessions.delete(token);
  res.json({ ok: true });
});

app.get('/api/admin/check', requireAdmin, (req, res) => res.json({ ok: true }));

// Vienreizējs admin rīks — salabo jau esošos sabojātos LV burtus/emocijzīmes
// datubāzē, izsaucot to tieši caur serveri (apiet lokālas DNS problēmas).
app.post('/api/admin/fix-encoding', requireAdmin, async (req, res) => {
  try {
    let fixedCount = 0;
    const changes = [];

    const tracks = await Track.find({});
    for (const tr of tracks) {
      const newTitle = fixMojibake(tr.title);
      const newArtist = fixMojibake(tr.artist);
      if (newTitle !== tr.title || newArtist !== tr.artist) {
        changes.push({ before: tr.title, after: newTitle });
        tr.title = newTitle;
        tr.artist = newArtist;
        await tr.save();
        fixedCount++;
      }
    }

    const images = await GalleryImage.find({});
    for (const img of images) {
      const newCaption = fixMojibake(img.caption);
      const newCategory = fixMojibake(img.category);
      if (newCaption !== img.caption || newCategory !== img.category) {
        changes.push({ before: img.caption, after: newCaption });
        img.caption = newCaption;
        img.category = newCategory;
        await img.save();
        fixedCount++;
      }
    }

    res.json({ ok: true, fixedCount, changes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  SATURS (teksti mājas lapā)
// ══════════════════════════════════════════════════
app.get('/api/content', async (req, res) => {
  try {
    const rows = await Content.find().lean();
    const out = { ...DEFAULT_CONTENT };
    rows.forEach(r => { out[r.key] = r.value; });
    res.json(out);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/content', requireAdmin, (req, res) => {
  (async () => {
    try {
      const body = req.body || {};
      const textKeys = Object.keys(DEFAULT_CONTENT).filter(k => k !== 'bgImageUrl' && k !== 'bgImagePublicId');
      for (const key of textKeys) {
        if (typeof body[key] === 'string') {
          await Content.findOneAndUpdate({ key }, { value: sanitize(body[key]) }, { upsert: true });
        }
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  })();
});

// Fona bilde — atsevišķa, tūlītēja darbība (ne daļa no lielā teksta saglabāšanas)
app.post('/api/content/background', requireAdmin, uploadLimiter, (req, res) => {
  uploadBgImg.single('bgImage')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const position = req.body?.position;
      const size = req.body?.size;
      const overlayOpacity = req.body?.overlayOpacity;
      const allowedPositions = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
      const allowedSizes = ['cover', 'contain'];

      if (!req.file && !position && !size && !overlayOpacity) return res.status(400).json({ error: 'Nav izvēlēta bilde' });

      if (req.file) {
        const old = await Content.findOne({ key: 'bgImagePublicId' });
        if (old?.value) { try { await cloudinary.uploader.destroy(old.value, { resource_type: 'image' }); } catch (e) {} }
        await Content.findOneAndUpdate({ key: 'bgImageUrl' }, { value: req.file.path }, { upsert: true });
        await Content.findOneAndUpdate({ key: 'bgImagePublicId' }, { value: req.file.filename }, { upsert: true });
      }
      if (position && allowedPositions.includes(position)) {
        await Content.findOneAndUpdate({ key: 'bgPosition' }, { value: position }, { upsert: true });
      }
      if (size && allowedSizes.includes(size)) {
        await Content.findOneAndUpdate({ key: 'bgSize' }, { value: size }, { upsert: true });
      }
      if (overlayOpacity !== undefined) {
        const num = parseFloat(overlayOpacity);
        if (!isNaN(num) && num >= 0 && num <= 0.9) {
          await Content.findOneAndUpdate({ key: 'bgOverlayOpacity' }, { value: String(num) }, { upsert: true });
        }
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/content/background', requireAdmin, async (req, res) => {
  try {
    const old = await Content.findOne({ key: 'bgImagePublicId' });
    if (old?.value) { try { await cloudinary.uploader.destroy(old.value, { resource_type: 'image' }); } catch (e) {} }
    await Content.findOneAndUpdate({ key: 'bgImageUrl' }, { value: '' }, { upsert: true });
    await Content.findOneAndUpdate({ key: 'bgImagePublicId' }, { value: '' }, { upsert: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  GALERIJA (bildes)
// ══════════════════════════════════════════════════
app.get('/api/gallery', async (req, res) => {
  try {
    const items = await GalleryImage.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/gallery', requireAdmin, uploadLimiter, (req, res) => {
  uploadGalleryImg.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav faila' });
      const item = await GalleryImage.create({
        url: req.file.path,
        publicId: req.file.filename,
        caption: sanitize(req.body?.caption || ''),
        category: sanitize(req.body?.category || '') || 'Citas',
      });
      res.status(201).json({ item });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/gallery/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const item = await GalleryImage.findByIdAndDelete(req.params.id);
    if (item?.publicId) { try { await cloudinary.uploader.destroy(item.publicId, { resource_type: 'image' }); } catch (e) {} }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  MŪZIKA (dziesmas)
// ══════════════════════════════════════════════════
app.get('/api/tracks', async (req, res) => {
  try {
    const tracks = await Track.find().sort({ order: 1, createdAt: -1 }).lean();
    res.json({ tracks });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tracks', requireAdmin, uploadLimiter, (req, res) => {
  uploadTrackFiles.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }])(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];
      if (!audioFile) return res.status(400).json({ error: 'Audio fails obligāts' });
      const { title, artist } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ error: 'Nosaukums obligāts' });
      const track = await Track.create({
        title: sanitize(title),
        artist: sanitize(artist || ''),
        cloudUrl: audioFile.path,
        publicId: audioFile.filename,
        coverUrl: coverFile?.path || '',
        coverPublicId: coverFile?.filename || '',
      });
      res.status(201).json({ track });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

// Secības maiņa (drag & drop admin panelī) — jāstāv PIRMS /api/tracks/:id
app.put('/api/tracks/reorder', requireAdmin, async (req, res) => {
  try {
    const { order } = req.body || {}; // masīvs ar track ID, jaunajā secībā
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order jābūt masīvam ar ID' });
    await Promise.all(order.map((id, idx) => {
      if (!mongoose.isValidObjectId(id)) return null;
      return Track.findByIdAndUpdate(id, { order: idx });
    }));
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tracks/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const { title, artist } = req.body || {};
    const update = {};
    if (title?.trim()) update.title = sanitize(title);
    if (typeof artist === 'string') update.artist = sanitize(artist);
    const track = await Track.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ track });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tracks/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const track = await Track.findByIdAndDelete(req.params.id);
    if (track) {
      if (track.publicId) { try { await cloudinary.uploader.destroy(track.publicId, { resource_type: 'video' }); } catch (e) {} }
      if (track.coverPublicId) { try { await cloudinary.uploader.destroy(track.coverPublicId, { resource_type: 'image' }); } catch (e) {} }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ══════════════════════════════════════════════════
//  ČATS — reāllaika, apmeklētājiem (Socket.IO, atmiņā)
// ══════════════════════════════════════════════════
const chatHistory = [];
io.on('connection', socket => {
  socket.emit('chat-history', chatHistory.slice(-50));

  socket.on('chat-msg', data => {
    const name = String(data?.name || 'Anonīms').replace(/<[^>]*>/g, '').trim().slice(0, 30) || 'Anonīms';
    const text = String(data?.text || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);
    if (!text) return;
    const msg = { id: Date.now().toString() + Math.random().toString(36).slice(2, 7), name, text, time: new Date().toISOString() };
    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift();
    io.emit('chat-msg', msg);
  });

  socket.on('chat-clear', token => {
    if (!isValidSession(token)) return;
    chatHistory.length = 0;
    io.emit('chat-cleared');
  });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Privātuma politikas lapa (piem. Google/app veikaliem)
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose.connection.once('open', async () => {
  await seedContent();
  server.listen(PORT, () => console.log(`
╔═══════════════════════════════════════════╗
║  SoundPulse — vienkāršā versija            ║
║  http://localhost:${PORT}                     ║
║  Admin: ${ADMIN_USER}                                ║
╚═══════════════════════════════════════════╝`));
});
