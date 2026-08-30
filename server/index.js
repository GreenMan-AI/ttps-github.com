// server/index.js
require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const configRoutes = require('./routes/config');
const songsRoutes = require('./routes/songs');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust the platform's reverse proxy (Railway/Render sit behind one) so
// secure cookies and rate-limit IPs behave correctly.
app.set('trust proxy', 1);

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Static assets: the frontend, and uploaded audio/images.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// API
app.use('/api/config', configRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/healthz', (req, res) => res.json({ ok: true }));

// Fallback to the SPA shell for any non-API route.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Centralized error handler so unexpected exceptions return JSON, not an HTML stack trace.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

app.listen(PORT, () => {
  console.log(`WAVE server running: http://localhost:${PORT}`);
});
