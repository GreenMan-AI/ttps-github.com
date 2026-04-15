// ══════════════════════════════════════════════════
//  UPLOAD LIMITS — pievieno server.js pirms app.listen
//  AppContext.tsx izsauc: GET /api/upload/limits
// ══════════════════════════════════════════════════

// Limits konfigurācija (maini pēc vajadzības)
const UPLOAD_LIMITS = {
  maxSizeMB:       25,   // max faila izmērs MB
  maxDurationMin:  6,    // max dziesmas garums minūtēs
  allowedTypes:    ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'],
  uploadsPerDay:   10,   // max augšupielādes dienā vienam lietotājam
};

// Dienas augšupielāžu skaitītājs (in-memory, reset katru dienu)
// Produkcijai labāk glabāt DB, bet šis darbojas labi
const uploadCountMap = new Map(); // { username: { count, date } }

function getUploadCount(username) {
  const today = new Date().toDateString();
  const entry = uploadCountMap.get(username);
  if (!entry || entry.date !== today) {
    uploadCountMap.set(username, { count: 0, date: today });
    return 0;
  }
  return entry.count;
}

function incrementUploadCount(username) {
  const today = new Date().toDateString();
  const entry = uploadCountMap.get(username);
  if (!entry || entry.date !== today) {
    uploadCountMap.set(username, { count: 1, date: today });
  } else {
    entry.count++;
  }
}

// GET /api/upload/limits — atgriež limitus un atlikušās augšupielādes
app.get('/api/upload/limits', requireAuth, (req, res) => {
  const used = getUploadCount(req.user.username);
  const remaining = Math.max(0, UPLOAD_LIMITS.uploadsPerDay - used);
  res.json({
    maxSizeMB:      UPLOAD_LIMITS.maxSizeMB,
    maxDurationMin: UPLOAD_LIMITS.maxDurationMin,
    allowedTypes:   UPLOAD_LIMITS.allowedTypes,
    uploadsPerDay:  UPLOAD_LIMITS.uploadsPerDay,
    usedToday:      used,
    remaining:      remaining,
    canUpload:      remaining > 0,
  });
});

// ── SVARĪGI: Pēc veiksmīgas augšupielādes pievieno šo uploadMulti/uploadAudio apstrādātājā: ──
// incrementUploadCount(req.user.username);
//
// Piemēram POST /api/upload apstrādātājā pēc Track.create():
//   incrementUploadCount(req.user.username);
//   res.status(201).json({ track });
