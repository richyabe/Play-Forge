class MemoryGame {
  constructor(boardId) {
    this.el      = document.getElementById(boardId);
    this.cards   = [];
    this.flipped = [];
    this.matched = [];
    this.moves   = 0;
    this.lock    = false;
    this.running = false;
  }

  init() {
    const emojis = ['🎮', '🎯', '🎲', '🎸', '🎨', '🚀', '💎', '🔥'];
    this.cards   = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    this.flipped = [];
    this.matched = [];
    this.moves   = 0;
    this.lock    = false;
    this.running = true;

    document.getElementById('game-score').textContent = '0';
    const best = PlayForge.storage.getScore('memory');
    document.getElementById('game-hs').textContent    = best || '—';

    this.render();
  }

  render() {
    this.el.innerHTML = '';
    this.cards.forEach((emoji, i) => {
      const wrap  = document.createElement('div');
      wrap.className    = 'memory-card';
      wrap.dataset.i    = i;
      wrap.style.width  = '100%';
      wrap.style.height = '0';
      wrap.style.paddingBottom = '100%';
      wrap.style.position = 'relative';

      const inner = document.createElement('div');
      inner.className = 'memory-inner';
      inner.style.position = 'absolute';
      inner.style.inset = '0';

      const back  = document.createElement('div');
      back.className  = 'memory-face memory-back';
      back.textContent = '?';

      const front = document.createElement('div');
      front.className  = 'memory-face memory-front';
      front.textContent = emoji;

      inner.append(back, front);
      wrap.append(inner);
      wrap.addEventListener('click', () => this.handleClick(i, inner));
      this.el.append(wrap);
    });
  }

  handleClick(i, inner) {
    if (!this.running || this.lock) return;
    if (inner.classList.contains('flipped')) return;
    if (this.flipped.some(f => f.i === i)) return;

    PlayForge.playSound(450, 0.05);
    inner.classList.add('flipped');
    this.flipped.push({ i, inner, val: this.cards[i] });

    if (this.flipped.length === 2) {
      this.moves++;
      document.getElementById('game-score').textContent = this.moves;
      this.lock = true;
      setTimeout(() => this.check(), 700);
    }
  }

  check() {
    const [a, b] = this.flipped;
    if (a.val === b.val) {
      this.matched.push(a.i, b.i);
      // Mark matched cards
      [a.inner, b.inner].forEach(el => {
        el.closest('.memory-card').classList.add('matched');
      });
      PlayForge.playSound(800, 0.1);
      this.flipped = [];
      this.lock    = false;
      if (this.matched.length === this.cards.length) this.win();
    } else {
      a.inner.classList.remove('flipped');
      b.inner.classList.remove('flipped');
      this.flipped = [];
      this.lock    = false;
      PlayForge.playSound(250, 0.1);
    }
  }

  win() {
    this.running = false;
    // For memory: lower moves is better — store as score, compare inverted
    // Store moves directly; scores page shows raw value
    const stored = PlayForge.storage.getScore('memory');
    if (!stored || this.moves < stored) {
      PlayForge.storage.storage
        ? PlayForge.storage.storage.set('hs_memory', this.moves)
        : PlayForge.storage.set('hs_memory', this.moves);
    }
    // Use the store directly
    try { localStorage.setItem('pf_hs_memory', this.moves); } catch {}
    PlayForge.storage.incPlays('memory');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('🏆 Win in ' + this.moves + ' moves!');
    PlayForge.playSound(900, 0.4);
    document.getElementById('game-hs').textContent = this.moves;
  }

  pause()  {}
  resume() {}
  restart() { this.cleanup(); this.init(); }
  cleanup() { this.running = false; this.el.innerHTML = ''; }
}

window.currentGame    = new MemoryGame('mem-board');
PlayForge.currentGame = window.currentGame;
window.currentGame.init();