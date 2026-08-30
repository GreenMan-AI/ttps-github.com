// server/routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { requireAuth } = require('../lib/auth');

const router = express.Router();

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const AUDIO_DIR = path.join(UPLOAD_ROOT, 'audio');
const IMAGE_DIR = path.join(UPLOAD_ROOT, 'images');
for (const dir of [AUDIO_DIR, IMAGE_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/x-m4a']);
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

function safeName(originalname) {
  const ext = path.extname(originalname).toLowerCase();
  return `${crypto.randomUUID()}${ext}`;
}

function storageFor(dir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, safeName(file.originalname))
  });
}

const uploadAudio = multer({
  storage: storageFor(AUDIO_DIR),
  limits: { fileSize: 60 * 1024 * 1024 }, // 60MB per track
  fileFilter: (req, file, cb) => {
    cb(null, AUDIO_TYPES.has(file.mimetype));
  }
});

const uploadImage = multer({
  storage: storageFor(IMAGE_DIR),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    cb(null, IMAGE_TYPES.has(file.mimetype));
  }
});

router.post('/audio', requireAuth, (req, res) => {
  uploadAudio.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Could not upload the audio file (check the format and size, max 60MB).' });
    if (!req.file) return res.status(400).json({ error: 'Invalid audio file. Supported formats: mp3, wav, ogg, flac, m4a.' });
    res.json({ ok: true, url: `/uploads/audio/${req.file.filename}` });
  });
});

router.post('/image', requireAuth, (req, res) => {
  uploadImage.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Could not upload the image (check the format and size, max 10MB).' });
    if (!req.file) return res.status(400).json({ error: 'Invalid image file. Supported formats: jpg, png, webp, gif, avif.' });
    res.json({ ok: true, url: `/uploads/images/${req.file.filename}` });
  });
});

module.exports = router;
