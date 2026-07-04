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
let adminToken = localStorage.getItem('sp_admin_token') || null;
let currentLang = localStorage.getItem('sp_lang') || 'lv';
let currentCategory = 'all';

function authHeaders() {
  return adminToken ? { 'Authorization': 'Bearer ' + adminToken } : {};
}

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
    nav_about: 'Par mani', nav_gallery: 'Bildes', nav_music: 'Mūzika', nav_chat: 'Čats',
    admin_bar: '🔧 Admin režīms ieslēgts — vari rediģēt saturu, pievienot bildes un mūziku',
    logout: 'Iziet', edit_text: '✏️ Rediģēt tekstu', about_title: 'Par mani',
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
    new_this_week: '🆕 Šīs nedēļas jaunumi', all_tracks: '🎵 Visas dziesmas',
  },
  en: {
    nav_about: 'About', nav_gallery: 'Gallery', nav_music: 'Music', nav_chat: 'Chat',
    admin_bar: '🔧 Admin mode on — you can edit content, add photos and music',
    logout: 'Log out', edit_text: '✏️ Edit text', about_title: 'About me',
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
    new_this_week: '🆕 New this week', all_tracks: '🎵 All tracks',
  },
};

function t(key) { return (I18N[currentLang] && I18N[currentLang][key]) || I18N.lv[key] || key; }

function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.getElementById('lang-toggle').textContent = currentLang === 'lv' ? 'EN' : 'LV';
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
}

async function checkAdmin() {
  if (!adminToken) { setAdminUI(false); return; }
  try {
    const r = await fetch(API + '/api/admin/check', { headers: authHeaders() });
    if (r.ok) setAdminUI(true);
    else { adminToken = null; localStorage.removeItem('sp_admin_token'); setAdminUI(false); }
  } catch (e) { setAdminUI(false); }
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
    adminToken = data.token;
    localStorage.setItem('sp_admin_token', adminToken);
    closeModal('login-modal');
    setAdminUI(true);
    await loadGallery();
    await loadTracks();
  } catch (e) { errEl.textContent = 'Servera kļūda'; }
});

