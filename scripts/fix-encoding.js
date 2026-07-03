// ══════════════════════════════════════════════════
//  VIENREIZĒJS SKRIPTS: salabo sabojātos latviešu burtus
//  un emocijzīmes esošajos datubāzes ierakstos.
//
//  Palaišana:  node scripts/fix-encoding.js
//  (jāpalaiž no projekta saknes mapes, kur ir .env fails)
// ══════════════════════════════════════════════════
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ MONGODB_URI nav atrasts .env failā. Pārliecinies, ka skriptu palaid no projekta saknes mapes.');
  process.exit(1);
}

function fixMojibake(str) {
  if (typeof str !== 'string' || !str) return str;
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    return fixed.includes('\uFFFD') ? str : fixed;
  } catch (e) { return str; }
}

// vienkārša pazīme, ka virkne, iespējams, ir sabojāta (satur tipiskus
// mojibake simbolus vai neredzamas C1 vadības rakstzīmes)
function looksCorrupted(str) {
  if (typeof str !== 'string' || !str) return false;
  return /[\u0080-\u009F]/.test(str) || /Ã.|Å.|Ä.|â€/.test(str);
}

const TrackSchema = new mongoose.Schema({}, { strict: false });
const GalleryImageSchema = new mongoose.Schema({}, { strict: false });
const Track = mongoose.model('Track', TrackSchema);
const GalleryImage = mongoose.model('GalleryImage', GalleryImageSchema);

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Savienots ar MongoDB\n');

  let fixedCount = 0;

  // ── Dziesmas ──
  const tracks = await Track.find({});
  for (const t of tracks) {
    const newTitle = fixMojibake(t.title);
    const newArtist = fixMojibake(t.artist);
    if (newTitle !== t.title || newArtist !== t.artist) {
      console.log(`🎵 "${t.title}" → "${newTitle}"`);
      t.title = newTitle;
      t.artist = newArtist;
      await t.save();
      fixedCount++;
    }
  }

  // ── Bildes ──
  const images = await GalleryImage.find({});
  for (const img of images) {
    const newCaption = fixMojibake(img.caption);
    const newCategory = fixMojibake(img.category);
    if (newCaption !== img.caption || newCategory !== img.category) {
      console.log(`🖼️  "${img.caption || '(bez paraksta)'}" → "${newCaption || '(bez paraksta)'}"`);
      img.caption = newCaption;
      img.category = newCategory;
      await img.save();
      fixedCount++;
    }
  }

  console.log(`\n✅ Gatavs! Salaboti ${fixedCount} ieraksti.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Kļūda:', err);
  process.exit(1);
});
