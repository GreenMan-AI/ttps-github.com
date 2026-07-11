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
const mm = require('music-metadata');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*', credentials: true } });
const PORT   = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Vienkāršs cookie parseris (bez cookie-parser atkarības) — vajadzīgs, lai
// nolasītu httpOnly admin sesijas cookie no pieprasījuma galvenēm.
app.use((req, res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    header.split(';').forEach(pair => {
      const idx = pair.indexOf('=');
      if (idx === -1) return;
      const key = pair.slice(0, idx).trim();
      const val = pair.slice(idx + 1).trim();
      if (key) { try { req.cookies[key] = decodeURIComponent(val); } catch (e) { req.cookies[key] = val; } }
    });
  }
  next();
});

// ══════════════════════════════════════════════════
//  CORS — sašaurināts uz zināmiem avotiem. Lapa un API ir vienā domēnā,
//  tāpēc parastiem apmeklētājiem CORS pat nav vajadzīgs (pārlūks CORS
//  pārbaudi piemēro TIKAI cross-origin pieprasījumiem). Ja vajag atļaut
//  kādu papildu domēnu (piem. atsevišķu admin app), pievieno to
//  ALLOWED_ORIGINS vides mainīgajā (ar komatu atdalītu sarakstu).
// ══════════════════════════════════════════════════
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
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
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
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
const uploadLimiter = rateLimit(150, 300000, 'upload');
const translateLimiter = rateLimit(40, 600000, 'translate');
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
// Audio + vāciņa faili PIRMS Cloudinary augšupielādes paliek atmiņā (memoryStorage),
// lai varētu aprēķināt audio faila hash un pārbaudīt, vai tāda dziesma jau nav
// augšupielādēta — tā izvairāmies tērēt Cloudinary vietu dublikātiem.
const uploadTrackFiles = multer({ storage: multer.memoryStorage(), fileFilter: (req, file, cb) => {
  if (file.fieldname === 'cover') return imageFilter(req, file, cb);
  return audioFilter(req, file, cb);
}, limits: { fileSize: 30 * 1024 * 1024 } });
const uploadBgImg = multer({ storage: bgStorage, fileFilter: imageFilter, limits: { fileSize: 12 * 1024 * 1024 } });

const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: 'SoundPulse/avatar',
    resource_type: 'image',
    public_id: 'avatar_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
  }),
});
const uploadAvatarImg = multer({ storage: avatarStorage, fileFilter: imageFilter, limits: { fileSize: 8 * 1024 * 1024 } });

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
  genre: { type: String, default: '', trim: true },
  cloudUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  coverUrl: { type: String, default: '' },
  coverPublicId: { type: String, default: '' },
  fileHash: { type: String, index: true }, // SHA-256 no audio faila satura — dublikātu noteikšanai
  playCount: { type: Number, default: 0 },
  order: { type: Number, default: 0, index: true },
}, { timestamps: true });

const BgSlideSchema = new mongoose.Schema({
  url: { type: String, required: true },
  publicId: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const Content = mongoose.model('Content', ContentSchema);
const GalleryImage = mongoose.model('GalleryImage', GalleryImageSchema);
const StatSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });
const Stat = mongoose.model('Stat', StatSchema);
const Track = mongoose.model('Track', TrackSchema);
const BgSlide = mongoose.model('BgSlide', BgSlideSchema);

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
  bgSlideInterval: '6',
  heroAvatarUrl: '',
  heroAvatarPublicId: '',
  heroTitleColor: '',
  heroSubtitleColor: '',
  heroImageUrl: '',
  heroImagePublicId: '',
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
const COOKIE_NAME = 'sp_admin_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PROD = process.env.NODE_ENV === 'production';

// tokens glabājas atmiņā — pietiek, jo admin ir tikai viens
const sessions = new Map(); // token -> expiresAt
function makeToken() { return crypto.randomBytes(32).toString('hex'); }
function isValidSession(token) {
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) { sessions.delete(token); return false; }
  return true;
}

