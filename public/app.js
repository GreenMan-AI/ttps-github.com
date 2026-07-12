// ══════════════════════════════════════════════════
//  SoundPulse — vienkāršā versija — klienta JS
// ══════════════════════════════════════════════════

// Izslēdz jebkuru VECU Service Worker (no laika, kad lapai bija PWA/offline
// atbalsts) — tas var rādīt seno, saglabāto lapas versiju, apejot servera
// kešatmiņas iestatījumus pilnībā. Jaunajai vienkāršotajai versijai Service
// Worker vairs nav vajadzīgs.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  }).catch(() => {});
  if (window.caches) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
  }
}

const API = ''; // tukšs, jo lapa un API ir vienā domēnā
// PIEZĪME: admin sesija tagad tiek glabāta httpOnly cookie (nevis localStorage),
// tāpēc JS kodam tā vairs nav redzama/nozogama caur XSS. isAdmin ir tikai
// vietējais UI stāvoklis — patieso autorizāciju katrā pieprasījumā pārbauda serveris.
let isAdmin = false;
let currentLang = localStorage.getItem('sp_lang') || 'lv';
let currentCategory = 'all';

function authHeaders() { return {}; } // saglabāts priekš saderības ar esošajiem izsaukumiem — cookie tiek sūtīta automātiski

function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }

// ══════════════════════════════════════════════════
//  TOAST paziņojumi
// ══════════════════════════════════════════════════
function toast(msg, type = 'ok') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade');
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ══════════════════════════════════════════════════
//  I18N — statiskie lapas teksti (LV/EN)
// ══════════════════════════════════════════════════
const I18N = {
  lv: {
    nav_about: 'Informācīja', nav_gallery: 'Bildes', nav_music: 'Mūzika', nav_chat: 'Čats',
    admin_bar: '🔧 Admin režīms ieslēgts — vari rediģēt saturu, pievienot bildes un mūziku',
    logout: 'Iziet', edit_text: '✏️ Rediģēt tekstu', edit_bg: '🖼️ Fona bilde', edit_bg_title: 'Fona bilde', about_title: 'Informācīja',
    edit_hero_img: '🙂 Profila bilde', hero_img_title: 'Profila bilde',
    hero_img_hint: 'Neliela apļveida bilde, kas parādās virs virsraksta.', hero_img_remove: '🗑️ Noņemt',
    genre_label: 'Žanrs (nav obligāts, piem. Hip-Hop, Metal, Balāde)',
    gallery_title: 'Bildes', add_image: '➕ Pievienot bildi',
    music_title: 'Mūzika', add_track: '➕ Pievienot dziesmu',
    drag_hint: 'Padoms: adminā vari dziesmas pārkārtot, velkot aiz ⠿ ikonas.',
    chat_title: 'Čats', chat_send: 'Sūtīt', chat_name_ph: 'Tavs vārds', chat_text_ph: 'Raksti ziņu...',
    clear_chat: '🗑️ Notīrīt čatu',
    login_title: 'Admin ielogošanās', login_user: 'Lietotājvārds', login_pass: 'Parole',
    cancel: 'Atcelt', login_btn: 'Ielogoties',
    edit_content_title: 'Rediģēt lapas tekstu', site_title_label: 'Lapas nosaukums',
    contact_email_label: 'Kontakta e-pasts', social_link_label: 'Sociālo tīklu saite',
    close: 'Aizvērt', save: 'Saglabāt',
    add_image_title: 'Pievienot bildi', image_label: 'Bilde', category_label: 'Kategorija',
    caption_label: 'Paraksts (nav obligāts)', upload: 'Augšupielādēt',
    add_track_title: 'Pievienot dziesmu', title_label: 'Nosaukums', artist_label: 'Izpildītājs (nav obligāts)',
    audio_file_label: 'Audio fails (MP3, WAV, OGG...)', cover_label: 'Vāciņa bilde (nav obligāta)',
    gallery_empty: 'Vēl nav pievienotu bilžu.', music_empty: 'Vēl nav pievienotu dziesmu.',
    filter_all: 'Visas',
    add_bulk: '📦 Pievienot vairākas uzreiz', add_bulk_title: 'Pievienot vairākas dziesmas uzreiz',
    audio_files_label: 'Audio faili (vari izvēlēties vairākus)',
    bulk_hint: 'Nosaukumi tiks ņemti no failu nosaukumiem — pēc tam tos vari rediģēt atsevišķi.',
    bg_image_label: 'Fona bilde (parādās aiz visas lapas)', bg_remove: '🗑️ Noņemt fona bildi',
    bg_upload: '⬆️ Augšupielādēt un uzstādīt fonu',
    bg_hint: 'Fona bilde saglabājas uzreiz pēc augšupielādes (neatkarīgi no "Saglabāt" pogas apakšā).',
    bg_position_label: 'Bildes novietojums (centrējums)',
    bg_size_label: 'Bildes izmērs', size_cover: 'Aizpildīt ekrānu (var apgriezt malas)', size_contain: 'Rādīt visu bildi (var būt tukšas malas)',
    bg_overlay_label: 'Tumšuma pārklājums (lai teksts būtu salasāms)',
    bg_add_label: 'Pievienot bildi(-es) fonam', bg_current_label: 'Pašreizējās fona bildes',
    bg_interval_label: 'Nomaiņas intervāls (sekundēs, ja vairākas bildes)',
    pos_center: 'Centrā', pos_top: 'Augšā', pos_bottom: 'Apakšā', pos_left: 'Kreisajā pusē', pos_right: 'Labajā pusē',
    pos_top_left: 'Augšā kreisi', pos_top_right: 'Augšā labi', pos_bottom_left: 'Apakšā kreisi', pos_bottom_right: 'Apakšā labi',
    new_this_week: '🆕 Šīs nedēļas jaunumi', all_tracks: '🎵 Visas dziesmas',
  },
  en: {
    nav_about: 'About', nav_gallery: 'Gallery', nav_music: 'Music', nav_chat: 'Chat',
    admin_bar: '🔧 Admin mode on — you can edit content, add photos and music',
    logout: 'Log out', edit_text: '✏️ Edit text', edit_bg: '🖼️ Background image', edit_bg_title: 'Background image', about_title: 'Information',
    edit_hero_img: '🙂 Profile image', hero_img_title: 'Profile image',
    hero_img_hint: 'A small round image that appears above the title.', hero_img_remove: '🗑️ Remove',
    genre_label: 'Genre (optional, e.g. Hip-Hop, Metal, Ballad)',
    gallery_title: 'Gallery', add_image: '➕ Add photo',
    music_title: 'Music', add_track: '➕ Add track',
    drag_hint: 'Tip: as admin you can reorder tracks by dragging the ⠿ handle.',
    chat_title: 'Chat', chat_send: 'Send', chat_name_ph: 'Your name', chat_text_ph: 'Type a message...',
    clear_chat: '🗑️ Clear chat',
    login_title: 'Admin login', login_user: 'Username', login_pass: 'Password',
    cancel: 'Cancel', login_btn: 'Log in',
    edit_content_title: 'Edit page text', site_title_label: 'Site name',
    contact_email_label: 'Contact email', social_link_label: 'Social media link',
    close: 'Close', save: 'Save',
    add_image_title: 'Add photo', image_label: 'Image', category_label: 'Category',
    caption_label: 'Caption (optional)', upload: 'Upload',
    add_track_title: 'Add track', title_label: 'Title', artist_label: 'Artist (optional)',
    audio_file_label: 'Audio file (MP3, WAV, OGG...)', cover_label: 'Cover image (optional)',
    gallery_empty: 'No photos yet.', music_empty: 'No tracks yet.',
    filter_all: 'All',
    add_bulk: '📦 Add multiple at once', add_bulk_title: 'Add multiple tracks at once',
    audio_files_label: 'Audio files (you can select several)',
    bulk_hint: 'Titles are taken from file names — you can edit them individually afterwards.',
    bg_image_label: 'Background image (shows behind the whole page)', bg_remove: '🗑️ Remove background image',
    bg_upload: '⬆️ Upload and set background',
    bg_hint: 'The background image saves immediately on upload (independent of the "Save" button below).',
    bg_position_label: 'Image position (alignment)',
    bg_size_label: 'Image size', size_cover: 'Fill screen (may crop edges)', size_contain: 'Show full image (may leave empty margins)',
    bg_overlay_label: 'Darkness overlay (for text readability)',
    bg_add_label: 'Add image(s) for background', bg_current_label: 'Current background images',
    bg_interval_label: 'Change interval (seconds, if multiple images)',
    pos_center: 'Center', pos_top: 'Top', pos_bottom: 'Bottom', pos_left: 'Left', pos_right: 'Right',
    pos_top_left: 'Top left', pos_top_right: 'Top right', pos_bottom_left: 'Bottom left', pos_bottom_right: 'Bottom right',
    new_this_week: '🆕 New this week', all_tracks: '🎵 All tracks',
  },
};

