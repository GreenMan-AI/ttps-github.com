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
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('TRŪKST MONGO_URI vides mainīgā! Skaties .env.example failu.');
}

mongoose.connect(MONGO_URI)
  .then(() => console.log('✓ Savienots ar MongoDB Atlas'))
  .catch(err => console.error('✗ MongoDB savienojuma kļūda:', err.message));

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
