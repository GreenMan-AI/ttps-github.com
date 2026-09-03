// PULSS re-skin — dekoratīvais kursora mirdzums (nekas šeit neietekmē app.js loģiku)
(function () {
  var glow = document.getElementById('cursorGlow');
  if (!glow) return;
  if (!window.matchMedia('(hover:hover)').matches) return;

  window.addEventListener('mousemove', function (e) {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
    glow.style.opacity = '1';
  });
  document.addEventListener('mouseleave', function () {
    glow.style.opacity = '0';
  });
})();

// ══════════════════════════════════════════════════
//  CILŅU SINHRONIZĀCIJA — ja lapa atvērta vairākās pārlūka
//  cilnēs, sākot spēlēt vienā, pārējās automātiski apstājas.
//  Tas novērš "divas dziesmas spēlē vienlaikus fonā".
// ══════════════════════════════════════════════════
(function () {
  if (typeof BroadcastChannel === 'undefined') return; // vecāki pārlūki — klusi izlaižam

  window.audioTabId = Math.random().toString(36).slice(2);
  window.audioTabChannel = new BroadcastChannel('pulss-audio-sync');

  window.audioTabChannel.addEventListener('message', (e) => {
    if (!e.data || e.data.tabId === window.audioTabId) return;
    if (e.data.type === 'playing') {
      const audio = document.getElementById('pb-audio');
      if (audio && !audio.paused) audio.pause();
    }
  });
})();

// ══════════════════════════════════════════════════
//  TIEŠRAIDES KLAUSĪTĀJU NOZĪMĪTE HEADERĪ
//  (izmanto jau esošo online-count socket notikumu)
// ══════════════════════════════════════════════════
(function () {
  if (typeof socket === 'undefined') return;
  socket.on('online-count', (count) => {
    const el = document.getElementById('live-badge-count');
    if (el) el.textContent = count;
  });
})();

