/**
 * ChessBrain - Motor de Xadrez 3x3 com Mini-Tabuleiro de Objetivo e Notação Algébrica
 */

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

class Chess3x3 {
  constructor() {
    this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    this.selectedSquare = null;
    this.legalMoves = [];

    this.draggingState = {
      isDragging: false,
      fromSquare: null,
      pieceEl: null,
      ghostEl: null
    };

    this.currentChallenge = null;
    this.moveHistory = [];
    this.totalScore = 0;
    this.currentUser = null;
    this.timerInterval = null;
    this.startTime = null;
    this.isCompleted = false;

    this.initBoardUI();
    this.initTargetBoardUI();
    this.initModeSelector();
    this.generateNextChallenge();
  }

  initBoardUI() {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const square = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        square.dataset.row = r;
        square.dataset.col = c;
        square.dataset.coord = COORDS[r][c];

        square.addEventListener('click', () => {
          if (!this.draggingState.isDragging) {
            this.handleSquareClick(r, c);
          }
        });

        boardEl.appendChild(square);
      }
    }

    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  // Inicializa a grade do mini-tabuleiro objetivo
  initTargetBoardUI() {
    const targetBoardEl = document.getElementById('target-board');
    if (!targetBoardEl) return;
    targetBoardEl.innerHTML = '';

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const square = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        square.dataset.targetRow = r;
        square.dataset.targetCol = c;
        targetBoardEl.appendChild(square);
      }
    }
  }

  initModeSelector() {
    const selectEl = document.getElementById('select-mode');
    if (selectEl) {
      selectEl.addEventListener('change', () => {
        this.generateNextChallenge();
      });
    }
  }

  generateNextChallenge() {
    const selectEl = document.getElementById('select-mode');
    const selectedMode = selectEl ? selectEl.value : 'move';

    if (selectedMode === 'move') {
      this.currentChallenge = ChallengeGenerator.generateRandomMoveChallenge();
    } else if (selectedMode.startsWith('mate-')) {
      const mateInX = parseInt(selectedMode.split('-')[1]);
      this.currentChallenge = ChallengeGenerator.getMateChallenge(mateInX);
    }

    this.loadChallenge(this.currentChallenge);
  }

  loadChallenge(challenge) {
    this.board = challenge.initialBoard.map(row => [...row]);
    this.moveHistory = [];
    this.isCompleted = false;

    document.getElementById('challenge-title').textContent = challenge.title;
    document.getElementById('challenge-desc').textContent = challenge.description;
    this.setFeedback('');

    // Exibe ou esconde a miniatura do objetivo
    const targetWrapper = document.getElementById('target-board-wrapper');
    if (challenge.type === 'move' && challenge.targetBoard) {
      targetWrapper.classList.remove('hidden');
      this.renderTargetBoard(challenge.targetBoard);
    } else {
      targetWrapper.classList.add('hidden');
    }

    this.clearSelection();
    this.startTimer();
    this.render();
  }

  // Renderiza as peças no mini-tabuleiro de objetivo
  renderTargetBoard(targetBoard) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const squareEl = document.querySelector(`[data-target-row="${r}"][data-target-col="${c}"]`);
        if (!squareEl) continue;
        squareEl.innerHTML = '';

        const piece = targetBoard[r][c];
        if (piece) {
          const pieceEl = document.createElement('div');
          const isWhite = piece === piece.toUpperCase();
          pieceEl.className = `piece ${isWhite ? 'white' : 'black'}`;
          pieceEl.textContent = PIECE_SYMBOLS[piece];
          squareEl.appendChild(pieceEl);
        }
      }
    }
  }

  startTimer() {
    this.stopTimer();
    this.startTime = Date.now();
    const timerEl = document.getElementById('timer');

    this.timerInterval = setInterval(() => {
      const elapsed = Date.now() - this.startTime;
      const seconds = (elapsed / 1000).toFixed(1);
      const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
      const secs = (seconds % 60).toFixed(1).padStart(4, '0');
      timerEl.textContent = `${mins}:${secs}`;
    }, 100);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  setFeedback(msg, type = '') {
    const feedbackEl = document.getElementById('game-feedback');
    feedbackEl.textContent = msg;
    feedbackEl.className = `feedback-msg ${type}`;
  }

  render() {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const coord = COORDS[r][c];
        const squareEl = document.querySelector(`[data-coord="${coord}"]`);
        if (!squareEl) continue;

        squareEl.innerHTML = '';
        squareEl.classList.remove('selected', 'highlight', 'highlight-capture');

        const piece = this.board[r][c];
        if (piece) {
          const pieceEl = document.createElement('div');
          const isWhite = piece === piece.toUpperCase();
          
          pieceEl.className = `piece ${isWhite ? 'white' : 'black'}`;
          pieceEl.textContent = PIECE_SYMBOLS[piece];

          if (!this.isCompleted && isWhite) {
            pieceEl.addEventListener('pointerdown', (e) => this.handlePointerDown(e, r, c));
          }

          squareEl.appendChild(pieceEl);
        }

        if (this.selectedSquare && this.selectedSquare.r === r && this.selectedSquare.c === c) {
          squareEl.classList.add('selected');
        }

        const isLegal = this.legalMoves.some(m => m.r === r && m.c === c);
        if (isLegal) {
          if (this.board[r][c]) {
            squareEl.classList.add('highlight-capture');
          } else {
            squareEl.classList.add('highlight');
          }
        }
      }
    }
  }

  handlePointerDown(e, r, c) {
    if (this.isCompleted) return;

    this.selectSquare(r, c);

    const pieceEl = e.currentTarget;
    this.draggingState = {
      isDragging: false,
      fromSquare: { r, c },
      pieceEl: pieceEl,
      startX: e.clientX,
      startY: e.clientY
    };
  }

  handlePointerMove(e) {
    if (!this.draggingState.pieceEl) return;

    const dx = Math.abs(e.clientX - this.draggingState.startX);
    const dy = Math.abs(e.clientY - this.draggingState.startY);

    if (!this.draggingState.isDragging && (dx > 5 || dy > 5)) {
      this.draggingState.isDragging = true;

      const ghost = this.draggingState.pieceEl.cloneNode(true);
      ghost.classList.add('dragging');
      document.body.appendChild(ghost);

      this.draggingState.ghostEl = ghost;
      this.draggingState.pieceEl.style.opacity = '0.3';
    }

    if (this.draggingState.isDragging && this.draggingState.ghostEl) {
      this.draggingState.ghostEl.style.left = `${e.clientX}px`;
      this.draggingState.ghostEl.style.top = `${e.clientY}px`;
    }
  }

  handlePointerUp(e) {
    if (!this.draggingState.pieceEl) return;

    if (this.draggingState.isDragging) {
      const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
      const squareEl = elementUnderCursor ? elementUnderCursor.closest('.square') : null;

      if (squareEl) {
        const toR = parseInt(squareEl.dataset.row);
        const toC = parseInt(squareEl.dataset.col);
        const move = this.legalMoves.find(m => m.r === toR && m.c === toC);

        if (move) {
          this.executeMove(this.draggingState.fromSquare, { r: toR, c: toC });
          this.clearSelection();
        }
      }

      if (this.draggingState.ghostEl) {
        this.draggingState.ghostEl.remove();
      }
      this.draggingState.pieceEl.style.opacity = '1';
    }

    this.draggingState = {
      isDragging: false,
      fromSquare: null,
      pieceEl: null,
      ghostEl: null
    };
  }

  handleSquareClick(r, c) {
    if (this.isCompleted) return;

    if (this.selectedSquare) {
      const move = this.legalMoves.find(m => m.r === r && m.c === c);
      if (move) {
        this.executeMove(this.selectedSquare, { r, c });
        this.clearSelection();
        return;
      }
    }

    const piece = this.board[r][c];
    if (piece && piece === piece.toUpperCase()) {
      this.selectSquare(r, c);
    } else {
      this.clearSelection();
    }
  }

  selectSquare(r, c) {
    this.selectedSquare = { r, c };
    this.legalMoves = this.calculateLegalMoves(r, c);
    this.render();
  }

  clearSelection() {
    this.selectedSquare = null;
    this.legalMoves = [];
    this.render();
  }

  executeMove(from, to, isBlackMove = false) {
    const piece = this.board[from.r][from.c];
    this.board[from.r][from.c] = null;
    this.board[to.r][to.c] = piece;

    if (!isBlackMove) {
      this.moveHistory.push({ from, to });
    }

    this.render();

    if (!isBlackMove) {
      this.validateChallenge();
    }
  }

  isKingInCheck(isWhite) {
    const kingSymbol = isWhite ? 'K' : 'k';
    let kingPos = null;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === kingSymbol) {
          kingPos = { r, c };
          break;
        }
      }
    }

    if (!kingPos) return false;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const piece = this.board[r][c];
        if (piece && (piece === piece.toUpperCase()) !== isWhite) {
          const moves = this.calculateRawMoves(r, c);
          if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  hasKingOnBoard(isWhite) {
    const kingSymbol = isWhite ? 'K' : 'k';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === kingSymbol) return true;
      }
    }
    return false;
  }

  hasLegalMoves(isWhite) {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const piece = this.board[r][c];
        if (piece && (piece === piece.toUpperCase()) === isWhite) {
          const moves = this.calculateLegalMoves(r, c);
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }

  validateChallenge() {
    const challenge = this.currentChallenge;

    if (this.hasKingOnBoard(false)) {
      const blackInCheck = this.isKingInCheck(false);
      const blackHasMoves = this.hasLegalMoves(false);

      if (!blackHasMoves && !blackInCheck) {
        this.setFeedback('Empate por Afogamento! As pretas não têm lances válidos.', 'error');
        setTimeout(() => this.loadChallenge(this.currentChallenge), 1500);
        return;
      }
    }

    if (challenge.type === 'move') {
      const matchesTarget = JSON.stringify(this.board) === JSON.stringify(challenge.targetBoard);
      if (matchesTarget) {
        this.completeChallenge();
      }
    } else if (challenge.type === 'mate') {
      const stepIndex = this.moveHistory.length - 1;
      const expectedMove = challenge.solution[stepIndex];

      if (!expectedMove || 
          expectedMove.from.r !== this.moveHistory[stepIndex].from.r ||
          expectedMove.from.c !== this.moveHistory[stepIndex].from.c ||
          expectedMove.to.r !== this.moveHistory[stepIndex].to.r ||
          expectedMove.to.c !== this.moveHistory[stepIndex].to.c) {
        
        this.setFeedback('Jogada incorreta! Tente novamente.', 'error');
        setTimeout(() => this.loadChallenge(this.currentChallenge), 1200);
        return;
      }

      if (this.moveHistory.length < challenge.solution.length) {
        const blackMove = challenge.blackResponses[stepIndex];
        if (blackMove) {
          setTimeout(() => {
            this.executeMove(blackMove.from, blackMove.to, true);
          }, 600);
        }
      } else {
        this.completeChallenge();
      }
    }
  }

  completeChallenge() {
    this.isCompleted = true;
    this.stopTimer();

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const pointsGained = Math.max(100, Math.floor(1000 - elapsedSeconds * 10));
    this.totalScore += pointsGained;

    document.getElementById('score').textContent = this.totalScore;
    this.setFeedback(`Desafio Concluído! +${pointsGained} pontos`, 'success');

    // Salva a pontuação caso o jogador esteja logado
    this.saveUserScore();
  }

  calculateRawMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];

    const isWhite = piece === piece.toUpperCase();
    const type = piece.toLowerCase();
    const moves = [];

    const isInside = (nr, nc) => nr >= 0 && nr < 3 && nc >= 0 && nc < 3;
    const canMoveTo = (nr, nc) => {
      if (!isInside(nr, nc)) return false;
      const targetPiece = this.board[nr][nc];
      if (!targetPiece) return true;
      const isTargetWhite = targetPiece === targetPiece.toUpperCase();
      return isWhite !== isTargetWhite;
    };

    const orthogonals = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const knightSteps = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    switch (type) {
      case 'p':
        const dir = isWhite ? -1 : 1;
        if (isInside(r + dir, c) && !this.board[r + dir][c]) moves.push({ r: r + dir, c });
        for (let dc of [-1, 1]) {
          const nr = r + dir, nc = c + dc;
          if (isInside(nr, nc) && this.board[nr][nc]) {
            const isTargetWhite = this.board[nr][nc] === this.board[nr][nc].toUpperCase();
            if (isWhite !== isTargetWhite) moves.push({ r: nr, c: nc });
          }
        }
        break;
      case 'n':
        for (let [dr, dc] of knightSteps) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ r: r + dr, c: c + dc });
        }
        break;
      case 'k':
        for (let [dr, dc] of [...orthogonals, ...diagonals]) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ r: r + dr, c: c + dc });
        }
        break;
      case 'r':
        this.addRayMoves(r, c, orthogonals, canMoveTo, moves);
        break;
      case 'b':
        this.addRayMoves(r, c, diagonals, canMoveTo, moves);
        break;
      case 'q':
        this.addRayMoves(r, c, [...orthogonals, ...diagonals], canMoveTo, moves);
        break;
    }
    return moves;
  }

  calculateLegalMoves(r, c) {
    const rawMoves = this.calculateRawMoves(r, c);
    const piece = this.board[r][c];
    if (!piece) return [];
    const isWhite = piece === piece.toUpperCase();

    return rawMoves.filter(move => {
      const targetBackup = this.board[move.r][move.c];
      this.board[move.r][move.c] = piece;
      this.board[r][c] = null;

      const inCheck = this.isKingInCheck(isWhite);

      this.board[r][c] = piece;
      this.board[move.r][move.c] = targetBackup;

      return !inCheck;
    });
  }

  addRayMoves(r, c, directions, canMoveTo, moves) {
    for (let [dr, dc] of directions) {
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 3 && nc >= 0 && nc < 3) {
        if (canMoveTo(nr, nc)) {
          moves.push({ r: nr, c: nc });
          if (this.board[nr][nc] !== null) break;
        } else {
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  async saveUserScore() {
    // A identidade vem do cookie de sessão; o servidor ignora visitantes
    if (!this.currentUser) return;

    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: this.totalScore })
      });
      // Atualiza o ranking em tempo real
      this.fetchLeaderboard();
    } catch (err) {
      console.error('Erro ao salvar pontuação:', err);
    }
  }

  // Carrega o Ranking Geral do Servidor
  async fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();

      const listEl = document.getElementById('leaderboard-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      if (data.length === 0) {
        listEl.innerHTML = '<li><span>Nenhum registro ainda</span></li>';
        return;
      }

      data.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.username}</span> <span>${item.score} pts</span>`;
        listEl.appendChild(li);
      });
    } catch (err) {
      console.error('Erro ao carregar ranking:', err);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess3x3();

  // Carrega o Ranking Inicial do Banco de Dados
  game.fetchLeaderboard();

  // Gerenciamento de Autenticação (LocalStorage + API)
  const modal = document.getElementById('auth-modal');
  const userStatusEl = document.getElementById('user-status');
  const btnLoginModal = document.getElementById('btn-login-modal');
  const btnLogout = document.getElementById('btn-logout');
  const authError = document.getElementById('auth-error');

  const updateUIForUser = () => {
    const user = game.currentUser;
    if (user) {
      userStatusEl.textContent = `Jogador: ${user.username}`;
      btnLoginModal.classList.add('hidden');
      btnLogout.classList.remove('hidden');
    } else {
      userStatusEl.textContent = 'Visitante (Não registrado)';
      btnLoginModal.classList.remove('hidden');
      btnLogout.classList.add('hidden');
    }
  };

  // Restaura o usuário a partir do cookie de sessão
  localStorage.removeItem('chessbrain_user'); // resquício da versão sem sessão
  updateUIForUser();
  fetch('/api/me')
    .then(res => res.json())
    .then(data => {
      game.currentUser = data.user || null;
      updateUIForUser();
    })
    .catch(err => console.error('Erro ao carregar sessão:', err));

  btnLoginModal.addEventListener('click', () => {
    authError.textContent = '';
    modal.classList.remove('hidden');
  });

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    }
    game.currentUser = null;
    updateUIForUser();
  });

  // Ação de Login
  document.getElementById('btn-submit-login').addEventListener('click', async () => {
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        authError.textContent = data.error;
        return;
      }

      game.currentUser = data.user;
      updateUIForUser();
      modal.classList.add('hidden');
      game.fetchLeaderboard();
    } catch (err) {
      authError.textContent = 'Erro ao conectar ao servidor.';
    }
  });

  // Ação de Cadastro
  document.getElementById('btn-submit-register').addEventListener('click', async () => {
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        authError.textContent = data.error;
        return;
      }

      game.currentUser = data.user;
      updateUIForUser();
      modal.classList.add('hidden');
      game.fetchLeaderboard();
    } catch (err) {
      authError.textContent = 'Erro ao conectar ao servidor.';
    }
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    game.loadChallenge(game.currentChallenge);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    game.generateNextChallenge();
  });
});