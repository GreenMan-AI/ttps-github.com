const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  textLv: { type: String, required: true, trim: true },
  textEn: { type: String, required: true, trim: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);
