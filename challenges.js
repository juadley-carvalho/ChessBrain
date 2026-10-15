/**
 * ChessBrain - Base de Desafios em Tabuleiro 3x3
 */

const CHALLENGES = [
  {
    id: 1,
    title: "Desafio 1: Troca de Posição (Royal Study)",
    type: "move",
    description: "Mova a Torre branca de a1 para c3.",
    initialBoard: [
      [null, null, null],
      [null, null, null],
      ['R', null, null]
    ],
    targetBoard: [
      [null, null, 'R'],
      [null, null, null],
      [null, null, null]
    ]
  },
  {
    id: 2,
    title: "Desafio 2: Mate em 1 Jogada",
    type: "mate",
    description: "As Brancas jogam e dão Xeque-Mate em 1 lance!",
    initialBoard: [
      ['k', null, null],
      [null, null, null],
      ['K', null, 'R']
    ],
    solution: [
      { from: { r: 2, c: 2 }, to: { r: 0, c: 2 } } // 1. Ra3#
    ]
  },
  {
    id: 3,
    title: "Desafio 3: Mate em 2 Jogadas",
    type: "mate",
    description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
    initialBoard: [
      [null, 'k', null],
      [null, 'p', null],
      ['K', 'R', 'R']
    ],
    solution: [
      { from: { r: 2, c: 1 }, to: { r: 1, c: 1 } }, // 1. Pa2
      { from: { r: 2, c: 2 }, to: { r: 0, c: 2 } }  // 2. Rc3#
    ],
    blackResponses: [
      { from: { r: 0, c: 1 }, to: { r: 0, c: 0 } }  // 1... Ka3
    ]
  }
];