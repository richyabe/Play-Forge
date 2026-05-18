class Game2048 {
  constructor(gridId) {
    this.el      = document.getElementById(gridId);
    this.grid    = [];
    this.score   = 0;
    this.running = false;
    this.won     = false;
    this.handler = null;
  }

  init() {
    this.grid    = Array(4).fill(null).map(() => Array(4).fill(0));
    this.score   = 0;
    this.running = true;
    this.won     = false;
    this.addTile();
    this.addTile();
    this.render();
    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('2048');
    this.bind();
  }

  addTile() {
    const empty = [];
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (!this.grid[r][c]) empty.push({ r, c });
    if (empty.length) {
      const { r, c } = empty[Math.floor(Math.random() * empty.length)];
      this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  render() {
    const colors = {
      0: '#1a1a2e', 2: '#1e3a5f', 4: '#1d4ed8', 8: '#0284c7',
      16: '#0d9488', 32: '#16a34a', 64: '#ca8a04', 128: '#ea580c',
      256: '#dc2626', 512: '#9333ea', 1024: '#db2777', 2048: '#fde047'
    };
    this.el.innerHTML = '';
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = this.grid[r][c];
        const d   = document.createElement('div');
        d.className   = 'tile-2048';
        d.textContent = val || '';
        d.style.background = colors[val] || '#2a003a';
        d.style.color      = val > 4 ? '#fff' : '#94a3b8';
        d.style.fontSize   = val >= 1024 ? '12px' : val >= 128 ? '14px' : '18px';
        if (val) d.style.boxShadow = `0 0 8px ${colors[val]}55`;
        this.el.appendChild(d);
      }
    }
  }

  slideRow(row) {
    let a = row.filter(x => x);
    for (let i = 0; i < a.length - 1; i++) {
      if (a[i] === a[i + 1]) {
        a[i] *= 2;
        this.score += a[i];
        a.splice(i + 1, 1);
      }
    }
    while (a.length < 4) a.push(0);
    return a;
  }

  // Transpose matrix
  transpose(m) {
    return m[0].map((_, i) => m.map(row => row[i]));
  }

  move(dir) {
    if (!this.running) return;
    let m = this.grid.map(r => [...r]);

    if (dir === 'left') {
      m = m.map(r => this.slideRow(r));
    } else if (dir === 'right') {
      m = m.map(r => this.slideRow(r.reverse()).reverse());
    } else if (dir === 'up') {
      m = this.transpose(this.transpose(m).map(r => this.slideRow(r)));
    } else if (dir === 'down') {
      m = this.transpose(this.transpose(m).map(r => this.slideRow(r.reverse()).reverse()));
    }

    if (JSON.stringify(m) === JSON.stringify(this.grid)) return; // no change
    this.grid = m;
    this.addTile();
    this.render();
    document.getElementById('game-score').textContent = this.score;
    PlayForge.playSound(500, 0.04);
    this.checkEnd();
  }

  bind() {
    if (this.handler) document.removeEventListener('keydown', this.handler);
    this.handler = e => {
      if (!this.running) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup'    || k === 'w') { e.preventDefault(); this.move('up');    }
      if (k === 'arrowdown'  || k === 's') { e.preventDefault(); this.move('down');  }
      if (k === 'arrowleft'  || k === 'a') { e.preventDefault(); this.move('left');  }
      if (k === 'arrowright' || k === 'd') { e.preventDefault(); this.move('right'); }
      if (k === ' ' || k === 'enter')      { e.preventDefault(); this.restart();     }
    };
    document.addEventListener('keydown', this.handler);

    // Swipe support
    let sx = 0, sy = 0;
    this.el.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    this.el.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 'right' : 'left');
      else this.move(dy > 0 ? 'down' : 'up');
    }, { passive: true });
  }

  checkEnd() {
    // Win condition
    if (!this.won && this.grid.flat().includes(2048)) {
      this.won = true;
      PlayForge.storage.setScore('2048', this.score);
      PlayForge.storage.incPlays('2048');
      PlayForge.ui.updateScores();
      PlayForge.ui.toast('🎉 You reached 2048!');
      PlayForge.playSound(900, 0.4);
      // Let player continue
    }

    // No empty cells
    if (!this.grid.flat().includes(0)) {
      // Check for any possible merge
      let canMove = false;
      for (let r = 0; r < 4 && !canMove; r++) {
        for (let c = 0; c < 4 && !canMove; c++) {
          if (c < 3 && this.grid[r][c] === this.grid[r][c + 1]) canMove = true;
          if (r < 3 && this.grid[r][c] === this.grid[r + 1][c]) canMove = true;
        }
      }
      if (!canMove) {
        this.running = false;
        PlayForge.storage.setScore('2048', this.score);
        PlayForge.storage.incPlays('2048');
        PlayForge.ui.updateScores();
        PlayForge.ui.toast('💀 No moves left!');
        PlayForge.playSound(200, 0.3);
      }
    }
  }

  pause()  {} // 2048 has no real-time loop
  resume() {}

  restart() {
    this.cleanup();
    this.init();
  }

  cleanup() {
    this.running = false;
    if (this.handler) document.removeEventListener('keydown', this.handler);
  }
}

window.currentGame    = new Game2048('grid-2048');
PlayForge.currentGame = window.currentGame;
window.currentGame.init();