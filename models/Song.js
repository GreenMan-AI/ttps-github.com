const mongoose = require('mongoose');

// SVARĪGI: collection: 'tracks' — tā ir kolekcija, kurā jau atrodas visas
// iepriekš augšupielādētās dziesmas (no vecās mājaslapas versijas). Ja šo
// nenorādītu, Mongoose pēc noklusējuma meklētu kolekcijā "songs", kas ir
// TUKŠA — tieši tāpēc dziesmas iepriekš neparādījās mājaslapā.
const SongSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: String, default: '', trim: true },
  genre: { type: String, default: '', trim: true },
  cloudUrl: { type: String, required: true },      // audio faila saite Cloudinary
  publicId: { type: String, required: true },      // Cloudinary audio ID (dzēšanai)
  coverUrl: { type: String, default: '' },
  coverPublicId: { type: String, default: '' },
  duration: { type: Number, default: 0 },           // sekundēs
  lyrics: { type: String, default: '' },
  fileHash: { type: String, index: true },          // SHA-256, dublikātu noteikšanai
  playCount: { type: Number, default: 0 },
  trending: { type: Boolean, default: false },
  order: { type: Number, default: 0, index: true },
}, { timestamps: true, collection: 'tracks' });

module.exports = mongoose.model('Song', SongSchema);
