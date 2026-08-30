// public/js/radio-dj.js
//
// Standalone Radio DJ module. Encapsulates "shuffled playback" as its own
// small state machine so the player code never has to know how shuffling
// works internally — it just asks RadioDJ "what's next?" / "what's previous?"
//
// Why a separate module: keeping shuffle history and on/off state inside the
// main player made it easy to introduce subtle bugs when touching unrelated
// player code (which is exactly what happened in the design preview). This
// class has one job, is easy to unit-test in isolation, and can be dropped
// into any player that exposes a plain (currentIndex, total) interface.

class RadioDJ {
  constructor({ onModeChange } = {}) {
    this.enabled = false;
    this.history = [];
    this.onModeChange = typeof onModeChange === 'function' ? onModeChange : () => {};
  }

  isEnabled() {
    return this.enabled;
  }

  // Turns shuffle mode on/off. Clears history on every toggle so "previous"
  // never walks back into a session from before it was last turned on.
  toggle() {
    this.enabled = !this.enabled;
    this.history = [];
    this.onModeChange(this.enabled);
    return this.enabled;
  }

  reset() {
    this.history = [];
  }

  // Records a track as "played" so pickPrev() can retrace it later.
  remember(index) {
    if (index === -1 || index === undefined || index === null) return;
    this.history.push(index);
    if (this.history.length > 100) this.history.shift();
  }

  // Returns the index that should play next. Falls back to normal sequential
  // order when shuffle is off, or when there's nothing to shuffle between.
  pickNext(currentIndex, total) {
    if (total <= 0) return -1;
    if (!this.enabled || total === 1) {
      return (currentIndex + 1 + total) % total;
    }
    this.remember(currentIndex);
    let idx;
    do {
      idx = Math.floor(Math.random() * total);
    } while (idx === currentIndex);
    return idx;
  }

  // Returns the index that should play on "previous". In shuffle mode this
  // retraces actual listening history rather than jumping to index - 1.
  pickPrev(currentIndex, total) {
    if (total <= 0) return -1;
    if (this.enabled && this.history.length) {
      return this.history.pop();
    }
    return (currentIndex - 1 + total) % total;
  }
}

window.RadioDJ = RadioDJ;
