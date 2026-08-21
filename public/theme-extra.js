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
//  ŽANRA IETEIKŠANA PĒC ATSLĒGVĀRDIEM (papildu admin rīks)
// ══════════════════════════════════════════════════
(function () {
  const GENRE_RULES = {
    "Trap / Hip-Hop": ["trap","808","repa","bass","flow","haiterss","rime","spitot","betons"],
    "Synthwave": ["synth","retro","neons","80","analogs","nakts brauciens","vhs"],
    "Lo-fi": ["lofi","lo-fi","čills","mierīgs","lietus","kafija","mācības","relaks"],
    "EDM / Electro": ["drop","festivāls","electro","dejot","bpm","klubs","bass drop"],
    "Indie / Alt": ["ģitāra","dzīvi ierakstīts","alternatīvs","garāža","live","akustika"],
    "Pop": ["refrēns","radio","vasara","dejot kopā","piparmētra","pop"],
    "R&B / Soul": ["dvēsele","mīksts vokāls","nakts skaņa","jūtīgs","romantika"],
    "Rock": ["ģitārsolo","bungas","enerģisks","koncerts","skaļš"],
    "Reggaeton": ["reggaeton","latino","dejo","ritms","vasaras hits"]
  };
  function classifyGenre(text) {
    const t = (text || '').toLowerCase();
    let best = null, bestScore = 0;
    for (const [genre, words] of Object.entries(GENRE_RULES)) {
      let score = 0;
      for (const w of words) { if (t.includes(w)) score++; }
      if (score > bestScore) { bestScore = score; best = genre; }
    }
    return best ? { genre: best, confidence: Math.min(95, 40 + bestScore * 20) } : { genre: null, confidence: 0 };
  }

  const btn = document.getElementById('t-genre-suggest');
  if (btn) {
    btn.addEventListener('click', () => {
      const title = (document.getElementById('t-title')?.value || '');
      const lyrics = (document.getElementById('t-lyrics')?.value || '');
      const result = classifyGenre(title + ' ' + lyrics);
      const genreEl = document.getElementById('t-genre');
      if (result.genre) {
        genreEl.value = result.genre;
        if (window.toast) toast(`✨ Ieteiktais žanrs: ${result.genre} (${result.confidence}% ticamība)`, 'ok');
      } else {
        if (window.toast) toast('Nevarēju noteikt žanru no nosaukuma/vārdiem — ieraksti manuāli.', 'err');
      }
    });
  }

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
