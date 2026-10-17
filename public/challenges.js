/**
 * ChessBrain - Gerador de Desafios Dinâmicos com Notação Algébrica
 */

// Regras e coordenadas vêm de ChessEngine (engine.js, carregado antes deste arquivo)

class ChallengeGenerator {
  /**
   * Gera um desafio aleatório de Movimentação (Royal Study) em tempo de execução.
   * Usa no máximo 1 peça de cada tipo (Peão, Torre, Bispo, Cavalo, Rei, Dama) e escolhe
   * um alvo que exige exatamente entre minMoves e maxMoves lances (distância mínima via BFS).
   */
  static generateRandomMoveChallenge({ numPieces = 6, minMoves = 4, maxMoves = 6 } = {}) {
    const pieces = this.shuffle(['P', 'R', 'B', 'N', 'K', 'Q']).slice(0, Math.min(numPieces, 6));

    for (let attempt = 0; attempt < 20; attempt++) {
      const initialBoard = this.randomPlacement(pieces);
      const levels = this.positionsByDistance(initialBoard, maxMoves);

      // Distância sorteada na faixa pedida; sem posições nela, usa a mais distante alcançável
      const wanted = minMoves + Math.floor(Math.random() * (maxMoves - minMoves + 1));
      const distance = Math.min(wanted, levels.length - 1);
      if (distance < minMoves) continue; // posição travada demais: sorteia outra

      const candidates = levels[distance];
      const targetBoard = candidates[Math.floor(Math.random() * candidates.length)];

      // Notação algébrica das peças no tabuleiro final (ex: Ra3, Bc1)
      const targetNotations = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (targetBoard[r][c]) targetNotations.push(`${targetBoard[r][c]}${ChessEngine.COORDS[r][c]}`);
        }
      }

      return {
        id: Date.now(),
        title: `Desafio de Movimentação (Aleatório)`,
        type: "move",
        description: `Posicione as peças em: ${targetNotations.join(', ')} — mínimo de ${distance} lances`,
        minMoves: distance,
        initialBoard,
        targetBoard
      };
    }
    throw new Error('Não foi possível gerar um desafio de movimentação.');
  }

  // Embaralhamento de Fisher–Yates (sem o viés do sort aleatório)
  static shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // Coloca as peças em casas aleatórias; o peão começa na linha do meio para ter lances
  static randomPlacement(pieces) {
    const board = Array(3).fill(null).map(() => Array(3).fill(null));
    const free = [];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) free.push({ r, c });
    }

    // O peão escolhe primeiro, garantindo uma casa livre na linha do meio
    const ordered = [...pieces].sort((a, b) => (b === 'P') - (a === 'P'));
    ordered.forEach(piece => {
      const options = piece === 'P' ? free.filter(pos => pos.r === 1) : free;
      const pos = options[Math.floor(Math.random() * options.length)];
      free.splice(free.indexOf(pos), 1);
      board[pos.r][pos.c] = piece;
    });
    return board;
  }

  // BFS a partir da posição inicial: levels[d] = posições cuja distância mínima é d lances
  static positionsByDistance(initialBoard, maxDepth) {
    const seen = new Set([ChessEngine.boardKey(initialBoard)]);
    const levels = [[initialBoard]];

    for (let depth = 1; depth <= maxDepth; depth++) {
      const next = [];
      for (const board of levels[depth - 1]) {
        // Só há peças brancas, então os lances brutos já são os legais
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (!board[r][c]) continue;
            for (const to of ChessEngine.rawMoves(board, r, c)) {
              const after = ChessEngine.applyMove(board, { from: { r, c }, to });
              const key = ChessEngine.boardKey(after);
              if (!seen.has(key)) {
                seen.add(key);
                next.push(after);
              }
            }
          }
        }
      }
      if (next.length === 0) break;
      levels.push(next);
    }
    return levels;
  }

  // Sorteia um puzzle do nível, evitando repetir o atual quando houver alternativa
  static getMateChallenge(mateInX, currentId = null) {
    const database = MATE_PUZZLES_DATABASE[mateInX];
    if (!database || database.length === 0) return null;

    const options = database.length > 1 ? database.filter(p => p.id !== currentId) : database;
    return options[Math.floor(Math.random() * options.length)];
  }

  // Níveis de mate com pelo menos um puzzle, em ordem crescente
  static getMateLevels() {
    return Object.keys(MATE_PUZZLES_DATABASE)
      .map(Number)
      .filter(n => MATE_PUZZLES_DATABASE[n].length > 0)
      .sort((a, b) => a - b);
  }
}