// ══════════════════════════════════════════════════
//  PULSĒJOŠS GAISMAS GREDZENS — reāli reaģē uz skanošo mūziku
//  (Web Audio API AnalyserNode, basu frekvences). Ja pārlūks/audio
//  avots to neatļauj (piem. CORS ierobežojums), klusi paliek vecās
//  animētās aizvietotāja josliņas — atskaņošana nekad netiek
//  pārtraukta šī iemesla dēļ.
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  const glow = document.getElementById('pb-cover-glow');
  const fallback = document.getElementById('pb-waveform');
  if (!pbAudio || !glow) return;

  // KRITISKI: šis jāiestata UZREIZ, PIRMS jebkurai dziesmai vispār tiek
  // iestatīts src — citādi pirmā dziesma tiek ielādēta bez CORS
  // pieprasījuma galvenēm, un pieslēdzot to Web Audio grafam (vizualizētājam),
  // pārlūks to uzskata par "piesārņotu" un klusē skaņu (bet tikai pirmajai
  // dziesmai — nākamās jau ielādējas pareizi, jo atribūts tad jau ir uzstādīts).
  pbAudio.crossOrigin = 'anonymous';

  let audioCtx, analyser, dataArray, rafId, ready = false, failed = false;
  let smoothedBeat = 0, hue = 0;
  const playBtns = document.querySelectorAll('.pb-play'); // mini josla + pilnekrāna skats
  const playerBar = document.getElementById('player-bar');

  function setup() {
    if (ready || failed) return ready;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaElementSource(pbAudio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      dataArray = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(audioCtx.destination); // svarīgi — citādi skaņa apklust
      ready = true;
      return true;
    } catch (e) {
      failed = true; // piem. CORS neatļauj — turpinām ar vecajām josliņām, bez kļūdas lietotājam
      return false;
    }
  }

  function draw() {
    rafId = requestAnimationFrame(draw);
    if (!analyser || pbAudio.paused) return;
    analyser.getByteFrequencyData(dataArray);
    // Basu frekvences (zemākie bini) dod visnotaļ "ritma sitiena" izjūtu.
    const bassRaw = (dataArray[0] + dataArray[1] + dataArray[2] + dataArray[3]) / 4 / 255;
    // Nedaudz nogludinām, lai gredzens "elpo", nevis raustās katru kadru.
    smoothedBeat = smoothedBeat * 0.72 + bassRaw * 0.28;
    const scale = 0.88 + smoothedBeat * 0.42;
    const opacity = 0.35 + smoothedBeat * 0.65;
    glow.style.transform = `scale(${scale.toFixed(3)})`;
    glow.style.opacity = opacity.toFixed(3);

    // Kopējā skanējuma "enerģija" (viss spektrs, ne tikai bass) — spēcīgākos,
    // dzīvīgākos brīžos krāsa mainās straujāk; klusākos — lēnāk, bet nekad
    // pilnīgi neapstājas, lai gredzens vienmēr justos "dzīvs".
    let energySum = 0;
    for (let i = 0; i < dataArray.length; i++) energySum += dataArray[i];
    const energy = energySum / dataArray.length / 255;
    hue = (hue + 0.6 + energy * 3.2) % 360;
    const hueDeg = `${hue.toFixed(1)}deg`;
    glow.style.filter = `blur(10px) hue-rotate(${hueDeg})`;
    playBtns.forEach(btn => btn.style.setProperty('--reactive-hue', hueDeg));

    // Viss atskaņotājs "zaigo" ritmā — mīksts, krāsu mainošs mirdzums ap
    // visu joslu, ne tikai vāciņu. Intensitāte seko basam, tonis — kopējai
    // enerģijai (tā pati hue vērtība, kas jau aprēķināta augšā).
    if (playerBar) {
      const glowSize = 22 + smoothedBeat * 46;
      const glowAlpha = (0.22 + smoothedBeat * 0.38).toFixed(2);
      playerBar.style.boxShadow =
        `0 12px 40px rgba(0,0,0,.5), 0 0 ${glowSize.toFixed(0)}px hsla(${hue.toFixed(0)},90%,62%,${glowAlpha})`;
    }
  }

  pbAudio.addEventListener('play', () => {
    if (!ready && !failed) {
      const ok = setup();
      if (ok) {
        glow.classList.add('active');
        playBtns.forEach(btn => btn.classList.add('audio-reactive'));
        if (fallback) fallback.style.display = 'none';
        draw();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  });

  pbAudio.addEventListener('pause', () => {
    if (ready) {
      glow.classList.remove('active');
      playBtns.forEach(btn => btn.classList.remove('audio-reactive'));
      if (playerBar) playerBar.style.boxShadow = '';
    }
  });

  // SVARĪGI mobilajām ierīcēm: kad ekrāns aizmieg/tiek atbloķēts, mobilie
  // pārlūki (īpaši iOS Safari) bieži "apstādina" (suspend) Web Audio API
  // AudioContext, lai taupītu bateriju — pat ja pati dziesma (pbAudio)
  // tehniski turpina spēlēt fonā. Tā kā vizualizētājs skaņu izvada TIEŠI
  // caur šo audioCtx (nevis tieši no pbAudio), tas nozīmētu klusumu vai
  // "iesprūdušu" skaņu pēc atbloķēšanas, ja to neatsāktu manuāli. Tāpēc
  // katru reizi, kad lapa atkal kļūst redzama UN dziesma joprojām spēlē,
  // piespiedu kārtā atsākam (resume) audioCtx.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && audioCtx && audioCtx.state === 'suspended' && !pbAudio.paused) {
      audioCtx.resume().catch(() => {});
    }
  });
  // Papildu drošības tīkls — dažas pārlūku versijas maina AudioContext
  // stāvokli klusībā, neizsaucot iepriekšminēto notikumu vispār.
  if (typeof window !== 'undefined') {
    window.addEventListener('pageshow', () => {
      if (audioCtx && audioCtx.state === 'suspended' && !pbAudio.paused) audioCtx.resume().catch(() => {});
    });
    window.addEventListener('focus', () => {
      if (audioCtx && audioCtx.state === 'suspended' && !pbAudio.paused) audioCtx.resume().catch(() => {});
    });
  }
})();

