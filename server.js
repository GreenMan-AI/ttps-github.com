require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// ══════════════════════════════════════════════════
//  MONGODB
// ══════════════════════════════════════════════════
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('❌ KĻŪDA: MONGODB_URI nav iestatīts Environment Variables!');
  process.exit(1);
}
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB savienots!'))
  .catch(e => console.error('❌ MongoDB kļūda:', e.message));

const songRoutes = require('./routes/songs');
const { router: adminRoutes } = require('./routes/admin');
app.use('/api/songs', songRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, dbState: mongoose.connection.readyState });
});

app.listen(PORT, () => {
  console.log(`PULSS serveris darbojas uz porta ${PORT}`);
});
