const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePuzzle, loadChallenges } = require('../scripts/puzzles.js');
const ChessEngine = require('../public/engine.js');

const { ChallengeGenerator, MATE_PUZZLES_DATABASE } = loadChallenges();

test('todos os puzzles de MATE_PUZZLES_DATABASE são válidos', () => {
  for (const [level, puzzles] of Object.entries(MATE_PUZZLES_DATABASE)) {
    for (const puzzle of puzzles) {
      assert.deepEqual(validatePuzzle(puzzle, Number(level)), [], `Mate em ${level} #${puzzle.id}`);
    }
  }
});

test('IDs dos puzzles são únicos', () => {
  const ids = Object.values(MATE_PUZZLES_DATABASE)
    .flat()
    .map(p => p.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('getMateChallenge evita repetir o puzzle atual', () => {
  const [first] = MATE_PUZZLES_DATABASE[1];
  for (let i = 0; i < 20; i++) {
    assert.notEqual(ChallengeGenerator.getMateChallenge(1, first.id).id, first.id);
  }
  assert.equal(ChallengeGenerator.getMateChallenge(99), null);
});

test('getMateChallenge segue para o próximo puzzle não resolvido', () => {
  const ids = MATE_PUZZLES_DATABASE[1].map(p => p.id);
  assert.equal(ChallengeGenerator.getMateChallenge(1).id, ids[0]);
  assert.equal(ChallengeGenerator.getMateChallenge(1, ids[0]).id, ids[1]);
  // Pula os resolvidos e dá a volta na lista
  const solved = new Set([ids[0], ids[2]]);
  assert.equal(ChallengeGenerator.getMateChallenge(1, ids[1], solved).id, ids[3]);
  const allButFirst = new Set(ids.slice(1));
  assert.equal(ChallengeGenerator.getMateChallenge(1, ids[3], allButFirst).id, ids[0]);
  // Só falta o atual: continua nele
  assert.equal(ChallengeGenerator.getMateChallenge(1, ids[0], allButFirst).id, ids[0]);
});

test('desafio de movimentação respeita a distância mínima pedida', () => {
  for (let i = 0; i < 10; i++) {
    const challenge = ChallengeGenerator.generateRandomMoveChallenge({ minMoves: 4, maxMoves: 6 });
    assert.ok(challenge.minMoves >= 4 && challenge.minMoves <= 6);

    // Confere a distância por uma BFS independente
    const levels = ChallengeGenerator.positionsByDistance(challenge.initialBoard, challenge.minMoves);
    const key = JSON.stringify(challenge.targetBoard);
    const found = levels.findIndex(level => level.some(b => JSON.stringify(b) === key));
    assert.equal(found, challenge.minMoves);
  }
});

test('desafios de movimentação têm IDs diferentes', () => {
  const a = ChallengeGenerator.generateRandomMoveChallenge();
  const b = ChallengeGenerator.generateRandomMoveChallenge();
  assert.notEqual(a.id, b.id);
});

test('movimentação vale menos que mate e perde pontos só por erro', () => {
  const move = { type: 'move' };
  assert.equal(ChallengeGenerator.points(move, 0, 0), 300);
  assert.equal(ChallengeGenerator.points(move, 120, 0), 300);
  assert.equal(ChallengeGenerator.points(move, 0, 2), 200);
  assert.equal(ChallengeGenerator.points(move, 0, 20), 50);
});

test('mate vale mais quanto mais longo e perde pontos com o tempo e com cada erro', () => {
  const mateIn = n => MATE_PUZZLES_DATABASE[n][0];
  assert.equal(ChallengeGenerator.points(mateIn(1), 0, 0), 400);
  assert.equal(ChallengeGenerator.points(mateIn(3), 0, 0), 600);
  assert.equal(ChallengeGenerator.points(mateIn(7), 0, 0), 1000);
  assert.equal(ChallengeGenerator.points(mateIn(7), 10.5, 0), 895);
  assert.equal(ChallengeGenerator.points(mateIn(7), 10, 2), 600);
  assert.equal(ChallengeGenerator.points(mateIn(1), 300, 5), 100);
});

test('nenhum desafio passa do limite de pontos aceito pelo servidor', () => {
  for (const level of Object.keys(MATE_PUZZLES_DATABASE)) {
    const puzzle = MATE_PUZZLES_DATABASE[level][0];
    assert.ok(ChallengeGenerator.points(puzzle, 0, 0) <= 1000, `Mate em ${level}`);
  }
});

// ==========================================
// Desafio de movimentação: o alvo precisa ser sempre alcançável
// ==========================================

// Posição do bug relatado: o alvo tinha duas Damas (peão promovido) e parecia impossível
// prettier-ignore
const REPORTED_BOARD = [
  ['Q', 'B', 'N'],
  ['R', 'K', 'P'],
  [null, null, null]
];

const inventory = board => board.flat().filter(Boolean).sort().join('');
const keyOf = board => board.map(row => row.map(p => p || '.').join('')).join('/');

// Todas as posições que o jogador alcança a partir de board, sem limite de lances
function reachableFrom(board) {
  const seen = new Map([[keyOf(board), board]]);
  const queue = [board];
  while (queue.length) {
    const current = queue.shift();
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (!current[r][c]) continue;
        for (const to of ChallengeGenerator.moveChallengeMoves(current, r, c)) {
          const after = ChessEngine.applyMove(current, { from: { r, c }, to });
          if (!seen.has(keyOf(after))) {
            seen.set(keyOf(after), after);
            queue.push(after);
          }
        }
      }
    }
  }
  return seen;
}

// Busca reversa: posições de onde o alvo ainda pode ser alcançado. Sem capturas,
// os lances das peças são reversíveis; o peão é desfeito voltando uma linha.
function canReachSet(target) {
  const seen = new Set([keyOf(target)]);
  const queue = [target];
  while (queue.length) {
    const current = queue.shift();
    const predecessors = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const piece = current[r][c];
        if (!piece) continue;
        if (piece === 'P') {
          if (r < 2 && !current[r + 1][c]) predecessors.push({ from: { r, c }, to: { r: r + 1, c } });
        } else {
          ChessEngine.rawMoves(current, r, c).forEach(to => predecessors.push({ from: { r, c }, to }));
        }
      }
    }
    for (const move of predecessors) {
      const before = ChessEngine.cloneBoard(current);
      before[move.to.r][move.to.c] = before[move.from.r][move.from.c];
      before[move.from.r][move.from.c] = null;
      if (!seen.has(keyOf(before))) {
        seen.add(keyOf(before));
        queue.push(before);
      }
    }
  }
  return seen;
}

