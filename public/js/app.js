<<<<<<< HEAD
// public/js/app.js — public-facing site + player.
// Relies on window.I18N (i18n.js), window.RadioDJ (radio-dj.js), and
// window.detectScript/applyScriptAttrs (script-detect.js), all loaded first.
(function () {
  const $ = (id) => document.getElementById(id);
  const t = window.I18N.t;

  const LIKES_KEY = 'wave-liked-songs';
  const DEFAULT_ACCENT = '#35E7C9';

  const state = {
    config: { title: 'WAVE', tagline: '', backgroundUrl: '', siteBackgroundUrl: '' },
    songs: [],
    currentIndex: -1,
    isPlaying: false,
    searchQuery: '',
    albumFilter: ''
  };

  const radioDJ = new window.RadioDJ({
    onModeChange: (enabled) => {
      radioToggleBtn.classList.toggle('active', enabled);
      radioToggleBtn.setAttribute('aria-pressed', String(enabled));
      updateRadioLabel();
    }
  });

  const audio = new Audio();
  audio.volume = 0.85;

  const els = {
    loadingVeil: $('loadingVeil'),
    stageBg: $('stageBg'),
    siteBgImage: $('siteBgImage'),
    npCover: $('npCover'),
    npTitle: $('npTitle'),
    npArtist: $('npArtist'),
    likeBtn: $('likeBtn'),
    shareBtn: $('shareBtn'),
    lyricsBtn: $('lyricsBtn'),
    lyricsPanel: $('lyricsPanel'),
    playBtn: $('playBtn'),
    playIcon: $('playIcon'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),
    bars: $('bars'),
    seek: $('seek'),
    curTime: $('curTime'),
    durTime: $('durTime'),
    ringProgress: $('ringProgress'),
    trackList: $('trackList'),
    trackCount: $('trackCount'),
    trackSearch: $('trackSearch'),
    albumFilter: $('albumFilter'),
    siteTitleNav: $('siteTitleNav'),
    siteTagline: $('siteTagline'),
    marqueeTrack: $('marqueeTrack'),
    heroPlayBtn: $('heroPlayBtn'),
    toast: $('toast')
  };
  const radioToggleBtn = $('radioToggle');
  const radioLabel = $('radioLabel');

  const RING_CIRCUMFERENCE = 452.4;

  window.WAVE = { toast, refreshAll: null }; // admin.js hooks into this

  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('error', !!isError);
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function updateRadioLabel() {
    radioLabel.textContent = radioDJ.isEnabled() ? t('radioDjOn') : t('radioDjOff');
  }

  // ---------- liked songs (localStorage, no account needed) ----------
  function getLikedIds() {
    try { return new Set(JSON.parse(localStorage.getItem(LIKES_KEY) || '[]')); }
    catch (e) { return new Set(); }
  }
  function saveLikedIds(set) {
    try { localStorage.setItem(LIKES_KEY, JSON.stringify([...set])); } catch (e) {}
  }
  function isLiked(songId) { return getLikedIds().has(songId); }
  function toggleLiked(songId) {
    const liked = getLikedIds();
    if (liked.has(songId)) liked.delete(songId); else liked.add(songId);
    saveLikedIds(liked);
    return liked.has(songId);
  }

  // ---------- shareable links ----------
  function songLinkFor(song) {
    return `${window.location.origin}/?song=${encodeURIComponent(song.id)}`;
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  // build waveform bars once
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    b.style.setProperty('--h', (16 + Math.random() * 26) + '%');
    b.style.setProperty('--h2', (42 + Math.random() * 46) + '%');
    b.style.animationDelay = (Math.random() * 1.1).toFixed(2) + 's';
    els.bars.appendChild(b);
  }

  // ---------- real audio visualizer (Web Audio API), with graceful fallback ----------
  // IMPORTANT: connecting an <audio> element to the Web Audio graph (via
  // createMediaElementSource) silences its audible output entirely for any
  // cross-origin source that doesn't send proper CORS headers — this is a
  // browser security rule, not a bug we can work around. Since songs are
  // commonly hosted on the user's own server (which may not have CORS
  // configured), we only ever attempt this when every song currently in the
  // library is same-origin (i.e. uploaded through this site). Otherwise we
  // skip Web Audio entirely and keep the decorative CSS animation — a music
  // player that always plays sound is far more important than one that
  // sometimes visualizes it.
  const viz = { ctx: null, analyser: null, data: null, connected: false, live: false, safeToConnect: false };

  function isSameOrigin(url) {
    if (!url) return false;
    if (url.startsWith('/')) return true;
    try { return new URL(url, window.location.href).origin === window.location.origin; }
    catch (e) { return false; }
  }

  function recomputeVisualizerSafety() {
    viz.safeToConnect = state.songs.length > 0 && state.songs.every((s) => isSameOrigin(s.url));
  }

  function ensureAudioGraph() {
    if (viz.connected || viz.ctx || !viz.safeToConnect) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      viz.ctx = new Ctx();
      viz.analyser = viz.ctx.createAnalyser();
      viz.analyser.fftSize = 64;
      viz.data = new Uint8Array(viz.analyser.frequencyBinCount);
      audio.crossOrigin = 'anonymous'; // safe here — every song is confirmed same-origin
      const source = viz.ctx.createMediaElementSource(audio);
      source.connect(viz.analyser);
      viz.analyser.connect(viz.ctx.destination);
      viz.connected = true;
    } catch (e) {
      viz.connected = false; // falls back to the CSS "playing" animation
    }
  }

  function visualizerTick() {
    if (state.isPlaying && viz.connected && viz.ctx) {
      if (viz.ctx.state === 'suspended') viz.ctx.resume();
      viz.analyser.getByteFrequencyData(viz.data);
      const bars = els.bars.children;

      if (!viz.live) {
        let sum = 0;
        for (let i = 0; i < viz.data.length; i++) sum += viz.data[i];
        if (sum > 60) {
          viz.live = true;
          els.bars.classList.add('live');
        }
      }

      if (viz.live) {
        for (let i = 0; i < bars.length; i++) {
          const v = viz.data[i % viz.data.length] || 0;
          bars[i].style.height = Math.max(8, (v / 255) * 100) + '%';
        }
      }
    }
    requestAnimationFrame(visualizerTick);
  }
  requestAnimationFrame(visualizerTick);

  // ---------- dynamic accent color from cover art ----------
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4;
      }
      h /= 6;
    }
    return [h * 360, s * 100, l * 100];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (x) => Math.round(255 * x).toString(16).padStart(2, '0');
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
  }

  function setAccentColor(hex) {
    document.documentElement.style.setProperty('--accent', hex);
  }

  function resetAccentColor() {
    document.documentElement.style.setProperty('--accent', DEFAULT_ACCENT);
  }

  function applyThemeFromCover(coverUrl) {
    if (!coverUrl) { resetAccentColor(); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 128) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        if (!count) return resetAccentColor();
        r /= count; g /= count; b /= count;
        const [h, s] = rgbToHsl(r, g, b);
        // Push toward a punchy, legible accent regardless of the source photo's tone.
        const hex = hslToHex(h, Math.max(s, 55), 62);
        setAccentColor(hex);
      } catch (e) {
        // Cross-origin image without CORS headers taints the canvas — keep default accent.
        resetAccentColor();
      }
    };
    img.onerror = () => resetAccentColor();
    img.src = coverUrl;
  }

  // ---------- data fetching ----------
  async function fetchConfig() {
    const res = await fetch('/api/config');
    state.config = await res.json();
  }

  async function fetchSongs() {
    const res = await fetch('/api/songs');
    const data = await res.json();
    state.songs = data.songs || [];
  }

  async function refreshAll() {
    await Promise.all([fetchConfig(), fetchSongs()]);
    recomputeVisualizerSafety();
    renderChrome();
    renderAlbumFilter();
    renderTracklist();
    renderMarquee();
  }
  window.WAVE.refreshAll = refreshAll;

  // ---------- rendering ----------
  function renderChrome() {
    const { title, tagline, backgroundUrl, siteBackgroundUrl } = state.config;
    els.siteTitleNav.textContent = title || 'WAVE';
    els.siteTagline.textContent = tagline || '';
    document.title = `${title || 'WAVE'} — Sound that belongs only to you`;

    if (backgroundUrl) {
      els.stageBg.style.backgroundImage = `url('${backgroundUrl}')`;
      els.stageBg.classList.add('active');
    } else {
      els.stageBg.classList.remove('active');
    }

    if (siteBackgroundUrl) {
      els.siteBgImage.style.backgroundImage = `url('${siteBackgroundUrl}')`;
      els.siteBgImage.classList.add('active');
      document.body.classList.add('has-site-bg');
    } else {
      els.siteBgImage.classList.remove('active');
      document.body.classList.remove('has-site-bg');
    }
  }

  function renderAlbumFilter() {
    const albums = [...new Set(state.songs.map((s) => s.album).filter(Boolean))].sort();
    if (!albums.length) {
      els.albumFilter.hidden = true;
      els.albumFilter.innerHTML = '';
      return;
    }
    const allLabel = window.I18N.currentLang === 'lv' ? 'Visi albumi' : 'All albums';
    els.albumFilter.innerHTML = `<option value="">${allLabel}</option>` +
      albums.map((a) => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
    els.albumFilter.value = state.albumFilter;
    els.albumFilter.hidden = false;
  }

  function trackCountText(n) {
    return n === 1 ? t('trackCountOne') : t('trackCountMany').replace('{n}', n);
  }

  function matchesFilters(song) {
    if (state.albumFilter && song.album !== state.albumFilter) return false;
    if (state.searchQuery) {
      const q = state.searchQuery;
      const haystack = `${song.title} ${song.artist || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  function renderTracklist() {
    const visible = state.songs
      .map((song, i) => ({ song, i }))
      .filter(({ song }) => matchesFilters(song));

    els.trackCount.textContent = trackCountText(visible.length);
    els.trackList.innerHTML = '';

    if (state.songs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<h3>${t('emptyTitle')}</h3><p>${t('emptyPara')}</p>`;
      els.trackList.appendChild(empty);
      return;
    }

    if (visible.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const noResults = window.I18N.currentLang === 'lv' ? 'Nekas neatbilst meklējumam.' : 'Nothing matches your search.';
      empty.innerHTML = `<h3>${noResults}</h3>`;
      els.trackList.appendChild(empty);
      return;
    }

    const liked = getLikedIds();

    visible.forEach(({ song, i }, displayIdx) => {
      const row = document.createElement('div');
      row.className = 'track-row' + (i === state.currentIndex ? ' active' : '');

      const idx = document.createElement('div');
      idx.className = 'track-idx';
      idx.textContent = (displayIdx + 1).toString().padStart(2, '0');

      const metaRow = document.createElement('div');
      metaRow.className = 'track-meta-row';

      if (song.coverUrl) {
        const cover = document.createElement('img');
        cover.className = 'track-cover';
        cover.src = song.coverUrl;
        cover.alt = '';
        cover.loading = 'lazy';
        metaRow.appendChild(cover);
      }

      const textWrap = document.createElement('div');
      textWrap.className = 'track-text';
      const titleEl = document.createElement('div');
      titleEl.className = 'track-title';
      titleEl.textContent = song.title;
      const detected = window.applyScriptAttrs(titleEl, song.title);
      const tag = document.createElement('span');
      tag.className = 'track-lang-tag';
      tag.textContent = detected;
      titleEl.appendChild(tag);

      const artistEl = document.createElement('div');
      artistEl.className = 'track-artist';
      artistEl.textContent = song.artist || '—';
      window.applyScriptAttrs(artistEl, song.artist);

      textWrap.appendChild(titleEl);
      textWrap.appendChild(artistEl);
      metaRow.appendChild(textWrap);

      const actions = document.createElement('div');
      actions.className = 'track-row-actions';

      const likeBtn = document.createElement('button');
      likeBtn.className = 'track-like-btn' + (liked.has(song.id) ? ' liked' : '');
      likeBtn.setAttribute('aria-label', 'Like');
      likeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowLiked = toggleLiked(song.id);
        likeBtn.classList.toggle('liked', nowLiked);
        if (i === state.currentIndex) updateLikeButton(song.id);
      });

      const copyBtn = document.createElement('button');
      copyBtn.className = 'track-copy-btn';
      copyBtn.setAttribute('aria-label', 'Copy link');
      copyBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4.93"/><path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07L13 19.07"/></svg>';
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ok = await copyToClipboard(songLinkFor(song));
        toast(ok ? (window.I18N.currentLang === 'lv' ? 'Saite nokopēta' : 'Link copied') : 'Could not copy link', !ok);
      });

      actions.appendChild(likeBtn);
      actions.appendChild(copyBtn);

      row.appendChild(idx);
      row.appendChild(metaRow);
      row.appendChild(actions);
      row.addEventListener('click', () => playTrack(i));
      els.trackList.appendChild(row);
    });
  }

  function renderMarquee() {
    const names = state.songs.length
      ? [...new Set(state.songs.map((s) => s.artist || s.title))]
      : [t('emptyTitle')];
    const content = names.map((n) => `<em>${escapeHtml(n)}</em>`).join('<span>✦</span>');
    els.marqueeTrack.innerHTML = `<span>${content}</span><span>${content}</span>`;
  }

  // ---------- now-playing panel (cover, like, share, lyrics) ----------
  function updateLikeButton(songId) {
    const liked = isLiked(songId);
    els.likeBtn.classList.toggle('liked', liked);
    els.likeBtn.setAttribute('aria-pressed', String(liked));
  }

  function updateNowPlayingPanel(song) {
    if (song.coverUrl) {
      els.npCover.src = song.coverUrl;
      els.npCover.hidden = false;
    } else {
      els.npCover.hidden = true;
    }

    els.likeBtn.hidden = false;
    updateLikeButton(song.id);

    els.shareBtn.hidden = false;

    els.lyricsPanel.hidden = true;
    els.lyricsPanel.textContent = '';
    els.lyricsBtn.setAttribute('aria-expanded', 'false');
    els.lyricsBtn.hidden = !song.lyrics;

    applyThemeFromCover(song.coverUrl);
  }

  function hideNowPlayingPanel() {
    els.npCover.hidden = true;
    els.likeBtn.hidden = true;
    els.shareBtn.hidden = true;
    els.lyricsBtn.hidden = true;
    els.lyricsPanel.hidden = true;
    resetAccentColor();
  }

  els.likeBtn.addEventListener('click', () => {
    const song = state.songs[state.currentIndex];
    if (!song) return;
    toggleLiked(song.id);
    updateLikeButton(song.id);
    renderTracklist();
  });

  els.shareBtn.addEventListener('click', async () => {
    const song = state.songs[state.currentIndex];
    if (!song) return;
    const ok = await copyToClipboard(songLinkFor(song));
    toast(ok ? (window.I18N.currentLang === 'lv' ? 'Saite nokopēta' : 'Link copied') : 'Could not copy link', !ok);
  });

  els.lyricsBtn.addEventListener('click', () => {
    const song = state.songs[state.currentIndex];
    if (!song || !song.lyrics) return;
    const expanded = els.lyricsBtn.getAttribute('aria-expanded') === 'true';
    if (expanded) {
      els.lyricsPanel.hidden = true;
      els.lyricsBtn.setAttribute('aria-expanded', 'false');
    } else {
      els.lyricsPanel.textContent = song.lyrics;
      els.lyricsPanel.hidden = false;
      els.lyricsBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // ---------- search / filter ----------
  els.trackSearch.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim().toLowerCase();
    renderTracklist();
  });
  els.albumFilter.addEventListener('change', (e) => {
    state.albumFilter = e.target.value;
    renderTracklist();
  });

  // ---------- player ----------
  // loadTrack() sets up metadata/UI without starting playback — used for
  // deep links, so arriving via a shared URL doesn't try to autoplay
  // (which browsers block anyway) and instead just has the track ready.
  function loadTrack(i) {
    const song = state.songs[i];
    if (!song) return;
    state.currentIndex = i;
    audio.src = song.url;
    els.npTitle.textContent = song.title;
    window.applyScriptAttrs(els.npTitle, song.title);
    els.npArtist.textContent = song.artist || '—';
    window.applyScriptAttrs(els.npArtist, song.artist);
    updateNowPlayingPanel(song);
    renderTracklist();
    updateUrlForSong(song);
  }

  function playTrack(i) {
    const song = state.songs[i];
    if (!song) return;
    ensureAudioGraph();
    loadTrack(i);
    audio.play().then(() => {
      state.isPlaying = true;
      updatePlayUI();
    }).catch(() => {
      toast(t('toastPlaybackError'), true);
    });
  }

  function updateUrlForSong(song) {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('song', song.id);
      window.history.replaceState({}, '', url);
    } catch (e) {}
  }

  function togglePlay() {
    if (state.currentIndex === -1) {
      if (state.songs.length > 0) playTrack(0);
      else toast(t('emptyTitle'));
      return;
    }
    ensureAudioGraph();
    if (state.isPlaying) { audio.pause(); state.isPlaying = false; }
    else { audio.play(); state.isPlaying = true; }
    updatePlayUI();
  }

  function updatePlayUI() {
    els.bars.classList.toggle('playing', state.isPlaying);
    if (!state.isPlaying) { els.bars.classList.remove('live'); viz.live = false; }
    els.playBtn.classList.toggle('is-playing', state.isPlaying);
    els.playIcon.innerHTML = state.isPlaying
      ? '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>'
      : '<path d="M8 5v14l11-7z"/>';
    renderTracklist();
  }

  function nextTrack() {
    if (!state.songs.length) return;
    const idx = radioDJ.pickNext(state.currentIndex, state.songs.length);
    if (idx !== -1) playTrack(idx);
  }
  function prevTrack() {
    if (!state.songs.length) return;
    const idx = radioDJ.pickPrev(state.currentIndex, state.songs.length);
    if (idx !== -1) playTrack(idx);
  }

  audio.addEventListener('timeupdate', () => {
    if (!isNaN(audio.duration) && audio.duration > 0) {
      const frac = audio.currentTime / audio.duration;
      els.seek.value = frac * 100;
      els.curTime.textContent = fmtTime(audio.currentTime);
      els.durTime.textContent = fmtTime(audio.duration);
      els.ringProgress.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - frac);
    }
  });
  audio.addEventListener('ended', nextTrack);

  els.seek.addEventListener('input', () => {
    if (audio.duration) audio.currentTime = (els.seek.value / 100) * audio.duration;
  });

  els.playBtn.addEventListener('click', togglePlay);
  els.heroPlayBtn.addEventListener('click', togglePlay);
  els.nextBtn.addEventListener('click', nextTrack);
  els.prevBtn.addEventListener('click', prevTrack);

  radioToggleBtn.addEventListener('click', () => {
    const enabled = radioDJ.toggle();
    toast(enabled ? t('toastRadioOn') : t('toastRadioOff'));
    // Immediate, unmistakable feedback: turning Radio DJ on jumps straight
    // into a random track instead of silently waiting for the next click.
    if (enabled && state.songs.length) nextTrack();
  });

  // ---------- language toggle ----------
  $('langToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-lang]');
    if (!btn) return;
    document.querySelectorAll('#langToggle button').forEach((b) => b.classList.toggle('active', b === btn));
    window.I18N.setLang(btn.dataset.lang);
  });

  document.addEventListener('i18n:changed', () => {
    if (state.currentIndex === -1) {
      els.npTitle.textContent = t('npTitleDefault');
      els.npArtist.textContent = t('npArtistDefault');
    }
    updateRadioLabel();
    renderAlbumFilter();
    renderTracklist();
    renderMarquee();
  });

  // ---------- init ----------
  (async function init() {
    window.I18N.setLang('en');
    updateRadioLabel();
    hideNowPlayingPanel();

    try {
      await refreshAll();

      // Deep link support: /?song=<id> preselects (but does not autoplay)
      // that track, since browsers block unrequested audio playback anyway.
      const params = new URLSearchParams(window.location.search);
      const songId = params.get('song');
      if (songId) {
        const idx = state.songs.findIndex((s) => s.id === songId);
        if (idx !== -1) loadTrack(idx);
      }
    } catch (e) {
      toast('Could not load data from the server', true);
    } finally {
      els.loadingVeil.classList.add('hide');
      setTimeout(() => { els.loadingVeil.style.display = 'none'; }, 500);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }
  })();
})();
=======
// ═══════════════════════════════════════════════════
//  Galvenā lapas loģika
// ═══════════════════════════════════════════════════

