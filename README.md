# 🎵 MusicBox — Shared Music Platform

Pilna mūzikas platforma ar lietotāju reģistrāciju, kopīgu bibliotēku un admin paneli.

## 🚀 Uzstādīšana

```bash
# 1. Instalē dependencies
npm install

# 2. Pieliec bg.jpg (fona bilde) projekta mapē (jau iekļauta)

# 3. Startē serveri
node server.js

# Vai ar auto-restart (dev mode):
npm run dev
```

Atver: **http://localhost:3000**

---

## 👤 Noklusējuma Admin

| Lietotājvārds | Parole    |
|--------------|-----------|
| `admin`      | `admin123` |

> ⚠️ **Nomainī paroli pēc pirmās ieiešanas!**

---

## ✨ Funkcijas

### 🔐 Autorizācija
- Reģistrācija ar lietotājvārdu + paroli
- Sesijas saglabāšana (7 dienas)
- Lomas: `user` un `admin`

### 🎵 Mūzika (visi redz!)
- Augšupielādē MP3, WAV, OGG, FLAC (max 100MB)
- Drag & Drop upload
- Katra dziesma redzama **visiem lietotājiem**
- Lejupielādēt jebkuru dziesmu

### 📁 Mapes
- Izveidot, pārvaldīt mapes
- Krāsainas mapes sānjoslā

### 🔍 Meklēšana
- Meklē pēc nosaukuma, izpildītāja, augšupielādētāja

### 🛡 Admin Panelis
- Redz visus lietotājus
- Dzēš lietotājus
- Paaugstina uz admin
- Redz un dzēš jebkuru failu

---

## 📁 Projekta struktūra

```
musicbox/
├── server.js      # Node.js backend
├── index.html     # Frontend (SPA)
├── package.json
├── bg.jpg         # Fona bilde
├── data.json      # DB (auto izveidojas)
└── uploads/       # Audio faili (auto izveidojas)
```

---

## 🌐 Izvietošana serverī (VPS)

```bash
# Instalē PM2
npm install -g pm2

# Startē
pm2 start server.js --name musicbox

# Auto-start pēc restart
pm2 startup
pm2 save
```

Ar Nginx proxy uz portu 3000 vari izmantot domēnu.

---

## 🔒 Drošība (Production)

Pirms publicēšanas nomainī `server.js` failā:
```js
secret: 'NOMAINĪ-ŠO-UZ-UNIKĀLU-VIRKNI'
```
