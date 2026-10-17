/**
 * ChessBrain - Regras do xadrez 3x3 (sem DOM)
 *
 * Funções puras sobre uma matriz 3x3: maiúsculas = brancas, minúsculas = pretas,
 * null = casa vazia. Usado pelo jogo (script.js), pelo gerador de desafios
 * (challenges.js) e pelo validador de puzzles (scripts/puzzles.js).
 */

const ChessEngine = (() => {
  const COORDS = [
    ['a3', 'b3', 'c3'],
    ['a2', 'b2', 'c2'],
    ['a1', 'b1', 'c1']
  ];

  const ORTHOGONALS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const DIAGONALS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const KNIGHT_STEPS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

  const isInside = (r, c) => r >= 0 && r < 3 && c >= 0 && c < 3;
  const isWhitePiece = (p) => p === p.toUpperCase();
  const cloneBoard = (board) => board.map(row => [...row]);

  // Lances da peça em (r, c) sem considerar se o próprio rei fica em xeque
  function rawMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const white = isWhitePiece(piece);
    const moves = [];

    const canMoveTo = (nr, nc) => {
      if (!isInside(nr, nc)) return false;
      const target = board[nr][nc];
      return !target || isWhitePiece(target) !== white;
    };
    const addSteps = (steps) => {
      for (const [dr, dc] of steps) {
        if (canMoveTo(r + dr, c + dc)) moves.push({ r: r + dr, c: c + dc });
      }
    };
    const addRays = (dirs) => {
      for (const [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (canMoveTo(nr, nc)) {
          moves.push({ r: nr, c: nc });
          if (board[nr][nc]) break;
          nr += dr; nc += dc;
        }
      }
    };

    switch (piece.toLowerCase()) {
      case 'p': {
        const dir = white ? -1 : 1;
        if (isInside(r + dir, c) && !board[r + dir][c]) moves.push({ r: r + dir, c });
        for (const dc of [-1, 1]) {
          const nr = r + dir, nc = c + dc;
          if (isInside(nr, nc) && board[nr][nc] && isWhitePiece(board[nr][nc]) !== white) {
            moves.push({ r: nr, c: nc });
          }
        }
        break;
      }
      case 'n': addSteps(KNIGHT_STEPS); break;
      case 'k': addSteps([...ORTHOGONALS, ...DIAGONALS]); break;
      case 'r': addRays(ORTHOGONALS); break;
      case 'b': addRays(DIAGONALS); break;
      case 'q': addRays([...ORTHOGONALS, ...DIAGONALS]); break;
    }
    return moves;
  }

  function findKing(board, white) {
    const king = white ? 'K' : 'k';
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (board[r][c] === king) return { r, c };
      }
    }
    return null;
  }

  const hasKing = (board, white) => findKing(board, white) !== null;

  function isKingInCheck(board, white) {
    const king = findKing(board, white);
    if (!king) return false;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const p = board[r][c];
        if (p && isWhitePiece(p) !== white && rawMoves(board, r, c).some(m => m.r === king.r && m.c === king.c)) {
          return true;
        }
      }
    }
    return false;
  }

  // Peão que chega à última linha (a3–c3 para as brancas, a1–c1 para as pretas)
  const isPromotion = (piece, toRow) =>
    piece === 'P' ? toRow === 0 : piece === 'p' ? toRow === 2 : false;

  // Devolve um novo tabuleiro com o lance aplicado; o peão é promovido a Dama automaticamente
  function applyMove(board, move) {
    const next = cloneBoard(board);
    const piece = next[move.from.r][move.from.c];
    next[move.to.r][move.to.c] = isPromotion(piece, move.to.r) ? (isWhitePiece(piece) ? 'Q' : 'q') : piece;
    next[move.from.r][move.from.c] = null;
    return next;
  }

  // Destinos legais da peça em (r, c): o próprio rei não pode ficar em xeque
  function legalMovesFrom(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const white = isWhitePiece(piece);
    return rawMoves(board, r, c).filter(to => !isKingInCheck(applyMove(board, { from: { r, c }, to }), white));
  }

  // Todos os lances legais de uma cor, no formato { from, to }
  function legalMoves(board, white) {
    const moves = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const p = board[r][c];
        if (!p || isWhitePiece(p) !== white) continue;
        legalMovesFrom(board, r, c).forEach(to => moves.push({ from: { r, c }, to }));
      }
    }
    return moves;
  }

  const isMate = (board, white) => isKingInCheck(board, white) && legalMoves(board, white).length === 0;
  const isStalemate = (board, white) => !isKingInCheck(board, white) && legalMoves(board, white).length === 0;

  const sameMove = (a, b) =>
    !!a && !!b && a.from.r === b.from.r && a.from.c === b.from.c && a.to.r === b.to.r && a.to.c === b.to.c;

  // ==========================================
  // Busca: brancas forçam mate em até n lances?
  // ==========================================

  const boardKey = (board) => board.map(row => row.map(p => p || '.').join('')).join('/');
  const memo = new Map();

  // Brancas a jogar
  function canMateIn(board, n) {
    if (n <= 0) return false;
    const k = boardKey(board) + n;
    if (memo.has(k)) return memo.get(k);

    let result = false;
    for (const move of legalMoves(board, true)) {
      if (mateAfterWhiteMove(applyMove(board, move), n)) { result = true; break; }
    }
    memo.set(k, result);
    return result;
  }

  // Pretas a jogar, depois de um lance branco: o mate continua forçado em até n lances (contando esse)?
  function mateAfterWhiteMove(board, n) {
    const replies = legalMoves(board, false);
    if (replies.length === 0) return isKingInCheck(board, false); // mate (true) ou afogamento (false)
    if (n <= 1) return false;
    return replies.every(reply => canMateIn(applyMove(board, reply), n - 1));
  }

  // Menor n (até max) em que as brancas forçam o mate; Infinity se não houver
  function mateDistance(board, max) {
    for (let n = 1; n <= max; n++) {
      if (canMateIn(board, n)) return n;
    }
    return Infinity;
  }

  // Lances brancos que mantêm o mate em n
  function mateMoves(board, n) {
    return legalMoves(board, true).filter(m => mateAfterWhiteMove(applyMove(board, m), n));
  }

  // Respostas pretas que adiam o mate ao máximo (melhor defesa), dentro de n-1
  function bestDefenses(board, n) {
    const replies = legalMoves(board, false).map(reply => ({
      reply,
      distance: mateDistance(applyMove(board, reply), n - 1)
    }));
    const longest = Math.max(...replies.map(x => x.distance));
    return replies.filter(x => x.distance === longest).map(x => x.reply);
  }

  return {
    COORDS,
    isWhitePiece,
    cloneBoard,
    rawMoves,
    hasKing,
    isKingInCheck,
    isPromotion,
    applyMove,
    legalMovesFrom,
    legalMoves,
    isMate,
    isStalemate,
    sameMove,
    boardKey,
    canMateIn,
    mateAfterWhiteMove,
    mateDistance,
    mateMoves,
    bestDefenses
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ChessEngine;
}
