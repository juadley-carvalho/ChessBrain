/**
 * ChessBrain - Gerador e validador dos puzzles de "Mate em X"
 *
 * Usa as regras do motor do jogo (public/engine.js) e calcula por busca
 * exaustiva se uma posição força o mate em N lances das brancas.
 *
 * Uso:
 *   node scripts/puzzles.js check              valida MATE_PUZZLES_DATABASE (public/challenges.js)
 *   node scripts/puzzles.js generate [max] [n] gera até [n] puzzles por nível, até mate em [max]
 *
 * Um puzzle é válido quando:
 *   - a posição inicial é legal (pretas fora de xeque, peões só na linha do meio);
 *   - o mate mais rápido possível leva exatamente N lances;
 *   - em cada passo, o lance da solução é o ÚNICO que mantém o mate no número de
 *     lances restantes (o jogo aceita alternativas, mas o puzzle fica mais claro);
 *   - cada resposta das pretas é legal e é a melhor defesa (adia o mate ao máximo);
 *   - nenhum lance da linha principal afoga as pretas e o último lance dá xeque-mate.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const {
  COORDS, boardKey, isKingInCheck, applyMove, legalMoves, isMate, isStalemate, sameMove,
  mateDistance, mateMoves, bestDefenses
} = require('../public/engine.js');

const notation = (board, m) => `${board[m.from.r][m.from.c]}${COORDS[m.from.r][m.from.c]}-${COORDS[m.to.r][m.to.c]}`;

// ==========================================
// Validação de um puzzle
// ==========================================

function validatePuzzle(puzzle, expectedN) {
  const errors = [];
  const n = puzzle.solution.length;
  const responses = puzzle.blackResponses || [];
  let board = puzzle.initialBoard.map(row => [...row]);

  if (n !== expectedN) errors.push(`solution tem ${n} lance(s), esperado ${expectedN}`);
  if (responses.length !== n - 1) errors.push(`blackResponses tem ${responses.length} lance(s), esperado ${n - 1}`);
  if ([0, 2].some(r => board[r].some(p => p && p.toLowerCase() === 'p'))) {
    errors.push('peões não podem começar na primeira nem na última linha');
  }
  if (board.flat().filter(p => p === 'K').length !== 1 || board.flat().filter(p => p === 'k').length !== 1) {
    errors.push('a posição precisa de exatamente um rei de cada cor');
  }
  if (isKingInCheck(board, false)) errors.push('as pretas começam em xeque com as brancas a jogar');
  if (errors.length) return errors;

  const distance = mateDistance(board, n);
  if (distance !== n) {
    errors.push(distance < n ? `existe mate mais rápido, em ${distance}` : `não há mate forçado em ${n}`);
    return errors;
  }

  for (let step = 0; step < n; step++) {
    const remaining = n - step;
    const expected = puzzle.solution[step];
    const candidates = mateMoves(board, remaining);

    if (!candidates.some(m => sameMove(m, expected))) {
      errors.push(`lance ${step + 1}: o lance da solução não mantém o mate em ${remaining}`);
      return errors;
    }
    if (candidates.length > 1) {
      errors.push(`lance ${step + 1}: ${candidates.length} lances mantêm o mate (${candidates.map(m => notation(board, m)).join(', ')})`);
    }

    board = applyMove(board, expected);
    if (isStalemate(board, false)) {
      errors.push(`lance ${step + 1}: as pretas ficam afogadas`);
      return errors;
    }
    if (step === n - 1) {
      if (!isMate(board, false)) errors.push('o último lance não dá xeque-mate');
      break;
    }

    const reply = responses[step];
    if (!legalMoves(board, false).some(m => sameMove(m, reply))) {
      errors.push(`resposta ${step + 1} das pretas é ilegal`);
      return errors;
    }
    if (!bestDefenses(board, remaining).some(m => sameMove(m, reply))) {
      errors.push(`resposta ${step + 1} das pretas não é a melhor defesa`);
    }
    board = applyMove(board, reply);
  }
  return errors;
}

function loadDatabase() {
  const file = path.join(__dirname, '..', 'public', 'challenges.js');
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(file, 'utf8')}\n;this.db = MATE_PUZZLES_DATABASE;`, context);
  return context.db;
}

function check() {
  const database = loadDatabase();
  let failures = 0;
  let total = 0;

  for (const [level, puzzles] of Object.entries(database)) {
    puzzles.forEach(puzzle => {
      total++;
      const errors = validatePuzzle(puzzle, Number(level));
      if (errors.length) {
        failures++;
        console.log(`✗ Mate em ${level} #${puzzle.id}`);
        errors.forEach(e => console.log(`    - ${e}`));
      } else {
        console.log(`✓ Mate em ${level} #${puzzle.id}`);
      }
    });
  }

  console.log(`\n${total - failures}/${total} puzzles válidos.`);
  process.exitCode = failures ? 1 : 0;
}

// ==========================================
// Geração
// ==========================================

// As 8 simetrias do quadrado; sem peões, todas preservam as regras (por isso o gerador não usa peões)
const SYMMETRIES = [
  (r, c) => [r, c], (r, c) => [r, 2 - c], (r, c) => [2 - r, c], (r, c) => [2 - r, 2 - c],
  (r, c) => [c, r], (r, c) => [c, 2 - r], (r, c) => [2 - c, r], (r, c) => [2 - c, 2 - r]
];

function canonicalKey(board) {
  return SYMMETRIES.map(t => {
    const out = Array(3).fill(null).map(() => Array(3).fill(null));
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const [nr, nc] = t(r, c);
        out[nr][nc] = board[r][c];
      }
    }
    return boardKey(out);
  }).sort()[0];
}

function* placements(pieces, board = Array(3).fill(null).map(() => Array(3).fill(null)), i = 0) {
  if (i === pieces.length) { yield board.map(row => [...row]); return; }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (board[r][c]) continue;
      board[r][c] = pieces[i];
      yield* placements(pieces, board, i + 1);
      board[r][c] = null;
    }
  }
}

// Monta a linha principal; devolve null se em algum passo o lance não for único
function buildLine(board, n) {
  const solution = [];
  const blackResponses = [];
  for (let step = 0; step < n; step++) {
    const remaining = n - step;
    const candidates = mateMoves(board, remaining);
    if (candidates.length !== 1) return null;
    board = applyMove(board, candidates[0]);
    solution.push(candidates[0]);
    if (step === n - 1) break;

    // Entre as melhores defesas, escolhe uma em que a continuação branca seja única
    const defense = bestDefenses(board, remaining)
      .find(reply => mateMoves(applyMove(board, reply), remaining - 1).length === 1);
    if (!defense) return null;
    blackResponses.push(defense);
    board = applyMove(board, defense);
  }
  return { solution, blackResponses };
}

// Gerador pseudoaleatório com semente fixa: a saída é reproduzível
function seededRandom(seed) {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

function generate(maxN = 6, perLevel = 5) {
  const whiteSets = [['Q'], ['R'], ['Q', 'R'], ['Q', 'B'], ['Q', 'N'], ['R', 'R'], ['R', 'B'], ['R', 'N'], ['B', 'B'], ['B', 'N'], ['N', 'N']];
  const blackSets = [[], ['n'], ['b'], ['r']];
  const found = {};
  const seen = new Set();

  for (const whites of whiteSets) {
    for (const blacks of blackSets) {
      const material = ['K', ...whites, 'k', ...blacks];
      for (const board of placements(material)) {
        const canon = canonicalKey(board);
        if (seen.has(canon)) continue;
        seen.add(canon);
        if (isKingInCheck(board, false)) continue;

        const n = mateDistance(board, maxN);
        if (n === Infinity) continue;
        const line = buildLine(board, n);
        if (!line) continue;

        (found[n] = found[n] || []).push({ material: material.join(''), initialBoard: board, ...line });
      }
    }
  }

  // Sorteia puzzles variados: no máximo um por combinação de material
  const random = seededRandom(42);
  const result = {};
  for (const n of Object.keys(found).map(Number).sort((a, b) => a - b)) {
    const byMaterial = {};
    found[n].forEach(p => (byMaterial[p.material] = byMaterial[p.material] || []).push(p));
    const groups = Object.values(byMaterial);
    for (let i = groups.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [groups[i], groups[j]] = [groups[j], groups[i]];
    }
    result[n] = groups.slice(0, perLevel).map(g => g[Math.floor(random() * g.length)]);
    console.error(`Mate em ${n}: ${found[n].length} posições válidas, ${groups.length} materiais`);
  }
  return result;
}

if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'check') {
    check();
  } else if (command === 'generate') {
    const result = generate(Number(args[0]) || 6, Number(args[1]) || 5);
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Uso: node scripts/puzzles.js check | generate [max] [porNível]');
    process.exitCode = 1;
  }
}

module.exports = { validatePuzzle, generate, legalMoves, isKingInCheck, isMate };
