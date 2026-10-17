/**
 * ChessBrain - Gerador de Desafios Dinâmicos com Notação Algébrica
 */

const COORDS = [
  ['a3', 'b3', 'c3'],
  ['a2', 'b2', 'c2'],
  ['a1', 'b1', 'c1']
];

class ChallengeGenerator {
  /**
   * Gera um desafio aleatório de Movimentação (Royal Study) em tempo de execução.
   * Cria notação algébrica (ex: Ra3, Bc1) e o modelo do mini-tabuleiro alvo.
   */
  /**
 * Gera um desafio aleatório de Movimentação (Royal Study) em tempo de execução.
 * Garante que não haja peças repetidas (no máximo 1x Peão, Torre, Bispo, Cavalo, Rei, Dama).
 */
static generateRandomMoveChallenge() {
  // Conjunto fixo com no máximo 1 peça de cada tipo
  const availablePieces = ['P', 'R', 'B', 'N', 'K', 'Q'];
  
  // Define quantas peças colocar no tabuleiro (exemplo: de 1 a 6 peças)
  // const numPieces = Math.floor(Math.random() * 6) + 1; 
  const numPieces = 6;

  // Embaralha o conjunto de peças e seleciona as 'numPieces' primeiras (sem repetição)
  const shuffledPieces = [...availablePieces].sort(() => Math.random() - 0.5);
  const chosenPieces = shuffledPieces.slice(0, numPieces);

  // Tabuleiro Inicial Vazio (3x3)
  let board = Array(3).fill(null).map(() => Array(3).fill(null));
  
  // Mapeia todas as 9 casas do tabuleiro
  const emptyCoords = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      // Opcional: Peão branco não deve iniciar na primeira (r=2) nem na última linha (r=0) para ter movimentos válidos
      emptyCoords.push({ r, c });
    }
  }

  // Posiciona as peças sorteadas em casas vazias aleatórias
  chosenPieces.forEach(piece => {
    // Filtra casas válidas para peões (evita r=0 / linha a3..c3 e r=2 / linha a1..c1 se necessário)
    let availableCoords = emptyCoords;
    if (piece === 'P') {
      const validForPawn = emptyCoords.filter(pos => pos.r === 1); // Força o peão a começar na linha central (a2, b2, c2)
      if (validForPawn.length > 0) availableCoords = validForPawn;
    }

    const idx = Math.floor(Math.random() * availableCoords.length);
    const pos = availableCoords[idx];
    
    // Remove a casa ocupada da lista de coordenadas livres
    const globalIdx = emptyCoords.findIndex(c => c.r === pos.r && c.c === pos.c);
    emptyCoords.splice(globalIdx, 1);

    board[pos.r][pos.c] = piece;
  });

  const initialBoard = board.map(row => [...row]);

  // Aplica de 4 a 7 movimentos válidos aleatórios para formar a posição-alvo
  let currentBoard = board.map(row => [...row]);
  const numSteps = 5; // 4 a 7 movimentos

  for (let step = 0; step < numSteps; step++) {
    const validMoves = [];

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const p = currentBoard[r][c];
        if (p) {
          const raw = this.getRawMoves(currentBoard, r, c);
          raw.forEach(m => validMoves.push({ from: { r, c }, to: m }));
        }
      }
    }

    if (validMoves.length === 0) break;

    const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
    const p = currentBoard[randomMove.from.r][randomMove.from.c];
    currentBoard[randomMove.from.r][randomMove.from.c] = null;
    currentBoard[randomMove.to.r][randomMove.to.c] = p;
  }

  // Gera a notação algébrica das peças no tabuleiro final (ex: Ra3, Bc1)
  const targetNotations = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const piece = currentBoard[r][c];
      if (piece) {
        const coordName = COORDS[r][c];
        targetNotations.push(`${piece}${coordName}`);
      }
    }
  }

  const descText = `Posicione as peças em: ${targetNotations.join(', ')}`;

  return {
    id: Date.now(),
    title: `Desafio de Movimentação (Aleatório)`,
    type: "move",
    description: descText,
    initialBoard: initialBoard,
    targetBoard: currentBoard
  };
}

  static getRawMoves(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const isInside = (nr, nc) => nr >= 0 && nr < 3 && nc >= 0 && nc < 3;

    const orthogonals = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diagonals = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const knightSteps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];

    const type = piece.toLowerCase();

    const addRay = (dirs) => {
      for (let [dr, dc] of dirs) {
        let nr = r + dr, nc = c + dc;
        while (isInside(nr, nc)) {
          if (!board[nr][nc]) {
            moves.push({ r: nr, c: nc });
          } else break;
          nr += dr; nc += dc;
        }
      }
    };

    if (type === 'r') addRay(orthogonals);
    else if (type === 'b') addRay(diagonals);
    else if (type === 'q') addRay([...orthogonals, ...diagonals]);
    else if (type === 'k') {
      for (let [dr, dc] of [...orthogonals, ...diagonals]) {
        if (isInside(r + dr, c + dc) && !board[r + dr][c + dc]) moves.push({ r: r + dr, c: c + dc });
      }
    } else if (type === 'n') {
      for (let [dr, dc] of knightSteps) {
        if (isInside(r + dr, c + dc) && !board[r + dr][c + dc]) moves.push({ r: r + dr, c: c + dc });
      }
    }
    return moves;
  }

  static getMateChallenge(mateInX) {
    const database = MATE_PUZZLES_DATABASE[mateInX];
    if (!database || database.length === 0) {
      return MATE_PUZZLES_DATABASE[1][0];
    }

    const randomIndex = Math.floor(Math.random() * database.length);
    return database[randomIndex];
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
