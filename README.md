# 🎵 SoundForge

Latvijas mūzikas straumēšanas platforma.

## Tehnoloģijas
- **Mobilā app**: React Native + Expo (EAS build)
- **Backend**: Node.js + Express + MongoDB Atlas
- **Hosting**: Render.com
- **Mediji**: Cloudinary

## Saites
- 🌐 **Web**: https://greenman-ai.onrender.com
- 📱 **Expo**: https://expo.dev/accounts/greenman/projects/SoundForge
- 📦 **APK**: https://github.com/GreenMan-AI/greenman-ai/releases

## Projekta struktūra
```
SoundForge/
├── app/
│   ├── _layout.tsx          ← Root navigācija
│   └── (tabs)/
│       ├── _layout.tsx      ← Tab josla
│       ├── index.tsx        ← Sākums / dziesmu saraksts
│       ├── explore.tsx      ← Meklēšana
│       ├── playlist.tsx     ← Playlistes
│       ├── profile.tsx      ← Profils
│       ├── admin.tsx        ← Admin panelis
│       └── diag.tsx         ← Diagnostika
├── components/
│   ├── MainApp.tsx          ← Galvenā aplikācija (čats, mūzika, info)
│   ├── AuthScreen.tsx       ← Login / Register
│   ├── LangScreen.tsx       ← Valodas izvēle
│   ├── Player.tsx           ← Audio atskaņotājs
│   └── MoodScreen.tsx       ← Mood Player
├── AppContext.tsx            ← Globālais stāvoklis
├── i18n.ts                  ← Tulkojumi LV/EN/RU
├── app.json                 ← Expo konfigurācija
└── package.json
```

## Serveris (greenman-ai/)
```
server.js          ← Express API + MongoDB
public/
├── index.html     ← Web aplikācija
└── design.css     ← Stili
```

## Komandas
```bash
# Expo startēšana
npx expo start --clear

# Android APK build
eas build --platform android --profile preview

# Production AAB
eas build --platform android --profile production

# Serveris lokāli
cd greenman-ai && npm start
```

## API endpoints
| Metode | URL | Apraksts |
|--------|-----|----------|
| POST | /api/register | Reģistrēšanās |
| POST | /api/login | Ielogošanās |
| GET | /api/tracks | Visas dziesmas |
| POST | /api/upload | Augšupielādēt dziesmu |
| GET | /api/chat/history | Čata vēsture |
| POST | /api/chat | Nosūtīt ziņojumu |
| GET | /api/chat/poll | Jaunie ziņojumi |
| GET | /api/ticker | Slīdošais ziņojums |
| GET | /api/health | Servera pārbaude |

## Versija
SoundForge v1.1.0 — GreenMan-AI