// Droša (laika ziņā konstanta) virkņu salīdzināšana — pasargā pret
// "timing attack", kur uzbrucējs pēc atbildes ātruma varētu uzminēt
// paroli rakstzīmi pa rakstzīmei.
function safeEqual(a, b) {
  const bufA = crypto.createHash('sha256').update(String(a)).digest();
  const bufB = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

// Konta bloķēšana pēc vairākiem neveiksmīgiem pieteikšanās mēģinājumiem —
// papildus IP rate-limitam, lai neļautu minēt paroli pat lēnām/no vairākām IP.
const loginAttempts = new Map(); // key (IP+lietotājvārds) -> { count, lockedUntil }
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
function loginKey(req, username) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  return ip + ':' + String(username || '').toLowerCase();
}
function isLockedOut(key) {
  const entry = loginAttempts.get(key);
  if (!entry) return false;
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) return true;
  if (entry.lockedUntil && Date.now() >= entry.lockedUntil) { loginAttempts.delete(key); return false; }
  return false;
}
function recordFailedLogin(key) {
  const entry = loginAttempts.get(key) || { count: 0 };
  entry.count++;
  if (entry.count >= MAX_LOGIN_ATTEMPTS) { entry.lockedUntil = Date.now() + LOCKOUT_MS; entry.count = 0; }
  loginAttempts.set(key, entry);
}
function clearLoginAttempts(key) { loginAttempts.delete(key); }
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts) if (!v.lockedUntil && now - (v.updated || 0) > LOCKOUT_MS) loginAttempts.delete(k);
}, 600000);

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_MS / 1000)}`,
  ];
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}
function clearSessionCookie(res) {
  const parts = [`${COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

// Atbalsta sesijas token gan no httpOnly cookie (parastie apmeklētāji admin
// panelī), gan no Authorization: Bearer galvenes (ērtāk API testēšanai/skriptiem).
function getSessionToken(req) {
  return req.cookies?.[COOKIE_NAME] || (req.headers['authorization'] || '').replace('Bearer ', '').trim();
}

function requireAdmin(req, res, next) {
  const token = getSessionToken(req);
  if (!token || !isValidSession(token)) return res.status(401).json({ error: 'Nepieciešama admin autorizācija' });
  // atjauno sesijas termiņu
  sessions.set(token, Date.now() + SESSION_MS);
  next();
}
setInterval(() => { const now = Date.now(); for (const [t, exp] of sessions) if (now > exp) sessions.delete(t); }, 600000);

// ══════════════════════════════════════════════════
//  Automātiska "mojibake" (sabojātu burtu, piem. ā→Ä, š→Å¡) labošana —
//  tas pats princips kā vienreizējā scripts/fix-encoding.js, bet tagad
//  pielietots AUTOMĀTISKI ikreiz, kad kāds teksts tiek saglabāts (dziesmu
//  nosaukumi, izpildītāji, bildes paraksti utt.), lai latviešu burti
//  (ā,ē,ī,ņ,ļ,ķ,š,ž,č,ģ) vienmēr paliktu pareizi un korekti izlasāmi.
function looksCorrupted(str) {
  if (typeof str !== 'string' || !str) return false;
  return /[\u0080-\u009F]/.test(str) || /Ã.|Å.|Ä.|â€/.test(str);
}
function fixMojibake(str) {
  if (typeof str !== 'string' || !str || !looksCorrupted(str)) return str;
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    return fixed.includes('\uFFFD') ? str : fixed;
  } catch (e) { return str; }
}

function sanitize(str) {
  const clean = String(str || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000);
  return fixMojibake(clean);
}

