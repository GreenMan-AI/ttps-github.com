// ═══════════════════════════════════════════════════════════════
//  SoundPulse — i18n.js  (Pilns tulkojumu fails)
//  Versija: 1.0  |  Valodas: LV · EN · RU
//
//  KĀ PIEVIENOT JAUNU TULKOJUMU:
//  1. Pievieno jaunu atslēgu VISĀS 3 valodās (lv, en, ru)
//  2. HTML elementam pievieno atribūtu:  data-i18n="atslēga"
//  3. JS kodā izmanto:  t('atslēga')
//
//  KĀ PIEVIENOT JAUNU VALODU:
//  1. Nokopē visu 'lv' bloku
//  2. Pārsauc uz jauno valodas kodu (piem. 'de')
//  3. Iztulko visas vērtības
//  4. Pievieno pogu splash ekrānā:  <button onclick="setLang('de')">DE</button>
// ═══════════════════════════════════════════════════════════════

const LANGS = {

  // ─────────────────────────────────────────
  //  LATVIEŠU
  // ─────────────────────────────────────────
  lv: {

    // NAV — koplietoti
    na: '—',
    loading: 'Ielādē...',
    error: 'Kļūda',
    save: 'SAGLABĀT',
    cancel: 'ATCELT',
    close: 'Aizvērt ✕',
    delete: 'Dzēst',
    edit: 'Rediģēt',
    yes: 'Jā',
    no: 'Nē',
    ok: 'Labi',

    // ── SPLASH ──────────────────────────────
    splash_sub:   'TAVA MŪZIKAS PASAULE',
    splash_btn:   'IEIET / REĢISTRĒTIES',
    splash_note:  'Nepieciešams konts, lai piekļūtu mūzikai',
    splash_platform: 'MŪZIKAS STRAUMĒŠANAS PLATFORMA',
    splash_free:  'Mūziku var klausīties bez konta',
    scan_phone:   'SKENĒ AR TELEFONU',
    install_app:  'Instalē',

    // ── AUTH ─────────────────────────────────
    login:        'IEIET',
    register:     'REĢISTRĒTIES',
    logout:       'IZIET',
    username:     'Lietotājvārds',
    password:     'PAROLE',
    username_ph:  'Lietotājvārds',
    password_ph:  'Parole',
    err_short_user: 'Lietotājvārds pārāk īss (min. 3)',
    err_short_pass: 'Parole pārāk īsa (min. 6)',
    err_wrong:    'Nepareizs lietotājvārds vai parole',
    err_taken:    'Lietotājvārds jau aizņemts',
    registered:   'Reģistrēts',

    // ── NAVIGĀCIJA (sānjosla) ────────────────
    home:         'Sākums',
    all_songs:    'Visas dziesmas',
    playlist:     'Playliste',
    favorites:    'Favorīti',
    folders:      'Mapes',
    my_stats:     'Mana statistika',
    my_profile:   'Mans profils',
    trending:     'Trending',
    feed:         'Jaunumi',
    library:      'BIBLIOTĒKA',
    songs:        'DZIESMAS',

    // ── MEKLĒŠANA / KĀRTOŠANA ───────────────
    search_ph:    'Meklēt dziesmas...',
    newest:       'Jaunākās',
    oldest:       'Vecākās',
    popular:      'Populārākās',
    az:           'A → Z',
    za:           'Z → A',
    plays_count:  'Atskaņojumi',

    // ── DZIESMAS / PLAYLISTE ─────────────────
    no_tracks:    'Nav ierakstu',
    no_songs_yet: 'Nav dziesmu vēl',
    no_songs_uploaded: 'Vēl nav augšupielādētu dziesmu',
    play_all:     '▶ ATSKAŅOT VISU',
    uploaded_by:  'Augšupielādēja',
    plays:        'atskaņojumi',
    artist:       'Izpildītājs',
    title:        'Nosaukums',
    lyrics:       'TEKSTS',
    lyrics_full:  'Teksts (Lyrics)',
    folder:       'Mape',
    album_cover:  'Albuma vāks',
    cover_hint:   'Noklikšķini lai mainītu vāku (500×500)',
    drag_reorder: 'Vilkt dziesmas lai mainītu secību',

    // ── PLAYLISTE ────────────────────────────
    my_playlist:  'MANA PLAYLISTE',
    playlist_empty: 'Playliste ir tukša!',
    playlist_empty_hint: 'Nospied ＋ pie jebkuras dziesmas lai pievienotu',
    playlist_yours_empty: 'Tavā playliste nav dziesmu.',
    playlist_share: 'Dalies ar savu playlisti — kopē saiti un nosūti draugiem',
    shared_playlist: 'Dalītā playliste',
    clear_playlist: 'NOTĪRĪT',
    add_to_playlist: 'Pievienot playliste',
    remove_from_playlist: 'Noņemt',
    press_to_add: 'Nospied lai pievienotu',

    // ── FAVORĪTI ────────────────────────────
    my_favs:      'FAVORĪTI',
    favs_yours:   'Tavas atzīmētās dziesmas',

    // ── TRENDING ────────────────────────────
    trending_title: '🔥 TRENDING',
    trending_sub: 'Populārākās dziesmas pēc atskaņojumiem',
    top_songs:    'TOP DZIESMAS',

    // ── JAUNUMI (FEED) ───────────────────────
    feed_title:   '📰 JAUNUMI',
    no_feed:      'Nav jaunumu',

    // ── MAPES ───────────────────────────────
    folders_title: 'MAPES',
    my_folders:   'MANAS MAPES',
    my_folders_lock: 'MANAS MAPES 🔒',
    no_folders:   'Nav nevienas mapes',
    no_priv_folders: 'Nav privātu mapju. Izveido pirmo!',
    folder_for_all: 'Mape visiem failiem',
    folder_field: 'MAPE',

    // ── AUGŠUPIELĀDE ─────────────────────────
    upload:       'AUGŠUPIELĀDE',
    upload_one:   'VIENA DZIESMA',
    upload_multi: 'VAIRĀKAS DZIESMAS',
    upload_btn:   'AUGŠUPIELĀDĒT',
    upload_all:   'AUGŠUPIELĀDĒT VISUS',
    multi_upload: 'MULTI-UPLOAD',
    one_song_hint: 'Viens fails, precīzi meta',
    multi_hint:   'Līdz 20 failiem vienlaicīgi · Katrs līdz 100MB',
    multi_hint2:  'Līdz 20 failiem · Katrs līdz 100MB',
    audio_hint:   'MP3 WAV OGG FLAC M4A · līdz 100MB',
    img_hint:     'JPG · PNG · WEBP · līdz 10MB',
    img_hint2:    'JPG · PNG · max 5MB',
    drop_audio:   'Noklikšķini vai iemet audio failu',
    drop_img:     'Noklikšķini vai iemet attēlu',
    img_url:      'Attēla URL',
    img_url_web:  'Attēla URL no interneta',
    names_from_files: 'Nosaukumi no failu nosaukumiem',
    names_from_files2: 'Nosaukumi ņemti no failu nosaukumiem',
    add_music:    '＋ PIEVIENOT MŪZIKU',
    add:          '＋ PIEVIENOT',
    description:  'Apraksts',
    social_link:  'Sociālā saite',
    social_link_opt: 'Sociālā saite (pēc izvēles)',
    link_click:   'Saite (klikšķis)',
    recipient:    'Saņēmējs',

    // ── PROFILS ──────────────────────────────
    profile:      'PROFILS',
    my_songs:     'MANAS DZIESMAS',
    profile_pic:  'Profila bilde',
    nick_on_pic:  'Nick uz bildes',
    nick_hint:    'Nick pie profila bildes',
    bio:          'Bio',
    bio_hint:     'Bio (max 200 rakstzīmes)',
    save_profile: 'SAGLABĀT PROFILU',
    user_field:   'Lietotājs: ',
    email_field:  'E-pasts: ',
    role:         'Loma',

    // ── IESTATĪJUMI ──────────────────────────
    settings:     'IESTATĪJUMI',
    change_pass:  'MAINĪT PAROLI',
    reset_pass:   'ATIESTATĪT PAROLI',
    reset_btn:    'ATIESTATĪT',
    curr_pass:    'Pašreizējā parole',
    new_pass:     'Jaunā parole (min. 6)',
    repeat_pass:  'Atkārtot jauno paroli',
    theme:        'KRĀSA',
    theme_hint:   'Izvēli lapas krāsu tēmu:',
    bg_image:     'FONA BILDE',
    set_bg:       'IESTATĪT FONU',
    save_bg:      'SAGLABĀT FONU',
    remove_bg:    'NOŅEMT FONU',
    del_bg:       'NOŅEMT FONU',

    // ── KRĀSU TĒMAS ──────────────────────────
    theme_blue:   'NEON ZILA',
    theme_green:  'NEON ZAĻA',
    theme_purple: 'VIOLETA',
    theme_red:    'SARKANA',
    theme_orange: 'SAULRIETS',
    theme_ocean:  'OKEĀNS',
    theme_yellow: 'DZELTENA',
    theme_white:  'BALTA',
    theme_black:  'MELNA',
    theme_forest: 'MEŽI',

    // ── STATISTIKA ───────────────────────────
    stats:        'MANA STATISTIKA',
    stats_plays:  'Atskaņojumi',

    // ── ADMIN ────────────────────────────────
    users:        'LIETOTĀJI',
    all_users:    'Visi lietotāji',
    users_list:   'Lietotāji',
    ads:          'REKLĀMAS',
    ad:           'REKLĀMA',
    ad_slot1:     'REKLĀMA — SLOTS 1',
    no_ads:       'Nav reklāmu',
    add_ad:       '+ PIEVIENOT REKLĀMU',
    ad_title:     'Virsraksts *',
    notif_text:   'Paziņojuma teksts',
    curr_ticker:  'Pašreizējais teksts: ',
    ticker_color: 'Teksta krāsa',

    // ── PAZIŅOJUMI ───────────────────────────
    no_notif:     'Nav paziņojumu',

    // ── KĻŪDAS / TOSTI ───────────────────────
    err_load:     'Kļūda ielādējot',
    welcome:      'Sveicināts',
    account_created: 'Konts izveidots!',

    // ── PRIVĀTUMS ────────────────────────────
    privacy:      'SoundPulse Privātuma politika',
    privacy_collects: 'SoundPulse vāc tikai',
    privacy_encrypted: 'šifrētu paroli',
    privacy_updated: 'Pēdējoreiz atjaunots: 01.05.2026.',
    learn_more:   'Uzzināt vairāk →',

    // ── GARASTĀVOKLIS ────────────────────────
    mood:         'Garastāvoklis',

    // ── MISC ─────────────────────────────────
    music:        'Music',
    // ── JAUNĀS ATSLĒGAS ──────────────────────────────────
    download_apk:   'LEJUPIELĀDĒT APK',
    privacy_btn_text: 'PRIVĀTUMS',
    qr_code:        'QR KODS',
    share:          'DALĪTIES',
    pwa_text:       'Instalē SoundPulse kā appu uz sava tālruņa vai datora!',
    splash_platform_short: 'TAVA MŪZIKAS PLATFORMA',
    title_ph:       'Dziesmas nosaukums',
    artist_ph:      'Mākslinieks',
    folder_ph:      'Mapes nosaukums',
    no_folder:      '— Bez mapes —',
    all_folders:    '📂 Visas',
    ticker_on:      '▶ IESLĒGT PAZIŅOJUMU',
    ticker_off:     '✕ IZSLĒGT',
    send_notif:     '📤 NOSŪTĪT',
    send_notif_title: '🔔 NOSŪTĪT PAZIŅOJUMU ZVANIŅĀ',
    all_users_opt:  'Visi lietotāji',
    create_btn:     '+ IZVEIDOT',
    priv_folders_hint: '🔒 Privātās mapes redzamas tikai tev',
    help_bio:       'Bio — īss stāsts par sevi (max 200 zīmes)',
    help_pic:       'Profila bilde — augšupielādē savu foto',
    help_mood:      'Garastāvoklis — ko klausies šobrīd',
    help_nick:      'Nick uz bildes — redzams profilā',
    help_playlist:  'Playliste',
    help_add_pl:    'Nospied ＋ pie dziesmas lai pievienotu',
    help_drag:      'Vilkt lai mainītu secību',
    help_share_pl:  '🔗 Dalies ar playlisti ar citiem',
    help_music:     'Mūzika',
    help_add:       '＋ PIEVIENOT — augšupielādē dziesmas',
    help_favs:      '⭐ Favorīti — atzīmē mīļākās',
    help_folders:   '📂 Mapes — kārto pa mapēm',
    admin_panel:    '⚙ ADMIN PANELIS',
    ticker_section: '📢 PAZIŅOJUMS',
    close_btn:      'Aizvērt ✕',
    songs_count:    'dziesmas',
    plays_label:    'atskaņojumi',
    private_label:  '· privāta',
    ticker_placeholder: 'Piemēram: 🎵 Jauna dziesma pievienota! Klausies tūlīt!',
    notif_placeholder:  'Piemēram: ⚠️ Serveris restartēsies rīt!',
    sound:        'Sound',
    pulse:        'Pulse',
    box:          'Box',
  },

  // ─────────────────────────────────────────
  //  ENGLISH
  // ─────────────────────────────────────────
  en: {

    na: '—',
    loading: 'Loading...',
    error: 'Error',
    save: 'SAVE',
    cancel: 'CANCEL',
    close: 'Close ✕',
    delete: 'Delete',
    edit: 'Edit',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',

    splash_sub:   'YOUR MUSIC WORLD',
    splash_btn:   'LOGIN / REGISTER',
    splash_note:  'Account required to access music',
    splash_platform: 'MUSIC STREAMING PLATFORM',
    splash_free:  'Listen to music without an account',
    scan_phone:   'SCAN WITH PHONE',
    install_app:  'Install',

    login:        'LOGIN',
    register:     'REGISTER',
    logout:       'LOGOUT',
    username:     'Username',
    password:     'PASSWORD',
    username_ph:  'Username',
    password_ph:  'Password',
    err_short_user: 'Username too short (min. 3)',
    err_short_pass: 'Password too short (min. 6)',
    err_wrong:    'Wrong username or password',
    err_taken:    'Username already taken',
    registered:   'Registered',

    home:         'Home',
    all_songs:    'All Songs',
    playlist:     'Playlist',
    favorites:    'Favorites',
    folders:      'Folders',
    my_stats:     'My Stats',
    my_profile:   'My Profile',
    trending:     'Trending',
    feed:         'Feed',
    library:      'LIBRARY',
    songs:        'SONGS',

    search_ph:    'Search songs...',
    newest:       'Newest',
    oldest:       'Oldest',
    popular:      'Popular',
    az:           'A → Z',
    za:           'Z → A',
    plays_count:  'Plays',

    no_tracks:    'No tracks',
    no_songs_yet: 'No songs yet',
    no_songs_uploaded: 'No uploaded songs yet',
    play_all:     '▶ PLAY ALL',
    uploaded_by:  'Uploaded by',
    plays:        'plays',
    artist:       'Artist',
    title:        'Title',
    lyrics:       'LYRICS',
    lyrics_full:  'Lyrics (Text)',
    folder:       'Folder',
    album_cover:  'Album cover',
    cover_hint:   'Click to change cover (500×500)',
    drag_reorder: 'Drag songs to reorder',

    my_playlist:  'MY PLAYLIST',
    playlist_empty: 'Playlist is empty!',
    playlist_empty_hint: 'Press ＋ on any song to add it',
    playlist_yours_empty: 'Your playlist has no songs.',
    playlist_share: 'Share your playlist — copy the link and send to friends',
    shared_playlist: 'Shared Playlist',
    clear_playlist: 'CLEAR',
    add_to_playlist: 'Add to playlist',
    remove_from_playlist: 'Remove',
    press_to_add: 'Press to add',

    my_favs:      'FAVORITES',
    favs_yours:   'Your liked songs',

    trending_title: '🔥 TRENDING',
    trending_sub: 'Most played tracks',
    top_songs:    'TOP SONGS',

    feed_title:   '📰 FEED',
    no_feed:      'No news',

    folders_title: 'FOLDERS',
    my_folders:   'MY FOLDERS',
    my_folders_lock: 'MY FOLDERS 🔒',
    no_folders:   'No folders',
    no_priv_folders: 'No private folders. Create the first one!',
    folder_for_all: 'Folder for all files',
    folder_field: 'FOLDER',

    upload:       'UPLOAD',
    upload_one:   'SINGLE SONG',
    upload_multi: 'MULTIPLE SONGS',
    upload_btn:   'UPLOAD',
    upload_all:   'UPLOAD ALL',
    multi_upload: 'MULTI-UPLOAD',
    one_song_hint: 'One file, precise metadata',
    multi_hint:   'Up to 20 files at once · Each up to 100MB',
    multi_hint2:  'Up to 20 files · Each up to 100MB',
    audio_hint:   'MP3 WAV OGG FLAC M4A · up to 100MB',
    img_hint:     'JPG · PNG · WEBP · up to 10MB',
    img_hint2:    'JPG · PNG · max 5MB',
    drop_audio:   'Click or drop audio file',
    drop_img:     'Click or drop image',
    img_url:      'Image URL',
    img_url_web:  'Image URL from the web',
    names_from_files: 'Titles from filenames',
    names_from_files2: 'Titles taken from filenames',
    add_music:    '＋ ADD MUSIC',
    add:          '＋ ADD',
    description:  'Description',
    social_link:  'Social link',
    social_link_opt: 'Social link (optional)',
    link_click:   'Link (clickable)',
    recipient:    'Recipient',

    profile:      'PROFILE',
    my_songs:     'MY SONGS',
    profile_pic:  'Profile picture',
    nick_on_pic:  'Nick on picture',
    nick_hint:    'Nick next to profile picture',
    bio:          'Bio',
    bio_hint:     'Bio (max 200 characters)',
    save_profile: 'SAVE PROFILE',
    user_field:   'User: ',
    email_field:  'Email: ',
    role:         'Role',

    settings:     'SETTINGS',
    change_pass:  'CHANGE PASSWORD',
    reset_pass:   'RESET PASSWORD',
    reset_btn:    'RESET',
    curr_pass:    'Current password',
    new_pass:     'New password (min. 6)',
    repeat_pass:  'Repeat new password',
    theme:        'COLOR',
    theme_hint:   'Choose page color theme:',
    bg_image:     'BACKGROUND IMAGE',
    set_bg:       'SET BACKGROUND',
    save_bg:      'SAVE BACKGROUND',
    remove_bg:    'REMOVE BACKGROUND',
    del_bg:       'REMOVE BACKGROUND',

    theme_blue:   'NEON BLUE',
    theme_green:  'NEON GREEN',
    theme_purple: 'PURPLE',
    theme_red:    'RED',
    theme_orange: 'SUNSET',
    theme_ocean:  'OCEAN',
    theme_yellow: 'YELLOW',
    theme_white:  'WHITE',
    theme_black:  'BLACK',
    theme_forest: 'FOREST',

    stats:        'MY STATISTICS',
    stats_plays:  'Plays',

    users:        'USERS',
    all_users:    'All users',
    users_list:   'Users',
    ads:          'ADS',
    ad:           'AD',
    ad_slot1:     'AD — SLOT 1',
    no_ads:       'No ads',
    add_ad:       '+ ADD AD',
    ad_title:     'Title *',
    notif_text:   'Notification text',
    curr_ticker:  'Current text: ',
    ticker_color: 'Text color',

    no_notif:     'No notifications',

    err_load:     'Error loading',
    welcome:      'Welcome',
    account_created: 'Account created!',

    privacy:      'SoundPulse Privacy Policy',
    privacy_collects: 'SoundPulse collects only',
    privacy_encrypted: 'encrypted password',
    privacy_updated: 'Last updated: 01.05.2026.',
    learn_more:   'Learn more →',

    mood:         'Mood',

    music:        'Music',
    // ── JAUNĀS ATSLĒGAS ──────────────────────────────────
    download_apk:   'LEJUPIELĀDĒT APK',
    privacy_btn_text: 'PRIVĀTUMS',
    qr_code:        'QR KODS',
    share:          'DALĪTIES',
    pwa_text:       'Instalē SoundPulse kā appu uz sava tālruņa vai datora!',
    splash_platform_short: 'TAVA MŪZIKAS PLATFORMA',
    title_ph:       'Dziesmas nosaukums',
    artist_ph:      'Mākslinieks',
    folder_ph:      'Mapes nosaukums',
    no_folder:      '— Bez mapes —',
    all_folders:    '📂 Visas',
    ticker_on:      '▶ IESLĒGT PAZIŅOJUMU',
    ticker_off:     '✕ IZSLĒGT',
    send_notif:     '📤 NOSŪTĪT',
    send_notif_title: '🔔 NOSŪTĪT PAZIŅOJUMU ZVANIŅĀ',
    all_users_opt:  'Visi lietotāji',
    create_btn:     '+ IZVEIDOT',
    priv_folders_hint: '🔒 Privātās mapes redzamas tikai tev',
    help_bio:       'Bio — īss stāsts par sevi (max 200 zīmes)',
    help_pic:       'Profila bilde — augšupielādē savu foto',
    help_mood:      'Garastāvoklis — ko klausies šobrīd',
    help_nick:      'Nick uz bildes — redzams profilā',
    help_playlist:  'Playliste',
    help_add_pl:    'Nospied ＋ pie dziesmas lai pievienotu',
    help_drag:      'Vilkt lai mainītu secību',
    help_share_pl:  '🔗 Dalies ar playlisti ar citiem',
    help_music:     'Mūzika',
    help_add:       '＋ PIEVIENOT — augšupielādē dziesmas',
    help_favs:      '⭐ Favorīti — atzīmē mīļākās',
    help_folders:   '📂 Mapes — kārto pa mapēm',
    admin_panel:    '⚙ ADMIN PANELIS',
    ticker_section: '📢 PAZIŅOJUMS',
    close_btn:      'Aizvērt ✕',
    songs_count:    'dziesmas',
    plays_label:    'atskaņojumi',
    private_label:  '· privāta',
    ticker_placeholder: 'Piemēram: 🎵 Jauna dziesma pievienota! Klausies tūlīt!',
    notif_placeholder:  'Piemēram: ⚠️ Serveris restartēsies rīt!',
    sound:        'Sound',
    pulse:        'Pulse',
    box:          'Box',
  },

  // ─────────────────────────────────────────
  //  РУССКИЙ
  // ─────────────────────────────────────────
  ru: {

    na: '—',
    loading: 'Загрузка...',
    error: 'Ошибка',
    save: 'СОХРАНИТЬ',
    cancel: 'ОТМЕНА',
    close: 'Закрыть ✕',
    delete: 'Удалить',
    edit: 'Редактировать',
    yes: 'Да',
    no: 'Нет',
    ok: 'ОК',

    splash_sub:   'ТВОЙ МИР МУЗЫКИ',
    splash_btn:   'ВОЙТИ / РЕГИСТРАЦИЯ',
    splash_note:  'Для доступа к музыке нужен аккаунт',
    splash_platform: 'ПЛАТФОРМА МУЗЫКАЛЬНОГО СТРИМИНГА',
    splash_free:  'Слушать музыку можно без аккаунта',
    scan_phone:   'СКАНИРУЙ ТЕЛЕФОНОМ',
    install_app:  'Установить',

    login:        'ВОЙТИ',
    register:     'РЕГИСТРАЦИЯ',
    logout:       'ВЫЙТИ',
    username:     'Имя пользователя',
    password:     'ПАРОЛЬ',
    username_ph:  'Имя пользователя',
    password_ph:  'Пароль',
    err_short_user: 'Имя слишком короткое (мин. 3)',
    err_short_pass: 'Пароль слишком короткий (мин. 6)',
    err_wrong:    'Неверное имя или пароль',
    err_taken:    'Имя пользователя занято',
    registered:   'Зарегистрирован',

    home:         'Главная',
    all_songs:    'Все песни',
    playlist:     'Плейлист',
    favorites:    'Избранное',
    folders:      'Папки',
    my_stats:     'Моя статистика',
    my_profile:   'Мой профиль',
    trending:     'Тренды',
    feed:         'Лента',
    library:      'БИБЛИОТЕКА',
    songs:        'ПЕСНИ',

    search_ph:    'Поиск песен...',
    newest:       'Новые',
    oldest:       'Старые',
    popular:      'Популярные',
    az:           'А → Я',
    za:           'Я → А',
    plays_count:  'Прослушиваний',

    no_tracks:    'Нет треков',
    no_songs_yet: 'Песен пока нет',
    no_songs_uploaded: 'Загруженных песен пока нет',
    play_all:     '▶ ИГРАТЬ ВСЁ',
    uploaded_by:  'Загрузил',
    plays:        'прослушиваний',
    artist:       'Исполнитель',
    title:        'Название',
    lyrics:       'ТЕКСТ',
    lyrics_full:  'Текст (Лирика)',
    folder:       'Папка',
    album_cover:  'Обложка альбома',
    cover_hint:   'Нажми чтобы изменить обложку (500×500)',
    drag_reorder: 'Перетаскивай песни для изменения порядка',

    my_playlist:  'МОЙ ПЛЕЙЛИСТ',
    playlist_empty: 'Плейлист пуст!',
    playlist_empty_hint: 'Нажми ＋ у любой песни чтобы добавить',
    playlist_yours_empty: 'В твоём плейлисте нет песен.',
    playlist_share: 'Поделись плейлистом — скопируй ссылку и отправь друзьям',
    shared_playlist: 'Общий плейлист',
    clear_playlist: 'ОЧИСТИТЬ',
    add_to_playlist: 'Добавить в плейлист',
    remove_from_playlist: 'Удалить',
    press_to_add: 'Нажми для добавления',

    my_favs:      'ИЗБРАННОЕ',
    favs_yours:   'Твои отмеченные песни',

    trending_title: '🔥 ТРЕНДЫ',
    trending_sub: 'Самые популярные треки',
    top_songs:    'ТОП ПЕСНИ',

    feed_title:   '📰 ЛЕНТА',
    no_feed:      'Нет новостей',

    folders_title: 'ПАПКИ',
    my_folders:   'МОИ ПАПКИ',
    my_folders_lock: 'МОИ ПАПКИ 🔒',
    no_folders:   'Нет папок',
    no_priv_folders: 'Нет приватных папок. Создай первую!',
    folder_for_all: 'Папка для всех файлов',
    folder_field: 'ПАПКА',

    upload:       'ЗАГРУЗКА',
    upload_one:   'ОДНА ПЕСНЯ',
    upload_multi: 'НЕСКОЛЬКО ПЕСЕН',
    upload_btn:   'ЗАГРУЗИТЬ',
    upload_all:   'ЗАГРУЗИТЬ ВСЕ',
    multi_upload: 'МУЛЬТИ-ЗАГРУЗКА',
    one_song_hint: 'Один файл, точные данные',
    multi_hint:   'До 20 файлов одновременно · Каждый до 100МБ',
    multi_hint2:  'До 20 файлов · Каждый до 100МБ',
    audio_hint:   'MP3 WAV OGG FLAC M4A · до 100МБ',
    img_hint:     'JPG · PNG · WEBP · до 10МБ',
    img_hint2:    'JPG · PNG · макс 5МБ',
    drop_audio:   'Нажми или перетащи аудио файл',
    drop_img:     'Нажми или перетащи изображение',
    img_url:      'URL изображения',
    img_url_web:  'URL изображения из интернета',
    names_from_files: 'Названия из имён файлов',
    names_from_files2: 'Названия взяты из имён файлов',
    add_music:    '＋ ДОБАВИТЬ МУЗЫКУ',
    add:          '＋ ДОБАВИТЬ',
    description:  'Описание',
    social_link:  'Социальная ссылка',
    social_link_opt: 'Социальная ссылка (по желанию)',
    link_click:   'Ссылка (кликабельная)',
    recipient:    'Получатель',

    profile:      'ПРОФИЛЬ',
    my_songs:     'МОИ ПЕСНИ',
    profile_pic:  'Фото профиля',
    nick_on_pic:  'Ник на фото',
    nick_hint:    'Ник рядом с фото профиля',
    bio:          'Bio',
    bio_hint:     'Bio (макс 200 символов)',
    save_profile: 'СОХРАНИТЬ ПРОФИЛЬ',
    user_field:   'Пользователь: ',
    email_field:  'Эл. почта: ',
    role:         'Роль',

    settings:     'НАСТРОЙКИ',
    change_pass:  'ИЗМЕНИТЬ ПАРОЛЬ',
    reset_pass:   'СБРОСИТЬ ПАРОЛЬ',
    reset_btn:    'СБРОСИТЬ',
    curr_pass:    'Текущий пароль',
    new_pass:     'Новый пароль (мин. 6)',
    repeat_pass:  'Повторить новый пароль',
    theme:        'ЦВЕТ',
    theme_hint:   'Выбери цветовую тему страницы:',
    bg_image:     'ФОНОВОЕ ИЗОБРАЖЕНИЕ',
    set_bg:       'УСТАНОВИТЬ ФОН',
    save_bg:      'СОХРАНИТЬ ФОН',
    remove_bg:    'УБРАТЬ ФОН',
    del_bg:       'УБРАТЬ ФОН',

    theme_blue:   'НЕОН СИНИЙ',
    theme_green:  'НЕОН ЗЕЛЁНЫЙ',
    theme_purple: 'ФИОЛЕТОВЫЙ',
    theme_red:    'КРАСНЫЙ',
    theme_orange: 'ЗАКАТ',
    theme_ocean:  'ОКЕАН',
    theme_yellow: 'ЖЁЛТЫЙ',
    theme_white:  'БЕЛЫЙ',
    theme_black:  'ЧЁРНЫЙ',
    theme_forest: 'ЛЕС',

    stats:        'МОЯ СТАТИСТИКА',
    stats_plays:  'Прослушиваний',

    users:        'ПОЛЬЗОВАТЕЛИ',
    all_users:    'Все пользователи',
    users_list:   'Пользователи',
    ads:          'РЕКЛАМА',
    ad:           'РЕКЛАМА',
    ad_slot1:     'РЕКЛАМА — СЛОТ 1',
    no_ads:       'Нет рекламы',
    add_ad:       '+ ДОБАВИТЬ РЕКЛАМУ',
    ad_title:     'Заголовок *',
    notif_text:   'Текст уведомления',
    curr_ticker:  'Текущий текст: ',
    ticker_color: 'Цвет текста',

    no_notif:     'Нет уведомлений',

    err_load:     'Ошибка загрузки',
    welcome:      'Добро пожаловать',
    account_created: 'Аккаунт создан!',

    privacy:      'Политика конфиденциальности SoundPulse',
    privacy_collects: 'SoundPulse собирает только',
    privacy_encrypted: 'зашифрованный пароль',
    privacy_updated: 'Последнее обновление: 01.05.2026.',
    learn_more:   'Узнать больше →',

    mood:         'Настроение',

    music:        'Music',
    // ── JAUNĀS ATSLĒGAS ──────────────────────────────────
    download_apk:   'LEJUPIELĀDĒT APK',
    privacy_btn_text: 'PRIVĀTUMS',
    qr_code:        'QR KODS',
    share:          'DALĪTIES',
    pwa_text:       'Instalē SoundPulse kā appu uz sava tālruņa vai datora!',
    splash_platform_short: 'TAVA MŪZIKAS PLATFORMA',
    title_ph:       'Dziesmas nosaukums',
    artist_ph:      'Mākslinieks',
    folder_ph:      'Mapes nosaukums',
    no_folder:      '— Bez mapes —',
    all_folders:    '📂 Visas',
    ticker_on:      '▶ IESLĒGT PAZIŅOJUMU',
    ticker_off:     '✕ IZSLĒGT',
    send_notif:     '📤 NOSŪTĪT',
    send_notif_title: '🔔 NOSŪTĪT PAZIŅOJUMU ZVANIŅĀ',
    all_users_opt:  'Visi lietotāji',
    create_btn:     '+ IZVEIDOT',
    priv_folders_hint: '🔒 Privātās mapes redzamas tikai tev',
    help_bio:       'Bio — īss stāsts par sevi (max 200 zīmes)',
    help_pic:       'Profila bilde — augšupielādē savu foto',
    help_mood:      'Garastāvoklis — ko klausies šobrīd',
    help_nick:      'Nick uz bildes — redzams profilā',
    help_playlist:  'Playliste',
    help_add_pl:    'Nospied ＋ pie dziesmas lai pievienotu',
    help_drag:      'Vilkt lai mainītu secību',
    help_share_pl:  '🔗 Dalies ar playlisti ar citiem',
    help_music:     'Mūzika',
    help_add:       '＋ PIEVIENOT — augšupielādē dziesmas',
    help_favs:      '⭐ Favorīti — atzīmē mīļākās',
    help_folders:   '📂 Mapes — kārto pa mapēm',
    admin_panel:    '⚙ ADMIN PANELIS',
    ticker_section: '📢 PAZIŅOJUMS',
    close_btn:      'Aizvērt ✕',
    songs_count:    'dziesmas',
    plays_label:    'atskaņojumi',
    private_label:  '· privāta',
    ticker_placeholder: 'Piemēram: 🎵 Jauna dziesma pievienota! Klausies tūlīt!',
    notif_placeholder:  'Piemēram: ⚠️ Serveris restartēsies rīt!',
    sound:        'Sound',
    pulse:        'Pulse',
    box:          'Box',
  },
};

