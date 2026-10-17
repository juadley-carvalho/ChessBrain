# ChessBrain ♞

Jogo web de desafios de xadrez em um **tabuleiro 3x3**. O jogador resolve dois tipos de desafio contra o relógio, acumula pontos e, se estiver cadastrado, aparece no ranking geral.

> Versão atual: **v0.5.0** (desafios de movimentação, mate em X, cadastro e login de usuários).

![Tela do ChessBrain: desafio de movimentação concluído, com o tabuleiro atual, o objetivo alvo e o ranking geral](docs/images/screenshot.png)

## Funcionalidades

- **Desafio de Movimentação (aleatório)** — o jogo sorteia uma posição inicial com peças brancas e gera uma posição‑alvo aplicando movimentos válidos. O objetivo é reproduzir a posição‑alvo, exibida em um mini‑tabuleiro e em notação algébrica (ex.: `Ra3, Bc1`).
- **Mate em X jogadas** — puzzles pré‑cadastrados em que as brancas devem dar xeque‑mate seguindo a sequência de lances da solução. As respostas das pretas são jogadas automaticamente.
- **Interação por clique ou arrastar‑e‑soltar** (Pointer Events, funciona com mouse e toque), com destaque de lances legais e de capturas.
- **Regras de xadrez aplicadas ao 3x3**: movimentos de todas as peças, bloqueio de lances que deixam o próprio rei em xeque e detecção de afogamento.
- **Cronômetro e pontuação** — cada desafio vale entre 100 e 1000 pontos, conforme o tempo gasto.
- **Cadastro e login** com senha criptografada (bcrypt).
- **Ranking geral (Top 10)** persistido em SQLite.
- Espaços reservados para anúncios (topo, laterais e rodapé).

## Stack

| Camada    | Tecnologia                                   |
|-----------|----------------------------------------------|
| Front‑end | HTML, CSS e JavaScript puro (sem framework)  |
| Back‑end  | Node.js + Express 4                          |
| Banco     | SQLite 3 (arquivo `data/chessbrain.db`)      |
| Senhas    | bcryptjs                                     |

## Estrutura do projeto

```
ChessBrain/
├── server.js            # Servidor Express, API REST e criação do banco SQLite
├── public/              # Única pasta servida ao navegador
│   ├── index.html       # Página única do jogo (layout, modal de login, ranking)
│   ├── styles.css       # Estilos do tabuleiro, layout e modais
│   ├── script.js        # Motor do jogo (classe Chess3x3): regras, UI, timer, pontuação, autenticação
│   └── challenges.js    # Gerador de desafios de movimentação + base de puzzles de mate
├── data/
│   └── chessbrain.db    # Banco SQLite (criado automaticamente; fora do Git)
├── package.json
└── docs/
    ├── MELHORIAS.md # Melhorias e problemas identificados
    └── images/      # Capturas de tela usadas na documentação
```

## Como executar

Pré‑requisito: **Node.js** (testado com v24) e npm.

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida pela variável de ambiente `PORT`) e escuta em `0.0.0.0`, ou seja, também fica acessível por outros dispositivos da rede local em `http://<SEU_IP_LOCAL>:3000`.

```bash
# Exemplo com outra porta (PowerShell)
$env:PORT=3006; npm start
```

O arquivo `data/chessbrain.db` e as tabelas são criados automaticamente se não existirem. Se houver um `chessbrain.db` na raiz (versões anteriores), ele é movido para `data/` na primeira execução. Apenas a pasta `public/` é servida pelo Express, então o banco e o código do servidor não ficam acessíveis pela rede.

## Como jogar

1. Escolha o modo no seletor **Modo de Desafio**.
2. Mova as peças brancas clicando na peça e depois na casa de destino, ou arrastando a peça.
3. **Movimentação:** deixe o tabuleiro igual ao **Objetivo Alvo**.
   **Mate em X:** encontre a sequência de lances que dá xeque‑mate. Um lance errado reinicia o desafio.
4. Use **Reiniciar Desafio** para voltar à posição inicial ou **Próximo Desafio** para sortear outro.
5. Faça login para que sua pontuação entre no ranking.

