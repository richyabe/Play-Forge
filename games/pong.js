class PongGame {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.W       = 400;
    this.H       = 300;
    this.PH      = 60;  // paddle height
    this.PW      = 10;  // paddle width
    this.p1y     = (this.H - this.PH) / 2;
    this.p2y     = (this.H - this.PH) / 2;
    this.ball    = { x: this.W / 2, y: this.H / 2, dx: 5, dy: 3 };
    this.s1      = 0;  // player score
    this.s2      = 0;  // AI score
    this.running = false;
    this.paused  = false;
    this.raf     = null;
    this.mmH     = null;
    this.tmH     = null;
    this.khH     = null;
    this.keys    = {};
  }

  init() {
    this.p1y  = this.p2y = (this.H - this.PH) / 2;
    this.s1   = this.s2  = 0;
    this.running = true;
    this.paused  = false;
    this.keys    = {};

    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('pong');
    document.getElementById('pause-overlay').classList.add('hidden');

    this.resetBall();
    this.bind();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  resetBall() {
    const angle = (Math.random() * 60 - 30) * Math.PI / 180;
    const dir   = Math.random() > 0.5 ? 1 : -1;
    this.ball   = {
      x: this.W / 2,
      y: this.H / 2,
      dx: dir * 5 * Math.cos(angle),
      dy: 5 * Math.sin(angle)
    };
  }

  bind() {
    this.unbind();

    // Mouse: track vertical position relative to canvas
    this.mmH = e => {
      const rect   = this.canvas.getBoundingClientRect();
      const scaleY = this.H / rect.height;
      const my     = (e.clientY - rect.top) * scaleY;
      this.p1y     = Math.max(0, Math.min(this.H - this.PH, my - this.PH / 2));
    };

    // Touch: same but via touches
    this.tmH = e => {
      e.preventDefault();
      const rect   = this.canvas.getBoundingClientRect();
      const scaleY = this.H / rect.height;
      const my     = (e.touches[0].clientY - rect.top) * scaleY;
      this.p1y     = Math.max(0, Math.min(this.H - this.PH, my - this.PH / 2));
    };

    // Keyboard
    this.khH = e => {
      this.keys[e.key] = e.type === 'keydown';
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
    };

    this.canvas.addEventListener('mousemove', this.mmH);
    this.canvas.addEventListener('touchmove', this.tmH, { passive: false });
    document.addEventListener('keydown', this.khH);
    document.addEventListener('keyup',   this.khH);
  }

  unbind() {
    if (this.mmH) this.canvas.removeEventListener('mousemove', this.mmH);
    if (this.tmH) this.canvas.removeEventListener('touchmove', this.tmH);
    if (this.khH) {
      document.removeEventListener('keydown', this.khH);
      document.removeEventListener('keyup',   this.khH);
    }
  }

  update() {
    if (!this.running || this.paused) return;
    const b = this.ball;

    // Keyboard paddle control
    const speed = 6;
    if (this.keys['ArrowUp'])   this.p1y = Math.max(0, this.p1y - speed);
    if (this.keys['ArrowDown']) this.p1y = Math.min(this.H - this.PH, this.p1y + speed);

    // Ball movement
    b.x += b.dx;
    b.y += b.dy;

    // Top / bottom bounce
    if (b.y - 7 < 0)        { b.y = 7;           b.dy = Math.abs(b.dy); }
    if (b.y + 7 > this.H)   { b.y = this.H - 7;  b.dy = -Math.abs(b.dy); }

    // AI paddle — smooth tracking with slight imperfection
    const aiTarget = b.y - this.PH / 2;
    const aiSpeed  = 3.5 + this.s1 * 0.2; // gets harder as player scores
    this.p2y += Math.sign(aiTarget - this.p2y) * Math.min(aiSpeed, Math.abs(aiTarget - this.p2y));
    this.p2y   = Math.max(0, Math.min(this.H - this.PH, this.p2y));

    // Player paddle collision (left side)
    if (
      b.dx < 0 &&
      b.x - 7 <= this.PW + 8 &&
      b.y >= this.p1y &&
      b.y <= this.p1y + this.PH
    ) {
      b.x  = this.PW + 8 + 7;
      b.dx = Math.abs(b.dx) * 1.05;
      // Add spin based on where ball hits paddle
      const hitPos = (b.y - this.p1y) / this.PH - 0.5; // -0.5 to 0.5
      b.dy  = hitPos * 8;
      b.dx  = Math.min(b.dx, 12); // cap speed
      PlayForge.playSound(500, 0.05);
    }

    // AI paddle collision (right side)
    if (
      b.dx > 0 &&
      b.x + 7 >= this.W - this.PW - 8 &&
      b.y >= this.p2y &&
      b.y <= this.p2y + this.PH
    ) {
      b.x  = this.W - this.PW - 8 - 7;
      b.dx = -Math.abs(b.dx) * 1.05;
      b.dx = Math.max(b.dx, -12);
      PlayForge.playSound(500, 0.05);
    }

    // Ball out left → AI scores
    if (b.x + 7 < 0) {
      this.s2++;
      PlayForge.playSound(200, 0.2);
      if (this.s2 >= 5) { this.lose(); return; }
      this.resetBall();
    }

    // Ball out right → player scores
    if (b.x - 7 > this.W) {
      this.s1++;
      document.getElementById('game-score').textContent = this.s1;
      PlayForge.playSound(700, 0.1);
      if (this.s1 >= 5) { this.win(); return; }
      this.resetBall();
    }
  }

  draw() {
    const c = this.ctx;
    c.fillStyle = '#080814';
    c.fillRect(0, 0, this.W, this.H);

    // Centre line
    c.setLineDash([6, 6]);
    c.strokeStyle = '#2a2a40'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(this.W / 2, 0); c.lineTo(this.W / 2, this.H); c.stroke();
    c.setLineDash([]);

    // Scores
    c.fillStyle = '#ffffff55';
    c.font      = 'bold 24px Orbitron, sans-serif';
    c.textAlign = 'center';
    c.fillText(this.s1, this.W / 4,       32);
    c.fillText(this.s2, this.W * 3 / 4,   32);

    // Paddles
    c.fillStyle   = '#00f3ff'; c.shadowColor = '#00f3ff'; c.shadowBlur = 12;
    c.fillRect(8, this.p1y, this.PW, this.PH);
    c.fillStyle   = '#f43f5e'; c.shadowColor = '#f43f5e';
    c.fillRect(this.W - 8 - this.PW, this.p2y, this.PW, this.PH);

    // Ball
    c.fillStyle   = '#ffffff'; c.shadowColor = '#ffffff'; c.shadowBlur = 16;
    c.beginPath();
    c.arc(this.ball.x, this.ball.y, 7, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
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

  win() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    PlayForge.storage.setScore('pong', this.s1);
    PlayForge.storage.incPlays('pong');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('🏆 You win! 5 – ' + this.s2);
    PlayForge.playSound(900, 0.4);
  }

  lose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    PlayForge.storage.setScore('pong', this.s1);
    PlayForge.storage.incPlays('pong');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('💀 AI wins! ' + this.s1 + ' – 5');
    PlayForge.playSound(200, 0.3);
  }

  restart() { this.cleanup(); this.init(); }

  cleanup() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.unbind();
  }
}

window.currentGame    = new PongGame('game-canvas');
PlayForge.currentGame = window.currentGame;
window.currentGame.init();