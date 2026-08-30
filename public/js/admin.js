<<<<<<< HEAD
// public/js/admin.js — secret-word gate → password → 2FA → dashboard.
(function () {
  const $ = (id) => document.getElementById(id);
  const t = window.I18N.t;

  const overlay = $('adminOverlay');
  const loginCard = $('loginCard');
  const totpCard = $('totpCard');
  const dashboard = $('dashboard');

  let currentSongs = []; // local cache of the admin song list, for drag-reorder

  function toast(msg, isError) {
    (window.WAVE && window.WAVE.toast ? window.WAVE.toast : () => {})(msg, isError);
  }

  function showOnly(el) {
    [loginCard, totpCard, dashboard].forEach((c) => { c.style.display = 'none'; });
    overlay.classList.add('open');
    el.style.display = '';
  }

  function closeOverlay() {
    overlay.classList.remove('open');
  }

  // ---------- STEP 0: secret word, typed anywhere on the page ----------
  let keyBuffer = '';
  window.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('open')) return;
    if (e.key.length !== 1) return;
    keyBuffer = (keyBuffer + e.key).slice(-40).toLowerCase();
    checkSecretDebounced();
  });

  let debounceTimer = null;
  function checkSecretDebounced() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkSecret, 120);
  }

  async function checkSecret() {
    if (keyBuffer.length < 4) return;
    try {
      const res = await fetch('/api/auth/check-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: keyBuffer })
      });
      const data = await res.json();
      if (data.ok) {
        keyBuffer = '';
        openLogin();
      }
    } catch (e) { /* silent — fires on every keystroke, don't spam errors */ }
  }

  function openLogin() {
    $('loginError').textContent = '';
    $('loginForm').reset();
    showOnly(loginCard);
  }

  $('closeLogin').addEventListener('click', closeOverlay);
  $('closeTotp').addEventListener('click', closeOverlay);
  $('closeDashboard').addEventListener('click', closeOverlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  // ---------- STEP 1: username + password ----------
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = $('loginUsername').value.trim();
    const password = $('loginPassword').value;
    const errEl = $('loginError');
    errEl.textContent = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.error || 'Error.'; return; }
      $('totpForm').reset();
      $('totpError').textContent = '';
      showOnly(totpCard);
      setTimeout(() => $('totpCode').focus(), 50);
    } catch (e) {
      errEl.textContent = 'Could not reach the server.';
    }
  });

  // ---------- STEP 2: TOTP code ----------
  $('totpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = $('totpCode').value.trim();
    const errEl = $('totpError');
    errEl.textContent = '';
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok) { errEl.textContent = data.error || 'Error.'; return; }
      await openDashboard();
    } catch (e) {
      errEl.textContent = 'Could not reach the server.';
    }
  });

  // ---------- dashboard ----------
  async function openDashboard() {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' });
      const data = await res.json();
      $('dashUsername').textContent = data.username ? ` — @${data.username}` : '';
    } catch (e) {}
    showOnly(dashboard);
    await loadContentTab();
    await loadSongsTab();
  }

  $('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    closeOverlay();
    toast(t('toastLoggedOut'));
  });

  // tabs
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((tb) => tb.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.querySelectorAll('.admin-tab-panel').forEach((p) => {
        p.style.display = p.dataset.panel === target ? '' : 'none';
      });
    });
  });

  // ---- content tab ----
  async function loadContentTab() {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    $('cfgTitle').value = cfg.title || '';
    $('cfgTagline').value = cfg.tagline || '';
    $('cfgBg').value = cfg.backgroundUrl || '';
    $('cfgSiteBg').value = cfg.siteBackgroundUrl || '';
  }

  $('saveContentBtn').addEventListener('click', async () => {
    const body = {
      title: $('cfgTitle').value,
      tagline: $('cfgTagline').value,
      backgroundUrl: $('cfgBg').value,
      siteBackgroundUrl: $('cfgSiteBg').value
    };
    const res = await fetch('/api/config', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not save', true); return; }
    $('contentSuccess').textContent = t('toastSettingsSaved') + '.';
    setTimeout(() => { $('contentSuccess').textContent = ''; }, 2500);
    await window.WAVE.refreshAll();
    toast(t('toastSettingsSaved'));
  });

  async function uploadImageFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/image', { method: 'POST', credentials: 'include', body: fd });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Upload failed', true); return null; }
    return data.url;
  }

  $('bgFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadImageFile(file);
    if (url) { $('cfgBg').value = url; toast(t('toastUploaded') + ' — ' + t('btnSaveChanges')); }
    e.target.value = '';
  });

  $('siteBgFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadImageFile(file);
    if (url) { $('cfgSiteBg').value = url; toast(t('toastUploaded') + ' — ' + t('btnSaveChanges')); }
    e.target.value = '';
  });

  $('songCoverFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = await uploadImageFile(file);
    if (url) { $('songCoverUrl').value = url; toast(t('toastUploaded')); }
    e.target.value = '';
  });

  // ---- songs tab ----
  async function loadSongsTab() {
    const res = await fetch('/api/songs');
    const data = await res.json();
    currentSongs = data.songs || [];
    renderAdminSongs();
  }

  function cleanFilename(name) {
    return name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
  }

  async function uploadAudioFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/audio', { method: 'POST', credentials: 'include', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  async function createSong(payload) {
    const res = await fetch('/api/songs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add song');
    return data.song;
  }

  async function updateSong(id, payload) {
    const res = await fetch(`/api/songs/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not update song');
    return data.song;
  }

  // ---- multi-file audio upload: uploads + registers every selected file ----
  $('audioFileInput').addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const statusEl = $('audioUploadStatus');
    let added = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      statusEl.textContent = `${i + 1}/${files.length}…`;
      try {
        const url = await uploadAudioFile(file);
        await createSong({ title: cleanFilename(file.name), artist: '', url });
        added++;
      } catch (err) {
        toast(`${file.name}: ${err.message}`, true);
      }
    }
    statusEl.textContent = added ? '✓' : '';
    setTimeout(() => { statusEl.textContent = ''; }, 2000);
    if (added) {
      await loadSongsTab();
      await window.WAVE.refreshAll();
      toast(added === 1 ? t('toastAddedSongsOne') : t('toastAddedSongsMany').replace('{n}', added));
    }
    e.target.value = '';
  });

  // ---- single song via title/artist/url form (+ optional cover/lyrics/album) ----
  $('addSongBtn').addEventListener('click', async () => {
    const title = $('songTitle').value.trim();
    const artist = $('songArtist').value.trim();
    const url = $('songUrl').value.trim();
    const album = $('songAlbum').value.trim();
    const coverUrl = $('songCoverUrl').value.trim();
    const lyrics = $('songLyrics').value;
    const errEl = $('songError');
    errEl.textContent = '';
    if (!title || !url) { errEl.textContent = t('songErrorRequired'); return; }
    try {
      await createSong({ title, artist, url, album, coverUrl, lyrics });
      $('songTitle').value = ''; $('songArtist').value = ''; $('songUrl').value = '';
      $('songAlbum').value = ''; $('songCoverUrl').value = ''; $('songLyrics').value = '';
      await loadSongsTab();
      await window.WAVE.refreshAll();
      toast(t('toastAddedSongsOne'));
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

  // ---- admin song list: cover thumbnail, drag-to-reorder, inline edit ----
  function renderAdminSongs() {
    const list = $('adminSongList');
    list.innerHTML = '';
    if (!currentSongs.length) {
      list.innerHTML = `<p class="dim" style="font-size:13px;">${t('emptyPara')}</p>`;
      return;
    }

    currentSongs.forEach((song) => {
      const row = document.createElement('div');
      row.className = 'admin-song-row';
      row.draggable = true;
      row.dataset.id = song.id;

      const main = document.createElement('div');
      main.className = 'row-main';

      const handle = document.createElement('span');
      handle.className = 'drag-handle';
      handle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>';

      const info = document.createElement('div');
      info.className = 'info';
      const titleEl = document.createElement('div'); titleEl.className = 't'; titleEl.textContent = song.title;
      const artistEl = document.createElement('div'); artistEl.className = 'a'; artistEl.textContent = song.artist || '—';
      if (window.applyScriptAttrs) { window.applyScriptAttrs(titleEl, song.title); window.applyScriptAttrs(artistEl, song.artist); }
      info.appendChild(titleEl); info.appendChild(artistEl);

      main.appendChild(handle);
      if (song.coverUrl) {
        const cover = document.createElement('img');
        cover.className = 'cover-thumb';
        cover.src = song.coverUrl;
        cover.alt = '';
        main.appendChild(cover);
      }
      main.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'admin-song-row-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-ghost btn-sm';
      editBtn.textContent = t('btnEdit');
      editBtn.addEventListener('click', () => toggleEditPanel(song, row));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-ghost btn-sm';
      delBtn.textContent = window.I18N.currentLang === 'lv' ? 'Dzēst' : 'Delete';
      delBtn.addEventListener('click', async () => {
        const res = await fetch(`/api/songs/${song.id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          toast(t('toastDeleted'));
          await loadSongsTab();
          await window.WAVE.refreshAll();
        } else {
          toast('Could not delete', true);
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);

      row.appendChild(main);
      row.appendChild(actions);
      list.appendChild(row);

      wireDragEvents(row);
    });
  }

  function toggleEditPanel(song, row) {
    const existing = row.nextElementSibling;
    if (existing && existing.classList.contains('admin-song-edit') && existing.dataset.forId === song.id) {
      existing.remove();
      return;
    }
    document.querySelectorAll('.admin-song-edit').forEach((el) => el.remove());

    const panel = document.createElement('div');
    panel.className = 'admin-song-edit';
    panel.dataset.forId = song.id;
    panel.innerHTML = `
      <div class="field-row">
        <div class="field"><label>${t('fieldSongTitle')}</label><input type="text" class="e-title" value="${escapeAttr(song.title)}"></div>
        <div class="field"><label>${t('fieldSongArtist')}</label><input type="text" class="e-artist" value="${escapeAttr(song.artist || '')}"></div>
      </div>
      <div class="field"><label>${t('fieldAudioUrl')}</label><input type="text" class="e-url" value="${escapeAttr(song.url)}"></div>
      <div class="field-row">
        <div class="field"><label>${t('fieldAlbum')}</label><input type="text" class="e-album" value="${escapeAttr(song.album || '')}"></div>
        <div class="field"><label>${t('fieldCover')}</label><input type="text" class="e-cover" value="${escapeAttr(song.coverUrl || '')}"></div>
      </div>
      <div class="field"><label>${t('fieldLyrics')}</label><textarea class="e-lyrics" rows="3">${escapeHtmlText(song.lyrics || '')}</textarea></div>
      <div class="admin-song-edit-actions">
        <button class="btn btn-primary btn-sm e-save">${t('btnSave')}</button>
        <button class="btn btn-ghost btn-sm e-cancel">${t('btnCancel')}</button>
      </div>
    `;
    row.insertAdjacentElement('afterend', panel);

    panel.querySelector('.e-cancel').addEventListener('click', () => panel.remove());
    panel.querySelector('.e-save').addEventListener('click', async () => {
      const payload = {
        title: panel.querySelector('.e-title').value.trim(),
        artist: panel.querySelector('.e-artist').value.trim(),
        url: panel.querySelector('.e-url').value.trim(),
        album: panel.querySelector('.e-album').value.trim(),
        coverUrl: panel.querySelector('.e-cover').value.trim(),
        lyrics: panel.querySelector('.e-lyrics').value
      };
      try {
        await updateSong(song.id, payload);
        panel.remove();
        await loadSongsTab();
        await window.WAVE.refreshAll();
        toast(t('toastSongUpdated'));
      } catch (err) {
        toast(err.message, true);
      }
    });
  }

  function escapeAttr(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML.replace(/"/g, '&quot;');
  }
  function escapeHtmlText(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  // ---- drag-to-reorder ----
  let dragSourceId = null;

  function wireDragEvents(row) {
    row.addEventListener('dragstart', (e) => {
      dragSourceId = row.dataset.id;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      document.querySelectorAll('.admin-song-row.drag-over').forEach((r) => r.classList.remove('drag-over'));
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (row.dataset.id !== dragSourceId) row.classList.add('drag-over');
    });
    row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
    row.addEventListener('drop', async (e) => {
      e.preventDefault();
      row.classList.remove('drag-over');
      const targetId = row.dataset.id;
      if (!dragSourceId || dragSourceId === targetId) return;

      const fromIdx = currentSongs.findIndex((s) => s.id === dragSourceId);
      const toIdx = currentSongs.findIndex((s) => s.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = currentSongs.slice();
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      currentSongs = reordered;
      renderAdminSongs();

      try {
        const res = await fetch('/api/songs/reorder', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderedIds: currentSongs.map((s) => s.id) })
        });
        if (!res.ok) throw new Error();
        await window.WAVE.refreshAll();
        toast(t('toastReordered'));
      } catch (err) {
        toast('Could not save the new order', true);
      }
    });
  }

  // ---- security tab ----
  $('saveSecretBtn').addEventListener('click', async () => {
    const newWord = $('newSecretWord').value.trim();
    const res = await fetch('/api/admin/secret-word', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newWord })
    });
    const data = await res.json();
    const successEl = $('secretSuccess');
    if (!res.ok) { toast(data.error || 'Could not change', true); return; }
    successEl.textContent = t('toastSecretUpdated') + '.';
    $('newSecretWord').value = '';
    setTimeout(() => { successEl.textContent = ''; }, 3000);
    toast(t('toastSecretUpdated'));
  });

  $('reroll2faBtn').addEventListener('click', async () => {
    const res = await fetch('/api/admin/2fa/reroll', { method: 'POST', credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not generate', true); return; }
    $('totpQrImg').src = data.qr;
    $('totpSetupBlock').style.display = '';
  });

  $('confirmTotpBtn').addEventListener('click', async () => {
    const token = $('confirmTotpCode').value.trim();
    const res = await fetch('/api/admin/2fa/confirm', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) { toast(data.error || 'Could not confirm', true); return; }
    $('totpConfirmSuccess').textContent = 'Activated!';
    toast('2FA updated');
  });
})();
=======
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
>>>>>>> b43235d63fc4cc36af37dc2d50f8106d5d4cc443