function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || I18N.lv[key] || key; }

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.getElementById('lang-toggle').textContent = currentLang === 'lv' ? '🌐 EN' : '🌐 LV';
  document.documentElement.lang = currentLang;
}

function toggleLang() {
  currentLang = currentLang === 'lv' ? 'en' : 'lv';
  localStorage.setItem('sp_lang', currentLang);
  applyStaticI18n();
  applyContentForLang();
  renderCatTabs();
  renderGallery();
}

// ── ADMIN UI toggle ──
function setAdminUI(isAdmin) {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
  document.getElementById('admin-bar').classList.toggle('show', isAdmin);
  document.getElementById('admin-fab').style.display = isAdmin ? 'none' : 'flex';
  if (isAdmin) loadVisitCount();
  else document.getElementById('visit-counter').style.display = 'none';
}

async function checkAdmin() {
  try {
    const r = await fetch(API + '/api/admin/check');
    if (r.ok) { isAdmin = true; setAdminUI(true); }
    else { isAdmin = false; setAdminUI(false); }
  } catch (e) { isAdmin = false; setAdminUI(false); }
}

function openLoginModal() { document.getElementById('login-err').textContent = ''; showModal('login-modal'); }

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-err');
  errEl.textContent = '';
  try {
    const r = await fetch(API + '/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; return; }
    isAdmin = true;
    closeModal('login-modal');
    setAdminUI(true);
    await loadGallery();
    await loadTracks();
  } catch (e) { errEl.textContent = 'Servera kļūda'; }
});

async function adminLogout() {
  try { await fetch(API + '/api/admin/logout', { method: 'POST' }); } catch (e) {}
  isAdmin = false;
  setAdminUI(false);
}

async function runFixEncoding() {
  if (!confirm(currentLang === 'lv'
    ? 'Salabot sabojātos latviešu burtus/emocijzīmes esošajos ierakstos?'
    : 'Fix corrupted Latvian letters/emoji in existing records?')) return;
  try {
    const r = await fetch(API + '/api/admin/fix-encoding', { method: 'POST', headers: authHeaders() });
    const data = await r.json();
    if (!r.ok) { toast(data.error || 'Kļūda', 'err'); return; }
    toast((currentLang === 'lv' ? 'Salaboti ieraksti: ' : 'Records fixed: ') + data.fixedCount, 'ok');
    await loadGallery();
    await loadTracks();
  } catch (e) { toast('Servera kļūda', 'err'); }
}

// ══════════════════════════════════════════════════
//  SATURS (teksti mājas lapā)
// ══════════════════════════════════════════════════
async function loadContent() {
  const r = await fetch(API + '/api/content');
  window._content = await r.json();
  document.getElementById('page-title').textContent = window._content.siteTitle;
  document.getElementById('logo-text').textContent = window._content.siteTitle;
  applyContentForLang();
}

function applyContentForLang() {
  const c = window._content || {};
  const L = currentLang;
  const heroTitleEl = document.getElementById('hero-title');
  const heroSubtitleEl = document.getElementById('hero-subtitle');
  heroTitleEl.textContent = c['heroTitle_' + L] || c.heroTitle_lv || '';
  heroSubtitleEl.textContent = c['heroSubtitle_' + L] || c.heroSubtitle_lv || '';
  heroTitleEl.style.color = c.heroTitleColor || '';
  heroTitleEl.style.background = c.heroTitleColor ? 'none' : '';
  heroTitleEl.style.webkitTextFillColor = c.heroTitleColor || '';
  heroSubtitleEl.style.color = c.heroSubtitleColor || '';
  document.getElementById('about-text').textContent = c['aboutText_' + L] || c.aboutText_lv || '';
  document.getElementById('about-text').style.color = c.aboutTextColor || '';
  const tagline = c['tagline_' + L] || c.tagline_lv || '';
  document.getElementById('footer-text').textContent = '© ' + new Date().getFullYear() + ' ' + c.siteTitle + (tagline ? ' — ' + tagline : '');

  const avatarEl = document.getElementById('hero-profile-img');
  if (avatarEl) {
    if (c.heroAvatarUrl) { avatarEl.src = c.heroAvatarUrl; avatarEl.style.display = ''; }
    else { avatarEl.style.display = 'none'; avatarEl.src = ''; }
  }

  // Fona bilde tagad tiek pārvaldīta atsevišķi caur loadBgSlideshow() /
  // startBgSlideshow() (skat. zemāk) — atbalsta gan 1, gan vairākas bildes.
}

function openContentModal() {
  const c = window._content || {};
  document.getElementById('f-siteTitle').value = c.siteTitle || '';
  document.getElementById('f-heroTitleColor').value = c.heroTitleColor || '#eef2f7';
  document.getElementById('f-heroSubtitleColor').value = c.heroSubtitleColor || '#9aa4b2';
  document.getElementById('f-aboutTextColor').value = c.aboutTextColor || '#9aa4b2';
  ['tagline', 'heroTitle', 'heroSubtitle', 'aboutText'].forEach(key => {
    document.getElementById('f-' + key + '_lv').value = c[key + '_lv'] || '';
    document.getElementById('f-' + key + '_en').value = c[key + '_en'] || '';
  });
  document.getElementById('f-contactEmail').value = c.contactEmail || '';
  document.getElementById('f-socialLink').value = c.socialLink || '';
  document.getElementById('content-err').textContent = '';
  document.getElementById('content-ok').textContent = '';
  showModal('content-modal');
}

// ══════════════════════════════════════════════════
//  Automātiskā LV ↔ EN tulkošana admin panelī
// ══════════════════════════════════════════════════
async function callTranslateApi(text, source, target) {
  const r = await fetch(API + '/api/admin/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Tulkošana neizdevās');
  return data.translated;
}