### Coordenadas

O tabuleiro usa notação algébrica reduzida, de `a1` a `c3`. Internamente ele é uma matriz `board[linha][coluna]`, com a linha 0 no topo:

```
        a     b     c
  3   [0,0] [0,1] [0,2]
  2   [1,0] [1,1] [1,2]
  1   [2,0] [2,1] [2,2]
```

Peças são representadas por letras: maiúsculas = brancas (`K Q R B N P`), minúsculas = pretas (`k q r b n p`).

### Pontuação

```
pontos = max(100, floor(1000 - segundos * 10))
```

A pontuação da sessão é acumulada e enviada ao servidor a cada desafio concluído. O servidor guarda apenas o **maior** valor já enviado por usuário.

## API REST

Todas as rotas recebem e devolvem JSON. Login e cadastro criam uma sessão guardada no cookie `chessbrain_session` (`HttpOnly`, válido por 30 dias), e é por ela que o servidor sabe de quem é a pontuação.

| Método | Rota               | Corpo                                  | Descrição                                                         |
|--------|--------------------|----------------------------------------|-------------------------------------------------------------------|
| POST   | `/api/register`    | `{ "username", "password" }`           | Cadastra o usuário e abre a sessão. Retorna `{ success, user: { id, username, score } }`. |
| POST   | `/api/login`       | `{ "username", "password" }`           | Autentica e abre a sessão. Retorna `{ success, user: { id, username, score } }`. |
| GET    | `/api/me`          | —                                      | Retorna o usuário da sessão: `{ user }` (ou `{ user: null }`).    |
| POST   | `/api/logout`      | —                                      | Encerra a sessão.                                                 |
| POST   | `/api/score`       | `{ "score" }`                          | **Exige sessão.** Atualiza a pontuação do usuário logado se `score` (inteiro de 0 a 1.000.000) for maior que a atual. |
| GET    | `/api/leaderboard` | —                                      | Retorna os 10 melhores: `[{ username, score }]`.                  |

Erros retornam `{ "error": "mensagem" }` com status `400`, `401` ou `500`.

### Banco de dados

Tabela `users`:

| Coluna       | Tipo     | Observação                     |
|--------------|----------|--------------------------------|
| `id`         | INTEGER  | PK, autoincremento             |
| `username`   | TEXT     | Único, obrigatório             |
| `password`   | TEXT     | Hash bcrypt (custo 10)         |
| `score`      | INTEGER  | Padrão 0 (maior pontuação)     |
| `created_at` | DATETIME | Padrão `CURRENT_TIMESTAMP`     |

Tabela `sessions`: `token` (TEXT, PK, aleatório), `user_id` (FK para `users`) e `expires_at` (timestamp em ms).

## Adicionando puzzles de mate

Os puzzles ficam em `MATE_PUZZLES_DATABASE`, no arquivo [public/challenges.js](public/challenges.js), agrupados pela quantidade de lances:

```js
2: [
  {
    id: 201,
    title: "Mate em 2 Jogadas",
    type: "mate",
    description: "As Brancas jogam e dão Xeque-Mate em 2 lances!",
    initialBoard: [
      ['k', null, null],
      [null, null, null],
      ['K', 'P', 'R']
    ],
    // Lances das brancas, em ordem
    solution: [
      { from: { r: 2, c: 1 }, to: { r: 1, c: 1 } },
      { from: { r: 2, c: 2 }, to: { r: 0, c: 2 } }
    ],
    // Resposta das pretas após cada lance das brancas (exceto o último)
    blackResponses: [
      { from: { r: 0, c: 0 }, to: { r: 0, c: 1 } }
    ]
  }
]
```

Regras importantes:
- `solution` deve ter exatamente X lances e `blackResponses`, X − 1.
- As respostas das pretas **não** são validadas pelo motor, então confira se cada uma é legal na posição.
- Nenhum lance das brancas pode deixar as pretas afogadas antes do mate, porque o jogo detecta o afogamento e reinicia o desafio.

Hoje existem puzzles apenas para mate em 1, 2 e 3. Os modos 4 a 10 caem no puzzle de mate em 1.