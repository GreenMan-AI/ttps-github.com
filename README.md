# PULSS — mūzikas mājaslapa

Pilns projekts: Node.js/Express serveris + MongoDB Atlas datubāze + frontend ar neredzamu admin paneli un žanra automātisko noteikšanu.

## Kā strādā

- `server.js` — Express serveris, kas apkalpo gan API, gan frontend failus
- `models/Song.js` — datu struktūra dziesmām MongoDB
- `routes/songs.js` — API: GET / POST / PATCH / DELETE dziesmām
- `public/index.html` — visa mājaslapa (dizains + loģika), sarunājas ar API
- `seed.js` — palaižams vienu reizi, lai datubāzē ieliktu 12 sākotnējās dziesmas

Admin panelis: noklikšķini uz logo **PULSS** 5 reizes pēc kārtas, vai spied **Ctrl+Shift+A** — tad prasīs paroli (`ADMIN_PASSWORD` no vides mainīgajiem). Bez pareizas paroles neko mainīt nevar — serveris to pārbauda, ne tikai pārlūks.

---

## 1. solis — MongoDB Atlas

1. Ej uz [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) un ielogojies savā kontā.
2. Ja tev jau ir klasteris — izmanto to. Ja nav, izveido bezmaksas M0 klasteri.
3. **Database Access** → izveido lietotāju ar paroli (atceries to!).
4. **Network Access** → pievieno IP adresi `0.0.0.0/0` (ļauj piekļuvi no jebkurienes — nepieciešams, lai Render varētu savienoties).
5. **Connect** → **Drivers** → nokopē savienojuma virkni (izskatās apmēram šādi):
   ```
   mongodb+srv://lietotajs:parole@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Pievieno tai beigās datubāzes nosaukumu `/pulss` pirms jautājuma zīmes:
   ```
   mongodb+srv://lietotajs:parole@cluster0.xxxxx.mongodb.net/pulss?retryWrites=true&w=majority
   ```

## 2. solis — pārbaude lokāli (nav obligāti, bet ieteicams)

```bash
npm install
cp .env.example .env
# atver .env failu un ieraksti savu MONGO_URI

npm run seed     # ieliek 12 sākotnējās dziesmas datubāzē
npm start        # palaiž serveri uz http://localhost:3000
```

Atver `http://localhost:3000` pārlūkā — ja redzi dziesmas un `● savienots ar datubāzi` statusu augšā, viss strādā.

## 3. solis — GitHub

```bash
git init
git add .
git commit -m "PULSS mājaslapa"
git branch -M main
git remote add origin https://github.com/<tavs-lietotajvards>/pulss.git
git push -u origin main
```

(`.env` fails **netiks** augšupielādēts — tas ir `.gitignore` sarakstā ar nolūku, lai parole nenonāktu publiskā repo.)

## 4. solis — Render

1. Ej uz [render.com](https://render.com) → **New** → **Web Service**.
2. Savieno savu GitHub repo (`pulss`).
3. Iestatījumi:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
4. **Environment Variables** → pievieno:
   - `MONGO_URI` = tava Atlas savienojuma virkne no 1. soļa
   - `ADMIN_PASSWORD` = parole, ar kuru atvērsi admin paneli (izvēlies kaut ko drošu — ne "admin123")
5. Nospied **Create Web Service**. Render uzbūvēs un palaidīs projektu — tas prasa 1-3 minūtes.
6. Kad statuss ir "Live", atver piedāvāto saiti (piem. `https://pulss.onrender.com`).

## 5. solis — sākotnējie dati datubāzē

Ja vēl neesi palaidis `npm run seed` lokāli 2. solī, vari to izdarīt caur Render:
- Render panelī atver savu servisu → **Shell** cilne → ieraksti:
  ```
  npm run seed
  ```
  (Šai komandai vajadzīgs pieejams `MONGO_URI` — Render Shell to jau redz no vides mainīgajiem.)

Vai arī vienkārši sāc ar tukšu datubāzi un pievieno dziesmas caur admin paneli tiešsaistē.

---

## Gatavs!

Tava saite (`https://pulss.onrender.com` vai kā to nosauksi) tagad ir īsta, dzīva mājaslapa:
- dati glabājas MongoDB Atlas datubāzē — nepazūd, pārlādējot lapu
- visi, kas atver saiti, redz vienus un tos pašus datus
- admin panelis (5x klikšķis uz logo vai Ctrl+Shift+A) ļauj pārvaldīt visu tiešsaistē no jebkuras ierīces

**Piezīme par bezmaksas Render plānu:** ja serviss kādu laiku nav lietots, tas "aizmieg" un pirmais pieprasījums pēc pauzes var aizņemt 30-60 sekundes, lai to "uzmodinātu". Tas ir normāli bezmaksas plānam.