/**
 * Base de Dados de Puzzles de Mate em X
 */
const MATE_PUZZLES_DATABASE = {
  1: [
    {
      id: 101,
      title: "Mate em 1 Jogada",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
      initialBoard: [
        ['K', null, 'N'],
        [null, null, null],
        ['k', null, 'N']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 0, c: 1 } }
      ]
    },
    {
      id: 102,
      title: "Mate em 1 Jogada",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
      initialBoard: [
        ['Q', 'K', null],
        [null, null, null],
        ['N', 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } }
      ]
    },
    {
      id: 103,
      title: "Mate em 1 Jogada",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
      initialBoard: [
        ['K', 'r', 'Q'],
        [null, 'R', null],
        ['k', null, null]
      ],
      solution: [
        { from: { r: 1, c: 1 }, to: { r: 0, c: 1 } }
      ]
    },
    {
      id: 104,
      title: "Mate em 1 Jogada",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
      initialBoard: [
        [null, 'K', null],
        ['Q', null, 'N'],
        ['n', null, 'k']
      ],
      solution: [
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 105,
      title: "Mate em 1 Jogada",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
      initialBoard: [
        ['K', null, 'n'],
        [null, null, 'B'],
        ['k', null, 'N']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 0, c: 1 } }
      ]
    }
  ],
  2: [
    {
      id: 201,
      title: "Mate em 2 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
      initialBoard: [
        ['B', 'K', null],
        ['n', null, null],
        ['k', 'B', null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } }
      ]
    },
    {
      id: 202,
      title: "Mate em 2 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
      initialBoard: [
        ['K', null, 'N'],
        [null, 'R', null],
        [null, 'b', 'k']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } }
      ]
    },
    {
      id: 203,
      title: "Mate em 2 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
      initialBoard: [
        ['K', 'R', null],
        ['b', null, 'k'],
        [null, null, null]
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 2 } }
      ]
    },
    {
      id: 204,
      title: "Mate em 2 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
      initialBoard: [
        ['Q', 'K', null],
        ['R', null, null],
        [null, 'k', 'n']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 2, c: 2 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } }
      ]
    },
    {
      id: 205,
      title: "Mate em 2 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
      initialBoard: [
        ['K', null, 'R'],
        [null, null, null],
        ['B', 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    }
  ],
  3: [
    {
      id: 301,
      title: "Mate em 3 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 3 lances!",
      initialBoard: [
        ['K', null, 'Q'],
        ['n', 'B', null],
        [null, 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 1 }, to: { r: 1, c: 1 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 0 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } }
      ]
    },
    {
      id: 302,
      title: "Mate em 3 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 3 lances!",
      initialBoard: [
        ['K', 'R', null],
        [null, null, 'k'],
        [null, 'b', 'N']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 2 } }
      ]
    },
    {
      id: 303,
      title: "Mate em 3 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 3 lances!",
      initialBoard: [
        ['K', 'R', null],
        [null, 'n', null],
        ['k', null, null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 304,
      title: "Mate em 3 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 3 lances!",
      initialBoard: [
        ['K', 'N', null],
        ['n', null, 'k'],
        [null, null, 'B']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } }
      ]
    },
    {
      id: 305,
      title: "Mate em 3 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 3 lances!",
      initialBoard: [
        ['K', 'R', 'b'],
        [null, null, null],
        ['k', null, null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    }
  ],
  4: [
    {
      id: 401,
      title: "Mate em 4 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 4 lances!",
      initialBoard: [
        ['K', 'b', 'B'],
        [null, null, null],
        ['N', null, 'k']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 402,
      title: "Mate em 4 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 4 lances!",
      initialBoard: [
        ['K', 'R', 'b'],
        ['B', null, 'k'],
        [null, null, null]
      ],
      solution: [
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 403,
      title: "Mate em 4 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 4 lances!",
      initialBoard: [
        ['K', 'R', null],
        [null, null, 'N'],
        ['n', null, 'k']
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 0 }, to: { r: 1, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 404,
      title: "Mate em 4 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 4 lances!",
      initialBoard: [
        ['K', null, null],
        [null, null, 'R'],
        ['N', 'k', 'r']
      ],
      solution: [
        { from: { r: 1, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 2 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } }
      ]
    },
    {
      id: 405,
      title: "Mate em 4 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 4 lances!",
      initialBoard: [
        ['K', 'Q', null],
        [null, 'R', null],
        ['r', null, 'k']
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } }
      ]
    }
  ],
  5: [
    {
      id: 501,
      title: "Mate em 5 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 5 lances!",
      initialBoard: [
        ['K', null, 'B'],
        [null, null, 'R'],
        [null, 'k', 'r']
      ],
      solution: [
        { from: { r: 1, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 2, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 2 }, to: { r: 0, c: 2 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 502,
      title: "Mate em 5 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 5 lances!",
      initialBoard: [
        ['B', 'K', null],
        [null, 'b', null],
        ['k', null, 'N']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 0, c: 0 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } }
      ]
    },
    {
      id: 503,
      title: "Mate em 5 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 5 lances!",
      initialBoard: [
        ['K', null, 'B'],
        [null, null, 'R'],
        [null, 'k', 'b']
      ],
      solution: [
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 2 }, to: { r: 0, c: 0 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 504,
      title: "Mate em 5 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 5 lances!",
      initialBoard: [
        ['K', 'N', 'B'],
        [null, null, null],
        ['n', 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 505,
      title: "Mate em 5 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 5 lances!",
      initialBoard: [
        ['K', null, 'R'],
        ['b', null, null],
        ['k', null, null]
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } }
      ]
    }
  ],
  6: [
    {
      id: 601,
      title: "Mate em 6 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 6 lances!",
      initialBoard: [
        ['K', null, 'B'],
        ['N', null, 'k'],
        [null, null, null]
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 602,
      title: "Mate em 6 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 6 lances!",
      initialBoard: [
        ['K', null, 'B'],
        ['N', null, 'k'],
        ['n', null, null]
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 603,
      title: "Mate em 6 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 6 lances!",
      initialBoard: [
        ['K', null, 'B'],
        ['b', null, 'k'],
        [null, null, 'N']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 604,
      title: "Mate em 6 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 6 lances!",
      initialBoard: [
        ['K', null, 'B'],
        [null, 'r', 'k'],
        [null, null, 'N']
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 0 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 605,
      title: "Mate em 6 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 6 lances!",
      initialBoard: [
        ['K', null, 'k'],
        [null, null, 'b'],
        [null, null, 'R']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 2 } }
      ]
    }
  ],
  7: [
    {
      id: 701,
      title: "Mate em 7 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 7 lances!",
      initialBoard: [
        ['K', 'N', 'B'],
        [null, null, 'k'],
        ['b', null, null]
      ],
      solution: [
        { from: { r: 0, c: 2 }, to: { r: 2, c: 0 } },
        { from: { r: 2, c: 0 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 1, c: 0 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 2, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } }
      ]
    },
    {
      id: 702,
      title: "Mate em 7 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 7 lances!",
      initialBoard: [
        ['K', 'N', 'k'],
        [null, null, null],
        ['n', null, 'B']
      ],
      solution: [
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 0, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 1, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 2 } },
        { from: { r: 0, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 0, c: 2 }, to: { r: 1, c: 2 } },
        { from: { r: 1, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 703,
      title: "Mate em 7 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 7 lances!",
      initialBoard: [
        ['B', 'K', null],
        [null, null, 'N'],
        [null, 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 0, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } }
      ]
    },
    {
      id: 704,
      title: "Mate em 7 Jogadas",
      type: "mate",
      description: "As Brancas jogam e dão Xeque-Mate em 7 lances!",
      initialBoard: [
        ['B', 'K', 'r'],
        [null, null, 'N'],
        [null, 'k', null]
      ],
      solution: [
        { from: { r: 0, c: 1 }, to: { r: 0, c: 2 } },
        { from: { r: 0, c: 0 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 1 }, to: { r: 2, c: 0 } },
        { from: { r: 0, c: 2 }, to: { r: 0, c: 1 } },
        { from: { r: 2, c: 0 }, to: { r: 1, c: 1 } },
        { from: { r: 1, c: 2 }, to: { r: 0, c: 0 } }
      ],
      blackResponses: [
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 1, c: 0 } },
        { from: { r: 1, c: 0 }, to: { r: 2, c: 1 } },
        { from: { r: 2, c: 1 }, to: { r: 2, c: 2 } },
        { from: { r: 2, c: 2 }, to: { r: 2, c: 1 } }
      ]
    }
  ]
};
