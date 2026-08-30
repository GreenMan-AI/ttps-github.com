// public/js/app.js — public-facing site + player.
// Relies on window.I18N (i18n.js), window.RadioDJ (radio-dj.js), and
// window.detectScript/applyScriptAttrs (script-detect.js), all loaded first.
(function () {
  const $ = (id) => document.getElementById(id);
  const t = window.I18N.t;

  const state = {
    config: { title: 'WAVE', tagline: '', backgroundUrl: '', siteBackgroundUrl: '' },
    songs: [],
    currentIndex: -1,
    isPlaying: false
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
    npTitle: $('npTitle'),
    npArtist: $('npArtist'),
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
    siteTitleNav: $('siteTitleNav'),
    siteTagline: $('siteTagline'),
    marqueeTrack: $('marqueeTrack'),
    heroPlayBtn: $('heroPlayBtn'),
    toast: $('toast'),
    cursorGlow: $('cursorGlow'),
    navHintWord: $('navHintWord')
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

  // build waveform bars once
  for (let i = 0; i < 28; i++) {
    const b = document.createElement('div');
    b.className = 'bar';
    b.style.setProperty('--h', (16 + Math.random() * 26) + '%');
    b.style.setProperty('--h2', (42 + Math.random() * 46) + '%');
    b.style.animationDelay = (Math.random() * 1.1).toFixed(2) + 's';
    els.bars.appendChild(b);
  }

  // ambient cursor glow
  if (window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('mousemove', (e) => {
      els.cursorGlow.style.left = e.clientX + 'px';
      els.cursorGlow.style.top = e.clientY + 'px';
    });
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
    renderChrome();
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

  function trackCountText(n) {
    return n === 1 ? t('trackCountOne') : t('trackCountMany').replace('{n}', n);
  }

  function renderTracklist() {
    const n = state.songs.length;
    els.trackCount.textContent = trackCountText(n);
    els.trackList.innerHTML = '';

    if (n === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = `<h3>${t('emptyTitle')}</h3><p>${t('emptyPara')}</p>`;
      els.trackList.appendChild(empty);
      return;
    }

    state.songs.forEach((song, i) => {
      const row = document.createElement('div');
      row.className = 'track-row' + (i === state.currentIndex ? ' active' : '');

      const idx = document.createElement('div');
      idx.className = 'track-idx';
      idx.textContent = (i + 1).toString().padStart(2, '0');

      const meta = document.createElement('div');
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

      meta.appendChild(titleEl);
      meta.appendChild(artistEl);

      const status = document.createElement('div');
      status.className = 'track-status';
      status.textContent = i === state.currentIndex && state.isPlaying ? '♪' : '';

      row.appendChild(idx); row.appendChild(meta); row.appendChild(status);
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

  // ---------- player ----------
  function playTrack(i) {
    const song = state.songs[i];
    if (!song) return;
    state.currentIndex = i;
    audio.src = song.url;
    audio.play().then(() => {
      state.isPlaying = true;
      updatePlayUI();
    }).catch(() => {
      toast(t('toastPlaybackError'), true);
    });
    els.npTitle.textContent = song.title;
    window.applyScriptAttrs(els.npTitle, song.title);
    els.npArtist.textContent = song.artist || '—';
    window.applyScriptAttrs(els.npArtist, song.artist);
    renderTracklist();
  }

  function togglePlay() {
    if (state.currentIndex === -1) {
      if (state.songs.length > 0) playTrack(0);
      else toast(t('emptyTitle'));
      return;
    }
    if (state.isPlaying) { audio.pause(); state.isPlaying = false; }
    else { audio.play(); state.isPlaying = true; }
    updatePlayUI();
  }

  function updatePlayUI() {
    els.bars.classList.toggle('playing', state.isPlaying);
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
    renderTracklist();
    renderMarquee();
  });

  // ---------- init ----------
  (async function init() {
    window.I18N.setLang('en');
    updateRadioLabel();
    try {
      await refreshAll();
    } catch (e) {
      toast('Could not load data from the server', true);
    } finally {
      els.loadingVeil.classList.add('hide');
      setTimeout(() => { els.loadingVeil.style.display = 'none'; }, 500);
    }
  })();
})();