test('alvo da movimentação tem sempre as mesmas peças da posição inicial (sem promoção)', () => {
  for (let i = 0; i < 100; i++) {
    const challenge = ChallengeGenerator.generateRandomMoveChallenge();
    assert.equal(inventory(challenge.targetBoard), inventory(challenge.initialBoard), challenge.description);
    assert.equal(challenge.targetBoard.flat().filter(p => p === 'Q').length <= 1, true, challenge.description);
  }
});

test('desafios com menos peças também mantêm as peças e a distância mínima', () => {
  for (const numPieces of [2, 3, 4, 5]) {
    for (let i = 0; i < 30; i++) {
      const challenge = ChallengeGenerator.generateRandomMoveChallenge({ numPieces, minMoves: 2, maxMoves: 4 });
      assert.equal(inventory(challenge.targetBoard), inventory(challenge.initialBoard));
      assert.equal(challenge.initialBoard.flat().filter(Boolean).length, numPieces);
      assert.ok(challenge.minMoves >= 2 && challenge.minMoves <= 4);
    }
  }
});

test('peão começa na primeira linha, com um lance que não promove', () => {
  for (let i = 0; i < 100; i++) {
    const board = ChallengeGenerator.randomPlacement(['P', 'R', 'B', 'N', 'K', 'Q']);
    const row = board.findIndex(r => r.includes('P'));
    assert.equal(row, 2);
  }
});

