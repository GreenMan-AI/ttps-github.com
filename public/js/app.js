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
