class BreakoutGame {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.W       = 400;
    this.H       = 300;
    this.paddle  = { x: 150, y: 270, w: 80, h: 10 };
    this.ball    = { x: 200, y: 200, r: 7, dx: 4, dy: -4 };
    this.bricks  = [];
    this.lives   = 3;
    this.score   = 0;
    this.running = false;
    this.paused  = false;
    this.launched= false;
    this.raf     = null;
    this.mmH     = null; // mousemove handler
    this.tmH     = null; // touchmove handler
    this.clH     = null; // click handler
    this.khH     = null; // keydown handler
  }

  init() {
    this.score    = 0;
    this.lives    = 3;
    this.running  = true;
    this.paused   = false;
    this.launched = false;

    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('breakout');
    document.getElementById('pause-overlay').classList.add('hidden');

    this.setupBricks();
    this.resetBall();
    this.bind();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  setupBricks() {
    this.bricks = [];
    const rows   = 5;
    const cols   = 8;
    const bW     = 44;
    const bH     = 18;
    const padX   = (this.W - cols * (bW + 4)) / 2;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.bricks.push({
          x: padX + c * (bW + 4),
          y: 30 + r * (bH + 4),
          w: bW, h: bH,
          alive: true,
          color: colors[r]
        });
      }
    }
  }

  resetBall() {
    const px = this.paddle.x + this.paddle.w / 2;
    this.ball = {
      x: px, y: this.paddle.y - 10,
      r: 7,
      dx: (Math.random() > 0.5 ? 1 : -1) * 4,
      dy: -5
    };
    this.launched = false;
  }

  bind() {
    this.unbind();

    this.mmH = e => {
      const rect   = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const mx     = (e.clientX - rect.left) * scaleX;
      this.paddle.x = Math.max(0, Math.min(this.W - this.paddle.w, mx - this.paddle.w / 2));
    };

    this.tmH = e => {
      e.preventDefault();
      const rect   = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const mx     = (e.touches[0].clientX - rect.left) * scaleX;
      this.paddle.x = Math.max(0, Math.min(this.W - this.paddle.w, mx - this.paddle.w / 2));
    };

    this.clH = () => { if (!this.launched) this.launched = true; };

    this.khH = e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.launched = true; }
      if (e.key === 'ArrowLeft')  this.paddle.x = Math.max(0, this.paddle.x - 20);
      if (e.key === 'ArrowRight') this.paddle.x = Math.min(this.W - this.paddle.w, this.paddle.x + 20);
    };

    this.canvas.addEventListener('mousemove', this.mmH);
    this.canvas.addEventListener('touchmove', this.tmH, { passive: false });
    this.canvas.addEventListener('click',     this.clH);
    document.addEventListener('keydown',      this.khH);
  }

  unbind() {
    if (this.mmH) this.canvas.removeEventListener('mousemove', this.mmH);
    if (this.tmH) this.canvas.removeEventListener('touchmove', this.tmH);
    if (this.clH) this.canvas.removeEventListener('click',     this.clH);
    if (this.khH) document.removeEventListener('keydown',      this.khH);
  }

  update() {
    if (!this.running || this.paused) return;

    // Ball follows paddle until launched
    if (!this.launched) {
      this.ball.x = this.paddle.x + this.paddle.w / 2;
      this.ball.y = this.paddle.y - this.ball.r - 2;
      return;
    }

    const b = this.ball;
    b.x += b.dx;
    b.y += b.dy;

    // Wall bounces
    if (b.x - b.r < 0)        { b.x = b.r;           b.dx = Math.abs(b.dx); }
    if (b.x + b.r > this.W)   { b.x = this.W - b.r;  b.dx = -Math.abs(b.dx); }
    if (b.y - b.r < 0)        { b.y = b.r;            b.dy = Math.abs(b.dy); }

    // Ball lost
    if (b.y - b.r > this.H) {
      this.lives--;
      PlayForge.playSound(200, 0.2);
      if (this.lives <= 0) { this.over(); return; }
      this.resetBall();
      return;
    }

    // Paddle collision
    const p = this.paddle;
    if (
      b.dy > 0 &&
      b.y + b.r >= p.y &&
      b.y - b.r <= p.y + p.h &&
      b.x > p.x &&
      b.x < p.x + p.w
    ) {
      b.dy = -Math.abs(b.dy);
      // Angle based on hit position
      const hitPos = (b.x - (p.x + p.w / 2)) / (p.w / 2); // -1 to 1
      b.dx = hitPos * 6;
      if (Math.abs(b.dx) < 1.5) b.dx = b.dx < 0 ? -1.5 : 1.5;
      PlayForge.playSound(500, 0.05);
    }

    // Brick collisions
    for (const br of this.bricks) {
      if (!br.alive) continue;
      if (
        b.x + b.r > br.x &&
        b.x - b.r < br.x + br.w &&
        b.y + b.r > br.y &&
        b.y - b.r < br.y + br.h
      ) {
        br.alive = false;
        // Determine bounce direction
        const overlapX = Math.min(b.x + b.r - br.x, br.x + br.w - (b.x - b.r));
        const overlapY = Math.min(b.y + b.r - br.y, br.y + br.h - (b.y - b.r));
        if (overlapX < overlapY) b.dx *= -1;
        else b.dy *= -1;
        this.score += 10;
        document.getElementById('game-score').textContent = this.score;
        PlayForge.playSound(650, 0.08);
        break; // one brick per frame
      }
    }

    if (this.bricks.every(br => !br.alive)) this.win();
  }

  draw() {
    const c = this.ctx;
    c.fillStyle = '#080814';
    c.fillRect(0, 0, this.W, this.H);

    // Bricks
    for (const br of this.bricks) {
      if (!br.alive) continue;
      c.fillStyle   = br.color;
      c.shadowColor = br.color;
      c.shadowBlur  = 6;
      c.fillRect(br.x, br.y, br.w, br.h);
      c.strokeStyle = 'rgba(255,255,255,0.15)';
      c.lineWidth   = 1;
      c.strokeRect(br.x, br.y, br.w, br.h);
    }
    c.shadowBlur = 0;

    // Paddle
    c.fillStyle   = '#00f3ff';
    c.shadowColor = '#00f3ff'; c.shadowBlur = 12;
    c.fillRect(this.paddle.x, this.paddle.y, this.paddle.w, this.paddle.h);

    // Ball
    c.fillStyle   = '#ffffff';
    c.shadowColor = '#ffffff'; c.shadowBlur = 14;
    c.beginPath();
    c.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    // HUD
    c.fillStyle = '#94a3b8';
    c.font      = '12px Orbitron, sans-serif';
    c.textAlign = 'left';
    c.fillText('Lives: ' + '❤'.repeat(this.lives), 8, 18);

    if (!this.launched) {
      c.fillStyle   = 'rgba(0,243,255,0.7)';
      c.font        = '12px Orbitron, sans-serif';
      c.textAlign   = 'center';
      c.fillText('CLICK OR SPACE TO LAUNCH', this.W / 2, this.H - 12);
    }
  }

  loop() {
    if (!this.running) return;
    this.raf = requestAnimationFrame(() => this.loop());
    if (this.paused) { this.draw(); return; }
    this.update();
    this.draw();
  }

  pause() {
    if (!this.running) return;
    this.paused = true;
    document.getElementById('pause-overlay').classList.remove('hidden');
  }

  resume() {
    this.paused = false;
    document.getElementById('pause-overlay').classList.add('hidden');
  }

  over() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    PlayForge.storage.setScore('breakout', this.score);
    PlayForge.storage.incPlays('breakout');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('💀 Game Over — Score: ' + this.score);
    PlayForge.playSound(200, 0.4);

    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, this.W, this.H);
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = 'bold 22px Orbitron, sans-serif';
    c.fillText('GAME OVER', this.W / 2, this.H / 2 - 15);
    c.font = '14px Orbitron, sans-serif'; c.fillStyle = '#aaa';
    c.fillText('Score: ' + this.score, this.W / 2, this.H / 2 + 15);
  }

  win() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    PlayForge.storage.setScore('breakout', this.score);
    PlayForge.storage.incPlays('breakout');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('🎉 You cleared the board!');
    PlayForge.playSound(900, 0.4);

    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.75)';
    c.fillRect(0, 0, this.W, this.H);
    c.fillStyle = '#00f3ff'; c.textAlign = 'center';
    c.font = 'bold 22px Orbitron, sans-serif';
    c.fillText('YOU WIN!', this.W / 2, this.H / 2 - 15);
    c.font = '14px Orbitron, sans-serif'; c.fillStyle = '#aaa';
    c.fillText('Score: ' + this.score, this.W / 2, this.H / 2 + 15);
  }

  restart() { this.cleanup(); this.init(); }

  cleanup() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.unbind();
  }
}

window.currentGame    = new BreakoutGame('game-canvas');
PlayForge.currentGame = window.currentGame;
window.currentGame.init();