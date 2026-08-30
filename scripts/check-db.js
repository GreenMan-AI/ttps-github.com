// Šis skripts NEDZĒŠ un NEPĀRRAKSTA nekādus datus — tas tikai pieslēdzas
// tavai MongoDB Atlas datubāzei un parāda, cik dziesmu (tracks kolekcijā)
// tur jau atrodas. Noderīgs, lai pārbaudītu, vai .env fails ir pareizs
// PIRMS servera palaišanas.
require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('../models/Song');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('Trūkst MONGODB_URI vides mainīgā. Izveido .env failu pēc .env.example parauga.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const count = await Song.countDocuments();
  const sample = await Song.find().limit(5).select('title artist');
  console.log(`✓ Savienojums izdevās. Datubāzē atrastas ${count} dziesmas (kolekcija "tracks").`);
  if (sample.length) {
    console.log('Piemēri:');
    sample.forEach(s => console.log(`  - ${s.title}${s.artist ? ' — ' + s.artist : ''}`));
  } else {
    console.log('Kolekcija ir tukša — dziesmas vari pievienot caur admin paneli mājaslapā.');
  }
  process.exit(0);
}

run().catch(err => { console.error('✗ Kļūda:', err.message); process.exit(1); });
