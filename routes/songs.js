const express = require('express');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const router = express.Router();
const Song = require('../models/Song');
const { requireAdmin } = require('./admin');
const { uploadBuffer, cloudinary } = require('../utils/cloudinary');
const { detectTrackInfo } = require('../utils/parseTrackInfo');

const audioExt = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac'];
const imgExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const path = require('path');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.fieldname === 'cover') {
      return imgExt.includes(ext) ? cb(null, true) : cb(new Error('Vāciņam jābūt attēlam (JPG/PNG/WEBP/GIF)'));
    }
    return audioExt.includes(ext) ? cb(null, true) : cb(new Error('Tikai audio faili: MP3, WAV, OGG, FLAC, M4A, AAC'));
  },
});

// GET /api/songs — visas dziesmas (publiski redzams)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find().sort({ order: 1, createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās ielādēt dziesmas' });
  }
});

// POST /api/songs — augšupielādē jaunu dziesmu (audio fails obligāts, admin only)
// title/artist tiek automātiski noteikti no ID3 tagiem vai faila nosaukuma —
// admins tos var pārrakstīt, bet nav spiests tos ievadīt no jauna.
router.post('/', requireAdmin, (req, res) => {
  upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }])(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    try {
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];
      if (!audioFile) return res.status(400).json({ error: 'Audio fails ir obligāts.' });

      const fileHash = crypto.createHash('sha256').update(audioFile.buffer).digest('hex');
      const existing = await Song.findOne({ fileHash });
      if (existing) {
        return res.status(409).json({
          error: `Šī dziesma jau ir augšupielādēta ("${existing.title}"${existing.artist ? ' — ' + existing.artist : ''}).`,
          duplicateOf: { id: existing._id, title: existing.title, artist: existing.artist },
        });
      }

      const detected = await detectTrackInfo(audioFile.buffer, audioFile.mimetype, audioFile.originalname);

      // admins var pārrakstīt automātiski noteikto title/artist/genre caur body,
      // bet, ja neko nesūta, izmantojam automātiski noteikto vērtību
      const title = (req.body.title && req.body.title.trim()) || detected.title;
      const artist = (req.body.artist && req.body.artist.trim()) || detected.artist;
      const genre = (req.body.genre && req.body.genre.trim()) || '';
      const trending = req.body.trending === 'true' || req.body.trending === true;

      const audioResult = await uploadBuffer(audioFile.buffer, {
        folder: 'Pulss/audio',
        resource_type: 'video', // Cloudinary glabā audio zem "video" resursa tipa
        public_id: 'track_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex'),
      });

      let coverBuffer = coverFile?.buffer || detected.picture || null;
      let coverResult = null;
      if (coverBuffer) {
        coverResult = await uploadBuffer(coverBuffer, {
          folder: 'Pulss/covers',
          resource_type: 'image',
          public_id: 'cover_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
          transformation: [{ width: 500, height: 500, crop: 'fill', quality: 'auto' }],
        });
      }

      const count = await Song.countDocuments();
      const song = await Song.create({
        title,
        artist,
        genre,
        trending,
        cloudUrl: audioResult.secure_url,
        publicId: audioResult.public_id,
        coverUrl: coverResult?.secure_url || '',
        coverPublicId: coverResult?.public_id || '',
        duration: audioResult.duration ? Math.round(audioResult.duration) : detected.duration,
        fileHash,
        order: count,
      });

      res.status(201).json({ song, autoDetected: { title: detected.title, artist: detected.artist } });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Neizdevās augšupielādēt dziesmu' });
    }
  });
});

// PATCH /api/songs/:id — labot metadatus (admin only)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const allowed = ['title', 'artist', 'genre', 'trending', 'lyrics'];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const song = await Song.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!song) return res.status(404).json({ error: 'Dziesma nav atrasta' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās atjaunināt dziesmu' });
  }
});

// PUT /api/songs/reorder — admin maina secību (drag & drop admin panelī)
router.put('/reorder/all', requireAdmin, async (req, res) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) return res.status(400).json({ error: 'order jābūt masīvam ar ID' });
    await Promise.all(order.map((id, idx) => {
      if (!mongoose.isValidObjectId(id)) return null;
      return Song.findByIdAndUpdate(id, { order: idx });
    }));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās mainīt secību' });
  }
});

// POST /api/songs/:id/play — publisks klausīšanās skaitītājs
router.post('/:id/play', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    await Song.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās' });
  }
});

// DELETE /api/songs/:id — dzēst (admin only), tīra arī Cloudinary failus
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ error: 'Dziesma nav atrasta' });
    if (song.publicId) { try { await cloudinary.uploader.destroy(song.publicId, { resource_type: 'video' }); } catch (e) {} }
    if (song.coverPublicId) { try { await cloudinary.uploader.destroy(song.coverPublicId, { resource_type: 'image' }); } catch (e) {} }
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās dzēst dziesmu' });
  }
});

module.exports = router;
