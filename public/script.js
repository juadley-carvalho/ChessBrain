/**
 * ChessBrain - Motor de Xadrez 3x3 com Mini-Tabuleiro de Objetivo e Notação Algébrica
 */

const { COORDS } = ChessEngine;

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
    // Pontos desde que a página foi aberta; o total salvo fica em currentUser.score
    this.sessionScore = 0;
    this.currentUser = null;
    this.timerInterval = null;
    this.startTime = null;
    this.isCompleted = false;
    // Bloqueia a entrada enquanto há uma ação agendada (resposta das pretas ou reinício)
    this.isLocked = false;
    this.pendingTimeouts = [];
    // Casa que recebe o foco do teclado (tabindex itinerante); começa em a1
    this.focusedSquare = { r: 2, c: 0 };

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
        square.setAttribute('role', 'button');
        square.tabIndex = r === this.focusedSquare.r && c === this.focusedSquare.c ? 0 : -1;

        square.addEventListener('click', () => {
          if (!this.draggingState.isDragging) {
            this.handleSquareClick(r, c);
          }
        });
        square.addEventListener('keydown', (e) => this.handleSquareKey(e, r, c));
        square.addEventListener('focus', () => this.setFocusedSquare(r, c));

        boardEl.appendChild(square);
      }
    }

    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  // Teclado: setas movem o foco, Enter/Espaço equivalem ao clique, Esc cancela a seleção
  handleSquareKey(e, r, c) {
    const steps = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (steps[e.key]) {
      e.preventDefault();
      const nr = Math.min(2, Math.max(0, r + steps[e.key][0]));
      const nc = Math.min(2, Math.max(0, c + steps[e.key][1]));
      this.getSquareEl(nr, nc).focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleSquareClick(r, c);
    } else if (e.key === 'Escape' && this.selectedSquare) {
      this.clearSelection();
    }
  }

  setFocusedSquare(r, c) {
    this.getSquareEl(this.focusedSquare.r, this.focusedSquare.c).tabIndex = -1;
    this.focusedSquare = { r, c };
    this.getSquareEl(r, c).tabIndex = 0;
  }

  getSquareEl(r, c) {
    return document.querySelector(`[data-coord="${COORDS[r][c]}"]`);
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
      // Só oferece os níveis de mate que têm puzzles cadastrados
      ChallengeGenerator.getMateLevels().forEach(n => {
        const option = document.createElement('option');
        option.value = `mate-${n}`;
        option.textContent = `Mate em ${n} ${n === 1 ? 'Jogada' : 'Jogadas'}`;
        selectEl.appendChild(option);
      });

      selectEl.addEventListener('change', () => {
        this.generateNextChallenge();
      });
    }
  }

  generateNextChallenge() {
    const selectEl = document.getElementById('select-mode');
    const selectedMode = selectEl ? selectEl.value : 'move';

    let challenge = null;
    if (selectedMode.startsWith('mate-')) {
      const mateInX = parseInt(selectedMode.split('-')[1]);
      const currentId = this.currentChallenge ? this.currentChallenge.id : null;
      challenge = ChallengeGenerator.getMateChallenge(mateInX, currentId);
    }
    this.currentChallenge = challenge || ChallengeGenerator.generateRandomMoveChallenge();

    this.loadChallenge(this.currentChallenge);
  }

  loadChallenge(challenge) {
    this.cancelPendingActions();
    this.isLocked = false;
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
    const placed = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const squareEl = document.querySelector(`[data-target-row="${r}"][data-target-col="${c}"]`);
        if (!squareEl) continue;
        squareEl.innerHTML = '';

        const piece = targetBoard[r][c];
        if (piece) {
          squareEl.appendChild(ChessPieces.create(piece));
          placed.push(`${ChessPieces.name(piece)} em ${COORDS[r][c]}`);
        }
      }
    }
    document.getElementById('target-board')
      .setAttribute('aria-label', `Objetivo alvo: ${placed.join(', ')}`);
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

  // setTimeout que é cancelado se o desafio for recarregado antes de disparar
  schedule(fn, delay) {
    const id = setTimeout(() => {
      this.pendingTimeouts = this.pendingTimeouts.filter(t => t !== id);
      fn();
    }, delay);
    this.pendingTimeouts.push(id);
  }

  cancelPendingActions() {
    this.pendingTimeouts.forEach(id => clearTimeout(id));
    this.pendingTimeouts = [];
  }

  lockInput() {
    this.isLocked = true;
    this.clearSelection();
  }

  // Texto lido por leitores de tela (região aria-live invisível)
  announce(msg) {
    document.getElementById('move-announcer').textContent = msg;
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
          const pieceEl = ChessPieces.create(piece);
          const isWhite = piece === piece.toUpperCase();

          if (!this.isCompleted && !this.isLocked && isWhite) {
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

        // Ex.: "a3, Torre branca, selecionada" ou "b2, vazia, lance possível"
        const isSelected = squareEl.classList.contains('selected');
        const label = [coord, piece ? ChessPieces.name(piece) : 'vazia'];
        if (isSelected) label.push('selecionada');
        if (isLegal) label.push(piece ? 'captura possível' : 'lance possível');
        squareEl.setAttribute('aria-label', label.join(', '));
        squareEl.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      }
    }
  }

  handlePointerDown(e, r, c) {
    if (this.isCompleted || this.isLocked) return;

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

        if (move && !this.isLocked) {
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
    if (this.isCompleted || this.isLocked) return;

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
    const captured = this.board[to.r][to.c];
    const promoted = ChessEngine.isPromotion(piece, to.r);
    this.board = ChessEngine.applyMove(this.board, { from, to });
    this.announce(`${ChessPieces.name(piece)} de ${COORDS[from.r][from.c]} para ${COORDS[to.r][to.c]}` +
      (captured ? `, captura ${ChessPieces.name(captured)}` : ''));
    if (promoted) this.setFeedback('Peão promovido a Dama!');

    if (!isBlackMove) {
      this.moveHistory.push({ from, to });
    }

    this.render();

    if (!isBlackMove) {
      this.validateChallenge();
    }
  }

  validateChallenge() {
    const challenge = this.currentChallenge;

    if (ChessEngine.hasKing(this.board, false)) {
      if (ChessEngine.isStalemate(this.board, false)) {
        this.setFeedback('Empate por Afogamento! As pretas não têm lances válidos.', 'error');
        this.lockInput();
        this.schedule(() => this.loadChallenge(this.currentChallenge), 1500);
        return;
      }
    }

    if (challenge.type === 'move') {
      const matchesTarget = JSON.stringify(this.board) === JSON.stringify(challenge.targetBoard);
      if (matchesTarget) {
        this.completeChallenge();
      }
    } else if (challenge.type === 'mate') {
      // Vale qualquer lance que mantenha o mate forçado nos lances restantes, não só o da solução
      const stepIndex = this.moveHistory.length - 1;
      const remaining = challenge.solution.length - stepIndex;

      if (ChessEngine.isMate(this.board, false)) {
        this.completeChallenge();
        return;
      }

      if (!ChessEngine.mateAfterWhiteMove(this.board, remaining)) {
        this.setFeedback('Jogada incorreta! Tente novamente.', 'error');
        this.lockInput();
        this.schedule(() => this.loadChallenge(this.currentChallenge), 1200);
        return;
      }

      const blackMove = this.chooseBlackResponse(stepIndex, remaining);
      this.lockInput();
      this.schedule(() => {
        this.isLocked = false;
        this.executeMove(blackMove.from, blackMove.to, true);
      }, 600);
    }
  }

  // Melhor defesa das pretas; usa a resposta cadastrada quando ela é uma das melhores
  chooseBlackResponse(stepIndex, remaining) {
    const defenses = ChessEngine.bestDefenses(this.board, remaining);
    const stored = (this.currentChallenge.blackResponses || [])[stepIndex];
    return defenses.find(m => ChessEngine.sameMove(m, stored)) ||
      defenses[Math.floor(Math.random() * defenses.length)];
  }

  completeChallenge() {
    this.isCompleted = true;
    this.stopTimer();

    const elapsedSeconds = (Date.now() - this.startTime) / 1000;
    const pointsGained = Math.max(100, Math.floor(1000 - elapsedSeconds * 10));
    this.sessionScore += pointsGained;
    this.renderScores();

    const saveHint = this.currentUser ? '' : ' (entre para salvar no ranking)';
    this.setFeedback(`Desafio Concluído! +${pointsGained} pontos${saveHint}`, 'success');

    // Soma os pontos ao total da conta caso o jogador esteja logado
    this.saveUserScore(pointsGained);
  }

  renderScores() {
    document.getElementById('score').textContent = this.sessionScore;
    document.getElementById('total-score').textContent = this.currentUser ? this.currentUser.score : '—';
  }

  calculateLegalMoves(r, c) {
    return ChessEngine.legalMovesFrom(this.board, r, c);
  }

  async saveUserScore(points) {
    // A identidade vem do cookie de sessão; o servidor ignora visitantes
    if (!this.currentUser) return;

    try {
      const res = await fetch('api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points })
      });
      const data = await res.json();
      if (res.ok && this.currentUser) {
        this.currentUser.score = data.score;
        this.renderScores();
      }
      // Atualiza o ranking em tempo real
      this.fetchLeaderboard();
    } catch (err) {
      console.error('Erro ao salvar pontuação:', err);
    }
  }

  // Carrega o Ranking Geral do Servidor
  async fetchLeaderboard() {
    try {
      const res = await fetch('api/leaderboard');
      const data = await res.json();

      const listEl = document.getElementById('leaderboard-list');
      if (!listEl) return;
      listEl.innerHTML = '';

      const addRow = (...texts) => {
        const li = document.createElement('li');
        texts.forEach((text, i) => {
          if (i > 0) li.append(' ');
          const span = document.createElement('span');
          span.textContent = text;
          li.appendChild(span);
        });
        listEl.appendChild(li);
      };

      if (data.length === 0) {
        addRow('Nenhum registro ainda');
        return;
      }

      // textContent evita que nomes de usuário sejam interpretados como HTML
      data.forEach(item => addRow(item.username, `${item.score} pts`));
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
    game.renderScores();
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
  fetch('api/me')
    .then(res => res.json())
    .then(data => {
      game.currentUser = data.user || null;
      updateUIForUser();
    })
    .catch(err => console.error('Erro ao carregar sessão:', err));

  const authForm = document.getElementById('auth-form');
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const submitButtons = authForm.querySelectorAll('.modal-buttons button');

  const openModal = () => {
    authError.textContent = '';
    modal.classList.remove('hidden');
    usernameInput.focus();
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    passwordInput.value = '';
    (game.currentUser ? btnLogout : btnLoginModal).focus();
  };

  btnLoginModal.addEventListener('click', openModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);

  // Fecha com clique fora do cartão ou com Esc
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('api/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err);
    }
    game.currentUser = null;
    game.sessionScore = 0;
    updateUIForUser();
  });

  // Login e cadastro: mesma requisição, só muda a rota
  const authenticate = async (endpoint) => {
    if (!authForm.reportValidity()) return;
    authError.textContent = '';
    submitButtons.forEach(btn => { btn.disabled = true; });

    try {
      const res = await fetch(`api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.value, password: passwordInput.value })
      });
      const data = await res.json();

      if (!res.ok) {
        authError.textContent = data.error;
        return;
      }

      game.currentUser = data.user;
      updateUIForUser();
      closeModal();
      game.fetchLeaderboard();
    } catch (err) {
      authError.textContent = 'Erro ao conectar ao servidor.';
    } finally {
      submitButtons.forEach(btn => { btn.disabled = false; });
    }
  };

  // Enter no formulário (ou o botão "Entrar") faz login
  authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authenticate('login');
  });
  document.getElementById('btn-submit-register').addEventListener('click', () => authenticate('register'));

  document.getElementById('btn-reset').addEventListener('click', () => {
    game.loadChallenge(game.currentChallenge);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    game.generateNextChallenge();
  });
});