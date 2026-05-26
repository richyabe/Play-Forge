/* js/app.js — PlayForge Core v2 */
const PlayForge = (function () {
  let audioCtx = null;
  let _currentGame = null;

  /* ── LocalStorage ── */
  const store = {
    get(key, def = '0') {
      try { return localStorage.getItem('pf_' + key) ?? def; } catch { return def; }
    },
    set(key, val) { try { localStorage.setItem('pf_' + key, String(val)); } catch {} },
    getScore(id)  { return parseInt(this.get('hs_' + id), 10) || 0; },
    setScore(id, val) {
      if (val > this.getScore(id)) { this.set('hs_' + id, val); return true; }
      return false;
    },
    incPlays(id) { this.set('plays_' + id, (parseInt(this.get('plays_' + id), 10) || 0) + 1); }
  };

  /* ── Audio ── */
  const audio = {
    init() {
      if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
    },
    play(freq, dur = 0.1) {
      if (!settings.sound || !audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      try {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, audioCtx.currentTime);
        g.gain.setValueAtTime(settings.volume / 200, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination);
        o.start(); o.stop(audioCtx.currentTime + dur);
      } catch {}
    }
  };

  const settings = {
    theme:  store.get('theme', 'dark'),
    sound:  store.get('sound', 'true') === 'true',
    volume: parseInt(store.get('volume', '70'), 10) || 70
  };

  /* ── UI ── */
  const ALL_GAMES = ['snake','ttt','2048','memory','breakout','pong','flappy','runner','asteroids'];
  const ui = {
    toast(msg) {
      const t = document.getElementById('toast');
      if (!t) return;
      const m = document.getElementById('toast-msg');
      if (m) m.textContent = msg;
      t.classList.remove('hide');
      clearTimeout(t._t);
      t._t = setTimeout(() => t.classList.add('hide'), 2800);
    },
    updateScores() {
      ALL_GAMES.forEach(id => {
        const hs = document.getElementById('hs-' + id);
        const pl = document.getElementById('plays-' + id);
        if (hs) { hs.textContent = store.getScore(id); hs.classList.add('score-roll'); setTimeout(()=>hs.classList.remove('score-roll'),350); }
        if (pl) pl.textContent = store.get('plays_' + id, '0');
      });
    }
  };

  /* ── Sidebar ── */
  function initSidebar() {
    const btn = document.getElementById('sidebar-toggle');
    const sb  = document.getElementById('sidebar');
    const bg  = document.getElementById('sidebar-backdrop');
    if (!btn || !sb) return;
    btn.addEventListener('click', () => {
      const open = sb.classList.toggle('open');
      if (bg) bg.classList.toggle('active', open);
    });
    if (bg) bg.addEventListener('click', () => { sb.classList.remove('open'); bg.classList.remove('active'); });
  }

  /* ── Theme / Sound ── */
  function applyTheme() {
    const isDark = settings.theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    const track = document.getElementById('theme-track');
    const thumb = document.getElementById('theme-thumb');
    if (track) track.style.background = isDark ? 'var(--neon-cyan)' : '#374151';
    if (thumb) thumb.style.transform  = isDark ? 'translateX(28px)' : 'translateX(0)';
  }
  function applySoundUI() {
    const track = document.getElementById('sound-track');
    const thumb = document.getElementById('sound-thumb');
    const vol   = document.getElementById('volume-slider');
    if (track) track.style.background = settings.sound ? 'var(--neon-cyan)' : '#374151';
    if (thumb) thumb.style.transform  = settings.sound ? 'translateX(28px)' : 'translateX(0)';
    if (vol)   vol.value = settings.volume;
  }

  /* ── Page flash transition ── */
  function flashTransition() {
    let f = document.getElementById('page-flash');
    if (!f) { f = document.createElement('div'); f.id = 'page-flash'; document.body.appendChild(f); }
    f.classList.add('flash');
    setTimeout(() => f.classList.remove('flash'), 200);
  }

  /* ── Card stagger reveal ── */
  function initCardStagger() {
    const cards = document.querySelectorAll('.card-stagger');
    if (!cards.length) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    cards.forEach(c => obs.observe(c));
  }

  /* ── Detect touch device ── */
  const isTouch = () => window.matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);

  const api = {
    storage: store,
    ui,
    isTouch,

    init() {
      audio.init();
      applyTheme();
      applySoundUI();
      ui.updateScores();
      initSidebar();
      initCardStagger();

      /* Nav link flash */
      document.querySelectorAll('a[href]').forEach(a => {
        a.addEventListener('click', (e) => {
          const href = a.getAttribute('href');
          if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
            flashTransition();
          }
        });
      });

      /* ESC pause */
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && _currentGame) {
          _currentGame.paused ? _currentGame.resume() : _currentGame.pause();
        }
      });

      /* Unlock audio on first gesture */
      document.addEventListener('click', () => audio.play(1, 0.001), { once: true });
      document.addEventListener('touchstart', () => { audio.init(); }, { once: true, passive: true });

      window.addEventListener('beforeunload', () => { if (_currentGame) _currentGame.cleanup(); });
      window.addEventListener('pagehide',      () => { if (_currentGame) _currentGame.cleanup(); });
    },

    get currentGame()  { return _currentGame; },
    set currentGame(inst) {
      if (_currentGame && _currentGame !== inst) _currentGame.cleanup();
      _currentGame = inst;
    },

    playSound(freq, dur)  { audio.play(freq, dur); },
    updateAllScores()     { ui.updateScores(); },
    toggleTheme()  { settings.theme = settings.theme === 'dark' ? 'light' : 'dark'; store.set('theme', settings.theme); applyTheme(); },
    toggleSound()  { settings.sound = !settings.sound; store.set('sound', settings.sound); applySoundUI(); },
    setVolume(v)   { settings.volume = parseInt(v,10); store.set('volume', settings.volume); },
    updateSoundUI(){ applySoundUI(); }
  };

  return api;
})();

window.PlayForge = PlayForge;
document.addEventListener('DOMContentLoaded', () => PlayForge.init());
