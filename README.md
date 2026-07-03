# SoundPulse — vienkāršā versija

Vienkārša mājas lapa ar **1 admin kontu**. Admins var:
- mainīt lapas tekstus (LV un EN valodā)
- pievienot/dzēst bildes galerijā, sadalot pa **kategorijām**
- pievienot/dzēst savu mūziku un **pārkārtot dziesmas ar peli (drag & drop)**
- notīrīt čata vēsturi

Apmeklētāji var:
- skatīties bildes (ar kategoriju filtriem) un lasīt tekstu
- pārslēgt lapu starp **LV / EN**
- klausīties mūziku
- rakstīt reāllaika čatā (norādot vārdu)

---

## 1. Sagatavošana (konti, kas vajadzīgi)

1. **MongoDB Atlas** (datubāze) — https://www.mongodb.com/cloud/atlas — izveido klasteri, dabū "Connection string" (`MONGODB_URI`).
2. **Cloudinary** (bilžu/audio glabāšana) — https://cloudinary.com — dashboard'ā redzēsi `Cloud name`, `API Key`, `API Secret`.

## 2. Lokāla palaišana (testēšanai)

```bash
npm install
cp .env.example .env
# atver .env un ievieto savus datus
npm start
```

Atver `http://localhost:3000`.

---

## 3. Kā aizstāt veco projektu ar šo un aizsūtīt uz GitHub → Render

**Ja tavs vecais projekts jau ir Git repozitorijā** (mapē, kur ir `.git` apakšmape):

```bash
# 1. Dodies uz sava vecā projekta mapi
cd ceļš/uz/veco-soundpulse-projektu

# 2. Izdzēs vecos failus, KURUS aizstāj šī jaunā versija
#    (nepieskaries .git mapei un .env failam!)
rm -f server.js index.html design.css i18n.js sw.js
rm -f package.json package-lock.json
rm -rf public

# 3. Iekopē šīs jaunās versijas failus tajā pašā mapē
#    (izpako lejupielādēto soundpulse-simple.zip un iekopē saturu)
cp -r ceļš/uz/soundpulse-simple/* .
cp ceļš/uz/soundpulse-simple/.gitignore .

# 4. Pārbaudi, ka viss izskatās pareizi
ls
git status

# 5. Commit un push uz GitHub
git add -A
git commit -m "Vienkāršota versija: 1 admin konts, kategorijas, drag&drop, LV/EN"
git push
```

**Ja projekta vēl nav Git repozitorijā** — izveido to no jauna:

```bash
cd ceļš/uz/soundpulse-simple
git init
git add -A
git commit -m "Sākotnējā vienkāršotā versija"
git branch -M main
git remote add origin https://github.com/TAVS-LIETOTAJVARDS/TAVA-REPO.git
git push -u origin main
```

**Render.com puse:**
- Ja Render Web Service jau bija savienots ar šo GitHub repo — pēc `git push` tas automātiski uzsāks jaunu deploy (vai nospied "Manual Deploy" → "Deploy latest commit").
- Environment mainīgie (`MONGODB_URI`, `CLOUDINARY_*`, `ADMIN_USER`, `ADMIN_PASS`) paliek tie paši, kas jau bija iestatīti — nekas nav jāmaina, ja izmanto to pašu MongoDB/Cloudinary kontu.
- **Svarīgi:** `.env` fails NEKAD netiek sūtīts uz GitHub (tas ir `.gitignore` sarakstā) — Render vides mainīgie jāievada Render dashboard'ā, cilnē "Environment".

## 4. Citi vecā projekta faili — vai tos vajag?

| Fails | Ko darīt |
|---|---|
| `privacy.html` | ✅ Jau iekļauts šajā versijā (`public/privacy.html`), pieejams zem `/privacy` |
| `_gitignore` | ✅ Aizstāts ar jaunu `.gitignore` (vecajā bija kļūda — tas ignorēja `public/` mapi, kas šeit ir svarīga) |
| `i18n.js` (vecais, 36KB) | ❌ Nav vajadzīgs — jaunajā versijā ir sava, daudz vienkāršāka LV/EN sistēma iekš `app.js` |
| `sw.js` (Service Worker / PWA) | ❌ Izlaists vienkāršības labad. Ja gribi lapu darīt instalējamu kā PWA (offline režīms, "Pievienot sākuma ekrānam"), pasaki — to var pievienot atsevišķi |
| `App.tsx` (Expo/React Native mobilā app) | ❌ Nav daļa no šīs vienkāršās web versijas — tā ir atsevišķa mobilā aplikācija. Ja kādreiz gribēsi arī mobilo app, tas ir cits projekts |

Ja tev ir vēl kādi faili no vecā projekta, ko domā izmantot (piem. logo, bg attēls, fonti) — vari tos vienkārši iemest `public/` mapē un tie būs pieejami pēc adreses `/faila-vards.jpg`.

---

## 5. Jaunās funkcijas šajā versijā

### 🗂️ Galerijas kategorijas
Augšupielādējot bildi, admin var ierakstīt kategoriju (piem. "Koncerti", "Studija"). Apmeklētāji virs galerijas redz filtru pogas un var skatīt tikai vienu kategoriju vai visas.

### 🔀 Dziesmu secības maiņa (drag & drop)
Admin režīmā pie katras dziesmas ir ⠿ ikona — aiz tās var dziesmu ievilkt citā vietā sarakstā, un jaunā secība automātiski saglabājas visiem apmeklētājiem.

### 🌐 LV / EN valodu pārslēgs
Augšējā labajā stūrī poga "EN"/"LV" pārslēdz visu statisko tekstu (pogas, virsraksti u.c.). Admin panelī teksta rediģēšanas logā ir atsevišķi lauki latviešu un angļu valodā — aizpildi abus, ja gribi, lai lapa strādā abās valodās.

---

## Faili

- `server.js` — serveris (Express + MongoDB + Cloudinary + Socket.IO čats)
- `public/index.html` — lapas struktūra
- `public/design.css` — dizains
- `public/app.js` — visa klienta puses loģika (i18n, admin panelis, drag&drop, čats)
- `public/privacy.html` — privātuma politikas lapa
- `.env.example` — vides mainīgo paraugs
- `.gitignore` — pareizi iestatīts jaunajai failu struktūrai

## Ielogošanās kā admins

Apakšējā labajā stūrī 🔒 ikona → ievadi `ADMIN_USER`/`ADMIN_PASS` no `.env` / Render Environment.

**Noteikti nomaini `ADMIN_PASS`, pirms lapa ir publiski pieejama!**
