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
