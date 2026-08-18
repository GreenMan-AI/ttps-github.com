const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const { requireAdmin } = require('./admin');

// GET /api/songs — visas dziesmas (publiski redzams)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās ielādēt dziesmas' });
  }
});

// POST /api/songs — jauna dziesma (tikai admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, artist, dur, genre, trending } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: 'Nosaukums un izpildītājs ir obligāti' });
    }
    const song = await Song.create({ title, artist, dur, genre, trending });
    res.status(201).json(song);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās izveidot dziesmu' });
  }
});

// PATCH /api/songs/:id — atjaunināt žanru, trending u.c. (tikai admin)
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const song = await Song.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!song) return res.status(404).json({ error: 'Dziesma nav atrasta' });
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās atjaunināt dziesmu' });
  }
});

// DELETE /api/songs/:id — dzēst (tikai admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return res.status(404).json({ error: 'Dziesma nav atrasta' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: 'Neizdevās dzēst dziesmu' });
  }
});

module.exports = router;

