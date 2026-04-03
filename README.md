# GREENMAN·AI — Music Platform v2.0

## ⚡ UZSTĀDĪŠANA (3 soļi)

```bash
# 1. Ienāc mapē
cd greenman-ai-v2

# 2. Uzstādi pakotnes
npm install

# 3. Palaid!
npm start
```

Atver pārlūkā: **http://localhost:3000**

---

## 🔑 ADMIN PIEKĻUVE

| Lietotājvārds | Parole     |
|---------------|------------|
| `admin`       | `admin1234` |

> ⚠️ **NOMAINĪT PAROLI** failā `server.js` rindā `const ADMIN_PASS = 'admin1234';` pirms publicēšanas!

---

## 📁 PROJEKTA STRUKTŪRA

```
greenman-ai-v2/
├── server.js          ← Node.js backend
├── package.json
├── uploads/           ← Tiek izveidots automātiski
└── public/
    └── index.html     ← Visa frontend
```

---

## 🎯 FUNKCIJAS

### Publiskais lietotājs (bez konta)
- ✅ Klausīties publiskās dziesmas
- ✅ Redzēt mapes un to saturu

### Reģistrēts lietotājs
- ✅ Viss iepriekšējais +
- ✅ Klausīties privātās dziesmas
- ✅ Veidot personīgās playlistes
- ✅ Pievienot/noņemt dziesmas no playlistes

### Admin (🔒 poga augšējā stūrī)
- ✅ Augšupielādēt mūziku (publisko vai privāto)
- ✅ Izveidot/dzēst mapes (Metal, Hip-Hop, utt.)
- ✅ Dzēst jebkuru dziesmu
- ✅ Skatīt statistiku (lietotāji, atskaņojumi)
- ✅ Pārvaldīt lietotājus

---

## 🎵 PLAYER FUNKCIJAS

- ▶ / ⏸ Atskaņot / Pauzēt
- ⏮ ⏭ Iepriekšējā / Nākamā
- ⇄ Shuffle (jaukt secību)
- ↻ Repeat (atkārtot dziesmu)
- Progress bar (klikšķināms)
- Skaļuma regulēšana

---

## 🌐 API

| Metode | URL | Apraksts | Tiesības |
|--------|-----|---------|---------|
| POST | /api/register | Reģistrācija | — |
| POST | /api/login | Ielogoties | — |
| POST | /api/logout | Izlogoties | User |
| GET  | /api/me | Pašreizējais user | User |
| GET  | /api/tracks | Dziesmu saraksts | — |
| POST | /api/upload | Augšupielādēt | Admin |
| PATCH | /api/tracks/:id | Rediģēt meta | Admin |
| DELETE | /api/tracks/:id | Dzēst dziesmu | Admin |
| POST | /api/tracks/:id/play | +1 atskaņojums | — |
| GET  | /api/folders | Mapes | — |
| POST | /api/folders | Izveidot mapi | Admin |
| DELETE | /api/folders/:id | Dzēst mapi | Admin |
| GET  | /api/playlists | Playlistes | User |
| POST | /api/playlists | Izveidot | User |
| DELETE | /api/playlists/:id | Dzēst | User/Admin |
| POST | /api/playlists/:id/tracks | Pievienot dziesmu | User |
| DELETE | /api/playlists/:id/tracks/:tid | Noņemt dziesmu | User |
| GET  | /api/admin/stats | Statistika | Admin |
| GET  | /api/admin/users | Lietotāju saraksts | Admin |
| DELETE | /api/admin/users/:u | Dzēst lietotāju | Admin |

---

## ⚠️ PIEZĪME

Dati glabājas **atmiņā** — pazūd pēc `npm restart`.
Nākamajā versijā var pievienot **SQLite** vai **MongoDB** pastāvīgai uzglabāšanai.