async function adminLogout() {
  try { await fetch(API + '/api/admin/logout', { method: 'POST', headers: authHeaders() }); } catch (e) {}
  adminToken = null;
  localStorage.removeItem('sp_admin_token');
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
  const tagline = c['tagline_' + L] || c.tagline_lv || '';
  document.getElementById('footer-text').textContent = '© ' + new Date().getFullYear() + ' ' + c.siteTitle + (tagline ? ' — ' + tagline : '');

  const bgEl = document.getElementById('site-bg');
  const overlayEl = document.getElementById('site-bg-overlay');
  if (c.bgImageUrl) {
    document.body.style.backgroundImage = `linear-gradient(rgba(6,6,10,.74), rgba(6,6,10,.74)), url('${c.bgImageUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundRepeat = 'no-repeat';
  } else {
    document.body.style.backgroundImage = '';
    document.body.style.backgroundSize = '';
    document.body.style.backgroundPosition = '';
    document.body.style.backgroundAttachment = '';
    document.body.style.backgroundRepeat = '';
  }
  if (bgEl) bgEl.style.display = 'none';
  if (overlayEl) overlayEl.style.display = 'none';
}

function openContentModal() {
  const c = window._content || {};
  document.getElementById('f-siteTitle').value = c.siteTitle || '';
  document.getElementById('f-heroTitleColor').value = c.heroTitleColor || '#eef2f7';
  document.getElementById('f-heroSubtitleColor').value = c.heroSubtitleColor || '#9aa4b2';
  document.getElementById('f-bgImage').value = '';
  document.getElementById('bg-err').textContent = '';
  refreshBgPreview(c);
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

function refreshBgPreview(c) {
  const preview = document.getElementById('bg-current-preview');
  const removeBtn = document.getElementById('bg-remove-btn');
  if (c.bgImageUrl) {
    preview.innerHTML = `<img src="${c.bgImageUrl}" alt="fona bilde">`;
    removeBtn.style.display = '';
  } else {
    preview.innerHTML = '';
    removeBtn.style.display = 'none';
  }
}

async function uploadBgImage() {
  const errEl = document.getElementById('bg-err');
  errEl.textContent = '';
  const file = document.getElementById('f-bgImage').files[0];
  if (!file) { errEl.textContent = currentLang === 'lv' ? 'Vispirms izvēlies failu' : 'Choose a file first'; return; }
  const fd = new FormData();
  fd.append('bgImage', file);
  const btn = document.getElementById('bg-upload-btn');
  btn.disabled = true;
  try {
    const r = await fetch(API + '/api/content/background', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await r.json();
    btn.disabled = false;
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    toast(currentLang === 'lv' ? '✅ Fona bilde uzstādīta!' : '✅ Background image set!', 'ok');
    document.getElementById('f-bgImage').value = '';
    await loadContent();
    refreshBgPreview(window._content || {});
  } catch (e) { btn.disabled = false; errEl.textContent = 'Servera kļūda'; toast('❌ Servera kļūda', 'err'); }
}

async function removeBgImage() {
  if (!confirm(currentLang === 'lv' ? 'Noņemt fona bildi?' : 'Remove background image?')) return;
  try {
    const r = await fetch(API + '/api/content/background', { method: 'DELETE', headers: authHeaders() });
    const data = await r.json();
    if (!r.ok) { toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    toast(currentLang === 'lv' ? '🗑️ Fona bilde noņemta' : '🗑️ Background image removed', 'ok');
    await loadContent();
    refreshBgPreview(window._content || {});
  } catch (e) { toast('❌ Servera kļūda', 'err'); }
}

document.getElementById('content-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('content-err');
  const okEl = document.getElementById('content-ok');
  errEl.textContent = ''; okEl.textContent = '';
  const body = {
    siteTitle: document.getElementById('f-siteTitle').value,
    heroTitleColor: document.getElementById('f-heroTitleColor').value,
    heroSubtitleColor: document.getElementById('f-heroSubtitleColor').value,
    contactEmail: document.getElementById('f-contactEmail').value,
    socialLink: document.getElementById('f-socialLink').value,
  };
  ['tagline', 'heroTitle', 'heroSubtitle', 'aboutText'].forEach(key => {
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
  if (adminToken) document.querySelectorAll('#gallery-grid .admin-only').forEach(el => el.style.display = '');
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

function trackItemHtml(t2, isAdmin) {
  return `
    <div class="track ${t2._id === currentTrackId ? 'playing' : ''}" data-id="${t2._id}" draggable="${isAdmin}" onclick="playTrack('${t2._id}')">
      ${isAdmin ? '<span class="drag-handle">⠿</span>' : ''}
      <img class="cover" src="${t2.coverUrl || ''}" onerror="this.style.visibility='hidden'" alt="">
      <div class="meta">
        <div class="t">${escapeHtml(t2.title)}</div>
        <div class="a">${escapeHtml(t2.artist || '')}</div>
      </div>
      <span class="play-ic">${t2._id === currentTrackId ? '⏸' : '▶'}</span>
      <button class="btn sm danger del admin-only" style="display:none" onclick="event.stopPropagation();deleteTrack('${t2._id}')">✕</button>
    </div>
  `;
}

const NEW_TRACK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 1 nedēļa

function renderTracks() {
  const tracks = window._tracks || [];
  const list = document.getElementById('track-list');
  const isAdmin = !!adminToken;
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
    newList.innerHTML = newTracks.map(t2 => trackItemHtml(t2, isAdmin)).join('');
  } else {
    newWrap.style.display = 'none';
    allHeading.style.display = tracks.length ? 'none' : ''; // ja vispār nav dziesmu, tik un tā parādi virsrakstu ar tukšu ziņu
  }

  // ── Visas dziesmas ──
  if (!tracks.length) { list.innerHTML = `<p class="empty-msg">${escapeHtml(t('music_empty'))}</p>`; return; }
  list.innerHTML = tracks.map(t2 => trackItemHtml(t2, isAdmin)).join('');

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
}

function playAdjacentTrack(dir) {
  const tracks = window._tracks || [];
  if (!tracks.length || !currentTrackId) return;
  const idx = tracks.findIndex(t2 => t2._id === currentTrackId);
  if (idx < 0) return;
  const nextIdx = (idx + dir + tracks.length) % tracks.length;
  playTrack(tracks[nextIdx]._id);
}

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
});
pbAudio.addEventListener('pause', () => {
  pbPlayBtn.textContent = '▶';
  const el = document.querySelector(`.track[data-id="${currentTrackId}"] .play-ic`);
  if (el) el.textContent = '▶';
});
pbAudio.addEventListener('ended', () => playAdjacentTrack(1));

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
  showModal('track-modal');
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
  fd.append('audio', audioFile);
  const coverFile = document.getElementById('t-cover').files[0];
  if (coverFile) fd.append('cover', coverFile);
  try {
    const r = await fetch(API + '/api/tracks', { method: 'POST', headers: authHeaders(), body: fd });
    const data = await r.json();
    if (!r.ok) { errEl.textContent = data.error || 'Kļūda'; toast('❌ ' + (data.error || 'Kļūda'), 'err'); return; }
    closeModal('track-modal');
    toast(currentLang === 'lv' ? '✅ Dziesma pievienota!' : '✅ Track added!', 'ok');
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
  showModal('bulk-modal');
}

function filenameToTitle(name) {
  return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
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

  submitBtn.disabled = true;
  let okCount = 0, errCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const title = filenameToTitle(file.name);
    const line = document.createElement('div');
    line.textContent = `⏳ (${i + 1}/${files.length}) ${title}...`;
    progressEl.appendChild(line);
    progressEl.scrollTop = progressEl.scrollHeight;

    const fd = new FormData();
    fd.append('title', title);
    fd.append('artist', artist);
    fd.append('audio', file);
    try {
      const r = await fetch(API + '/api/tracks', { method: 'POST', headers: authHeaders(), body: fd });
      const data = await r.json();
      if (r.ok) {
        line.textContent = `✅ ${title}`;
        line.className = 'line-ok';
        okCount++;
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
  }

  submitBtn.disabled = false;
  await loadTracks();
  const summary = currentLang === 'lv'
    ? `Pievienotas ${okCount} dziesmas` + (errCount ? `, ${errCount} neizdevās` : '')
    : `Added ${okCount} tracks` + (errCount ? `, ${errCount} failed` : '');
  toast((errCount ? '⚠️ ' : '✅ ') + summary, errCount ? 'err' : 'ok');
});

// ══════════════════════════════════════════════════
//  ČATS
// ══════════════════════════════════════════════════
const socket = io();
const chatMsgsEl = document.getElementById('chat-msgs');

function renderChatMsg(m) {
  const div = document.createElement('div');
  div.className = 'chat-line';
  div.innerHTML = `<b>${escapeHtml(m.name)}:</b> ${escapeHtml(m.text)}`;
  chatMsgsEl.appendChild(div);
  chatMsgsEl.scrollTop = chatMsgsEl.scrollHeight;
}

socket.on('chat-history', (history) => {
  chatMsgsEl.innerHTML = '';
  history.forEach(renderChatMsg);
});
socket.on('chat-msg', renderChatMsg);
socket.on('chat-cleared', () => { chatMsgsEl.innerHTML = ''; });

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
  socket.emit('chat-clear', adminToken);
}

// ── palīgfunkcijas ──
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}
function escapeAttr(str) { return escapeHtml(str).replace(/"/g, '&quot;'); }

// ══════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════
(async function init() {
  const savedName = localStorage.getItem('sp_chat_name');
  if (savedName) document.getElementById('chat-name').value = savedName;
  applyStaticI18n();
  await checkAdmin();
  await loadContent();
  await loadGallery();
  await loadTracks();
})();
