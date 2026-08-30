<<<<<<< HEAD
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
=======
// ═══════════════════════════════════════════════════
//  i18n — pilna lapas tulkošana LV / EN, bez izņēmumiem.
//  Katrs teksta elements HTML lietoto ar data-i18n="atslēga" atribūtu,
//  un šis skripts to aizvieto ar tulkojumu no vārdnīcas zemāk.
// ═══════════════════════════════════════════════════

const I18N = {
  lv: {
    brand: 'PULSS',
    tagline: 'Tava mūzika. Tavs pulss.',
    nav_home: 'Sākums',
    nav_trending: 'Populārākās',
    nav_all: 'Visas dziesmas',
    search_placeholder: 'Meklēt dziesmu vai izpildītāju…',
    filter_all_genres: 'Visi žanri',
    trending_title: 'Populārākās dziesmas',
    all_songs_title: 'Visas dziesmas',
    no_songs: 'Šeit vēl nav neviena dziesma.',
    no_songs_admin_hint: 'Atver admin paneli, lai pievienotu pirmo dziesmu.',
    no_results: 'Nekas netika atrasts.',
    plays: 'noklausīšanās',
    unknown_artist: 'Nezināms izpildītājs',
    player_no_song: 'Nav izvēlēta neviena dziesma',
    play: 'Atskaņot',
    pause: 'Pauze',
    next: 'Nākamā',
    prev: 'Iepriekšējā',
    shuffle: 'Jaukt',
    repeat: 'Atkārtot',
    volume: 'Skaļums',
    queue: 'Rinda',
    close: 'Aizvērt',
    admin_login_title: 'Admin pieeja',
    admin_username: 'Lietotājvārds',
    admin_password: 'Parole',
    admin_login_btn: 'Ieiet',
    admin_login_error: 'Nepareizs lietotājvārds vai parole.',
    admin_panel_title: 'Admin panelis',
    admin_logout: 'Iziet',
    admin_tab_songs: 'Dziesmas',
    admin_tab_upload: 'Pievienot dziesmu',
    admin_tab_broadcast: 'Ziņojums lietotājiem',
    admin_tab_stats: 'Pārskats',
    upload_dropzone: 'Ievelc audio failu šeit vai spied, lai izvēlētos',
    upload_dropzone_hint: 'MP3, WAV, OGG, FLAC, M4A, AAC — līdz 30MB',
    upload_cover_label: 'Vāciņa attēls (neobligāti)',
    upload_cover_hint: 'Ja neizvēlēsies, mēģināsim izgūt no faila ID3 taga.',
    upload_title_label: 'Nosaukums',
    upload_artist_label: 'Izpildītājs',
    upload_genre_label: 'Žanrs',
    upload_genre_placeholder: 'piem. Synthwave, Lo-fi, Trap…',
    upload_autodetected: 'Automātiski noteikts no faila — vari labot, ja vajag.',
    upload_trending_label: 'Rādīt kā populāru',
    upload_submit: 'Augšupielādēt dziesmu',
    upload_uploading: 'Augšupielādē…',
    upload_success: 'Dziesma pievienota!',
    upload_error_generic: 'Neizdevās augšupielādēt dziesmu.',
    upload_need_file: 'Vispirms izvēlies audio failu.',
    song_table_title: 'Nosaukums',
    song_table_artist: 'Izpildītājs',
    song_table_genre: 'Žanrs',
    song_table_plays: 'Klausīšanās',
    song_table_trending: 'Populāra',
    song_table_actions: 'Darbības',
    edit: 'Labot',
    save: 'Saglabāt',
    cancel: 'Atcelt',
    delete: 'Dzēst',
    delete_confirm: 'Vai tiešām dzēst šo dziesmu? To nevar atsaukt.',
    drag_to_reorder: 'Velc, lai mainītu secību',
    broadcast_label: 'Uzraksti ziņojumu (jebkurā valodā) — otra valoda tiks pievienota automātiski',
    broadcast_lang_lv: 'Es rakstu latviski',
    broadcast_lang_en: 'I am writing in English',
    broadcast_send: 'Publicēt ziņojumu',
    broadcast_sending: 'Tulko un publicē…',
    broadcast_sent: 'Ziņojums publicēts abās valodās!',
    broadcast_preview_lv: 'Priekšskatījums (LV)',
    broadcast_preview_en: 'Priekšskatījums (EN)',
    broadcast_none: 'Pašlaik nav aktīva ziņojuma.',
    broadcast_history: 'Iepriekšējie ziņojumi',
    broadcast_hide: 'Paslēpt',
    stats_songs: 'Dziesmas kopā',
    stats_plays: 'Noklausīšanās kopā',
    stats_trending: 'Populāras dziesmas',
    footer_rights: 'Visas tiesības aizsargātas.',
    lang_switch: 'EN',
    close_admin_hint: 'Nospied Esc, lai aizvērtu',
    loading: 'Ielādē…',
  },
  en: {
    brand: 'PULSS',
    tagline: 'Your music. Your pulse.',
    nav_home: 'Home',
    nav_trending: 'Trending',
    nav_all: 'All songs',
    search_placeholder: 'Search song or artist…',
    filter_all_genres: 'All genres',
    trending_title: 'Trending songs',
    all_songs_title: 'All songs',
    no_songs: 'There are no songs here yet.',
    no_songs_admin_hint: 'Open the admin panel to add the first song.',
    no_results: 'No results found.',
    plays: 'plays',
    unknown_artist: 'Unknown artist',
    player_no_song: 'No song selected',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    prev: 'Previous',
    shuffle: 'Shuffle',
    repeat: 'Repeat',
    volume: 'Volume',
    queue: 'Queue',
    close: 'Close',
    admin_login_title: 'Admin access',
    admin_username: 'Username',
    admin_password: 'Password',
    admin_login_btn: 'Log in',
    admin_login_error: 'Incorrect username or password.',
    admin_panel_title: 'Admin panel',
    admin_logout: 'Log out',
    admin_tab_songs: 'Songs',
    admin_tab_upload: 'Add song',
    admin_tab_broadcast: 'Message to users',
    admin_tab_stats: 'Overview',
    upload_dropzone: 'Drag an audio file here or click to choose',
    upload_dropzone_hint: 'MP3, WAV, OGG, FLAC, M4A, AAC — up to 30MB',
    upload_cover_label: 'Cover image (optional)',
    upload_cover_hint: "If you don't pick one, we'll try to extract it from the file's ID3 tag.",
    upload_title_label: 'Title',
    upload_artist_label: 'Artist',
    upload_genre_label: 'Genre',
    upload_genre_placeholder: 'e.g. Synthwave, Lo-fi, Trap…',
    upload_autodetected: 'Auto-detected from the file — edit if needed.',
    upload_trending_label: 'Mark as trending',
    upload_submit: 'Upload song',
    upload_uploading: 'Uploading…',
    upload_success: 'Song added!',
    upload_error_generic: 'Failed to upload the song.',
    upload_need_file: 'Choose an audio file first.',
    song_table_title: 'Title',
    song_table_artist: 'Artist',
    song_table_genre: 'Genre',
    song_table_plays: 'Plays',
    song_table_trending: 'Trending',
    song_table_actions: 'Actions',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    delete_confirm: 'Really delete this song? This cannot be undone.',
    drag_to_reorder: 'Drag to reorder',
    broadcast_label: 'Write a message (in either language) — the other language is added automatically',
    broadcast_lang_lv: 'Es rakstu latviski',
    broadcast_lang_en: 'I am writing in English',
    broadcast_send: 'Publish message',
    broadcast_sending: 'Translating and publishing…',
    broadcast_sent: 'Message published in both languages!',
    broadcast_preview_lv: 'Preview (LV)',
    broadcast_preview_en: 'Preview (EN)',
    broadcast_none: 'No active message right now.',
    broadcast_history: 'Previous messages',
    broadcast_hide: 'Hide',
    stats_songs: 'Total songs',
    stats_plays: 'Total plays',
    stats_trending: 'Trending songs',
    footer_rights: 'All rights reserved.',
    lang_switch: 'LV',
    close_admin_hint: 'Press Esc to close',
    loading: 'Loading…',
  },
};

const i18n = {
  current: localStorage.getItem('pulss_lang') || 'lv',

  t(key) {
    return (I18N[this.current] && I18N[this.current][key]) || (I18N.lv[key]) || key;
  },

  setLang(lang) {
    if (!I18N[lang]) return;
    this.current = lang;
    localStorage.setItem('pulss_lang', lang);
    document.documentElement.setAttribute('lang', lang);
    this.apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  },

  toggle() {
    this.setLang(this.current === 'lv' ? 'en' : 'lv');
  },

  // Iziet cauri VISIEM elementiem ar data-i18n / data-i18n-placeholder /
  // data-i18n-title un piemēro tulkojumu — nekas netiek izlaists.
  apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = this.t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-placeholder')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')));
    });
    root.querySelectorAll('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', this.t(el.getAttribute('data-i18n-aria')));
    });
    const langBtn = document.getElementById('langSwitchLabel');
    if (langBtn) langBtn.textContent = this.t('lang_switch');
    document.documentElement.setAttribute('lang', this.current);
  },
};

document.addEventListener('DOMContentLoaded', () => i18n.apply());
>>>>>>> b43235d63fc4cc36af37dc2d50f8106d5d4cc443
