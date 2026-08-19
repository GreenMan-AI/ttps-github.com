// ═══════════════════════════════════════════════════
//  Admin panelis
// ═══════════════════════════════════════════════════

const AdminState = {
  token: sessionStorage.getItem('pulss_admin_token') || '',
};

function authHeaders(json = true) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (AdminState.token) h['x-admin-token'] = AdminState.token;
  return h;
}

// ── Slepenā aktivizēšana: raksti "tups" jebkur lapā, vai 5x klikšķi uz logo ──
(function bindSecretTrigger() {
  let typed = '';
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    typed = (typed + e.key).slice(-4).toLowerCase();
    if (typed === 'tups') openAdminModal();
  });

  let clicks = 0, clickTimer = null;
  document.addEventListener('DOMContentLoaded', () => {
    const logo = document.getElementById('logo');
    logo?.addEventListener('click', () => {
      clicks++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clicks = 0; }, 1500);
      if (clicks >= 5) { clicks = 0; openAdminModal(); }
    });
  });
})();

function openAdminModal() {
  const modal = document.getElementById('adminModal');
  modal.classList.add('open');
  if (AdminState.token) showAdminPanel(); else showAdminLogin();
}

function closeAdminModal() {
  document.getElementById('adminModal').classList.remove('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('adminModalClose')?.addEventListener('click', closeAdminModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAdminModal();
  });

  document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    const errBox = document.getElementById('adminLoginError');
    errBox.textContent = '';
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { errBox.textContent = i18n.t('admin_login_error'); return; }
      AdminState.token = data.token;
      sessionStorage.setItem('pulss_admin_token', data.token);
      showAdminPanel();
    } catch (e) {
      errBox.textContent = i18n.t('admin_login_error');
    }
  });

  document.getElementById('adminLogoutBtn')?.addEventListener('click', async () => {
    try { await fetch('/api/admin/logout', { method: 'POST', headers: authHeaders() }); } catch (e) {}
    AdminState.token = '';
    sessionStorage.removeItem('pulss_admin_token');
    showAdminLogin();
  });

  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAdminTab(tab.dataset.tab));
  });

  bindUploadForm();
  bindBroadcastForm();
});

function showAdminLogin() {
  document.getElementById('adminLoginView').style.display = '';
  document.getElementById('adminPanelView').style.display = 'none';
}

function showAdminPanel() {
  document.getElementById('adminLoginView').style.display = 'none';
  document.getElementById('adminPanelView').style.display = '';
  switchAdminTab('songs');
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.admin-tabpanel').forEach(p => p.classList.toggle('active', p.id === `adminTab-${tab}`));
  if (tab === 'songs') loadAdminSongTable();
  if (tab === 'broadcast') loadBroadcastHistory();
  if (tab === 'stats') loadAdminStats();
}

// ── DZIESMU PĀRVALDĪBA ──────────────────────────────
async function loadAdminSongTable() {
  const res = await fetch('/api/songs');
  const songs = await res.json();
  const tbody = document.getElementById('adminSongTableBody');
  tbody.innerHTML = '';
  songs.forEach(song => tbody.appendChild(adminSongRow(song)));
  makeTableDraggable(tbody, songs);
}