test('busca do alvo nunca promove o peão (regressão da posição relatada)', () => {
  const levels = ChallengeGenerator.positionsByDistance(REPORTED_BOARD, 6);
  for (const board of levels.flat()) {
    assert.equal(inventory(board), inventory(REPORTED_BOARD), keyOf(board));
  }
});

test('moveChallengeMoves bloqueia a promoção, mas legalMovesFrom continua promovendo', () => {
  // Peão em c2 com c3 livre: no motor o lance existe (e promove); no desafio, não
  // prettier-ignore
  const board = [
    [null, null, null],
    [null, null, 'P'],
    ['K', null, null]
  ];
  assert.deepEqual(ChessEngine.legalMovesFrom(board, 1, 2), [{ r: 0, c: 2 }]);
  assert.deepEqual(ChallengeGenerator.moveChallengeMoves(board, 1, 2), []);
  assert.deepEqual(
    ChallengeGenerator.moveChallengeMoves(board, 2, 0).length,
    ChessEngine.legalMovesFrom(board, 2, 0).length
  );
});

test('canReachTarget detecta peão que avançou demais, mudou de peças ou de coluna', () => {
  // prettier-ignore
  const target = [
    ['Q', 'B', 'N'],
    ['R', 'K', null],
    [null, null, 'P']
  ];
  assert.equal(ChallengeGenerator.canReachTarget(target, target), true);

  const advanced = ChessEngine.applyMove(target, { from: { r: 2, c: 2 }, to: { r: 1, c: 2 } });
  assert.equal(ChallengeGenerator.canReachTarget(advanced, target), false);

  const promoted = ChessEngine.cloneBoard(target);
  promoted[2][2] = null;
  promoted[0][2] = 'Q';
  promoted[2][0] = 'N';
  assert.equal(ChallengeGenerator.canReachTarget(promoted, target), false);

  const otherColumn = ChessEngine.cloneBoard(target);
  otherColumn[2][2] = null;
  otherColumn[2][1] = 'P';
  assert.equal(ChallengeGenerator.canReachTarget(otherColumn, target), false);

  // O inverso vale: peão atrás do alvo ainda pode avançar até ele
  assert.equal(ChallengeGenerator.canReachTarget(target, advanced), true);
});

test('todo desafio gerado é resolvível e canReachTarget confere com uma busca reversa', () => {
  for (let i = 0; i < 6; i++) {
    const challenge = ChallengeGenerator.generateRandomMoveChallenge();
    const reachable = [...reachableFrom(challenge.initialBoard)];
    const winnable = canReachSet(challenge.targetBoard);

    assert.ok(winnable.has(keyOf(challenge.initialBoard)), `alvo inalcançável: ${challenge.description}`);
    // Posições sem saída existem (peão avançado na hora errada); confere uma amostra delas e das demais
    const stuck = reachable.filter(([key]) => !winnable.has(key));
    const sample = [...stuck.slice(0, 4), ...reachable.slice(0, 4)];
    for (const [key, board] of sample) {
      assert.equal(ChallengeGenerator.canReachTarget(board, challenge.targetBoard), winnable.has(key), key);
    }
  }
});

test('peão avançado na hora errada prende as peças e é detectado', () => {
  // O peão chega à casa do alvo (b2), mas cedo demais: o bispo de c1 fica sem saída e nunca
  // alcança c3. Não basta olhar a linha e a coluna do peão.
  // prettier-ignore
  const initial = [
    ['K', null, null],
    ['N', null, 'Q'],
    ['R', 'P', 'B']
  ];
  // prettier-ignore
  const target = [
    ['K', 'Q', 'B'],
    ['N', 'P', null],
    [null, null, 'R']
  ];
  const pawnFirst = ChessEngine.applyMove(initial, { from: { r: 2, c: 1 }, to: { r: 1, c: 1 } });

  assert.equal(ChallengeGenerator.canReachTarget(initial, target), true);
  assert.equal(ChallengeGenerator.canReachTarget(pawnFirst, target), false);
  assert.equal(canReachSet(target).has(keyOf(pawnFirst)), false);
  assert.deepEqual(ChallengeGenerator.moveChallengeMoves(pawnFirst, 2, 2), []);
});