const player = new PulssPlayer();
let allSongs = [];
let activeGenre = '';
let searchTerm = '';

async function loadSongs() {
  try {
    const res = await fetch('/api/songs');
    allSongs = await res.json();
    populateGenreFilter();
    renderSongs();
  } catch (e) {
    console.error('Neizdevās ielādēt dziesmas', e);
  }
}

function populateGenreFilter() {
  const sel = document.getElementById('genreFilter');
  if (!sel) return;
  const genres = [...new Set(allSongs.map(s => s.genre).filter(Boolean))].sort();
  sel.innerHTML = `<option value="" data-i18n="filter_all_genres">${i18n.t('filter_all_genres')}</option>` +
    genres.map(g => `<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtDuration(sec) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function filteredSongs() {
  return allSongs.filter(s => {
    const matchesGenre = !activeGenre || s.genre === activeGenre;
    const hay = `${s.title} ${s.artist}`.toLowerCase();
    const matchesSearch = !searchTerm || hay.includes(searchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });
}

function songCard(song, list, index) {
  const div = document.createElement('div');
  div.className = 'song-card';
  div.innerHTML = `
    <div class="song-cover">
      <img src="${escapeHtml(song.coverUrl) || '/img/default-cover.svg'}" alt="">
      <button class="play-overlay" data-i18n-aria="play" aria-label="${i18n.t('play')}">▶</button>
    </div>
    <div class="song-info">
      <div class="song-title">${escapeHtml(song.title)}</div>
      <div class="song-artist">${escapeHtml(song.artist) || i18n.t('unknown_artist')}</div>
      <div class="song-meta">
        ${song.genre ? `<span class="tag">${escapeHtml(song.genre)}</span>` : ''}
        ${song.duration ? `<span class="dur">${fmtDuration(song.duration)}</span>` : ''}
        <span class="plays">${song.playCount || 0} <span data-i18n="plays">${i18n.t('plays')}</span></span>
      </div>
    </div>
  `;
  const playFn = () => player.playSongList(list, index);
  div.querySelector('.play-overlay').addEventListener('click', playFn);
  div.querySelector('.song-cover').addEventListener('click', playFn);
  return div;
}

function renderSongs() {
  const list = filteredSongs();
  const trending = list.filter(s => s.trending);

  const trendingWrap = document.getElementById('trendingGrid');
  const trendingSection = document.getElementById('trendingSection');
  if (trendingWrap) {
    trendingWrap.innerHTML = '';
    if (trending.length) {
      trending.forEach((s, i) => trendingWrap.appendChild(songCard(s, trending, i)));
      trendingSection.style.display = '';
    } else {
      trendingSection.style.display = 'none';
    }
  }

  const allWrap = document.getElementById('allGrid');
  const emptyState = document.getElementById('emptyState');
  if (allWrap) {
    allWrap.innerHTML = '';
    if (list.length) {
      list.forEach((s, i) => allWrap.appendChild(songCard(s, list, i)));
      emptyState.style.display = 'none';
    } else {
      emptyState.style.display = '';
      emptyState.querySelector('[data-i18n="no_songs"]').textContent =
        allSongs.length ? i18n.t('no_results') : i18n.t('no_songs');
    }
  }
}

async function loadAnnouncement() {
  try {
    const res = await fetch('/api/announcements/latest');
    const a = await res.json();
    const banner = document.getElementById('announcementBanner');
    if (!banner) return;
    if (a) {
      banner.style.display = '';
      banner.dataset.lv = a.textLv;
      banner.dataset.en = a.textEn;
      banner.querySelector('.announcement-text').textContent = i18n.current === 'en' ? a.textEn : a.textLv;
    } else {
      banner.style.display = 'none';
    }
  } catch (e) { /* klusi ignorējam */ }
}

function initUI() {
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchTerm = e.target.value;
    renderSongs();
  });
  document.getElementById('genreFilter')?.addEventListener('change', (e) => {
    activeGenre = e.target.value;
    renderSongs();
  });
  document.getElementById('langSwitchBtn')?.addEventListener('click', () => i18n.toggle());
  document.getElementById('announcementClose')?.addEventListener('click', () => {
    document.getElementById('announcementBanner').style.display = 'none';
  });

  document.addEventListener('langchange', () => {
    populateGenreFilter();
    renderSongs();
    const banner = document.getElementById('announcementBanner');
    if (banner && banner.dataset.lv) {
      banner.querySelector('.announcement-text').textContent =
        i18n.current === 'en' ? banner.dataset.en : banner.dataset.lv;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  loadSongs();
  loadAnnouncement();
});
>>>>>>> b43235d63fc4cc36af37dc2d50f8106d5d4cc443