// ══════════════════════════════════════════════════
//  AUTOMĀTISKĀ TULKOŠANA (admin panelim, LV ↔ EN)
//  Izmanto bezmaksas, neoficiālo Google Translate galapunktu —
//  tas nemaksā un nav vajadzīga API atslēga, bet arī nav garantēts
//  (var mainīties/pārtraukt darboties). Ja nākotnē vajag stabilāku
//  risinājumu, var pāriet uz maksas Google Cloud Translate API.
// ══════════════════════════════════════════════════
async function translateText(text, source, target) {
  if (!text || !text.trim()) return '';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(source)}&tl=${encodeURIComponent(target)}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Tulkošanas serviss nav pieejams');
  const data = await r.json();
  return (data[0] || []).map(chunk => chunk[0]).join('');
}

app.post('/api/admin/translate', requireAdmin, translateLimiter, async (req, res) => {
  try {
    const { text, source, target } = req.body || {};
    if (!text || !target) return res.status(400).json({ error: 'Trūkst text vai target' });
    if (String(text).length > 3000) return res.status(400).json({ error: 'Teksts par garu' });
    const translated = await translateText(sanitize(text), source || 'auto', target);
    res.json({ translated });
  } catch (e) { res.status(502).json({ error: 'Tulkošana neizdevās — pamēģini vēlreiz vēlāk' }); }
});

// Publisks tulkošanas endpoints čatam (nevis tikai adminam) — visi apmeklētāji
// var uzrakstīt/lasīt čatu savā valodā. Stingrāks rate-limit, jo pieejams visiem.
const chatTranslateLimiter = rateLimit(20, 300000, 'chat-translate');
app.post('/api/translate', chatTranslateLimiter, async (req, res) => {
  try {
    const { text, source, target } = req.body || {};
    if (!text || !target) return res.status(400).json({ error: 'Trūkst text vai target' });
    if (String(text).length > 500) return res.status(400).json({ error: 'Teksts par garu' });
    const translated = await translateText(sanitize(text), source || 'auto', target);
    res.json({ translated });
  } catch (e) { res.status(502).json({ error: 'Tulkošana neizdevās' }); }
});