// ══════════════════════════════════════════════════
//  PILNEKRĀNA "NOW PLAYING" REŽĪMS — atveras, uzspiežot uz vāciņa
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  const overlay = document.getElementById('nowplaying-overlay');
  const pbCover = document.getElementById('pb-cover');
  if (!pbAudio || !overlay || !pbCover) return;

  const npBg = document.getElementById('np-bg');
  const npCover = document.getElementById('np-cover');
  const npTitle = document.getElementById('np-title');
  const npArtist = document.getElementById('np-artist');
  const npPlayBtn = document.getElementById('np-playpause');
  const npProgress = document.getElementById('np-progress');
  const npProgressFill = document.getElementById('np-progress-fill');
  const npCurrent = document.getElementById('np-current');
  const npDuration = document.getElementById('np-duration');

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function syncFromMiniPlayer() {
    npBg.style.backgroundImage = `url("${pbCover.src}")`;
    npCover.src = pbCover.src;
    npTitle.textContent = document.getElementById('pb-title')?.textContent || '—';
    npArtist.textContent = document.getElementById('pb-artist')?.textContent || '';
  }

  function syncPlayIcon() {
    npPlayBtn.textContent = pbAudio.paused ? '▶' : '⏸';
  }

  pbCover.addEventListener('click', () => {
    syncFromMiniPlayer();
    syncPlayIcon();
    overlay.classList.add('open');
  });
  document.getElementById('np-close')?.addEventListener('click', () => {
    overlay.classList.remove('open');
  });

  // ── Vadības pogas — pārsūta klikšķus uz jau esošajām reālajām pogām ──
  const forwardMap = { 'np-shuffle': 'pb-shuffle', 'np-prev': 'pb-prev', 'np-next': 'pb-next', 'np-repeat': 'pb-repeat' };
  Object.entries(forwardMap).forEach(([fromId, toId]) => {
    document.getElementById(fromId)?.addEventListener('click', () => {
      document.getElementById(toId)?.click();
      setTimeout(syncFromMiniPlayer, 60); // ja nomainījās dziesma (prev/next)
    });
  });
  npPlayBtn.addEventListener('click', () => {
    if (pbAudio.paused) pbAudio.play().catch(() => {});
    else pbAudio.pause();
  });
  pbAudio.addEventListener('play', syncPlayIcon);
  pbAudio.addEventListener('pause', syncPlayIcon);
  pbAudio.addEventListener('play', () => { if (overlay.classList.contains('open')) syncFromMiniPlayer(); });

  // ── Progresa josla ──
  pbAudio.addEventListener('timeupdate', () => {
    if (!pbAudio.duration) return;
    npProgressFill.style.width = `${(pbAudio.currentTime / pbAudio.duration) * 100}%`;
    npCurrent.textContent = formatTime(pbAudio.currentTime);
    npDuration.textContent = formatTime(pbAudio.duration);
  });
  npProgress.addEventListener('click', (e) => {
    if (!pbAudio.duration) return;
    const rect = npProgress.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    pbAudio.currentTime = Math.max(0, Math.min(1, frac)) * pbAudio.duration;
  });
})();

