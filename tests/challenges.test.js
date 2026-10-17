const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePuzzle, loadChallenges } = require('../scripts/puzzles.js');

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