// Augšupielādē bufera saturu (atmiņā, no multer memoryStorage) uz Cloudinary,
// izmantojot upload_stream — vajadzīgs, jo audio failu vispirms pārbaudām pēc
// hash (dublikātu meklēšanai) un TIKAI TAD sūtām uz Cloudinary.
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });
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
  const key = loginKey(req, username);
  if (isLockedOut(key)) {
    return res.status(429).json({ error: 'Pārāk daudz neveiksmīgu mēģinājumu. Mēģini pēc 15 minūtēm.' });
  }
  const userOk = safeEqual(username || '', ADMIN_USER);
  const passOk = safeEqual(password || '', ADMIN_PASS);
  if (userOk && passOk) {
    clearLoginAttempts(key);
    const token = makeToken();
    sessions.set(token, Date.now() + SESSION_MS);
    setSessionCookie(res, token);
    return res.json({ ok: true });
  }
  recordFailedLogin(key);
  res.status(401).json({ error: 'Nepareizs lietotājvārds vai parole' });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const token = getSessionToken(req);
  sessions.delete(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/admin/check', requireAdmin, (req, res) => res.json({ ok: true }));

// ══════════════════════════════════════════════════
//  APMEKLĒJUMU SKAITĪTĀJS — vienkāršs (ne unikālu apmeklētāju) skaitītājs.
//  Klients izsauc /ping vienreiz uz sesiju (skat. app.js), admins redz
//  kopskaitu lapas augšā kreisajā stūrī.
// ══════════════════════════════════════════════════
const visitLimiter = rateLimit(20, 60000, 'visit');
app.post('/api/visits/ping', visitLimiter, async (req, res) => {
  try {
    const stat = await Stat.findOneAndUpdate({ key: 'totalVisits' }, { $inc: { count: 1 } }, { upsert: true, new: true });
    res.json({ ok: true, total: stat.count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.get('/api/visits', requireAdmin, async (req, res) => {
  try {
    const stat = await Stat.findOne({ key: 'totalVisits' }).lean();
    res.json({ total: stat?.count || 0 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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
// ── Fona bildes iestatījumi (pozīcija, izmērs, tumšums, intervāls) ──
app.put('/api/content/bg-settings', requireAdmin, async (req, res) => {
  try {
    const { position, size, overlayOpacity, interval } = req.body || {};
    const allowedPositions = ['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'];
    const allowedSizes = ['cover', 'contain'];

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
    if (interval !== undefined) {
      const num = parseInt(interval, 10);
      if (!isNaN(num) && num >= 2 && num <= 60) {
        await Content.findOneAndUpdate({ key: 'bgSlideInterval' }, { value: String(num) }, { upsert: true });
      }
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Fona bilžu slaidrāde (var būt 1 vai vairākas bildes) ──
// ── Profila (hero) bilde — neliela apļveida bilde virs virsraksta ──
app.post('/api/content/hero-avatar', requireAdmin, uploadLimiter, (req, res) => {
  uploadAvatarImg.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav izvēlēta bilde' });
      const old = await Content.findOne({ key: 'heroAvatarPublicId' });
      if (old?.value) { try { await cloudinary.uploader.destroy(old.value, { resource_type: 'image' }); } catch (e) {} }
      await Content.findOneAndUpdate({ key: 'heroAvatarUrl' }, { value: req.file.path }, { upsert: true });
      await Content.findOneAndUpdate({ key: 'heroAvatarPublicId' }, { value: req.file.filename }, { upsert: true });
      res.json({ ok: true, heroAvatarUrl: req.file.path });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/content/hero-avatar', requireAdmin, async (req, res) => {
  try {
    const old = await Content.findOne({ key: 'heroAvatarPublicId' });
    if (old?.value) { try { await cloudinary.uploader.destroy(old.value, { resource_type: 'image' }); } catch (e) {} }
    await Content.findOneAndUpdate({ key: 'heroAvatarUrl' }, { value: '' }, { upsert: true });
    await Content.findOneAndUpdate({ key: 'heroAvatarPublicId' }, { value: '' }, { upsert: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/content/bg-slides', async (req, res) => {
  try {
    const slides = await BgSlide.find().sort({ order: 1, createdAt: 1 }).lean();
    res.json({ slides });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/content/bg-slides', requireAdmin, uploadLimiter, (req, res) => {
  uploadBgImg.single('image')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      if (!req.file) return res.status(400).json({ error: 'Nav izvēlēta bilde' });
      const count = await BgSlide.countDocuments();
      const slide = await BgSlide.create({ url: req.file.path, publicId: req.file.filename, order: count });
      res.status(201).json({ slide });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
});

app.delete('/api/content/bg-slides/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const slide = await BgSlide.findByIdAndDelete(req.params.id);
    if (slide?.publicId) { try { await cloudinary.uploader.destroy(slide.publicId, { resource_type: 'image' }); } catch (e) {} }
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
      const { title, artist, genre } = req.body || {};
      if (!title?.trim()) return res.status(400).json({ error: 'Nosaukums obligāts' });

      // ── Dublikātu pārbaude PIRMS Cloudinary augšupielādes ──
      // Hash tiek rēķināts no faila SATURA, nevis nosaukuma, tāpēc dublikātu
      // atpazīst arī tad, ja fails pārsaukts vai nosaukums/izpildītājs atšķiras.
      const fileHash = crypto.createHash('sha256').update(audioFile.buffer).digest('hex');
      const existing = await Track.findOne({ fileHash });
      if (existing) {
        return res.status(409).json({
          error: `Šī dziesma jau ir augšupielādēta ("${existing.title}"${existing.artist ? ' — ' + existing.artist : ''}). Lai neaizņemtu vietu velti, dublikāts netika pievienots.`,
          duplicateOf: { id: existing._id, title: existing.title, artist: existing.artist },
        });
      }

      let coverBuffer = coverFile?.buffer || null;
      let coverIsFromId3 = false;

      // ── Ja admins pats nepievienoja vāka bildi, mēģinam izgūt to, kas jau
      //    ir "iekšā" audio failā (ID3 tags) — attēls, kas dziesmai pievienots
      //    kopš tās izveides brīža. Ja tāda nav, dziesma paliek bez vāka. ──
      if (!coverBuffer) {
        try {
          const metadata = await mm.parseBuffer(audioFile.buffer, audioFile.mimetype, { duration: false, skipCovers: false });
          const pic = metadata?.common?.picture?.[0];
          if (pic?.data?.length) { coverBuffer = Buffer.from(pic.data); coverIsFromId3 = true; }
        } catch (e) { /* nav ID3 taga vai fails to nesatur — tas ir OK, turpinām bez vāka */ }
      }

      const audioResult = await uploadBufferToCloudinary(audioFile.buffer, {
        folder: 'SoundPulse/audio',
        resource_type: 'video', // Cloudinary glabā audio zem "video" resursa tipa
        public_id: 'track_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex'),
      });

      let coverResult = null;
      if (coverBuffer) {
        coverResult = await uploadBufferToCloudinary(coverBuffer, {
          folder: 'SoundPulse/covers',
          resource_type: 'image',
          public_id: 'cover_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
          transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }],
        });
      }

      const track = await Track.create({
        title: sanitize(title),
        artist: sanitize(artist || ''),
        genre: sanitize(genre || ''),
        cloudUrl: audioResult.secure_url,
        publicId: audioResult.public_id,
        coverUrl: coverResult?.secure_url || '',
        coverPublicId: coverResult?.public_id || '',
        fileHash,
      });
      res.status(201).json({ track, coverFromId3: coverIsFromId3 });
    } catch (e) {
      if (e?.code === 11000) return res.status(409).json({ error: 'Šī dziesma jau ir augšupielādēta (dublikāts).' });
      res.status(500).json({ error: e.message });
    }
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

const playLimiter = rateLimit(120, 60000, 'play');
// Klausīšanās skaitītājs — publisks (jebkurš apmeklētājs, kas noklausās
// dziesmu, palielina skaitli), bet ar limitu, lai nevarētu mākslīgi uzpumpēt.
app.post('/api/tracks/:id/play', playLimiter, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    await Track.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tracks/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const { title, artist, genre } = req.body || {};
    const update = {};
    if (title?.trim()) update.title = sanitize(title);
    if (typeof artist === 'string') update.artist = sanitize(artist);
    if (typeof genre === 'string') update.genre = sanitize(genre);
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
const CHAT_MAX_MSGS = 8;
const CHAT_WINDOW_MS = 10000;
io.on('connection', socket => {
  socket.emit('chat-history', chatHistory.slice(-50));
  const chatTimestamps = [];

  socket.on('chat-msg', data => {
    const now = Date.now();
    while (chatTimestamps.length && now - chatTimestamps[0] > CHAT_WINDOW_MS) chatTimestamps.shift();
    if (chatTimestamps.length >= CHAT_MAX_MSGS) {
      socket.emit('chat-rate-limited');
      return;
    }
    chatTimestamps.push(now);

    const name = String(data?.name || 'Anonīms').replace(/<[^>]*>/g, '').trim().slice(0, 30) || 'Anonīms';
    const text = String(data?.text || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);
    if (!text) return;
    const msg = { id: Date.now().toString() + Math.random().toString(36).slice(2, 7), name, text, time: new Date().toISOString() };
    chatHistory.push(msg);
    if (chatHistory.length > 200) chatHistory.shift();
    io.emit('chat-msg', msg);
  });

  socket.on('chat-clear', () => {
    // Vecā metode vairs nedarbojas — admin sesijas tokens tagad ir httpOnly
    // cookie un JS to vairs nevar nolasīt/nosūtīt. Tīrīšana notiek caur
    // /api/chat/clear (skat. zemāk), kas pareizi pārbauda admin sesiju.
  });
});

app.post('/api/chat/clear', requireAdmin, (req, res) => {
  chatHistory.length = 0;
  io.emit('chat-cleared');
  res.json({ ok: true });
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