// ══════════════════════════════════════════════════
//  ĀTRĀ SAŠĶIROŠANA (admin rīks)
// ══════════════════════════════════════════════════
(function () {

  // ── Ātrā sašķirošana — panelis ar valodas dropdown katrai dziesmai,
  //    kam vēl nav norādīta valoda (žanrs vairs neietekmē pārlūkošanu,
  //    tāpēc šeit vairs nav vajadzīgs) ──
  window.openQuickSort = function () {
    const overlay = document.getElementById('quicksort-overlay');
    const listEl = document.getElementById('quicksort-list');
    if (!overlay || !listEl) return;

    const unsorted = (window._tracks || []).filter(t2 => !t2.language);
    if (!unsorted.length) {
      if (window.toast) toast('Visām dziesmām jau ir norādīta valoda.', 'ok');
      return;
    }

    listEl.innerHTML = unsorted.map(tr => `
      <div class="quicksort-row" data-id="${tr._id}">
        <div class="qs-title" title="${escapeAttr(tr.title || '')}">${escapeHtml(tr.title || '')}</div>
        <select class="qs-lang-select">
          <option value="">— valoda —</option>
          <option value="LV">🇱🇻 Latviešu</option>
          <option value="EN">🇬🇧 English</option>
        </select>
        <span class="qs-saved">✓ saglabāts</span>
      </div>
    `).join('');

    async function saveField(row, field, value) {
      const id = row.dataset.id;
      try {
        const res = await fetch(`/api/tracks/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          const savedEl = row.querySelector('.qs-saved');
          savedEl.classList.add('show');
          if (typeof loadTracks === 'function') await loadTracks();
        } else if (window.toast) {
          toast('Neizdevās saglabāt — mēģini vēlreiz.', 'err');
        }
      } catch (err) {
        if (window.toast) toast('Neizdevās saglabāt — pārbaudi savienojumu.', 'err');
      }
    }

    listEl.querySelectorAll('.quicksort-row .qs-lang-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        if (!e.target.value) return;
        const row = e.target.closest('.quicksort-row');
        sel.disabled = true;
        saveField(row, 'language', e.target.value);
      });
    });

    overlay.classList.add('open');
  };
  window.closeQuickSort = function () {
    const overlay = document.getElementById('quicksort-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  // ── CSV eksports ──
  const exportBtn = document.getElementById('export-csv-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const tracks = window._tracks || [];
      if (!tracks.length) {
        if (window.toast) toast('Nav dziesmu, ko eksportēt.', 'err');
        return;
      }
      const header = ['Nosaukums', 'Izpildītājs', 'Žanrs', 'Pievienots'];
      const rows = tracks.map(t => [
        t.title || '',
        t.artist || '',
        t.genre || '',
        t.createdAt ? new Date(t.createdAt).toLocaleDateString('lv-LV') : ''
      ]);
      const csv = [header, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dziesmas.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
})();

// ══════════════════════════════════════════════════
//  ATSKAŅOTĀJA NOTURĪBA
//  — atkārtoti mēģinājumi kļūdas gadījumā
//  — pašreizējās dziesmas un pozīcijas saglabāšana/atjaunošana
//  — redzama kļūda, ja serveris/tīkls nereaģē (nevis klusa "nomiršana")
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  if (!pbAudio) return;

  // ── Atkārtoti mēģinājumi, ja dziesma neielādējas ──
  let audioRetryCount = 0;
  const MAX_AUDIO_RETRIES = 3;
  pbAudio.addEventListener('playing', () => { audioRetryCount = 0; });
  pbAudio.addEventListener('error', () => {
    if (!pbAudio.src) return;
    audioRetryCount++;
    if (audioRetryCount <= MAX_AUDIO_RETRIES) {
      if (window.toast) toast(`⚠️ Audio ielādes kļūda — mēģinu vēlreiz (${audioRetryCount}/${MAX_AUDIO_RETRIES})...`, 'err');
      setTimeout(() => {
        const srcNow = pbAudio.src;
        pbAudio.src = srcNow;
        pbAudio.load();
        pbAudio.play().catch(() => {});
      }, 1200 * audioRetryCount); // pieaugoša aizkave starp mēģinājumiem
    } else {
      if (window.toast) toast('⚠️ Neizdevās atskaņot šo dziesmu — pārejam uz nākamo.', 'err');
      audioRetryCount = 0;
      setTimeout(() => {
        if (typeof playAdjacentTrack === 'function') playAdjacentTrack(1);
      }, 800);
    }
  });

  // ── Servera/tīkla pieejamības uzraudzība ──
  let serverIssueToastShown = false;
  pbAudio.addEventListener('stalled', () => {
    if (!serverIssueToastShown) {
      serverIssueToastShown = true;
      if (window.toast) toast('⚠️ Savienojums pārtrūkst — mēģinu atjaunot atskaņošanu...', 'err');
      setTimeout(() => { serverIssueToastShown = false; }, 8000);
    }
  });

  // ── Pašreizējās dziesmas + pozīcijas saglabāšana ──
  let lastSaveTs = 0;
  function savePlaybackState() {
    if (typeof currentTrackId === 'undefined' || !currentTrackId) return;
    try {
      localStorage.setItem('sp_playback_state', JSON.stringify({
        trackId: currentTrackId,
        position: pbAudio.currentTime || 0,
        ts: Date.now(),
      }));
    } catch (e) { /* localStorage nav pieejams — nav kritiski */ }
  }
  pbAudio.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - lastSaveTs > 4000) { lastSaveTs = now; savePlaybackState(); }
  });
  pbAudio.addEventListener('pause', savePlaybackState);
  window.addEventListener('beforeunload', savePlaybackState);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') savePlaybackState();
  });

  // ── Atjaunošana pēc lapas atkārtotas atvēršanas ──
  function restorePlaybackState() {
    try {
      const raw = localStorage.getItem('sp_playback_state');
      if (!raw) return;
      const state = JSON.parse(raw);
      if (!state || !state.trackId) return;
      if (Date.now() - (state.ts || 0) > 7 * 24 * 60 * 60 * 1000) return; // vecāks par nedēļu — neatjaunojam

      const tracks = window._tracks || [];
      const track = tracks.find(t2 => t2._id === state.trackId);
      if (!track) return;

      currentTrackId = state.trackId; // atjauno app.js koplietoto mainīgo (nevis window.*)

      const bar = document.getElementById('player-bar');
      bar.classList.add('show');
      document.getElementById('pb-title').textContent = track.title;
      document.getElementById('pb-artist').textContent = track.artist || '';
      document.getElementById('pb-cover').src = track.coverUrl || '';
      pbAudio.src = track.cloudUrl;
      pbAudio.currentTime = state.position || 0;
      // Apzināti nepalaižam automātiski — pārlūki bloķē autoplay bez
      // lietotāja žesta. Atskaņotājs parādās gatavs turpināt no tās
      // pašas vietas, tiklīdz lietotājs nospiež Play.

      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || '',
          artist: track.artist || '',
          artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '512x512', type: 'image/png' }] : [],
        });
        navigator.mediaSession.playbackState = 'paused';
      }
    } catch (e) { /* nekas nesaglabājas — vienkārši sākam no jauna */ }
  }

  // Pieķeramies app.js definētajai loadTracks() funkcijai, lai atjaunošana
  // notiktu tieši pēc tam, kad dziesmu saraksts pirmoreiz ielādēts.
  if (typeof window.loadTracks === 'function') {
    const originalLoadTracks = window.loadTracks;
    let restored = false;
    window.loadTracks = async function (...args) {
      const result = await originalLoadTracks.apply(this, args);
      if (!restored) { restored = true; restorePlaybackState(); }
      return result;
    };
  }
})();

// ══════════════════════════════════════════════════
//  VIĻŅA JOSLA (waveform scrubber) — īstā skaņdarba forma,
//  ne tikai taisna līnija. Ja CORS/audio avots to neatļauj,
//  klusi paliek vecā taisnā progresa josla.
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  const canvas = document.getElementById('np-waveform');
  const progressFill = document.getElementById('np-progress-fill');
  const progressWrap = document.getElementById('np-progress');
  if (!pbAudio || !canvas || !progressWrap) return;

  const ctx2d = canvas.getContext('2d');
  const peaksCache = {}; // trackId -> Float32Array ar virsotņu vērtībām (0..1)
  let currentPeaks = null;

  function resizeCanvas() {
    const rect = progressWrap.getBoundingClientRect();
    canvas.width = Math.max(200, Math.round(rect.width));
    canvas.height = Math.max(30, Math.round(rect.height));
  }

  function drawWaveform(peaks, progressFrac) {
    if (!peaks) return;
    resizeCanvas();
    const w = canvas.width, h = canvas.height;
    ctx2d.clearRect(0, 0, w, h);
    const barCount = peaks.length;
    const barW = w / barCount;
    const progressIdx = Math.floor(progressFrac * barCount);
    for (let i = 0; i < barCount; i++) {
      const barH = Math.max(2, peaks[i] * h);
      ctx2d.fillStyle = i <= progressIdx ? '#ff3d81' : 'rgba(255,255,255,.22)';
      ctx2d.fillRect(i * barW, (h - barH) / 2, Math.max(1, barW - 1), barH);
    }
  }

  async function computePeaks(trackId, url) {
    if (peaksCache[trackId]) return peaksCache[trackId];
    try {
      const res = await fetch(url, { mode: 'cors' });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuf = await audioCtx.decodeAudioData(buf);
      const raw = audioBuf.getChannelData(0);
      const samples = 140;
      const blockSize = Math.floor(raw.length / samples);
      const peaks = new Float32Array(samples);
      for (let i = 0; i < samples; i++) {
        let max = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j++) {
          const v = Math.abs(raw[start + j] || 0);
          if (v > max) max = v;
        }
        peaks[i] = max;
      }
      // normalizē, lai klusākie ieraksti arī izskatītos labi
      const peakMax = Math.max(...peaks, 0.01);
      for (let i = 0; i < peaks.length; i++) peaks[i] = peaks[i] / peakMax;
      peaksCache[trackId] = peaks;
      audioCtx.close();
      return peaks;
    } catch (e) {
      return null; // CORS vai cita kļūda — paliekam pie vienkāršās joslas
    }
  }

  async function loadWaveformFor(trackId, url) {
    canvas.classList.remove('ready');
    if (progressFill) progressFill.classList.remove('hidden-by-waveform');
    currentPeaks = null;
    const peaks = await computePeaks(trackId, url);
    if (!peaks || trackId !== currentTrackId) return; // dziesma jau nomainījusies, kamēr gaidījām
    currentPeaks = peaks;
    canvas.classList.add('ready');
    if (progressFill) progressFill.classList.add('hidden-by-waveform');
    drawWaveform(currentPeaks, pbAudio.duration ? pbAudio.currentTime / pbAudio.duration : 0);
  }

  pbAudio.addEventListener('play', () => {
    if (!currentTrackId) return;
    if (document.hidden) return; // lapa fonā — netērējam resursus smagai audio dekodēšanai tieši tagad
    const track = (window._tracks || []).find(t2 => t2._id === currentTrackId);
    if (track && track.cloudUrl) loadWaveformFor(currentTrackId, track.cloudUrl);
  });

  // Kad lietotājs atgriežas pie lapas, ja vilnis vēl nav aprēķināts šai
  // dziesmai, izdarām to tagad (agrāk to varējām izlaist, jo lapa bija fonā).
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && currentTrackId && !currentPeaks) {
      const track = (window._tracks || []).find(t2 => t2._id === currentTrackId);
      if (track && track.cloudUrl) loadWaveformFor(currentTrackId, track.cloudUrl);
    }
  });

  pbAudio.addEventListener('timeupdate', () => {
    if (!currentPeaks || !pbAudio.duration) return;
    drawWaveform(currentPeaks, pbAudio.currentTime / pbAudio.duration);
  });

  canvas.addEventListener('click', (e) => {
    if (!pbAudio.duration) return;
    const rect = canvas.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    pbAudio.currentTime = Math.max(0, Math.min(1, frac)) * pbAudio.duration;
  });

  window.addEventListener('resize', () => {
    if (currentPeaks) drawWaveform(currentPeaks, pbAudio.duration ? pbAudio.currentTime / pbAudio.duration : 0);
  });
})();

// ══════════════════════════════════════════════════
//  SINHRONIZĒTI DZIESMAS VĀRDI — atbalsta LRC formātu
//  ([mm:ss.xx]rinda). Ja vārdi ir bez laika atzīmēm, vienkārši
//  parāda tos kā parastu tekstu (bez izcelšanas) — godīgi, bez
//  izlikšanās, ka tas ir precīzi sinhronizēts, ja tas tā nav.
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  const toggleBtn = document.getElementById('np-lyrics-toggle');
  const panel = document.getElementById('np-lyrics-panel');
  if (!pbAudio || !toggleBtn || !panel) return;

  let parsedLines = []; // {time, text} — time === null, ja nav laika atzīmes
  let hasTimestamps = false;

  function parseLyrics(raw) {
    if (!raw) return [];
    const lines = raw.split('\n');
    const lrcRegex = /^\[(\d{1,2}):(\d{2})(?:\.(\d{1,2}))?\]\s*(.*)$/;
    const result = [];
    let anyTimestamp = false;
    lines.forEach(line => {
      const m = line.match(lrcRegex);
      if (m) {
        anyTimestamp = true;
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const frac = m[3] ? parseInt(m[3], 10) / (m[3].length === 1 ? 10 : 100) : 0;
        result.push({ time: mins * 60 + secs + frac, text: m[4] });
      } else if (line.trim()) {
        result.push({ time: null, text: line.trim() });
      }
    });
    hasTimestamps = anyTimestamp;
    return result;
  }

  function renderLyrics() {
    if (!parsedLines.length) {
      panel.innerHTML = `<p style="opacity:.6">Šai dziesmai nav pievienoti vārdi.</p>`;
      return;
    }
    panel.innerHTML = parsedLines.map((l, i) =>
      `<div class="lyric-line" data-i="${i}">${l.text ? escapeHtml(l.text) : '&nbsp;'}</div>`
    ).join('');
  }

  pbAudio.addEventListener('play', () => {
    const track = (window._tracks || []).find(t2 => t2._id === currentTrackId);
    const lyrics = track ? track.lyrics : '';
    parsedLines = parseLyrics(lyrics || '');
    toggleBtn.style.display = parsedLines.length ? '' : 'none';
    if (!parsedLines.length) { panel.classList.remove('open'); }
    if (panel.classList.contains('open')) renderLyrics();
  });

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) renderLyrics();
  });

  pbAudio.addEventListener('timeupdate', () => {
    if (!hasTimestamps || !panel.classList.contains('open')) return;
    const t = pbAudio.currentTime;
    let activeIdx = -1;
    for (let i = 0; i < parsedLines.length; i++) {
      if (parsedLines[i].time !== null && parsedLines[i].time <= t) activeIdx = i;
    }
    panel.querySelectorAll('.lyric-line').forEach((el, i) => {
      el.classList.toggle('active', i === activeIdx);
    });
    if (activeIdx >= 0) {
      const activeEl = panel.querySelector(`.lyric-line[data-i="${activeIdx}"]`);
      if (activeEl) activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
})();

// ══════════════════════════════════════════════════
//  KLAVIATŪRAS ĪSCEĻI — atstarpe (play/pause), bultiņas
//  (nākamā/iepriekšējā, 5s tinšana). Neaktivizējas, kamēr
//  raksti kādā ievades laukā vai atvērts modālais logs.
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  if (!pbAudio) return;

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!document.getElementById('player-bar')?.classList.contains('show')) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (pbAudio.paused) pbAudio.play().catch(() => {}); else pbAudio.pause();
        break;
      case 'ArrowRight':
        if (e.shiftKey) { if (typeof playAdjacentTrack === 'function') playAdjacentTrack(1); }
        else { pbAudio.currentTime = Math.min(pbAudio.duration || 0, pbAudio.currentTime + 5); }
        break;
      case 'ArrowLeft':
        if (e.shiftKey) { if (typeof playAdjacentTrack === 'function') playAdjacentTrack(-1); }
        else { pbAudio.currentTime = Math.max(0, pbAudio.currentTime - 5); }
        break;
    }
  });
})();

// ══════════════════════════════════════════════════
//  🎉 DJ JUKEBOX — reāllaika kopienas balsošana
// ══════════════════════════════════════════════════
(function () {
  if (typeof socket === 'undefined') return;
  const banner = document.getElementById('jukebox-banner');
  const leaderNameEl = document.getElementById('jukebox-leader-name');
  const timerEl = document.getElementById('jukebox-timer');
  const playLeaderBtn = document.getElementById('jukebox-play-leader');
  if (!banner) return;

  let currentLeaderId = null;
  let roundEndsAt = Date.now() + 90000;
  let timerInterval = null;

  window.castJukeboxVote = function (trackId) {
    try {
      const votedKey = 'sp_jukebox_voted';
      if (sessionStorage.getItem(votedKey)) {
        if (window.toast) toast('Šajā raundā jau nobalsoji — nākamais raunds sāksies drīz.', 'err');
        return;
      }
      socket.emit('jukebox-vote', trackId);
      sessionStorage.setItem(votedKey, '1');
      if (window.toast) toast('🗳️ Paldies par balsi!', 'ok');
    } catch (e) {}
  };

  function updateBanner(state) {
    if (!state || !state.leaderId || !state.leaderVotes) {
      banner.style.display = 'none';
      currentLeaderId = null;
      return;
    }
    const track = (window._tracks || []).find(t2 => t2._id === state.leaderId);
    if (!track) { banner.style.display = 'none'; return; }
    currentLeaderId = state.leaderId;
    leaderNameEl.textContent = `${track.title} — ${track.artist || ''} (${state.leaderVotes} ${state.leaderVotes === 1 ? 'balss' : 'balsis'})`;
    banner.style.display = 'flex';
  }

  socket.on('jukebox-update', (state) => { updateBanner(state); });
  socket.on('jukebox-round-ended', () => {
    try { sessionStorage.removeItem('sp_jukebox_voted'); } catch (e) {}
    roundEndsAt = Date.now() + 90000;
  });

  playLeaderBtn?.addEventListener('click', () => {
    if (currentLeaderId && typeof playTrack === 'function') playTrack(currentLeaderId, 'library');
  });

  timerInterval = setInterval(() => {
    const secsLeft = Math.max(0, Math.round((roundEndsAt - Date.now()) / 1000));
    if (timerEl) timerEl.textContent = `nākamais raunds pēc ${secsLeft}s`;
  }, 1000);
})();

// ══════════════════════════════════════════════════
//  📻 RADIO REŽĪMS — viena poga, mūzika spēlē mūžīgi pati
// ══════════════════════════════════════════════════
(function () {
  const btn = document.getElementById('radio-mode-btn');
  const pbAudio = document.getElementById('pb-audio');
  if (!btn || !pbAudio) return;

  let radioOn = false;
  const baseTitle = 'Ieslēgt/izslēgt radio — spēlē mūžīgi, pati izvēloties';

  btn.addEventListener('click', () => {
    if (radioOn) {
      radioOn = false;
      btn.classList.remove('active');
      btn.title = baseTitle;
      return;
    }

    const tracks = window._tracks || [];
    const pool = tracks.filter(t2 => t2.language); // tikai jau sašķirotas (LV vai EN) dziesmas

    if (!pool.length) {
      if (window.toast) toast('Vēl nav dziesmu, ko atskaņot.', 'err');
      return;
    }

    radioOn = true;
    btn.classList.add('active');
    btn.title = 'Radio ieslēgts — spied, lai izslēgtu';

    // ieslēdzam jaukšanu, lai radio nekad neatkārto vienā secībā
    const shuffleBtn = document.getElementById('pb-shuffle');
    if (shuffleBtn && !shuffleBtn.classList.contains('active')) shuffleBtn.click();

    const randomTrack = pool[Math.floor(Math.random() * pool.length)];
    if (typeof playTrack === 'function') playTrack(randomTrack._id, 'library');
  });

  // Ja lietotājs pats manuāli nospiež pauzi atskaņotājā (nevis radio pogu),
  // uzskatām, ka radio ir apturēts — bet NEreaģējam uz īslaicīgo pauzi,
  // kas notiek katru reizi, kad dziesma tiek nomainīta (playTrack iekšēji
  // uz mirkli izsauc pause() pirms jaunā avota ielādes).
  let switchingTrack = false;
  const origPlayTrack = window.playTrack;
  if (typeof origPlayTrack === 'function') {
    window.playTrack = function (...args) {
      switchingTrack = true;
      const result = origPlayTrack.apply(this, args);
      setTimeout(() => { switchingTrack = false; }, 150);
      return result;
    };
  }
  pbAudio.addEventListener('pause', () => {
    if (radioOn && !switchingTrack) {
      radioOn = false;
      btn.classList.remove('active');
      btn.title = baseTitle;
    }
  });
})();

// ══════════════════════════════════════════════════
//  WAKE LOCK — aizkavē telefona ekrāna automātisku aptumšošanos/
//  aizslēgšanos NEAKTIVITĀTES dēļ, kamēr spēlē mūzika. GODĪGI:
//  šis NEDARBOJAS, ja lietotājs PATS manuāli nospiež aizslēgšanas
//  pogu — tas ir OS drošības ierobežojums, ko neviena mājaslapa
//  nevar apiet. Šis palīdz tikai gadījumā, kad telefons pats
//  aizmieg no neaktivitātes, kamēr klausies.
// ══════════════════════════════════════════════════
(function () {
  const pbAudio = document.getElementById('pb-audio');
  if (!pbAudio || !('wakeLock' in navigator)) return;

  let wakeLock = null;

  async function requestWakeLock() {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
    } catch (e) { /* piem. akumulatora taupīšanas režīms — klusi izlaižam */ }
  }

  pbAudio.addEventListener('play', () => { requestWakeLock(); });
  pbAudio.addEventListener('pause', () => {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  });

  // Wake Lock automātiski atceļas, kad lapa kļūst neredzama (piem., cilne
  // pārslēgta) — atjaunojam to, tiklīdz atgriežamies, ja mūzika joprojām spēlē.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !pbAudio.paused && !wakeLock) requestWakeLock();
  });
})();

// ══════════════════════════════════════════════════
//  ATSKAŅOTĀJS AUGŠĀ — izmēra reālo header augstumu (tas mainās
//  mobilajā, kad izvēlne pāriet uz otru rindu) un iestata to kā CSS
//  mainīgo, lai atskaņotāja josla vienmēr precīzi pieguļ zem header,
//  neatkarīgi no ekrāna izmēra.
// ══════════════════════════════════════════════════
(function () {
  const header = document.querySelector('header');
  if (!header) return;

  function updateHeaderHeight() {
    const h = header.offsetHeight;
    if (h > 0) document.documentElement.style.setProperty('--header-h', h + 'px');
  }

  updateHeaderHeight();
  window.addEventListener('resize', updateHeaderHeight);
  window.addEventListener('load', updateHeaderHeight);
  // Header saturs (piem., "klausās tagad" skaitītājs) var mainīt tā augstumu
  // pēc sākotnējās ielādes — pārbaudām vēlreiz pēc īsa brīža, drošības pēc.
  setTimeout(updateHeaderHeight, 500);
  setTimeout(updateHeaderHeight, 1500);
})();
