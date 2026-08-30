// public/js/admin.js — secret-word gate → password → 2FA → dashboard.
(function () {
  const $ = (id) => document.getElementById(id);
  const t = window.I18N.t;

  const overlay = $('adminOverlay');
  const loginCard = $('loginCard');
  const totpCard = $('totpCard');
  const dashboard = $('dashboard');

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

  // ---- songs tab ----
  async function loadSongsTab() {
    const res = await fetch('/api/songs');
    const data = await res.json();
    renderAdminSongs(data.songs || []);
  }

  function renderAdminSongs(songs) {
    const list = $('adminSongList');
    list.innerHTML = '';
    if (!songs.length) {
      list.innerHTML = `<p class="dim" style="font-size:13px;">${t('emptyPara')}</p>`;
      return;
    }
    songs.forEach((song) => {
      const row = document.createElement('div');
      row.className = 'admin-song-row';
      const info = document.createElement('div');
      info.className = 'info';
      const titleEl = document.createElement('div'); titleEl.className = 't'; titleEl.textContent = song.title;
      const artistEl = document.createElement('div'); artistEl.className = 'a'; artistEl.textContent = song.artist || '—';
      if (window.applyScriptAttrs) { window.applyScriptAttrs(titleEl, song.title); window.applyScriptAttrs(artistEl, song.artist); }
      info.appendChild(titleEl); info.appendChild(artistEl);

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
      row.appendChild(info);
      row.appendChild(delBtn);
      list.appendChild(row);
    });
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

  async function createSong(title, artist, url) {
    const res = await fetch('/api/songs', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, artist, url })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not add song');
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
        await createSong(cleanFilename(file.name), '', url);
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

  // ---- single song via title/artist/url form ----
  $('addSongBtn').addEventListener('click', async () => {
    const title = $('songTitle').value.trim();
    const artist = $('songArtist').value.trim();
    const url = $('songUrl').value.trim();
    const errEl = $('songError');
    errEl.textContent = '';
    if (!title || !url) { errEl.textContent = t('songErrorRequired'); return; }
    try {
      await createSong(title, artist, url);
      $('songTitle').value = ''; $('songArtist').value = ''; $('songUrl').value = '';
      await loadSongsTab();
      await window.WAVE.refreshAll();
      toast(t('toastAddedSongsOne'));
    } catch (err) {
      errEl.textContent = err.message;
    }
  });

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
