// ═══════════════════════════════════════════════════
//  Modernais mūzikas atskaņotājs
// ═══════════════════════════════════════════════════

class PulssPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.queue = [];
    this.currentIndex = -1;
    this.shuffleOn = false;
    this.repeatMode = 'off'; // off | one | all
    this.shuffleOrder = [];

    this.els = {
      bar: document.getElementById('player'),
      cover: document.getElementById('playerCover'),
      title: document.getElementById('playerTitle'),
      artist: document.getElementById('playerArtist'),
      playBtn: document.getElementById('playBtn'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      shuffleBtn: document.getElementById('shuffleBtn'),
      repeatBtn: document.getElementById('repeatBtn'),
      seek: document.getElementById('seekBar'),
      curTime: document.getElementById('curTime'),
      durTime: document.getElementById('durTime'),
      volume: document.getElementById('volumeBar'),
      volBtn: document.getElementById('volBtn'),
    };

    this._bindAudioEvents();
    this._bindControls();
    this._bindMediaSession();

    const savedVol = parseFloat(localStorage.getItem('pulss_volume'));
    this.audio.volume = isNaN(savedVol) ? 0.8 : savedVol;
    if (this.els.volume) this.els.volume.value = this.audio.volume;
  }

  setQueue(songs, startIndex = 0) {
    this.queue = songs;
    this.shuffleOrder = [...Array(songs.length).keys()];
    this.currentIndex = startIndex;
    this._loadCurrent();
  }

  playSongList(songs, index) {
    this.setQueue(songs, index);
    this.play();
  }

  _loadCurrent() {
    const song = this.queue[this.currentIndex];
    if (!song) return;
    this.audio.src = song.cloudUrl;
    if (this.els.cover) this.els.cover.src = song.coverUrl || '/img/default-cover.svg';
    if (this.els.title) this.els.title.textContent = song.title;
    if (this.els.artist) this.els.artist.textContent = song.artist || i18n.t('unknown_artist');
    if (this.els.bar) this.els.bar.classList.add('active');
    this._updateMediaSession(song);
    this._registerPlay(song._id);
    document.dispatchEvent(new CustomEvent('songchange', { detail: { song } }));
  }

  async _registerPlay(id) {
    try { await fetch(`/api/songs/${id}/play`, { method: 'POST' }); } catch (e) {}
  }

  play() {
    if (this.currentIndex < 0 && this.queue.length) this.currentIndex = 0;
    if (this.currentIndex < 0) return;
    if (!this.audio.src) this._loadCurrent();
    this.audio.play().catch(() => {});
  }

  pause() { this.audio.pause(); }

  togglePlay() {
    if (this.audio.paused) this.play(); else this.pause();
  }

  next(auto = false) {
    if (!this.queue.length) return;
    if (this.repeatMode === 'one' && auto) {
      this.audio.currentTime = 0;
      this.play();
      return;
    }
    let nextIdx;
    if (this.shuffleOn) {
      const pos = this.shuffleOrder.indexOf(this.currentIndex);
      nextIdx = this.shuffleOrder[(pos + 1) % this.shuffleOrder.length];
    } else {
      nextIdx = this.currentIndex + 1;
    }
    if (nextIdx >= this.queue.length || nextIdx === undefined) {
      if (this.repeatMode === 'all') nextIdx = 0;
      else { this.pause(); return; }
    }
    this.currentIndex = nextIdx;
    this._loadCurrent();
    this.play();
  }

  prev() {
    if (!this.queue.length) return;
    if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
    let prevIdx = this.shuffleOn
      ? this.shuffleOrder[(this.shuffleOrder.indexOf(this.currentIndex) - 1 + this.shuffleOrder.length) % this.shuffleOrder.length]
      : this.currentIndex - 1;
    if (prevIdx < 0) prevIdx = this.queue.length - 1;
    this.currentIndex = prevIdx;
    this._loadCurrent();
    this.play();
  }

  toggleShuffle() {
    this.shuffleOn = !this.shuffleOn;
    if (this.shuffleOn) {
      this.shuffleOrder = [...Array(this.queue.length).keys()].sort(() => Math.random() - 0.5);
    }
    this.els.shuffleBtn?.classList.toggle('on', this.shuffleOn);
  }

  cycleRepeat() {
    const order = ['off', 'all', 'one'];
    this.repeatMode = order[(order.indexOf(this.repeatMode) + 1) % order.length];
    this.els.repeatBtn?.classList.toggle('on', this.repeatMode !== 'off');
    this.els.repeatBtn?.setAttribute('data-mode', this.repeatMode);
  }

  seekTo(fraction) {
    if (this.audio.duration) this.audio.currentTime = fraction * this.audio.duration;
  }

  setVolume(v) {
    this.audio.volume = v;
    localStorage.setItem('pulss_volume', v);
  }

  _fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  _bindAudioEvents() {
    this.audio.addEventListener('play', () => this.els.playBtn?.classList.add('playing'));
    this.audio.addEventListener('pause', () => this.els.playBtn?.classList.remove('playing'));
    this.audio.addEventListener('ended', () => this.next(true));
    this.audio.addEventListener('timeupdate', () => {
      if (this.els.seek && this.audio.duration) {
        this.els.seek.value = (this.audio.currentTime / this.audio.duration) * 100;
      }
      if (this.els.curTime) this.els.curTime.textContent = this._fmtTime(this.audio.currentTime);
    });
    this.audio.addEventListener('loadedmetadata', () => {
      if (this.els.durTime) this.els.durTime.textContent = this._fmtTime(this.audio.duration);
    });
  }

  _bindControls() {
    this.els.playBtn?.addEventListener('click', () => this.togglePlay());
    this.els.nextBtn?.addEventListener('click', () => this.next());
    this.els.prevBtn?.addEventListener('click', () => this.prev());
    this.els.shuffleBtn?.addEventListener('click', () => this.toggleShuffle());
    this.els.repeatBtn?.addEventListener('click', () => this.cycleRepeat());
    this.els.seek?.addEventListener('input', (e) => this.seekTo(e.target.value / 100));
    this.els.volume?.addEventListener('input', (e) => this.setVolume(parseFloat(e.target.value)));

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePlay(); }
      if (e.code === 'ArrowRight' && e.shiftKey) this.next();
      if (e.code === 'ArrowLeft' && e.shiftKey) this.prev();
    });
  }

  _bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
  }

  _updateMediaSession(song) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist || '',
      artwork: song.coverUrl ? [{ src: song.coverUrl, sizes: '500x500', type: 'image/jpeg' }] : [],
    });
  }
}
