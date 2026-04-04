# 🎵 MusicBox — Railway Deployment Guide

## ✅ Solis pa solim — GitHub + Railway

---

### 1️⃣ SAGATAVO GITHUB REPO

1. Ej uz **github.com** → klik **"New repository"**
2. Nosaukums: `musicbox`
3. **Public** vai **Private** — abi der
4. Klik **"Create repository"**

Tad savā datorā:
```bash
# Izpako musicbox-railway.zip
# Atver termināli tā mapē un ieraksti:

git init
git add .
git commit -m "MusicBox v1"
git branch -M main
git remote add origin https://github.com/TAVS-USERNAME/musicbox.git
git push -u origin main
```

> 💡 Vai arī vienkārši augšupielādē failus GitHub caur **"Upload files"** pogu!

---

### 2️⃣ PALAIDI AR RAILWAY (BEZMAKSAS)

1. Ej uz **railway.app**
2. Klik **"Start a New Project"**
3. Izvēlies **"Deploy from GitHub repo"**
4. Autorizē Railway piekļuvi GitHub
5. Izvēlies savu `musicbox` repo
6. Railway **automātiski** atklās Node.js un palaidīs!

**Pēc ~2 minūtēm** tev būs saite kā:
```
https://musicbox-production-xxxx.up.railway.app
```

---

### 3️⃣ NOSŪTI BILDI

Railway vajag bg.jpg failu! Pievieno to repo:
- Liec `bg.jpg` failu savā GitHub repozitorijā kopā ar pārējiem failiem

---

### 🔐 NOKLUSĒJUMA ADMINS

| Lietotājvārds | Parole    |
|--------------|-----------|
| `admin`      | `admin123` |

> ⚠️ Nomainī paroli admin panelī pēc pirmās ieiešanas!

---

### 📁 FAILU STRUKTŪRA

```
musicbox/
├── server.js       ← Node.js serveri
├── index.html      ← Visa mājas lapa
├── package.json    ← Dependencies
├── railway.json    ← Railway konfigurācija
├── .gitignore      ← Git ignorē node_modules utt.
└── bg.jpg          ← Fona bilde (Ultra Instinct)
```

---

### ⚠️ SVARĪGI — Railway Free Tier

Railway bezmaksas plānā:
- **500h/mēnesī** (pietiek 1 projektam)
- **Augšupielādētie faili** pazūd pēc restart (servera restarta)
- Ja vajag pastāvīgu storage → jāpievieno **Railway Volume** vai **Cloudinary**

Pagaidām tas darbojas lieliski testēšanai un lietošanai!

---

### 🌐 ALTERNATĪVAS (arī bezmaksas)

| Platforma | Bezmaksas | Viegli |
|-----------|-----------|--------|
| **Railway** | ✅ 500h/mēn | ⭐⭐⭐⭐⭐ |
| **Render** | ✅ (lēnāks cold start) | ⭐⭐⭐⭐ |
| **Fly.io** | ✅ | ⭐⭐⭐ |

---

### 💬 Problēmas?

Ja kaut kas neiet — pasaki kur iestrēgi un palīdzēšu!
