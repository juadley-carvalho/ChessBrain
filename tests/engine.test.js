const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../public/engine.js');

// Monta o tabuleiro a partir de 3 linhas ('.' = vazia), da linha 3 para a linha 1
const board = (...rows) => rows.map(row => [...row].map(p => (p === '.' ? null : p)));
const targets = moves => moves.map(m => E.COORDS[m.r][m.c]).sort();

test('COORDS segue a notação do README', () => {
  assert.equal(E.COORDS[0][0], 'a3');
  assert.equal(E.COORDS[2][2], 'c1');
});

test('torre anda em linha reta e para na primeira peça', () => {
  const b = board('R.N', '...', '...');
  assert.deepEqual(targets(E.rawMoves(b, 0, 0)), ['a1', 'a2', 'b3']);
});

test('peças capturam as do adversário, mas não as próprias', () => {
  const b = board('R.n', '...', 'N..');
  assert.deepEqual(targets(E.rawMoves(b, 0, 0)), ['a2', 'b3', 'c3']);
});

test('bispo anda nas diagonais', () => {
  const b = board('...', '.B.', '...');
  assert.deepEqual(targets(E.rawMoves(b, 1, 1)), ['a1', 'a3', 'c1', 'c3']);
});

test('cavalo salta por cima das peças', () => {
  const b = board('NRR', 'RRR', 'RRR');
  assert.deepEqual(targets(E.rawMoves(b, 0, 0)), []);
  const open = board('N..', 'PP.', '...');
  assert.deepEqual(targets(E.rawMoves(open, 0, 0)), ['b1', 'c2']);
});

test('peão avança uma casa e captura na diagonal', () => {
  const b = board('n.r', '.P.', '...');
  assert.deepEqual(targets(E.rawMoves(b, 1, 1)), ['a3', 'b3', 'c3']);
  const blocked = board('.k.', '.P.', '...');
  assert.deepEqual(targets(E.rawMoves(blocked, 1, 1)), []);
  const black = board('...', '.p.', '...');
  assert.deepEqual(targets(E.rawMoves(black, 1, 1)), ['b1']);
});

test('peão que chega à última linha vira Dama', () => {
  const white = E.applyMove(board('...', 'P..', '...'), { from: { r: 1, c: 0 }, to: { r: 0, c: 0 } });
  assert.equal(white[0][0], 'Q');
  const black = E.applyMove(board('...', 'p..', '...'), { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } });
  assert.equal(black[2][0], 'q');
  assert.equal(E.isPromotion('P', 1), false);
});

test('applyMove não altera o tabuleiro original', () => {
  const b = board('R..', '...', '...');
  E.applyMove(b, { from: { r: 0, c: 0 }, to: { r: 2, c: 0 } });
  assert.equal(b[0][0], 'R');
});

test('detecta xeque', () => {
  assert.equal(E.isKingInCheck(board('k.R', '...', 'K..'), false), true);
  assert.equal(E.isKingInCheck(board('k..', '..R', 'K..'), false), false);
});

test('lances que deixam o próprio rei em xeque são ilegais', () => {
  // A torre branca em b2 está cravada pela torre preta em b3 contra o rei em b1
  const b = board('.r.', '.R.', '.K.');
  assert.deepEqual(targets(E.legalMovesFrom(b, 1, 1)), ['b3']);
});

test('xeque-mate e afogamento', () => {
  const check = board('k.R', '..K', '...');
  assert.equal(E.isMate(check, false), false); // o rei escapa para a2
  const mated = board('k.R', '...', '.K.');
  assert.equal(E.isMate(mated, false), true);
  const stalemate = board('k..', '.R.', '.K.');
  assert.equal(E.isStalemate(stalemate, false), true);
  assert.equal(E.isMate(stalemate, false), false);
});

test('busca de mate encontra a distância exata', () => {
  const mateIn1 = board('K.N', '...', 'k.N');
  assert.equal(E.mateDistance(mateIn1, 3), 1);
  assert.equal(E.canMateIn(mateIn1, 1), true);
  assert.equal(E.mateMoves(mateIn1, 1).length > 0, true);
});

test('sameMove compara origem e destino', () => {
  const m = { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } };
  assert.equal(E.sameMove(m, { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } }), true);
  assert.equal(E.sameMove(m, { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } }), false);
  assert.equal(E.sameMove(m, undefined), false);
});
