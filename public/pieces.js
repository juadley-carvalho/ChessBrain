/**
 * ChessBrain - Peças em SVG (desenho próprio, estilo Staunton)
 *
 * Cada peça usa o mesmo desenho para as duas cores; o preenchimento,
 * o contorno e os detalhes vêm das variáveis CSS de .piece.white / .piece.black.
 */
const ChessPieces = (() => {
  const body = d => `<path class="pc-body" d="${d}"/>`;
  const line = d => `<path class="pc-line" d="${d}"/>`;
  const ball = (cx, cy, r) => `<circle class="pc-body" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const dot = (cx, cy, r) => `<circle class="pc-dot" cx="${cx}" cy="${cy}" r="${r}"/>`;

  // Pedestal comum: anel + base larga
  const BASE =
    body('M27 82 C27 78 31 76 35 76 H65 C69 76 73 78 73 82 Z') +
    body('M20 91 C20 85 24 83 30 82 H70 C76 83 80 85 80 91 Z');

  const SHAPES = {
    p: body('M37 77 C41 68 43 61 43 55 H57 C57 61 59 68 63 77 Z') +
       BASE +
       body('M36 56 C36 51 64 51 64 56 C64 60 36 60 36 56 Z') +
       ball(50, 39, 13),

    r: body('M34 77 L36 42 H64 L66 77 Z') +
       line('M38 58 H62') +
       BASE +
       body('M30 43 C30 39 32 38 35 38 H65 C68 38 70 39 70 43 Z') +
       body('M31 38 V20 H40 V26 H46 V20 H54 V26 H60 V20 H69 V38 Z') +
       line('M37 47 H63'),

    b: body('M38 77 C41 68 43 62 43 57 H57 C57 62 59 68 62 77 Z') +
       BASE +
       body('M35 58 C35 53 65 53 65 58 C65 62 35 62 35 58 Z') +
       body('M50 20 C40 27 34 37 36 45 C37 51 43 54 50 54 C57 54 63 51 64 45 C66 37 60 27 50 20 Z') +
       line('M55 31 L46 42') +
       ball(50, 16, 5),

    n: body('M30 79 C30 68 38 62 42 57 C36 58 29 61 24 59 C17 57 15 50 19 45 ' +
            'C25 37 31 29 37 23 L41 10 L48 19 C63 21 74 35 73 54 C72 65 70 72 70 79 Z') +
       line('M49 21 C61 27 67 40 66 56') +
       line('M42 57 C40 52 36 49 31 48') +
       dot(35, 33, 2.6) +
       dot(21, 50, 1.6) +
       BASE,

    q: body('M36 77 C37 64 33 50 26 33 L38 45 L38 25 L46 43 L50 21 L54 43 L62 25 L62 45 L74 33 ' +
            'C67 50 63 64 64 77 Z') +
       ball(26, 31, 4.2) + ball(38, 23, 4.2) + ball(50, 18, 4.5) + ball(62, 23, 4.2) + ball(74, 31, 4.2) +
       BASE +
       body('M33 60 C33 56 67 56 67 60 C67 64 33 64 33 60 Z'),

    k: body('M36 77 C38 66 36 56 31 46 H69 C64 56 62 66 64 77 Z') +
       body('M47 32 V24 H42 V18 H47 V11 H53 V18 H58 V24 H53 V32 Z') +
       body('M30 47 C26 36 36 29 44 34 C46 31 48 30 50 30 C52 30 54 31 56 34 ' +
            'C64 29 74 36 70 47 C60 44 40 44 30 47 Z') +
       BASE +
       body('M33 61 C33 57 67 57 67 61 C67 65 33 65 33 61 Z')
  };

  // Gradientes compartilhados por todas as peças (marfim e ébano)
  const DEFS = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <defs>
        <linearGradient id="pc-ivory" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#fffdf6"/>
          <stop offset="0.5" stop-color="#efe1c3"/>
          <stop offset="1" stop-color="#c4a67c"/>
        </linearGradient>
        <linearGradient id="pc-ebony" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" stop-color="#6e5644"/>
          <stop offset="0.45" stop-color="#2d2119"/>
          <stop offset="1" stop-color="#0d0906"/>
        </linearGradient>
      </defs>
    </svg>`;

  document.body.insertAdjacentHTML('afterbegin', DEFS);

  const NAMES = { p: 'Peão', r: 'Torre', b: 'Bispo', n: 'Cavalo', q: 'Dama', k: 'Rei' };

  // Cria o elemento da peça a partir da letra FEN ('K' = rei branco, 'k' = rei preto)
  function create(piece) {
    const isWhite = piece === piece.toUpperCase();
    const type = piece.toLowerCase();
    const el = document.createElement('div');
    el.className = `piece ${isWhite ? 'white' : 'black'}`;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', `${NAMES[type]} ${isWhite ? 'branco' : 'preto'}`);
    el.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${SHAPES[type]}</svg>`;
    return el;
  }

  return { create };
})();