function adminSongRow(song) {
  const tr = document.createElement('tr');
  tr.draggable = true;
  tr.dataset.id = song._id;
  tr.innerHTML = `
    <td class="drag-handle" title="${i18n.t('drag_to_reorder')}">⠿</td>
    <td class="cell-title">${escapeHtml(song.title)}</td>
    <td class="cell-artist">${escapeHtml(song.artist)}</td>
    <td class="cell-genre">${escapeHtml(song.genre)}</td>
    <td>${song.playCount || 0}</td>
    <td><input type="checkbox" class="trending-toggle" ${song.trending ? 'checked' : ''}></td>
    <td class="row-actions">
      <button class="btn-small edit-btn" data-i18n="edit">${i18n.t('edit')}</button>
      <button class="btn-small danger delete-btn" data-i18n="delete">${i18n.t('delete')}</button>
    </td>
  `;

  tr.querySelector('.trending-toggle').addEventListener('change', async (e) => {
    await fetch(`/api/songs/${song._id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ trending: e.target.checked }),
    });
    loadSongs();
  });

  tr.querySelector('.delete-btn').addEventListener('click', async () => {
    if (!confirm(i18n.t('delete_confirm'))) return;
    await fetch(`/api/songs/${song._id}`, { method: 'DELETE', headers: authHeaders() });
    loadAdminSongTable();
    loadSongs();
  });

  tr.querySelector('.edit-btn').addEventListener('click', () => enterEditMode(tr, song));

  return tr;
}

function enterEditMode(tr, song) {
  tr.querySelector('.cell-title').innerHTML = `<input type="text" class="edit-title" value="${escapeHtml(song.title)}">`;
  tr.querySelector('.cell-artist').innerHTML = `<input type="text" class="edit-artist" value="${escapeHtml(song.artist)}">`;
  tr.querySelector('.cell-genre').innerHTML = `<input type="text" class="edit-genre" value="${escapeHtml(song.genre)}">`;
  const actions = tr.querySelector('.row-actions');
  actions.innerHTML = `
    <button class="btn-small save-btn" data-i18n="save">${i18n.t('save')}</button>
    <button class="btn-small cancel-btn" data-i18n="cancel">${i18n.t('cancel')}</button>
  `;
  actions.querySelector('.save-btn').addEventListener('click', async () => {
    const title = tr.querySelector('.edit-title').value.trim();
    const artist = tr.querySelector('.edit-artist').value.trim();
    const genre = tr.querySelector('.edit-genre').value.trim();
    await fetch(`/api/songs/${song._id}`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ title, artist, genre }),
    });
    loadAdminSongTable();
    loadSongs();
  });
  actions.querySelector('.cancel-btn').addEventListener('click', () => loadAdminSongTable());
}

function makeTableDraggable(tbody, songs) {
  let dragEl = null;
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('dragstart', () => { dragEl = row; row.classList.add('dragging'); });
    row.addEventListener('dragend', async () => {
      row.classList.remove('dragging');
      const order = [...tbody.querySelectorAll('tr')].map(r => r.dataset.id);
      await fetch('/api/songs/reorder/all', {
        method: 'PUT', headers: authHeaders(), body: JSON.stringify({ order }),
      });
      loadSongs();
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      const after = getRowAfter(tbody, e.clientY);
      if (!dragEl) return;
      if (after == null) tbody.appendChild(dragEl); else tbody.insertBefore(dragEl, after);
    });
  });
}

function getRowAfter(tbody, y) {
  const rows = [...tbody.querySelectorAll('tr:not(.dragging)')];
  return rows.reduce((closest, row) => {
    const box = row.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: row };
    return closest;
  }, { offset: -Infinity }).element;
}

// ── AUGŠUPIELĀDE ar automātisku title/artist noteikšanu ──────────────
function bindUploadForm() {
  const dropzone = document.getElementById('uploadDropzone');
  const fileInput = document.getElementById('audioFileInput');
  const form = document.getElementById('uploadForm');
  if (!dropzone || !fileInput || !form) return;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      onAudioFileChosen(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) onAudioFileChosen(fileInput.files[0]);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const statusBox = document.getElementById('uploadStatus');
    if (!fileInput.files.length) { statusBox.textContent = i18n.t('upload_need_file'); return; }

    const fd = new FormData();
    fd.append('audio', fileInput.files[0]);
    const coverInput = document.getElementById('coverFileInput');
    if (coverInput.files.length) fd.append('cover', coverInput.files[0]);
    fd.append('title', document.getElementById('uploadTitle').value.trim());
    fd.append('artist', document.getElementById('uploadArtist').value.trim());
    fd.append('genre', document.getElementById('uploadGenre').value.trim());
    fd.append('trending', document.getElementById('uploadTrending').checked);

    statusBox.textContent = i18n.t('upload_uploading');
    try {
      const res = await fetch('/api/songs', { method: 'POST', headers: authHeaders(false), body: fd });
      const data = await res.json();
      if (!res.ok) { statusBox.textContent = data.error || i18n.t('upload_error_generic'); return; }
      statusBox.textContent = i18n.t('upload_success');
      form.reset();
      document.getElementById('uploadPreview').style.display = 'none';
      loadSongs();
      loadAdminSongTable();
    } catch (err) {
      statusBox.textContent = i18n.t('upload_error_generic');
    }
  });
}

// Uzreiz, kad admin izvēlas failu, mēģinam nolasīt title/artist no faila
// nosaukuma (vienkāršs "Izpildītājs - Nosaukums" veida atpazīšana klientā),
// lai admins uzreiz redz priekšskatījumu — pilnīga (un precīzāka, ID3 balstīta)
// noteikšana notiek serverī augšupielādes brīdī.
function onAudioFileChosen(file) {
  const preview = document.getElementById('uploadPreview');
  preview.style.display = '';
  const noExt = file.name.replace(/\.[a-zA-Z0-9]+$/, '');
  const parts = noExt.split(/\s*[-–—]\s*/);
  const titleInput = document.getElementById('uploadTitle');
  const artistInput = document.getElementById('uploadArtist');
  if (!titleInput.value && !artistInput.value) {
    if (parts.length >= 2) {
      artistInput.value = parts[0].trim();
      titleInput.value = parts.slice(1).join(' - ').trim();
    } else {
      titleInput.value = noExt.replace(/[_]+/g, ' ').trim();
    }
    document.getElementById('uploadAutoNote').style.display = '';
  }
  document.getElementById('uploadFileName').textContent = file.name;
}

// ── ZIŅOJUMS LIETOTĀJIEM (broadcast) ──────────────────────
function bindBroadcastForm() {
  const form = document.getElementById('broadcastForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = document.getElementById('broadcastText').value.trim();
    const lang = document.querySelector('input[name="broadcastLang"]:checked')?.value || 'lv';
    const statusBox = document.getElementById('broadcastStatus');
    if (!text) return;
    statusBox.textContent = i18n.t('broadcast_sending');
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ text, lang }),
      });
      const data = await res.json();
      if (!res.ok) { statusBox.textContent = data.error || ''; return; }
      statusBox.textContent = i18n.t('broadcast_sent');
      document.getElementById('broadcastPreviewLv').textContent = data.textLv;
      document.getElementById('broadcastPreviewEn').textContent = data.textEn;
      form.reset();
      loadAnnouncement();
      loadBroadcastHistory();
    } catch (err) {
      statusBox.textContent = i18n.t('upload_error_generic');
    }
  });
}

async function loadBroadcastHistory() {
  const list = document.getElementById('broadcastHistoryList');
  if (!list) return;
  try {
    const res = await fetch('/api/announcements', { headers: authHeaders() });
    const items = await res.json();
    list.innerHTML = items.map(a => `
      <div class="broadcast-item ${a.active ? 'active' : ''}">
        <div class="broadcast-item-lv">${escapeHtml(a.textLv)}</div>
        <div class="broadcast-item-en">${escapeHtml(a.textEn)}</div>
        <div class="broadcast-item-date">${new Date(a.createdAt).toLocaleString()}</div>
        ${a.active ? `<button class="btn-small danger hide-btn" data-id="${a._id}" data-i18n="broadcast_hide">${i18n.t('broadcast_hide')}</button>` : ''}
      </div>
    `).join('') || `<p data-i18n="broadcast_none">${i18n.t('broadcast_none')}</p>`;

    list.querySelectorAll('.hide-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await fetch(`/api/announcements/${btn.dataset.id}`, { method: 'DELETE', headers: authHeaders() });
        loadAnnouncement();
        loadBroadcastHistory();
      });
    });
  } catch (e) { /* ignorējam */ }
}

// ── PĀRSKATS ──────────────────────
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admin/stats', { headers: authHeaders() });
    const data = await res.json();
    document.getElementById('statSongs').textContent = data.songCount ?? '-';
    document.getElementById('statPlays').textContent = data.totalPlays ?? '-';
    document.getElementById('statTrending').textContent = data.trendingCount ?? '-';
  } catch (e) { /* ignorējam */ }
}
