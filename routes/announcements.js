const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { requireAdmin } = require('./admin');
const { translateText } = require('../utils/translate');

// GET /api/announcements/latest — publiski redzams, jaunākais aktīvais paziņojums
router.get('/latest', async (req, res) => {
  try {
    const a = await Announcement.findOne({ active: true }).sort({ createdAt: -1 });
    res.json(a || null);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās ielādēt paziņojumu' });
  }
});

// GET /api/announcements — visi paziņojumi (admin panelim, vēsture)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const list = await Announcement.find().sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās ielādēt paziņojumus' });
  }
});

// POST /api/announcements — admin uzraksta ziņu VIENĀ valodā, servera puse
// automātiski iztulko uz otru. lang: 'lv' vai 'en' — kurā valodā admins rakstīja.
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { text, lang } = req.body || {};
    if (!text || !text.trim()) return res.status(400).json({ error: 'Ziņas teksts ir obligāts.' });

    let textLv, textEn;
    if (lang === 'en') {
      textEn = text.trim();
      textLv = await translateText(text.trim(), 'en', 'lv');
    } else {
      textLv = text.trim();
      textEn = await translateText(text.trim(), 'lv', 'en');
    }

    // padara visus iepriekšējos neaktīvus — rāda tikai jaunāko
    await Announcement.updateMany({}, { active: false });
    const a = await Announcement.create({ textLv, textEn, active: true });
    res.status(201).json(a);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās izveidot paziņojumu' });
  }
});

// DELETE /api/announcements/:id — admin dzēš/paslēpj paziņojumu
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Nederīgs ID' });
    await Announcement.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās dzēst paziņojumu' });
  }
});

module.exports = router;