// ═══════════════════════════════════════════════════════════════
//  TULKOŠANAS FUNKCIJAS
// ═══════════════════════════════════════════════════════════════

let curLang = localStorage.getItem('sp_lang') || 'lv';

/** Iegūst tulkojumu pēc atslēgas */
function t(key) {
  return LANGS[curLang]?.[key] || LANGS.lv[key] || key;
}

/** Maina valodu un atjauno visu lapu */
function setLang(lang) {
  curLang = lang;
  localStorage.setItem('sp_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('on', b.textContent === lang.toUpperCase())
  );
  applyLang();
}

/** Atjauno visus elementus ar data-i18n un citus zināmos elementus */
function applyLang() {
  // data-i18n atribūti
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    const val = LANGS[curLang]?.[k];
    if (val) el.textContent = val;
  });

  // data-i18n-ph — placeholder tulkojumi
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.dataset.i18nPh;
    const val = LANGS[curLang]?.[k];
    if (val) el.placeholder = val;
  });

  // Meklēšanas lauks
  const srch = document.getElementById('srch');
  if (srch) srch.placeholder = t('search_ph');

  // Splash
  const splashSub  = document.querySelector('.splash-sub');  if (splashSub)  splashSub.textContent  = t('splash_sub');
  const splashBtn  = document.querySelector('.splash-btn');  if (splashBtn)  splashBtn.textContent  = t('splash_btn');
  const splashNote = document.querySelector('.splash-note'); if (splashNote) splashNote.textContent = t('splash_note');

  // Auth
  const btnLogin = document.getElementById('btn-login'); if (btnLogin) btnLogin.textContent = t('login');
  const btnReg   = document.getElementById('btn-reg');   if (btnReg)   btnReg.textContent   = t('register');
  const btnOut   = document.getElementById('btn-logout'); if (btnOut)  btnOut.textContent   = t('logout');
  const lU = document.getElementById('l-u'); if (lU) lU.placeholder = t('username_ph');
  const lP = document.getElementById('l-p'); if (lP) lP.placeholder = t('password_ph');
  const rU = document.getElementById('r-u'); if (rU) rU.placeholder = t('username_ph');
  const rP = document.getElementById('r-p'); if (rP) rP.placeholder = t('password_ph');

  // Auth tabs
  const tabs = document.querySelectorAll('.auth-tab');
  if (tabs[0]) tabs[0].textContent = t('login');
  if (tabs[1]) tabs[1].textContent = t('register');

  // Pogas
  const btnPlayAll = document.getElementById('btn-play-all');
  if (btnPlayAll) btnPlayAll.textContent = t('play_all');

  const btnUp = document.getElementById('btn-user-panel');
  if (btnUp && window.S?.role !== 'admin') btnUp.textContent = t('add');
}
