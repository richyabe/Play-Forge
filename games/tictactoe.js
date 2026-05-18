  class TicTacToe {
    constructor() {
      this.board   = Array(9).fill(null);
      this.over    = false;
      this.wins    = 0;
      this.boardEl = document.getElementById('ttt-board');
      this.statusEl= document.getElementById('ttt-status');
    }

    init() {
      this.board = Array(9).fill(null);
      this.over  = false;
      document.getElementById('game-score').textContent = this.wins;
      document.getElementById('game-hs').textContent    = PlayForge.storage.getScore('ttt');
      this.render();
      this.setStatus('Your turn ✖');
    }

    render(winLine = []) {
      this.boardEl.innerHTML = '';
      this.board.forEach((val, i) => {
        const cell = document.createElement('div');
        cell.className = 'ttt-cell' + (val ? ' taken' : '') + (winLine.includes(i) ? ' win' : '');
        cell.textContent = val === 'X' ? '✖' : val === 'O' ? '⭕' : '';
        if (!val && !this.over) cell.addEventListener('click', () => this.playerMove(i));
        this.boardEl.appendChild(cell);
      });
    }

    playerMove(i) {
      if (this.board[i] || this.over) return;
      this.board[i] = 'X';
      PlayForge.playSound(500, 0.05);
      const w = this.checkWin(this.board);
      if (w) { this.render(w); this.endGame('win'); return; }
      if (this.isDraw()) { this.render(); this.endGame('draw'); return; }
      this.render();
      this.setStatus('AI thinking…');
      setTimeout(() => this.aiMove(), 350);
    }

    aiMove() {
      const best = this.minimax(this.board, 'O');
      this.board[best.idx] = 'O';
      PlayForge.playSound(350, 0.05);
      const w = this.checkWin(this.board);
      if (w) { this.render(w); this.endGame('lose'); return; }
      if (this.isDraw()) { this.render(); this.endGame('draw'); return; }
      this.render();
      this.setStatus('Your turn ✖');
    }

    minimax(board, player, depth = 0) {
      const w = this.checkWin(board);
      if (w)           return { score: player === 'O' ? 10 - depth : depth - 10 };
      if (board.every(c => c)) return { score: 0 };

      const moves = board.reduce((a, v, i) => { if (!v) a.push(i); return a; }, []);
      let best = player === 'O' ? { score: -Infinity } : { score: Infinity };

      for (const idx of moves) {
        const nb = [...board]; nb[idx] = player;
        const res = this.minimax(nb, player === 'O' ? 'X' : 'O', depth + 1);
        res.idx = idx;
        if (player === 'O' && res.score > best.score) best = res;
        if (player === 'X' && res.score < best.score) best = res;
      }
      return best;
    }

    checkWin(board) {
      const lines = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
      ];
      for (const l of lines) {
        const [a,b,c] = l;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return l;
      }
      return null;
    }

    isDraw() { return this.board.every(c => c); }

    endGame(result) {
      this.over = true;
      if (result === 'win') {
        this.wins++;
        document.getElementById('game-score').textContent = this.wins;
        PlayForge.storage.setScore('ttt', this.wins);
        PlayForge.storage.incPlays('ttt');
        PlayForge.ui.updateScores();
        PlayForge.ui.toast('🏆 You won!');
        PlayForge.playSound(900, 0.3);
        this.setStatus('🏆 You won!');
        document.getElementById('game-hs').textContent = PlayForge.storage.getScore('ttt');
      } else if (result === 'lose') {
        PlayForge.storage.incPlays('ttt');
        PlayForge.ui.toast('💀 AI wins!');
        PlayForge.playSound(200, 0.3);
        this.setStatus('💀 AI wins!');
      } else {
        PlayForge.storage.incPlays('ttt');
        PlayForge.ui.toast('🤝 Draw!');
        PlayForge.playSound(400, 0.2);
        this.setStatus('🤝 Draw!');
      }
    }

    setStatus(msg) { this.statusEl.textContent = msg; }

    restart() { this.init(); }
    pause()   {}
    resume()  {}
    cleanup() {}
  }

  const ttt = new TicTacToe();
  window.currentGame    = ttt;
  PlayForge.currentGame = ttt;
  document.addEventListener('DOMContentLoaded', () => ttt.init());