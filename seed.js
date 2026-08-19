require('dotenv').config();
const mongoose = require('mongoose');
const Song = require('./models/Song');

const seedSongs = [
  { title: "Betona Pulss", artist: "KODS.404", dur: "2:41", genre: "Trap / Hip-Hop", trending: true },
  { title: "Neona Ceļš", artist: "VILNIS//", dur: "3:12", genre: "Synthwave", trending: true },
  { title: "Lietus Logs", artist: "maijs.", dur: "2:58", genre: "Lo-fi", trending: false },
  { title: "Klubs Nr.9", artist: "DROP CTRL", dur: "3:34", genre: "EDM / Electro", trending: true },
  { title: "Garāžas Stāsts", artist: "Suns un Māne", dur: "3:47", genre: "Indie / Alt", trending: false },
  { title: "Vasaras Refrēns", artist: "Zane K.", dur: "3:02", genre: "Pop", trending: true },
  { title: "Nakts Skaņa", artist: "L.O.V.E.", dur: "3:21", genre: "R&B / Soul", trending: false },
  { title: "Skaļāk Par Visu", artist: "DZELZS SIRDS", dur: "4:01", genre: "Rock", trending: false },
  { title: "Karstā Nakts", artist: "Rico & Luna", dur: "2:49", genre: "Reggaeton", trending: true },
  { title: "Kafijas Rituāls", artist: "maijs.", dur: "2:20", genre: "Lo-fi", trending: false },
  { title: "Tumšais Bass", artist: "KODS.404", dur: "2:55", genre: "Trap / Hip-Hop", trending: false },
  { title: "Retro Brauciens", artist: "VILNIS//", dur: "3:40", genre: "Synthwave", trending: false },
];

async function run() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!MONGO_URI) {
    console.error('Trūkst MONGO_URI vides mainīgā. Izveido .env failu pēc .env.example parauga.');
    process.exit(1);
  }
  await mongoose.connect(MONGO_URI);
  await Song.deleteMany({});
  await Song.insertMany(seedSongs);
  console.log(`Ielādētas ${seedSongs.length} sākotnējās dziesmas datubāzē!`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