// force=true (poga 🌐) -> vienmēr pārtulko LV->EN un pārraksta EN lauku.
// force=false (automātiski, zaudējot fokusu) -> aizpilda TIKAI ja mērķa lauks tukšs,
// un virziens ir tas lauks, kuram tikko pazuda fokuss un kurā ir teksts.
async function autoTranslatePair(lvId, enId, force, fromField) {
  const lvEl = document.getElementById(lvId);
  const enEl = document.getElementById(enId);
  if (!lvEl || !enEl) return;

  let sourceEl, targetEl, source, target;
  if (force) {
    // poga vienmēr tulko no LV puses (parastākā plūsma: uzraksti LV, ģenerē EN)
    sourceEl = lvEl; targetEl = enEl; source = 'lv'; target = 'en';
  } else if (fromField === 'lv') {
    if (enEl.value.trim()) return; // EN jau aizpildīts — nepārraksta automātiski
    sourceEl = lvEl; targetEl = enEl; source = 'lv'; target = 'en';
  } else {
    if (lvEl.value.trim()) return;
    sourceEl = enEl; targetEl = lvEl; source = 'en'; target = 'lv';
  }

  const text = sourceEl.value.trim();
  if (!text) return;

  const btn = document.querySelector(`.translate-btn[onclick*="'${lvId}'"]`);
  if (btn) btn.classList.add('busy');
  try {
    const translated = await callTranslateApi(text, source, target);
    targetEl.value = translated;
    targetEl.classList.add('auto-translated');
  } catch (e) {
    if (force) toast(e.message || 'Tulkošana neizdevās', 'err');
  } finally {
    if (btn) btn.classList.remove('busy');
  }
}

// automātiska aizpilde, kad lietotājs pabeidz rakstīt vienā pusē un otra ir tukša
document.querySelectorAll('#content-form [data-pair]').forEach(el => {
  el.addEventListener('blur', () => {
    const pairId = el.dataset.pair;
    const isLv = el.dataset.lv === '1';
    if (isLv) autoTranslatePair(el.id, pairId, false, 'lv');
    else autoTranslatePair(pairId, el.id, false, 'en');
  });
  // ja lietotājs pats izlabo automātiski tulkoto tekstu, noņem "auto" izcēlumu
  el.addEventListener('input', () => el.classList.remove('auto-translated'));
});

function openHeroImgModal() {
  const c = window._content || {};
  document.getElementById('f-heroImg').value = '';
  document.getElementById('hero-img-err').textContent = '';
  const preview = document.getElementById('hero-img-preview');
  const removeBtn = document.getElementById('hero-img-remove-btn');
  if (c.heroAvatarUrl) {
    preview.innerHTML = `<img src="${c.heroAvatarUrl}" alt="" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`;
    removeBtn.style.display = '';
  } else {
    preview.innerHTML = '';
    removeBtn.style.display = 'none';
  }
  showModal('hero-img-modal');
}

