// public/js/i18n.js
//
// Minimal i18n: a flat string table per language + a t(key) lookup. Shared
// between app.js (public site) and admin.js (dashboard). Default language
// is English; the nav toggle switches to Latvian at runtime.

const STRINGS = {
  en: {
    navHintBefore: 'type', navHintAfter: 'anywhere → admin',
    heroEyebrow: 'Live now',
    heroTitlePre: 'Sound that ', heroTitleEm: 'belongs', heroTitlePost: ' only to you.',
    heroPara: 'One player for your whole collection — no subscriptions, no algorithm, no distractions. Just music.',
    heroBtnPlay: 'Start listening', heroBtnLineup: 'View tracklist',
    npLabel: 'Now playing', npTitleDefault: 'Choose a song', npArtistDefault: 'and the real magic begins',
    trackEyebrow: 'Collection', trackHeading: 'Tracklist',
    footer: 'WAVE — your music, your rules.',
    step1: 'Step 1 of 2', step2: 'Step 2 of 2',
    adminLoginTitle: 'Admin login', adminLoginHint: 'Enter your username and password.',
    fieldUsername: 'Username', fieldPassword: 'Password', btnContinue: 'Continue',
    totpTitle: 'Authenticator code', totpHint: 'Enter the 6-digit code from your authenticator app.',
    fieldCode: 'Code', btnLogin: 'Log in',
    dashTagPreview: 'Management', dashWelcome: 'Welcome back', btnLogout: 'Log out',
    tabContent: 'Content', tabSongs: 'Songs', tabSecurity: 'Security',
    fieldSiteTitle: 'Site title', fieldTagline: 'Tagline',
    fieldPlayerBg: 'Player card background image', fieldSiteBg: 'Site-wide background image',
    siteBgHint: 'Covers the entire page, not just the player.',
    btnChooseFile: 'Choose file', btnChooseFiles: 'Choose file(s)', btnSaveChanges: 'Save changes',
    addSongsTitle: 'Add song(s)', fieldSongTitle: 'Title', fieldSongArtist: 'Artist',
    fieldAudioFiles: 'Audio file(s)', audioMultiHint: 'Select multiple files to upload and add several songs at once.',
    fieldAudioUrl: 'Or paste an audio link',
    btnAddSong: '+ Add song', existingSongs: 'Existing songs',
    secretWordTitle: 'Secret word', secretWordHint: 'This word opens the login form when typed anywhere on the page.',
    fieldNewSecret: 'New secret word', btnChange: 'Change',
    twoFaTitle: 'Two-factor authentication', twoFaHint: 'Scan the QR code with your authenticator app, then confirm below.',
    btnReroll2fa: 'Generate new 2FA key', fieldConfirmCode: 'Confirm with code from your app',
    btnConfirmActivate: 'Confirm & activate',
    emptyTitle: 'Tracklist is empty', emptyPara: 'No tracks here yet.',
    songErrorRequired: 'A title and an audio link/file are required.',
    radioDjOn: 'Radio DJ: shuffling', radioDjOff: 'Radio DJ',
    toastRadioOn: 'Radio DJ is on — songs will play in shuffled order',
    toastRadioOff: 'Radio DJ is off — back to normal order',
    toastPlaybackError: "That track couldn't play — check the audio link",
    toastUploaded: 'Uploaded',
    toastAddedSongsOne: 'Added 1 song', toastAddedSongsMany: 'Added {n} songs',
    toastDeleted: 'Song deleted', toastSettingsSaved: 'Settings saved',
    toastSecretUpdated: 'Secret word updated', toastLoggedOut: 'Logged out',
    trackCountOne: '1 track', trackCountMany: '{n} tracks',
    searchPlaceholder: 'Search songs or artists…',
    lyricsLabel: 'Lyrics',
    fieldAlbum: 'Album (optional)', fieldCover: 'Cover image (optional)', fieldLyrics: 'Lyrics (optional)',
    dragReorderHint: 'Drag songs to reorder them.',
    btnEdit: 'Edit', btnSave: 'Save', btnCancel: 'Cancel',
    toastSongUpdated: 'Song updated', toastReordered: 'Order saved'
  },
  lv: {
    navHintBefore: 'raksti', navHintAfter: 'jebkur → admin',
    heroEyebrow: 'Tiešraidē tagad',
    heroTitlePre: 'Skaņa, kas ', heroTitleEm: 'pieder', heroTitlePost: ' tikai tev.',
    heroPara: 'Viens atskaņotājs visai kolekcijai — bez piemaksām, bez algoritma, bez traucēkļiem. Tikai mūzika.',
    heroBtnPlay: 'Sākt klausīties', heroBtnLineup: 'Skatīt repertuāru',
    npLabel: 'Tagad skan', npTitleDefault: 'Izvēlies dziesmu', npArtistDefault: 'un sāksies īstā piedzīvojums',
    trackEyebrow: 'Kolekcija', trackHeading: 'Repertuārs',
    footer: 'WAVE — tava mūzika, tavos noteikumos.',
    step1: 'Solis 1 no 2', step2: 'Solis 2 no 2',
    adminLoginTitle: 'Admin pieteikšanās', adminLoginHint: 'Ievadi lietotājvārdu un paroli.',
    fieldUsername: 'Lietotājvārds', fieldPassword: 'Parole', btnContinue: 'Turpināt',
    totpTitle: 'Autentifikatora kods', totpHint: 'Ievadi 6 ciparu kodu no savas autentifikatora lietotnes.',
    fieldCode: 'Kods', btnLogin: 'Pieteikties',
    dashTagPreview: 'Pārvaldība', dashWelcome: 'Sveiks atpakaļ', btnLogout: 'Iziet',
    tabContent: 'Saturs', tabSongs: 'Dziesmas', tabSecurity: 'Drošība',
    fieldSiteTitle: 'Lapas nosaukums', fieldTagline: 'Zemvirsraksts',
    fieldPlayerBg: 'Atskaņotāja kartītes fona attēls', fieldSiteBg: 'Visas lapas fona attēls',
    siteBgHint: 'Aizpilda visu lapu, ne tikai atskaņotāju.',
    btnChooseFile: 'Izvēlēties failu', btnChooseFiles: 'Izvēlēties failu(s)', btnSaveChanges: 'Saglabāt izmaiņas',
    addSongsTitle: 'Pievienot dziesmu(as)', fieldSongTitle: 'Nosaukums', fieldSongArtist: 'Izpildītājs',
    fieldAudioFiles: 'Audio fails(i)', audioMultiHint: 'Izvēlies vairākus failus, lai augšupielādētu un pievienotu vairākas dziesmas uzreiz.',
    fieldAudioUrl: 'Vai ielīmē audio saiti',
    btnAddSong: '+ Pievienot dziesmu', existingSongs: 'Esošās dziesmas',
    secretWordTitle: 'Slepenais vārds', secretWordHint: 'Šis vārds atver pieteikšanās formu, ja to uzraksta jebkur lapā.',
    fieldNewSecret: 'Jaunais slepenais vārds', btnChange: 'Mainīt',
    twoFaTitle: 'Divu faktoru autentifikācija', twoFaHint: 'Ieskenē QR kodu ar autentifikatora lietotni, tad apstiprini zemāk.',
    btnReroll2fa: 'Ģenerēt jaunu 2FA atslēgu', fieldConfirmCode: 'Apstiprini ar kodu no lietotnes',
    btnConfirmActivate: 'Apstiprināt un aktivizēt',
    emptyTitle: 'Repertuārs vēl ir tukšs', emptyPara: 'Šeit vēl nav neviena ieraksta.',
    songErrorRequired: 'Nepieciešams nosaukums un audio saite/fails.',
    radioDjOn: 'Radio DJ: jaukta secība', radioDjOff: 'Radio DJ',
    toastRadioOn: 'Radio DJ ieslēgts — dziesmas skanēs jauktā secībā',
    toastRadioOff: 'Radio DJ izslēgts — atpakaļ pie parastās secības',
    toastPlaybackError: 'Šo dziesmu nevar atskaņot — pārbaudi audio saiti',
    toastUploaded: 'Augšupielādēts',
    toastAddedSongsOne: 'Pievienota 1 dziesma', toastAddedSongsMany: 'Pievienotas {n} dziesmas',
    toastDeleted: 'Dziesma dzēsta', toastSettingsSaved: 'Iestatījumi saglabāti',
    toastSecretUpdated: 'Slepenais vārds atjaunināts', toastLoggedOut: 'Izgāji no admin paneļa',
    trackCountOne: '1 dziesma', trackCountMany: '{n} dziesmas',
    searchPlaceholder: 'Meklēt dziesmas vai izpildītājus…',
    lyricsLabel: 'Dziesmas vārdi',
    fieldAlbum: 'Albums (nav obligāti)', fieldCover: 'Vāka attēls (nav obligāti)', fieldLyrics: 'Dziesmas vārdi (nav obligāti)',
    dragReorderHint: 'Velc dziesmas, lai mainītu secību.',
    btnEdit: 'Rediģēt', btnSave: 'Saglabāt', btnCancel: 'Atcelt',
    toastSongUpdated: 'Dziesma atjaunināta', toastReordered: 'Secība saglabāta'
  }
};

const I18N = {
  currentLang: 'en',

  t(key) {
    return (STRINGS[I18N.currentLang] && STRINGS[I18N.currentLang][key]) || STRINGS.en[key] || key;
  },

  setLang(lang) {
    I18N.currentLang = STRINGS[lang] ? lang : 'en';
    document.documentElement.lang = I18N.currentLang;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = I18N.t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
      el.placeholder = I18N.t(el.getAttribute('data-i18n-ph'));
    });
    document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang: I18N.currentLang } }));
  }
};

window.I18N = I18N;
