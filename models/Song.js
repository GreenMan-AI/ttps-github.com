const mongoose = require('mongoose');

const SongSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  artist: { type: String, required: true, trim: true },
  dur: { type: String, default: '0:00' },
  genre: { type: String, default: 'Nenoteikts' },
  trending: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Song', SongSchema);