async function uploadHeroImage() {
  const errEl = document.getElementById('hero-img-err');
  errEl.textContent = '';
  const file = document.getElementById('f-heroImg').files[0];
  if (!file) { errEl.textContent = currentLang === 'lv' ? 'Vispirms izvēlies failu' : 'Choose a file first'; return; }
  const fd = new FormData();
  fd.append('image', file);
  const btn = document.getElementById('hero-img-upload-btn');
  btn.disabled = true;
  try {
    const r = await fetch(API + '/api/content/hero-avatar', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await r.json();
    btn.disabled = false;
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    toast(currentLang === 'lv' ? '✅ Profila bilde uzstādīta!' : '✅ Profile image set!', 'ok');
    closeModal('hero-img-modal');
    await loadContent();
  } catch (e) { btn.disabled = false; errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
}

async function removeHeroImage() {
  if (!confirm(currentLang === 'lv' ? 'Noņemt profila bildi?' : 'Remove profile image?')) return;
  try {
    const r = await fetch(API + '/api/content/hero-avatar', { method: 'DELETE', headers: authHeaders() });
    const data = await r.json();
    if (!r.ok) { toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    toast(currentLang === 'lv' ? '🗑️ Profila bilde noņemta' : '🗑️ Profile image removed', 'ok');
    closeModal('hero-img-modal');
    await loadContent();
  } catch (e) { toast('❌ Servera kļūda', 'err'); }
}

function openBgModal() {
  const c = window._content || {};
  document.getElementById('f-bgImage').value = '';
  document.getElementById('f-bgPosition').value = c.bgPosition || 'center';
  document.getElementById('f-bgSize').value = c.bgSize || 'cover';
  const ov = c.bgOverlayOpacity !== undefined && c.bgOverlayOpacity !== '' ? c.bgOverlayOpacity : '0.4';
  document.getElementById('f-bgOverlay').value = ov;
  document.getElementById('bg-overlay-val').textContent = Math.round(ov * 100) + '%';
  document.getElementById('f-bgInterval').value = c.bgSlideInterval || '6';
  document.getElementById('bg-err').textContent = '';
  document.getElementById('bg-settings-ok').textContent = '';
  document.getElementById('bg-upload-progress').innerHTML = '';
  renderBgSlidesAdmin();
  showModal('bg-modal');
}

async function renderBgSlidesAdmin() {
  const listEl = document.getElementById('bg-slides-list');
  listEl.innerHTML = currentLang === 'lv' ? 'Ielādē...' : 'Loading...';
  try {
    const r = await fetch(API + '/api/content/bg-slides');
    const { slides } = await r.json();
    window._bgSlides = slides;
    if (!slides.length) {
      listEl.innerHTML = `<p class="empty-msg">${currentLang === 'lv' ? 'Vēl nav pievienota neviena fona bilde.' : 'No background images added yet.'}</p>`;
      return;
    }
    listEl.innerHTML = slides.map(s => `
      <div class="bg-slide-item">
        <img src="${s.url}" alt="">
        <button class="btn danger" onclick="deleteBgSlide('${s._id}')">✕</button>
      </div>
    `).join('');
  } catch (e) { listEl.innerHTML = ''; }
}

async function uploadBgSlides() {
  const errEl = document.getElementById('bg-err');
  errEl.textContent = '';
  const files = Array.from(document.getElementById('f-bgImage').files);
  if (!files.length) { errEl.textContent = currentLang === 'lv' ? 'Izvēlies vismaz vienu bildi' : 'Choose at least one image'; return; }
  const progressEl = document.getElementById('bg-upload-progress');
  progressEl.innerHTML = '';
  const btn = document.getElementById('bg-upload-btn');
  btn.disabled = true;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const line = document.createElement('div');
    line.textContent = `⏳ (${i + 1}/${files.length}) ${file.name}...`;
    progressEl.appendChild(line);
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(API + '/api/content/bg-slides', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await r.json();
      line.textContent = r.ok ? `✅ ${file.name}` : `❌ ${file.name} — ${data.error || 'kļūda'}`;
    } catch (e) { line.textContent = `❌ ${file.name} — servera kļūda`; }
  }

  btn.disabled = false;
  document.getElementById('f-bgImage').value = '';
  await renderBgSlidesAdmin();
  await loadBgSlideshow();
  toast(currentLang === 'lv' ? '✅ Fona bildes atjauninātas!' : '✅ Background images updated!', 'ok');
}

async function deleteBgSlide(id) {
  if (!confirm(currentLang === 'lv' ? 'Dzēst šo fona bildi?' : 'Delete this background image?')) return;
  await fetch(API + '/api/content/bg-slides/' + id, { method: 'DELETE', headers: authHeaders() });
  await renderBgSlidesAdmin();
  await loadBgSlideshow();
}

async function saveBgSettings() {
  const okEl = document.getElementById('bg-settings-ok');
  const errEl = document.getElementById('bg-err');
  okEl.textContent = ''; errEl.textContent = '';
  const body = {
    position: document.getElementById('f-bgPosition').value,
    size: document.getElementById('f-bgSize').value,
    overlayOpacity: document.getElementById('f-bgOverlay').value,
    interval: document.getElementById('f-bgInterval').value,
  };
  try {
    const r = await fetch(API + '/api/content/bg-settings', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    okEl.textContent = currentLang === 'lv' ? 'Saglabāts!' : 'Saved!';
    toast(currentLang === 'lv' ? '✅ Fona iestatījumi saglabāti!' : '✅ Background settings saved!', 'ok');
    await loadContent();
    await loadBgSlideshow();
  } catch (e) { errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
}

// ══════════════════════════════════════════════════
//  FONA SLAIDRĀDE (publiskā puse — 1 vai vairākas bildes ar crossfade)
// ══════════════════════════════════════════════════
let bgSlideTimer = null;
let bgSlideIndex = 0;
let bgActiveLayer = 'a';

async function loadBgSlideshow() {
  try {
    const r = await fetch(API + '/api/content/bg-slides');
    const { slides } = await r.json();
    window._bgSlides = slides || [];
    startBgSlideshow();
  } catch (e) {}
}

function applyBgLayerStyle(el) {
  const c = window._content || {};
  el.style.backgroundSize = c.bgSize || 'cover';
  el.style.backgroundPosition = c.bgPosition || 'center';
}

function startBgSlideshow() {
  const layerA = document.getElementById('site-bg-a');
  const layerB = document.getElementById('site-bg-b');
  const overlayEl = document.getElementById('site-bg-overlay');
  const slides = window._bgSlides || [];

  if (bgSlideTimer) { clearInterval(bgSlideTimer); bgSlideTimer = null; }

  if (!slides.length) {
    layerA.classList.remove('active');
    layerB.classList.remove('active');
    overlayEl.classList.remove('show');
    return;
  }

  const c = window._content || {};
  const opacity = c.bgOverlayOpacity !== undefined && c.bgOverlayOpacity !== '' ? c.bgOverlayOpacity : '0.4';
  overlayEl.style.background = `rgba(6,6,10,${opacity})`;
  overlayEl.classList.add('show');

  bgSlideIndex = 0;
  bgActiveLayer = 'a';
  applyBgLayerStyle(layerA);
  applyBgLayerStyle(layerB);
  layerA.style.backgroundImage = `url('${slides[0].url}')`;
  layerA.classList.add('active');
  layerB.classList.remove('active');

  if (slides.length > 1) {
    const seconds = parseInt(c.bgSlideInterval, 10) || 6;
    bgSlideTimer = setInterval(() => advanceBgSlide(), seconds * 1000);
  }
}

function advanceBgSlide() {
  const slides = window._bgSlides || [];
  if (!slides.length) return;
  bgSlideIndex = (bgSlideIndex + 1) % slides.length;
  const showingEl = document.getElementById(bgActiveLayer === 'a' ? 'site-bg-b' : 'site-bg-a');
  const hidingEl = document.getElementById(bgActiveLayer === 'a' ? 'site-bg-a' : 'site-bg-b');
  applyBgLayerStyle(showingEl);
  showingEl.style.backgroundImage = `url('${slides[bgSlideIndex].url}')`;
  showingEl.classList.add('active');
  hidingEl.classList.remove('active');
  bgActiveLayer = bgActiveLayer === 'a' ? 'b' : 'a';
}

document.getElementById('content-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('content-err');
  const okEl = document.getElementById('content-ok');
  const submitBtn = e.target.querySelector('button[type="submit"]');
  errEl.textContent = ''; okEl.textContent = '';

  // ── Garantēta tulkošana PIRMS saglabāšanas ──
  // Ja lietotājs uzrakstīja tikai LV (vai tikai EN) un uzreiz spiež "Saglabāt"
  // (bez klikšķa citur, kas parasti izraisa auto-tulkošanu), pārliecināmies,
  // ka trūkstošā valoda tomēr tiek pārtulkota — lai NEKAD nebūtu jāraksta pašam.
  const pairs = ['tagline', 'heroTitle', 'heroSubtitle', 'aboutText'];
  const missing = pairs.filter(key => {
    const lv = document.getElementById('f-' + key + '_lv').value.trim();
    const en = document.getElementById('f-' + key + '_en').value.trim();
    return (lv && !en) || (en && !lv);
  });
  if (missing.length) {
    submitBtn.disabled = true;
    submitBtn.textContent = currentLang === 'lv' ? 'Tulkoju...' : 'Translating...';
    try {
      for (const key of missing) {
        const lvEl = document.getElementById('f-' + key + '_lv');
        const enEl = document.getElementById('f-' + key + '_en');
        if (lvEl.value.trim() && !enEl.value.trim()) {
          enEl.value = await callTranslateApi(lvEl.value.trim(), 'lv', 'en');
          enEl.classList.add('auto-translated');
        } else if (enEl.value.trim() && !lvEl.value.trim()) {
          lvEl.value = await callTranslateApi(enEl.value.trim(), 'en', 'lv');
          lvEl.classList.add('auto-translated');
        }
      }
    } catch (err) {
      toast(currentLang === 'lv' ? '⚠️ Automātiskā tulkošana neizdevās — pārbaudi tekstu pats' : '⚠️ Auto-translate failed — please check the text', 'err');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = currentLang === 'lv' ? 'Saglabāt' : 'Save';
    }
  }

  const body = {
    siteTitle: document.getElementById('f-siteTitle').value,
    heroTitleColor: document.getElementById('f-heroTitleColor').value,
    heroSubtitleColor: document.getElementById('f-heroSubtitleColor').value,
    aboutTextColor: document.getElementById('f-aboutTextColor').value,
    contactEmail: document.getElementById('f-contactEmail').value,
    socialLink: document.getElementById('f-socialLink').value,
  };
  pairs.forEach(key => {
    body[key + '_lv'] = document.getElementById('f-' + key + '_lv').value;
    body[key + '_en'] = document.getElementById('f-' + key + '_en').value;
  });
  try {
    const r = await fetch(API + '/api/content', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    okEl.textContent = currentLang === 'lv' ? 'Saglabāts!' : 'Saved!';
    toast(currentLang === 'lv' ? '✅ Teksts saglabāts!' : '✅ Text saved!', 'ok');
    await loadContent();
  } catch (e) { errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
});

// ══════════════════════════════════════════════════
//  GALERIJA (bildes + kategorijas)
// ══════════════════════════════════════════════════
let galleryItems = [];

async function loadGallery() {
  const r = await fetch(API + '/api/gallery');
  const data = await r.json();
  galleryItems = data.items || [];
  renderCatTabs();
  renderGallery();
}

function renderCatTabs() {
  const tabsEl = document.getElementById('cat-tabs');
  const cats = [...new Set(galleryItems.map(it => it.category || 'Citas'))];
  if (!cats.length) { tabsEl.innerHTML = ''; return; }
  const allLabel = t('filter_all');
  let html = `<button class="cat-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="setCategory('all')">${escapeHtml(allLabel)}</button>`;
  html += cats.map(c => `<button class="cat-tab ${currentCategory === c ? 'active' : ''}" onclick="setCategory('${escapeAttr(c)}')">${escapeHtml(c)}</button>`).join('');
  tabsEl.innerHTML = html;
  // atjauno kategoriju sarakstu augšupielādes formā
  document.getElementById('cat-list').innerHTML = cats.map(c => `<option value="${escapeAttr(c)}">`).join('');
}

function setCategory(cat) { currentCategory = cat; renderCatTabs(); renderGallery(); }

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  const items = currentCategory === 'all' ? galleryItems : galleryItems.filter(it => (it.category || 'Citas') === currentCategory);
  if (!items.length) { grid.innerHTML = `<p class="empty-msg">${escapeHtml(t('gallery_empty'))}</p>`; return; }
  grid.innerHTML = items.map(it => `
    <div class="gallery-item">
      <img src="${it.url}" alt="${escapeAttr(it.caption)}" loading="lazy">
      ${it.caption ? `<div class="cap">${escapeHtml(it.caption)}</div>` : ''}
      <button class="btn sm danger del admin-only" style="display:none" onclick="deleteGalleryItem('${it._id}')">✕</button>
    </div>
  `).join('');
  if (isAdmin) document.querySelectorAll('#gallery-grid .admin-only').forEach(el => el.style.display = '');
}

function openGalleryModal() {
  document.getElementById('gallery-form').reset();
  document.getElementById('gallery-err').textContent = '';
  showModal('gallery-modal');
}

document.getElementById('gallery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('gallery-err');
  errEl.textContent = '';
  const file = document.getElementById('g-file').files[0];
  if (!file) { errEl.textContent = 'Izvēlies bildi'; return; }
  const fd = new FormData();
  fd.append('image', file);
  fd.append('caption', document.getElementById('g-caption').value);
  fd.append('category', document.getElementById('g-category').value);
  try {
    const r = await fetch(API + '/api/gallery', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    closeModal('gallery-modal');
    toast(currentLang === 'lv' ? '✅ Bilde pievienota!' : '✅ Photo added!', 'ok');
    await loadGallery();
  } catch (e) { errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
});

async function deleteGalleryItem(id) {
  if (!confirm('Dzēst šo bildi?')) return;
  await fetch(API + '/api/gallery/' + id, { method: 'DELETE', headers: authHeaders() });
  toast(currentLang === 'lv' ? '🗑️ Bilde dzēsta' : '🗑️ Photo deleted', 'ok');
  await loadGallery();
}

// ══════════════════════════════════════════════════
//  MŪZIKA (+ drag & drop secības maiņa)
// ══════════════════════════════════════════════════
let draggedId = null;
let currentTrackId = null;

async function loadTracks() {
  const r = await fetch(API + '/api/tracks');
  const { tracks } = await r.json();
  window._tracks = tracks;
  renderTracks();
}

function trackItemHtml(t2, isAdmin, num) {
  const lastPlayedId = localStorage.getItem('sp_last_played');
  const isLastPlayed = lastPlayedId && t2._id === lastPlayedId && t2._id !== currentTrackId;
  return `
    <div class="track ${t2._id === currentTrackId ? 'playing' : ''}" data-id="${t2._id}" draggable="${isAdmin}" onclick="playTrack('${t2._id}')">
      ${isAdmin ? '<span class="drag-handle">⠿</span>' : ''}
      ${num ? `<span class="track-num">${num}</span>` : ''}
      <img class="cover" src="${t2.coverUrl || ''}" onerror="this.style.visibility='hidden'" alt="">
      <div class="meta">
        <div class="t">${escapeHtml(t2.title)}${t2.genre ? `<span class="genre-tag">${escapeHtml(t2.genre)}</span>` : ''}${isLastPlayed ? `<span class="last-played-tag" title="${currentLang === 'lv' ? 'Pēdējā klausītā' : 'Last played'}">🕐 ${currentLang === 'lv' ? 'pēdējā' : 'last'}</span>` : ''}</div>
        <div class="a">${escapeHtml(t2.artist || '')}${isAdmin ? `<span class="play-count" title="${currentLang === 'lv' ? 'Noklausīšanās skaits' : 'Play count'}">▶ ${t2.playCount || 0}</span>` : ''}</div>
      </div>
      <span class="play-ic">${t2._id === currentTrackId ? '⏸' : '▶'}</span>
      <button class="btn sm dl-track" title="${currentLang === 'lv' ? 'Lejupielādēt' : 'Download'}" onclick="event.stopPropagation();downloadTrack('${t2._id}')">⬇</button>
      <button class="btn sm danger del admin-only" style="display:none" onclick="event.stopPropagation();deleteTrack('${t2._id}')">✕</button>
    </div>
  `;
}

// Cloudinary URL pārveidošana lejupielādes saitē: pievieno fl_attachment karodziņu,
// lai serveris atbild ar Content-Disposition: attachment (pārlūks failu lejupielādē,
// nevis atskaņo/atver to jaunā cilnē).
function cloudinaryDownloadUrl(url, filename) {
  if (!url) return url;
  const marker = '/upload/';
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const safeName = (filename || 'dziesma').replace(/[^\w\s\-()]/g, '').trim().replace(/\s+/g, '_').slice(0, 80);
  const flag = 'fl_attachment:' + encodeURIComponent(safeName || 'dziesma');
  return url.slice(0, idx + marker.length) + flag + '/' + url.slice(idx + marker.length);
}

function downloadTrack(id) {
  const tracks = window._tracks || [];
  const track = tracks.find(t2 => t2._id === id);
  if (!track || !track.cloudUrl) return;
  const filename = (track.artist ? track.artist + ' - ' : '') + track.title;
  const url = cloudinaryDownloadUrl(track.cloudUrl, filename);
  window.open(url, '_blank');
}

function downloadCurrentTrack() {
  if (!currentTrackId) { toast(currentLang === 'lv' ? 'Nav izvēlēta dziesma' : 'No track selected', 'err'); return; }
  downloadTrack(currentTrackId);
}

const NEW_TRACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 1 nedēļa

// ── Skata pārslēgšana: saraksts / režģis ──
let trackViewMode = localStorage.getItem('sp_track_view') || 'list';

function applyTrackViewMode() {
  const isGrid = trackViewMode === 'grid';
  document.getElementById('track-list').classList.toggle('grid-view', isGrid);
  document.getElementById('new-track-list').classList.toggle('grid-view', isGrid);
  const btn = document.getElementById('view-toggle-btn');
  if (btn) btn.textContent = isGrid ? '📃 Saraksts' : '🔲 Režģis';
}

function toggleTrackView() {
  trackViewMode = trackViewMode === 'grid' ? 'list' : 'grid';
  localStorage.setItem('sp_track_view', trackViewMode);
  applyTrackViewMode();
}

function renderTracks() {
  const tracks = window._tracks || [];
  const list = document.getElementById('track-list');
  document.getElementById('drag-hint').style.display = isAdmin ? '' : 'none';

  // ── Šīs nedēļas jaunumi ──
  const now = Date.now();
  const newTracks = tracks
    .filter(t2 => t2.createdAt && (now - new Date(t2.createdAt).getTime()) < NEW_TRACK_WINDOW_MS)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const newWrap = document.getElementById('new-tracks-wrap');
  const newList = document.getElementById('new-track-list');
  const allHeading = document.getElementById('all-tracks-heading');
  if (newTracks.length) {
    newWrap.style.display = '';
    allHeading.style.display = '';
    newList.innerHTML = newTracks.map(t2 => trackItemHtml(t2, isAdmin, tracks.findIndex(x => x._id === t2._id) + 1)).join('');
  } else {
    newWrap.style.display = 'none';
    allHeading.style.display = tracks.length ? 'none' : ''; // ja vispār nav dziesmu, tik un tā parādi virsrakstu ar tukšu ziņu
  }

  // ── Visas dziesmas ──
  if (!tracks.length) { list.innerHTML = `<p class="empty-msg">${escapeHtml(t('music_empty'))}</p>`; return; }
  list.innerHTML = tracks.map((t2, idx) => trackItemHtml(t2, isAdmin, idx + 1)).join('');
  applyTrackViewMode();

  if (isAdmin) {
    document.querySelectorAll('#track-list .admin-only, #new-track-list .admin-only').forEach(el => el.style.display = '');
    attachDragHandlers();
  }
}

function attachDragHandlers() {
  const items = document.querySelectorAll('#track-list .track');
  items.forEach(el => {
    el.addEventListener('dragstart', () => { draggedId = el.dataset.id; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); document.querySelectorAll('.track').forEach(x => x.classList.remove('drag-over')); });
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => { el.classList.remove('drag-over'); });
    el.addEventListener('drop', async (e) => {
      e.preventDefault();
      el.classList.remove('drag-over');
      const targetId = el.dataset.id;
      if (!draggedId || draggedId === targetId) return;
      const tracks = window._tracks;
      const fromIdx = tracks.findIndex(x => x._id === draggedId);
      const toIdx = tracks.findIndex(x => x._id === targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = tracks.splice(fromIdx, 1);
      tracks.splice(toIdx, 0, moved);
      renderTracks();
      try {
        await fetch(API + '/api/tracks/reorder', {
          method: 'PUT', headers: { 'Content-Type': 'application/json', ...authHeaders() },
          body: JSON.stringify({ order: tracks.map(x => x._id) }),
        });
      } catch (e2) {}
    });
  });
}

function playTrack(id) {
  const tracks = window._tracks || [];
  const track = tracks.find(t2 => t2._id === id);
  if (!track) return;
  currentTrackId = id;
  document.querySelectorAll('.track').forEach(el => {
    const isThis = el.dataset.id === id;
    el.classList.toggle('playing', isThis);
    const icon = el.querySelector('.play-ic');
    if (icon) icon.textContent = isThis ? '⏸' : '▶';
  });
  const bar = document.getElementById('player-bar');
  bar.classList.add('show');
  document.getElementById('pb-title').textContent = track.title;
  document.getElementById('pb-artist').textContent = track.artist || '';
  document.getElementById('pb-cover').src = track.coverUrl || '';
  const audio = document.getElementById('pb-audio');
  audio.src = track.cloudUrl;
  audio.play().catch(() => {});
  localStorage.setItem('sp_last_played', id);

  // Klausīšanās skaitītājs — vienreiz uz katru dziesmas izvēli (nevis katru
  // pauzes/atsākšanas reizi). "Fire and forget" — neietekmē atskaņošanu, ja neizdodas.
  fetch(API + '/api/tracks/' + id + '/play', { method: 'POST' }).catch(() => {});
}

function playAdjacentTrack(dir) {
  const tracks = window._tracks || [];
  if (!tracks.length || !currentTrackId) return;
  const idx = tracks.findIndex(t2 => t2._id === currentTrackId);
  if (idx < 0) return;
  if (shuffleOn && tracks.length > 1) {
    let randIdx;
    do { randIdx = Math.floor(Math.random() * tracks.length); } while (randIdx === idx);
    playTrack(tracks[randIdx]._id);
    return;
  }
  const nextIdx = (idx + dir + tracks.length) % tracks.length;
  playTrack(tracks[nextIdx]._id);
}

// ── Shuffle / Repeat ──
let shuffleOn = false;
let repeatMode = 'off'; // 'off' | 'all' | 'one'
const pbShuffleBtn = document.getElementById('pb-shuffle');
const pbRepeatBtn = document.getElementById('pb-repeat');
pbShuffleBtn.addEventListener('click', () => {
  shuffleOn = !shuffleOn;
  pbShuffleBtn.classList.toggle('active', shuffleOn);
});
pbRepeatBtn.addEventListener('click', () => {
  repeatMode = repeatMode === 'off' ? 'all' : repeatMode === 'all' ? 'one' : 'off';
  pbRepeatBtn.classList.toggle('active', repeatMode !== 'off');
  pbRepeatBtn.textContent = repeatMode === 'one' ? '🔂' : '🔁';
  pbRepeatBtn.title = repeatMode === 'off' ? 'Atkārtot: izslēgts' : repeatMode === 'all' ? 'Atkārtot: visas' : 'Atkārtot: vienu';
});

// ── Custom player vadība ──
const pbAudio = document.getElementById('pb-audio');
const pbPlayBtn = document.getElementById('pb-playpause');
const pbProgress = document.getElementById('pb-progress');
const pbProgressFill = document.getElementById('pb-progress-fill');
const pbProgressHandle = document.getElementById('pb-progress-handle');
const pbCurrentEl = document.getElementById('pb-current');
const pbDurationEl = document.getElementById('pb-duration');
const pbVolumeSlider = document.getElementById('pb-volume-slider');
const pbVolIcon = document.getElementById('pb-vol-icon');

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

pbPlayBtn.addEventListener('click', () => {
  if (pbAudio.paused) pbAudio.play().catch(() => {});
  else pbAudio.pause();
});
document.getElementById('pb-prev').addEventListener('click', () => playAdjacentTrack(-1));
document.getElementById('pb-next').addEventListener('click', () => playAdjacentTrack(1));

pbAudio.addEventListener('play', () => {
  pbPlayBtn.textContent = '⏸';
  const el = document.querySelector(`.track[data-id="${currentTrackId}"] .play-ic`);
  if (el) el.textContent = '⏸';
  const wf = document.getElementById('pb-waveform');
  if (wf) wf.classList.add('playing');
  document.getElementById('pb-cover').classList.add('pulsing');
});
pbAudio.addEventListener('pause', () => {
  pbPlayBtn.textContent = '▶';
  const el = document.querySelector(`.track[data-id="${currentTrackId}"] .play-ic`);
  if (el) el.textContent = '▶';
  const wf = document.getElementById('pb-waveform');
  if (wf) wf.classList.remove('playing');
  document.getElementById('pb-cover').classList.remove('pulsing');
});
pbAudio.addEventListener('ended', () => {
  if (repeatMode === 'one') { pbAudio.currentTime = 0; pbAudio.play().catch(() => {}); return; }
  playAdjacentTrack(1);
});

pbAudio.addEventListener('loadedmetadata', () => {
  pbDurationEl.textContent = formatTime(pbAudio.duration);
});
pbAudio.addEventListener('timeupdate', () => {
  if (!pbAudio.duration) return;
  const pct = (pbAudio.currentTime / pbAudio.duration) * 100;
  pbProgressFill.style.width = pct + '%';
  pbProgressHandle.style.left = pct + '%';
  pbCurrentEl.textContent = formatTime(pbAudio.currentTime);
});

let isSeeking = false;
function seekFromEvent(e) {
  const rect = pbProgress.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  if (pbAudio.duration) {
    pbAudio.currentTime = pct * pbAudio.duration;
    pbProgressFill.style.width = (pct * 100) + '%';
    pbProgressHandle.style.left = (pct * 100) + '%';
  }
}
pbProgress.addEventListener('mousedown', (e) => { isSeeking = true; seekFromEvent(e); });
window.addEventListener('mousemove', (e) => { if (isSeeking) seekFromEvent(e); });
window.addEventListener('mouseup', () => { isSeeking = false; });
pbProgress.addEventListener('touchstart', (e) => { isSeeking = true; seekFromEvent(e); });
pbProgress.addEventListener('touchmove', (e) => { if (isSeeking) seekFromEvent(e); });
pbProgress.addEventListener('touchend', () => { isSeeking = false; });

pbVolumeSlider.addEventListener('input', () => {
  pbAudio.volume = pbVolumeSlider.value;
  pbVolIcon.textContent = pbAudio.volume == 0 ? '🔇' : pbAudio.volume < 0.5 ? '🔉' : '🔊';
});

function openTrackModal() {
  document.getElementById('track-form').reset();
  document.getElementById('track-err').textContent = '';
  populateGenreList();
  showModal('track-modal');
}

document.getElementById('t-audio').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const titleEl = document.getElementById('t-title');
  const artistEl = document.getElementById('t-artist');
  const parsed = parseAudioFilename(file.name);
  if (!titleEl.value.trim()) titleEl.value = parsed.title;
  if (!artistEl.value.trim() && parsed.artist) artistEl.value = parsed.artist;
});

function populateGenreList() {
  const genres = [...new Set((window._tracks || []).map(t2 => t2.genre).filter(Boolean))];
  const listEl = document.getElementById('genre-list');
  if (listEl) listEl.innerHTML = genres.map(g => `<option value="${escapeAttr(g)}">`).join('');
}

document.getElementById('track-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('track-err');
  errEl.textContent = '';
  const audioFile = document.getElementById('t-audio').files[0];
  if (!audioFile) { errEl.textContent = 'Izvēlies audio failu'; return; }
  const fd = new FormData();
  fd.append('title', document.getElementById('t-title').value);
  fd.append('artist', document.getElementById('t-artist').value);
  fd.append('genre', document.getElementById('t-genre').value);
  fd.append('audio', audioFile);
  const coverFile = document.getElementById('t-cover').files[0];
  if (coverFile) fd.append('cover', coverFile);
  try {
    const r = await fetch(API + '/api/tracks', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    closeModal('track-modal');
    if (data.coverFromId3) {
      toast(currentLang === 'lv' ? '✅ Dziesma pievienota! 🖼️ Vāka bilde automātiski atrasta failā' : '✅ Track added! 🖼️ Cover art found in file', 'ok');
    } else {
      toast(currentLang === 'lv' ? '✅ Dziesma pievienota!' : '✅ Track added!', 'ok');
    }
    await loadTracks();
  } catch (e) { errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
});

async function deleteTrack(id) {
  if (!confirm('Dzēst šo dziesmu?')) return;
  await fetch(API + '/api/tracks/' + id, { method: 'DELETE', headers: authHeaders() });
  toast(currentLang === 'lv' ? '🗑️ Dziesma dzēsta' : '🗑️ Track deleted', 'ok');
  await loadTracks();
}

// ── Vairāku dziesmu augšupielāde uzreiz ──
function openBulkModal() {
  document.getElementById('bulk-form').reset();
  document.getElementById('bulk-err').textContent = '';
  document.getElementById('bulk-progress').innerHTML = '';
  document.getElementById('bulk-submit-btn').disabled = false;
  populateGenreList();
  showModal('bulk-modal');
}

// ══════════════════════════════════════════════════
//  Gudra failu nosaukumu atpazīšana (bulk augšupielādei un
//  vienas dziesmas augšupielādes noklusējuma nosaukumam)
// ══════════════════════════════════════════════════

// Frāzes, kas bieži sastopamas lejupielādētu dziesmu nosaukumos, bet nav
// daļa no īstā dziesmas nosaukuma — tās izņemam pilnībā.
const FILENAME_JUNK_PATTERNS = [
  /\(\s*official\s*(music\s*)?video\s*\)/gi,
  /\(\s*official\s*audio\s*\)/gi,
  /\(\s*official\s*\)/gi,
  /\(\s*lyrics?\s*(video)?\s*\)/gi,
  /\(\s*audio\s*\)/gi,
  /\(\s*visualizer\s*\)/gi,
  /\(\s*hq\s*\)/gi, /\(\s*hd\s*\)/gi, /\(\s*4k\s*\)/gi,
  /\(\s*explicit\s*\)/gi, /\(\s*clean\s*(version)?\s*\)/gi,
  /\(\s*remaster(ed)?(\s*\d{4})?\s*\)/gi,
  /\[[^\]]*\]/g, // jebkas kvadrātiekavās (piem. [Official], [Music Video], [4K])
];

// Vārdi, kam paliek mazie burti, ja tie NAV nosaukuma pirmajā vietā
// (latviešu un angļu īsie saikļi/prievārdi)
const TITLE_CASE_LOWERCASE_WORDS = new Set([
  'un', 'ar', 'no', 'uz', 'pie', 'par', 'kā', 'vai', 'bet', 'ir', 'the', 'of', 'in', 'on',
  'a', 'an', 'and', 'or', 'to', 'for', 'ft', 'feat',
]);

function smartTitleCase(str) {
  return str.split(' ').map((word, idx) => {
    if (!word) return word;
    // saglabā jau esošus lielos burtus, ja tas izskatās pēc saīsinājuma (DJ, MC, III...)
    if (word.length <= 4 && word === word.toUpperCase() && /[A-ZĀČĒĢĪĶĻŅŠŪŽ]/.test(word)) return word;
    const lower = word.toLowerCase();
    if (idx > 0 && TITLE_CASE_LOWERCASE_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(' ');
}

// Atpazīst "Izpildītājs - Nosaukums.mp3" formātu un iztīra sēraini failu
// nosaukumus (numuru prefiksus, liekus iekavu tekstus, pasvītrojumus u.c.)
function parseAudioFilename(rawName) {
  let name = rawName.replace(/\.[^/.]+$/, ''); // noņem paplašinājumu
  try { name = decodeURIComponent(name); } catch (e) {} // piem. %20 -> atstarpe

  FILENAME_JUNK_PATTERNS.forEach(re => { name = name.replace(re, ''); });

  name = name.replace(/[_]+/g, ' '); // pasvītrojumi -> atstarpes
  name = name.replace(/^\s*\(?\d{1,3}\)?[\s._\-]+/, ''); // noņem sākuma celiņa numuru, piem. "01 - ", "01."
  name = name.replace(/\s{2,}/g, ' ').trim();
  name = name.replace(/^[\s\-._]+|[\s\-._]+$/g, ''); // liekas atstarpes/domuzīmes malās

  let artist = '';
  let title = name;

  // "Izpildītājs - Nosaukums" — sadala tikai pēc PIRMĀS " - ", lai nesabojātu
  // nosaukumus, kuros domuzīme ir daļa no paša nosaukuma
  const dashMatch = name.match(/^(.+?)\s+-\s+(.+)$/);
  if (dashMatch && dashMatch[1].length <= 40) {
    artist = dashMatch[1].trim();
    title = dashMatch[2].trim();
  }

  title = smartTitleCase(title);
  artist = smartTitleCase(artist);

  return { title: title || 'Nezināms nosaukums', artist };
}

// Apstrādā vairākus elementus VIENLAICĪGI (ierobežots skaits uzreiz), nevis
// vienu pēc otra — tas ievērojami paātrina daudzu failu augšupielādi.
async function processWithConcurrency(items, worker, concurrency) {
  let idx = 0;
  async function runNext() {
    while (idx < items.length) {
      const current = idx++;
      await worker(items[current], current);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runNext);
  await Promise.all(workers);
}

document.getElementById('bulk-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('bulk-err');
  const progressEl = document.getElementById('bulk-progress');
  const submitBtn = document.getElementById('bulk-submit-btn');
  errEl.textContent = '';
  progressEl.innerHTML = '';
  const files = Array.from(document.getElementById('b-files').files);
  if (!files.length) { errEl.textContent = 'Izvēlies vismaz vienu failu'; return; }
  const artist = document.getElementById('b-artist').value;
  const genre = document.getElementById('b-genre').value;

  submitBtn.disabled = true;
  let okCount = 0, errCount = 0, dupCount = 0, coverFoundCount = 0;

  // Visas rindiņas izveidojam UZREIZ (pareizā secībā), lai progress saraksts
  // paliktu pārskatāms, pat ja faili paralēli pabeidzas citā secībā.
  const lines = files.map((file, i) => {
    const parsed = parseAudioFilename(file.name);
    const trackArtist = artist.trim() || parsed.artist;
    const line = document.createElement('div');
    line.textContent = `⏳ (${i + 1}/${files.length}) ${trackArtist ? trackArtist + ' - ' : ''}${parsed.title}...`;
    progressEl.appendChild(line);
    return { line, title: parsed.title, trackArtist };
  });

  await processWithConcurrency(files, async (file, i) => {
    const { line, title, trackArtist } = lines[i];
    const fd = new FormData();
    fd.append('title', title);
    fd.append('artist', trackArtist);
    fd.append('genre', genre);
    fd.append('audio', file);
    try {
      const r = await fetch(API + '/api/tracks', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await r.json();
      if (r.ok) {
        line.textContent = data.coverFromId3 ? `✅ ${trackArtist ? trackArtist + ' - ' : ''}${title} 🖼️` : `✅ ${trackArtist ? trackArtist + ' - ' : ''}${title}`;
        line.className = 'line-ok';
        okCount++;
        if (data.coverFromId3) coverFoundCount++;
      } else if (r.status === 409) {
        line.textContent = `⏭️ ${title} — jau ir augšupielādēta (izlaists dublikāts)`;
        line.className = 'line-err';
        dupCount++;
      } else {
        line.textContent = `❌ ${title} — ${data.error || 'kļūda'}`;
        line.className = 'line-err';
        errCount++;
      }
    } catch (err) {
      line.textContent = `❌ ${title} — servera kļūda`;
      line.className = 'line-err';
      errCount++;
    }
    progressEl.scrollTop = progressEl.scrollHeight;
  }, 3); // 3 faili vienlaicīgi — līdzsvars starp ātrumu un servera slodzi

  submitBtn.disabled = false;
  await loadTracks();
  const summary = currentLang === 'lv'
    ? `Pievienotas ${okCount} dziesmas` + (coverFoundCount ? ` (${coverFoundCount} ar auto-atrastu vāku 🖼️)` : '') + (dupCount ? `, ${dupCount} dublikāti izlaisti` : '') + (errCount ? `, ${errCount} neizdevās` : '')
    : `Added ${okCount} tracks` + (coverFoundCount ? ` (${coverFoundCount} with auto-found cover 🖼️)` : '') + (dupCount ? `, ${dupCount} duplicates skipped` : '') + (errCount ? `, ${errCount} failed` : '');
  toast(((errCount || dupCount) ? '⚠️ ' : '✅ ') + summary, (errCount || dupCount) ? 'err' : 'ok');
});

// ══════════════════════════════════════════════════
//  ČATS
// ══════════════════════════════════════════════════
const socket = io();
const chatMsgsEl = document.getElementById('chat-msgs');
let chatPanelOpen = false;
let chatUnreadCount = 0;

function toggleChatPanel(forceOpen) {
  chatPanelOpen = typeof forceOpen === 'boolean' ? forceOpen : !chatPanelOpen;
  document.getElementById('chat-panel').classList.toggle('show', chatPanelOpen);
  if (chatPanelOpen) {
    chatUnreadCount = 0;
    updateChatBadge();
    chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
  }
}

function updateChatBadge() {
  const badge = document.getElementById('chat-badge');
  if (chatUnreadCount > 0) { badge.textContent = chatUnreadCount > 9 ? '9+' : chatUnreadCount; badge.style.display = 'flex'; }
  else { badge.style.display = 'none'; }
}

function renderChatMsg(m) {
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.dataset.msgId = m.id || '';
  div.dataset.rawText = m.text;
  div.innerHTML = `<b>${escapeHtml(m.name)}:</b> <span class="msg-text">${escapeHtml(m.text)}</span>` +
    `<button type="button" class="msg-translate-btn" title="${currentLang === 'lv' ? 'Iztulkot' : 'Translate'}" onclick="toggleTranslateMsg(this)">T</button>`;
  chatMsgsEl.appendChild(div);
  chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
}

// ── Čata tulkošana ──
// Katrai ziņai — nospiežot "T", parāda/paslēpj tulkojumu uz lietotāja pašreizējo
// valodu (currentLang). Ievades laukam — nospiežot "T", pārtulko UZRAKSTĪTO
// tekstu uz OTRU valodu, lai varētu uzrakstīt savā valodā un nosūtīt saprotamu
// ziņu arī tiem, kas to nezina.
async function toggleTranslateMsg(btn) {
  const line = btn.closest('.chat-line');
  const existing = line.querySelector('.translated-text');
  if (existing) { existing.remove(); return; } // otrreiz nospiežot — paslēpj

  const text = line.dataset.rawText;
  if (!text) return;
  btn.disabled = true;
  try {
    const target = currentLang === 'lv' ? 'lv' : 'en';
    const translated = await callPublicTranslateApi(text, 'auto', target);
    const span = document.createElement('span');
    span.className = 'translated-text';
    span.textContent = '🌐 ' + translated;
    line.appendChild(span);
  } catch (e) {
    toast(currentLang === 'lv' ? 'Tulkošana neizdevās' : 'Translation failed', 'err');
  } finally {
    btn.disabled = false;
  }
}

async function translateChatDraft() {
  const textEl = document.getElementById('chat-text');
  const btn = document.querySelector('.chat-translate-btn');
  const text = textEl.value.trim();
  if (!text) return;
  const target = currentLang === 'lv' ? 'en' : 'lv';
  const source = currentLang === 'lv' ? 'lv' : 'en';
  btn.classList.add('busy');
  try {
    textEl.value = await callPublicTranslateApi(text, source, target);
  } catch (e) {
    toast(currentLang === 'lv' ? 'Tulkošana neizdevās' : 'Translation failed', 'err');
  } finally {
    btn.classList.remove('busy');
  }
}

async function callPublicTranslateApi(text, source, target) {
  const r = await fetch(API + '/api/translate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, source, target }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Tulkošana neizdevās');
  return data.translated;
}

socket.on('chat-history', (history) => {
  chatMsgsEl.innerHTML = '';
  history.forEach(renderChatMsg);
});
socket.on('chat-msg', (m) => {
  renderChatMsg(m);
  if (!chatPanelOpen) { chatUnreadCount++; updateChatBadge(); }
});
socket.on('chat-cleared', () => { chatMsgsEl.innerHTML = ''; });
socket.on('chat-rate-limited', () => {
  toast(currentLang === 'lv' ? '⏳ Pārāk daudz ziņu — pagaidi mirkli' : '⏳ Too many messages — wait a moment', 'err');
});

document.getElementById('chat-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const nameEl = document.getElementById('chat-name');
  const textEl = document.getElementById('chat-text');
  const name = nameEl.value.trim();
  const text = textEl.value.trim();
  if (!name || !text) return;
  localStorage.setItem('sp_chat_name', name);
  socket.emit('chat-msg', { name, text });
  textEl.value = '';
});

async function clearChat() {
  if (!confirm('Notīrīt visu čata vēsturi visiem apmeklētājiem?')) return;
  try {
    const r = await fetch(API + '/api/chat/clear', { method: 'POST' });
    if (!r.ok) { const d = await r.json().catch(() => ({})); toast(d.error || 'Kļūda', 'err'); }
  } catch (e) { toast('Servera kļūda', 'err'); }
}

// ── palīgfunkcijas ──
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function escapeAttr(str) { return escapeHtml(str).replace(/"/g, '&quot;'); }

// ══════════════════════════════════════════════════
//  ATPAKAĻ UZ AUGŠU poga
// ══════════════════════════════════════════════════
const backToTopBtn = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  backToTopBtn.classList.toggle('show', window.scrollY > 400);
});
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════
(async function init() {
  const savedName = localStorage.getItem('sp_chat_name');
  if (savedName) document.getElementById('chat-name').value = savedName;
  applyStaticI18n();
  await checkAdmin();
  await loadContent();
  await loadBgSlideshow();
  await loadGallery();
  await loadTracks();
  registerVisit();
})();

// ══════════════════════════════════════════════════
//  Apmeklējumu skaitītājs
// ══════════════════════════════════════════════════
function registerVisit() {
  // Skaita reizi uz pārlūka cilnes sesiju (nevis katru pārlādi/atsvaidzināšanu),
  // lai skaitlis rupji atspoguļotu apmeklējumus, nevis F5 spiešanu.
  if (sessionStorage.getItem('sp_visit_counted')) return;
  sessionStorage.setItem('sp_visit_counted', '1');
  fetch(API + '/api/visits/ping', { method: 'POST' }).catch(() => {});
}

async function loadVisitCount() {
  try {
    const r = await fetch(API + '/api/visits');
    if (!r.ok) return;
    const data = await r.json();
    const el = document.getElementById('visit-counter');
    const numEl = document.getElementById('visit-count-num');
    if (el && numEl) { numEl.textContent = data.total; el.style.display = 'flex'; }
  } catch (e) {}
}
