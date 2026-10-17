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
  const ids = Object.values(MATE_PUZZLES_DATABASE).flat().map(p => p.id);
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
