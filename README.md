# PULSS — mūzikas mājaslapa (izlabota un papildināta versija)

## Kas bija salauzts un kāpēc

Salīdzinot veco un jauno projektu, atradu īsto iemeslu, kāpēc dziesmas, kas
jau bija augšupielādētas serverī, neparādījās mājaslapā:

1. **Dziesmas glabājās nepareizā vietā.** Vecajā versijā dziesmas tika
   saglabātas MongoDB kolekcijā `tracks` (ar audio saiti uz Cloudinary,
   vāciņu, ilgumu u.c.). Jaunajā (pusgatavajā) versijā datu modelis bija
   pilnībā pārtaisīts par vienkāršu `Song` modeli, kas glabājas kolekcijā
   `songs` — **tukšā** kolekcijā. Tāpēc lapa rādīja "nav dziesmu", lai gan
   datubāzē tavas ~simtiem dziesmu bija — tikai citā "atvilktnē".
2. **"Pievienot dziesmu" funkcija nemaz nestrādāja ar audio failiem.**
   Jaunajā versijā admin forma bija tikai teksta lauki (nosaukums,
   izpildītājs, ilgums, žanrs) — bez faila augšupielādes iespējas vispār.
   Tā arī radās tā kļūdas ziņa "Ieraksti gan nosaukumu, gan izpildītāju,
   lai pievienotu dziesmu" — sistēma prasīja to visu ierakstīt ar roku,
   jo nebija nekāda mehānisma, kas to izlasītu no paša faila.

## Kas tagad ir izlabots un pievienots

- **Dati atkal savienoti ar īsto kolekciju** (`tracks`) — kolīdz ievadīsi
  savu īsto `MONGODB_URI`, visas iepriekš augšupielādētās dziesmas uzreiz
  parādīsies mājaslapā, nekas nav jāpārceļ vai jāimportē no jauna.
- **Īsta audio augšupielāde ar automātisku atpazīšanu.** Admin panelī tagad
  ir faila ievilkšanas lauks (drag & drop) — ievelc MP3/WAV/OGG/FLAC/M4A/AAC
  failu, un sistēma **pati** mēģina noteikt nosaukumu un izpildītāju:
  1. vispirms no faila ID3 tagiem (ja AI rīks tos jau ierakstījis),
  2. ja to nav — no faila nosaukuma (atpazīst formātu `Izpildītājs -
     Nosaukums.mp3`).
  Admins REDZ, kas tika atpazīts, un var to izlabot, bet nav spiests
  rakstīt visu no nulles. Vāciņa attēlu, ja tāda nav pievienota, sistēma
  arī mēģina izgūt no faila ID3 taga.
- **Vairāk admin iespēju:** labot dziesmas nosaukumu/izpildītāju/žanru,
  atzīmēt kā "populāru", dzēst (ar apstiprinājumu, kas notīra arī
  Cloudinary failus), mainīt secību ar velkot-un-metot, pārskata cilne ar
  kopējo dziesmu skaitu, klausīšanos skaitu un populāro dziesmu skaitu.
- **Divas valodas — latviešu un angļu, pilnībā, bez izņēmumiem.** Katrs
  teksta gabaliņš lapā (arī admin panelī) iet caur `data-i18n` sistēmu
  (`public/js/i18n.js`) — nav neviena teksta, kas paliktu netulkots, kad
  pārslēdz valodu pogā augšā labajā stūrī.
- **Ziņojums visiem lietotājiem ar automātisku tulkošanu.** Admin panelī
  ("Ziņojums lietotājiem") admins uzraksta ziņu VIENĀ valodā (izvēlas, kurā),
  un serveris automātiski notulko uz otru, izmantojot bezmaksas tulkošanas
  servisu — publicētā ziņa parādās kā baneris lapas augšā TAJĀ valodā, kuru
  lietotājs tobrīd ir izvēlējies.
- **Modernāks, pilnvērtīgs mūzikas atskaņotājs:** fiksēta apakšējā josla ar
  vāciņu, progresa joslu (var pārtīt), skaļuma regulatoru, shuffle/repeat,
  klaviatūras īsceļiem (atstarpe = play/pause), un integrāciju ar tālruņa/
  pārlūka multivides vadību (var pauzēt no bloķēšanas ekrāna vai austiņām).

## Svarīgi PIRMS palaišanas

Atkopi savu **īsto** `.env` failu (to, kas jau bija tavā vecajā projektā ar
`MONGODB_URI`, `CLOUDINARY_*`) un pārkopē vērtības uz `.env` šajā projektā —
skaties `.env.example` par formātu. **Neizmanto** iepriekšējā "pulss-fixed"
projekta piemēra vērtības — tur bija cita, tukša datubāze.

```bash
npm install
cp .env.example .env
# atver .env un ieraksti savu īsto MONGODB_URI, CLOUDINARY_* un ADMIN_PASS

npm run check-db   # parāda, cik dziesmu tavā datubāzē jau ir — bez izmaiņām
npm start          # palaiž serveri uz http://localhost:3000
```

Ja `check-db` parāda skaitli, kas atbilst tavām reālajām dziesmām — viss
savienots pareizi, un tās tūlīt parādīsies arī mājaslapā.

## Admin pieeja

Ieraksti vārdu **`tups`** jebkurā vietā lapā (nevis kādā laukā, vienkārši
rakstot ar tastatūru), vai 5x noklikšķini uz logo "PULSS". Pieslēdzies ar
`ADMIN_USER` / `ADMIN_PASS` no sava `.env` faila.

## Izvietošana uz Render (tāpat kā iepriekš)

1. `git init && git add . && git commit -m "PULSS v2" && git push` uz GitHub.
2. Render.com → New → Web Service → savieno repo.
3. Build Command: `npm install`, Start Command: `npm start`.
4. Environment Variables: pievieno visus no sava `.env` (MONGODB_URI,
   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET,
   ADMIN_USER, ADMIN_PASS).
5. Kad "Live" — atver saiti, un tavas dziesmas jau būs tur.

## Piezīme par automātisko tulkošanu

Ziņojumu tulkošanai izmantots bezmaksas **MyMemory** API (nav vajadzīga
atslēga, strādā uzreiz). Kvalitāte ir pietiekama īsiem paziņojumiem, bet
ne ideāla. Ja vēlāk gribi precīzāku tulkojumu, `utils/translate.js` ir
viena vieta, kur to nomainīt uz DeepL vai Google Translate API (vajadzēs
API atslēgu no attiecīgā pakalpojuma).
