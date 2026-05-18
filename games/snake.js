class SnakeGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.GRID   = 20; // cells
    this.TILE   = 20; // px per cell (canvas 400×400)
    this.snake  = [];
    this.dir    = { x: 1, y: 0 };
    this.nextDir= { x: 1, y: 0 };
    this.food   = {};
    this.speed  = 120; // ms between ticks
    this.last   = 0;
    this.score  = 0;
    this.running= false;
    this.paused = false;
    this.raf    = null;
    this.keyH   = null;
  }

  init() {
    this.score   = 0;
    this.speed   = 120;
    this.dir     = this.nextDir = { x: 1, y: 0 };
    this.snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.running = true;
    this.paused  = false;
    this.last    = 0;

    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('snake');
    document.getElementById('pause-overlay').classList.add('hidden');

    this.placeFood();
    this.bind();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(t => this.loop(t));
  }

  placeFood() {
    let ok = false;
    while (!ok) {
      this.food = {
        x: Math.floor(Math.random() * this.GRID),
        y: Math.floor(Math.random() * this.GRID)
      };
      ok = !this.snake.some(s => s.x === this.food.x && s.y === this.food.y);
    }
  }

  bind() {
    if (this.keyH) document.removeEventListener('keydown', this.keyH);
    this.keyH = e => {
      const map = {
        ArrowUp: 'u', w: 'u',
        ArrowDown: 'd', s: 'd',
        ArrowLeft: 'l', a: 'l',
        ArrowRight: 'r', d: 'r'
      };
      const m = map[e.key];
      if (!m && e.key !== ' ') return;
      e.preventDefault();
      const d = this.dir;
      if (m === 'u' && d.y !==  1) this.nextDir = { x: 0, y: -1 };
      if (m === 'd' && d.y !== -1) this.nextDir = { x: 0, y:  1 };
      if (m === 'l' && d.x !==  1) this.nextDir = { x: -1, y: 0 };
      if (m === 'r' && d.x !== -1) this.nextDir = { x:  1, y: 0 };
      if (e.key === ' ') this.restart();
    };
    document.addEventListener('keydown', this.keyH);
  }

  update(t) {
    if (this.paused || !this.running) return;
    if (t - this.last < this.speed) return;
    this.last = t;
    this.dir  = { ...this.nextDir };

    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y
    };

    // Wall or self collision → game over
    if (
      head.x < 0 || head.x >= this.GRID ||
      head.y < 0 || head.y >= this.GRID ||
      this.snake.some(s => s.x === head.x && s.y === head.y)
    ) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.speed  = Math.max(50, this.speed - 2);
      document.getElementById('game-score').textContent = this.score;
      PlayForge.playSound(600, 0.08);
      this.placeFood();
    } else {
      this.snake.pop();
    }
  }

  draw() {
    const c  = this.ctx;
    const T  = this.TILE;
    c.fillStyle = '#080814';
    c.fillRect(0, 0, 400, 400);

    // Grid lines
    c.strokeStyle = '#15152a'; c.lineWidth = 0.5;
    for (let i = 0; i <= this.GRID; i++) {
      c.beginPath(); c.moveTo(i * T, 0);   c.lineTo(i * T, 400); c.stroke();
      c.beginPath(); c.moveTo(0, i * T);   c.lineTo(400, i * T); c.stroke();
    }

    // Food
    c.fillStyle   = '#ff4757';
    c.shadowColor = '#ff4757'; c.shadowBlur = 14;
    c.beginPath();
    c.arc(this.food.x * T + T / 2, this.food.y * T + T / 2, T / 2 - 2, 0, Math.PI * 2);
    c.fill();

    // Snake
    this.snake.forEach((s, i) => {
      c.fillStyle   = i === 0 ? '#00ff88' : '#00cc66';
      c.shadowColor = c.fillStyle;
      c.shadowBlur  = i === 0 ? 10 : 4;
      c.fillRect(s.x * T + 1, s.y * T + 1, T - 2, T - 2);
    });
    c.shadowBlur = 0;
  }

  loop(t) {
    if (!this.running) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    if (this.paused) { this.draw(); return; }
    this.update(t);
    this.draw();
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    document.getElementById('pause-overlay').classList.remove('hidden');
  }

  resume() {
    this.paused = false;
    this.last   = 0; // prevent jump after resume
    document.getElementById('pause-overlay').classList.add('hidden');
  }

  gameOver() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    PlayForge.storage.setScore('snake', this.score);
    PlayForge.storage.incPlays('snake');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('💀 Game Over — Score: ' + this.score);
    PlayForge.playSound(200, 0.3);

    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, 400, 400);
    c.fillStyle   = '#fff';
    c.font        = 'bold 26px Orbitron, sans-serif';
    c.textAlign   = 'center';
    c.fillText('GAME OVER', 200, 180);
    c.font        = '16px Orbitron, sans-serif';
    c.fillStyle   = '#aaa';
    c.fillText('Score: ' + this.score, 200, 215);
    c.fillText('Press SPACE to restart', 200, 245);
  }

  restart() { this.cleanup(); this.init(); }

  cleanup() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    if (this.keyH) document.removeEventListener('keydown', this.keyH);
  }
}

window.currentGame       = new SnakeGame('game-canvas');
PlayForge.currentGame    = window.currentGame;
window.currentGame.init();