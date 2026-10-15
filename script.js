/**
 * ChessBrain - Motor de Xadrez 3x3, Drag & Drop Universal (Pointer Events)
 */

const PIECE_SYMBOLS = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

const COORDS = [
  ['a3', 'b3', 'c3'],
  ['a2', 'b2', 'c2'],
  ['a1', 'b1', 'c1']
];

class Chess3x3 {
  constructor() {
    this.board = Array(3).fill(null).map(() => Array(3).fill(null));
    this.selectedSquare = null;
    this.legalMoves = [];

    // Estado do Drag & Drop por Pointer Events
    this.draggingState = {
      isDragging: false,
      fromSquare: null,
      pieceEl: null,
      ghostEl: null
    };

    this.currentChallengeIndex = 0;
    this.moveHistory = [];
    this.totalScore = 0;
    this.timerInterval = null;
    this.startTime = null;
    this.isCompleted = false;

    this.initBoardUI();
    this.loadChallenge(0);
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

        square.addEventListener('click', (e) => {
          // Previne clique duplo ao soltar o arraste
          if (!this.draggingState.isDragging) {
            this.handleSquareClick(r, c);
          }
        });

        boardEl.appendChild(square);
      }
    }

    // Eventos Globais de Movimento de Ponteiro (Mouse & Touch)
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  loadChallenge(index) {
    if (index >= CHALLENGES.length) {
      this.setFeedback('Parabéns! Você concluiu todos os desafios disponíveis.', 'success');
      return;
    }

    this.currentChallengeIndex = index;
    const challenge = CHALLENGES[index];

    this.board = challenge.initialBoard.map(row => [...row]);
    this.moveHistory = [];
    this.isCompleted = false;

    document.getElementById('challenge-title').textContent = challenge.title;
    document.getElementById('challenge-desc').textContent = challenge.description;
    this.setFeedback('');

    this.clearSelection();
    this.startTimer();
    this.render();
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

          // Inicia o Arraste via Pointer Down (Sempre permitido para peças Brancas)
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

    // Seleciona a casa imediatamente ao clicar/tocar
    this.selectSquare(r, c);

    const pieceEl = e.currentTarget;
    this.draggingState = {
      isDragging: false,
      hasMoved: false,
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

    // Considera arraste se o movimento for maior que 5 pixels
    if (!this.draggingState.isDragging && (dx > 5 || dy > 5)) {
      this.draggingState.isDragging = true;

      // Cria a peça flutuante que segue o cursor
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
      // Identifica sob qual casa do tabuleiro o cursor/dedo foi solto
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

      // Remove a peça flutuante da tela
      if (this.draggingState.ghostEl) {
        this.draggingState.ghostEl.remove();
      }
      this.draggingState.pieceEl.style.opacity = '1';
    }

    // Reseta o estado do arraste
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
    const challenge = CHALLENGES[this.currentChallengeIndex];

    if (this.hasKingOnBoard(false)) {
      const blackInCheck = this.isKingInCheck(false);
      const blackHasMoves = this.hasLegalMoves(false);

      if (!blackHasMoves && !blackInCheck) {
        this.setFeedback('Empate por Afogamento! As pretas não têm lances válidos.', 'error');
        setTimeout(() => this.loadChallenge(this.currentChallengeIndex), 1500);
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
        setTimeout(() => this.loadChallenge(this.currentChallengeIndex), 1200);
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
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Chess3x3();

  document.getElementById('btn-reset').addEventListener('click', () => {
    game.loadChallenge(game.currentChallengeIndex);
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    game.loadChallenge(game.currentChallengeIndex + 1);
  });
});