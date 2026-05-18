class FlappyGame {
  constructor(canvasId) {
    this.canvas  = document.getElementById(canvasId);
    this.ctx     = this.canvas.getContext('2d');
    this.W       = 300;
    this.H       = 400;
    this.BIRD_R  = 12;
    this.PIPE_W  = 40;
    this.GAP     = 120;
    this.bird    = { x: 60, y: this.H / 2, v: 0 };
    this.pipes   = [];
    this.score   = 0;
    this.frame   = 0;
    this.running = false;
    this.paused  = false;
    this.started = false; // waiting for first tap
    this.dead    = false;
    this.raf     = null;
    this.flapH   = null;
    this.khH     = null;
  }

  init() {
    this.bird    = { x: 60, y: this.H / 2, v: 0 };
    this.pipes   = [];
    this.score   = 0;
    this.frame   = 0;
    this.running = true;
    this.paused  = false;
    this.started = false;
    this.dead    = false;

    document.getElementById('game-score').textContent = '0';
    document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('flappy');
    document.getElementById('pause-overlay').classList.add('hidden');

    this.spawnPipe();
    this.bind();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.loop());
  }

  spawnPipe() {
    const minTop = 50;
    const maxTop = this.H - this.GAP - 50;
    const top    = Math.floor(Math.random() * (maxTop - minTop) + minTop);
    this.pipes.push({ x: this.W + 10, top, passed: false });
  }

  flap() {
    if (this.paused) return;
    if (this.dead) { this.restart(); return; }
    if (!this.started) this.started = true;
    this.bird.v = -8;
    PlayForge.playSound(400, 0.06);
  }

  bind() {
    this.unbind();

    this.flapH = e => { e.preventDefault(); this.flap(); };
    this.khH   = e => {
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); this.flap(); }
    };

    this.canvas.addEventListener('mousedown',  this.flapH);
    this.canvas.addEventListener('touchstart', this.flapH, { passive: false });
    document.addEventListener('keydown',       this.khH);
  }

  unbind() {
    if (this.flapH) {
      this.canvas.removeEventListener('mousedown',  this.flapH);
      this.canvas.removeEventListener('touchstart', this.flapH);
    }
    if (this.khH) document.removeEventListener('keydown', this.khH);
  }

  update() {
    if (!this.running || this.paused || !this.started || this.dead) return;

    // Gravity
    this.bird.v += 0.45;
    this.bird.y += this.bird.v;
    this.frame++;

    // Spawn pipes periodically
    if (this.frame % 110 === 0) this.spawnPipe();

    // Move pipes
    const pipeSpeed = 2.5 + this.score * 0.05; // slight speed-up
    for (const p of this.pipes) {
      p.x -= pipeSpeed;
      // Score: passed the bird's x
      if (!p.passed && p.x + this.PIPE_W < this.bird.x) {
        this.score++;
        document.getElementById('game-score').textContent = this.score;
        p.passed = true;
        PlayForge.playSound(650, 0.05);
      }
    }
    this.pipes = this.pipes.filter(p => p.x + this.PIPE_W > -10);

    // Collision: ground / ceiling
    if (this.bird.y - this.BIRD_R < 0 || this.bird.y + this.BIRD_R > this.H) {
      this.over();
      return;
    }

    // Collision: pipes
    for (const p of this.pipes) {
      const bx = this.bird.x;
      const by = this.bird.y;
      const r  = this.BIRD_R - 2; // slightly forgiving hitbox
      if (
        bx + r > p.x &&
        bx - r < p.x + this.PIPE_W
      ) {
        if (by - r < p.top || by + r > p.top + this.GAP) {
          this.over();
          return;
        }
      }
    }
  }

  draw() {
    const c = this.ctx;

    // Sky background gradient
    const grad = c.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, '#050520');
    grad.addColorStop(1, '#0a0a30');
    c.fillStyle = grad;
    c.fillRect(0, 0, this.W, this.H);

    // Ground
    c.fillStyle = '#1a3a1a';
    c.fillRect(0, this.H - 20, this.W, 20);
    c.fillStyle = '#0f2a0f';
    c.fillRect(0, this.H - 22, this.W, 4);

    // Pipes
    for (const p of this.pipes) {
      // Top pipe
      c.fillStyle   = '#16a34a'; c.shadowColor = '#16a34a'; c.shadowBlur = 6;
      c.fillRect(p.x, 0, this.PIPE_W, p.top);
      // Cap
      c.fillStyle   = '#15803d';
      c.fillRect(p.x - 3, p.top - 12, this.PIPE_W + 6, 12);
      // Bottom pipe
      c.fillStyle   = '#16a34a';
      c.fillRect(p.x, p.top + this.GAP, this.PIPE_W, this.H - p.top - this.GAP);
      // Cap
      c.fillRect(p.x - 3, p.top + this.GAP, this.PIPE_W + 6, 12);
      c.shadowBlur  = 0;
    }

    // Bird
    const by = this.bird.y;
    const bx = this.bird.x;
    const angle = Math.min(Math.max(this.bird.v * 0.08, -0.4), 0.8);
    c.save();
    c.translate(bx, by);
    c.rotate(angle);
    c.fillStyle   = '#f97316'; c.shadowColor = '#f97316'; c.shadowBlur = 14;
    c.beginPath();
    c.arc(0, 0, this.BIRD_R, 0, Math.PI * 2);
    c.fill();
    // Eye
    c.fillStyle   = '#fff'; c.shadowBlur = 0;
    c.beginPath(); c.arc(5, -4, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle   = '#111';
    c.beginPath(); c.arc(6.5, -4, 2, 0, Math.PI * 2); c.fill();
    // Beak
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.moveTo(12, -1); c.lineTo(18, 0); c.lineTo(12, 3); c.closePath(); c.fill();
    c.restore();

    // Score display
    c.fillStyle   = '#ffffff';
    c.font        = 'bold 28px Orbitron, sans-serif';
    c.textAlign   = 'center';
    c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 4;
    c.fillText(this.score, this.W / 2, 50);
    c.shadowBlur = 0;

    // Start prompt
    if (!this.started && !this.dead) {
      c.fillStyle = 'rgba(0,0,0,0.55)';
      c.fillRect(0, this.H / 2 - 40, this.W, 80);
      c.fillStyle   = 'var(--neon-cyan, #00f3ff)';
      c.font        = 'bold 16px Orbitron, sans-serif';
      c.textAlign   = 'center';
      c.fillText('TAP TO START', this.W / 2, this.H / 2 + 6);
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
    if (this.dead) return;
    this.dead    = true;
    this.started = false;
    PlayForge.storage.setScore('flappy', this.score);
    PlayForge.storage.incPlays('flappy');
    PlayForge.ui.updateScores();
    PlayForge.ui.toast('💀 Game Over — Score: ' + this.score);
    PlayForge.playSound(200, 0.35);

    const c = this.ctx;
    c.fillStyle = 'rgba(0,0,0,0.7)';
    c.fillRect(0, 0, this.W, this.H);
    c.textAlign = 'center';
    c.fillStyle   = '#fff';
    c.font        = 'bold 22px Orbitron, sans-serif';
    c.fillText('GAME OVER', this.W / 2, this.H / 2 - 20);
    c.font        = '13px Orbitron, sans-serif'; c.fillStyle = '#aaa';
    c.fillText('Score: ' + this.score,   this.W / 2, this.H / 2 + 10);
    c.fillText('Tap to restart',          this.W / 2, this.H / 2 + 34);
  }

  restart() { this.cleanup(); this.init(); }

  cleanup() {
    cancelAnimationFrame(this.raf);
    this.running = false;
    this.unbind();
  }
}

window.currentGame    = new FlappyGame('game-canvas');
PlayForge.currentGame = window.currentGame;
window.currentGame.init();