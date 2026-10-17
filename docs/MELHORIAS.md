# Melhorias identificadas — ChessBrain

Documento vivo com os problemas e oportunidades de melhoria encontrados no projeto. Atualize o **Status** de cada item conforme avançarmos.

**Legenda de prioridade:** 🔴 Crítica · 🟠 Alta · 🟡 Média · 🟢 Baixa
**Status:** `Aberto` · `Em andamento` · `Concluído` · `Descartado`

_Última revisão: 2026-10-17 (base: commit `4d8c11c`, v0.5.0; itens críticos resolvidos em seguida)_

---

## Resumo

| #  | Item                                                                 | Área        | Prioridade | Status |
|----|----------------------------------------------------------------------|-------------|------------|--------|
| 1  | Servidor expõe todos os arquivos do projeto, inclusive o banco       | Segurança   | 🔴 | Concluído |
| 2  | `/api/score` aceita pontuação de qualquer usuário, sem autenticação  | Segurança   | 🔴 | Concluído |
| 3  | XSS armazenado no ranking (nome de usuário via `innerHTML`)          | Segurança   | 🔴 | Concluído |
| 4  | `chessbrain.db` e `node_modules` versionados no Git                  | Repositório | 🔴 | Concluído |
| 5  | Puzzle "Mate em 3" é impossível de resolver                          | Jogo        | 🟠 | Concluído |
| 6  | Modos "Mate em 4" a "Mate em 10" carregam o puzzle de mate em 1      | Jogo        | 🟠 | Aberto |
| 7  | Jogador pode mover peças durante as esperas (`setTimeout`)           | Jogo        | 🟠 | Aberto |
| 8  | Sem limite de tentativas de login e sem regras de senha              | Segurança   | 🟠 | Aberto |
| 9  | Pontuação de login não é carregada; o placar recomeça em 0           | Jogo        | 🟡 | Aberto |
| 10 | Mate validado só pela sequência exata, não por xeque‑mate real       | Jogo        | 🟡 | Aberto |
| 11 | Sem promoção de peão                                                  | Jogo        | 🟡 | Aberto |
| 12 | Desafio de movimentação pode gerar alvo trivial ou igual ao inicial  | Jogo        | 🟡 | Aberto |
| 13 | Lógica de movimento duplicada entre `script.js` e `challenges.js`    | Código      | 🟡 | Aberto |
| 14 | `bcrypt.hashSync`/`compareSync` bloqueiam o servidor                 | Back‑end    | 🟡 | Aberto |
| 15 | Servidor sobe mesmo se o banco falhar ao abrir                       | Back‑end    | 🟡 | Aberto |
| 16 | Modal de login não envia com Enter                                    | UX          | 🟢 | Aberto |
| 17 | Sem testes automatizados, lint ou formatação                         | Qualidade   | 🟢 | Aberto |
| 18 | Organização de pastas e pequenas inconsistências                     | Código      | 🟢 | Aberto |
| 19 | Acessibilidade do tabuleiro                                          | UX          | 🟢 | Aberto |

---

## 🔴 Crítica

### 1. Servidor expõe todos os arquivos do projeto, inclusive o banco
**Onde:** [server.js:16](../server.js#L16) com `app.use(express.static(path.join(__dirname)))`

A raiz do projeto inteira é servida como estática. Qualquer pessoa na rede consegue baixar `http://<host>:3000/chessbrain.db` (com todos os usuários e hashes de senha), além de `server.js`, `package.json` etc. O servidor escuta em `0.0.0.0`, então isso vale para toda a rede local.

**Proposta:** mover os arquivos do front‑end para uma pasta `public/` e servir apenas ela (`express.static('public')`). Manter o banco fora de qualquer pasta pública, por exemplo em `data/`.

> **Resolvido:** front‑end em `public/` (única pasta estática) e banco em `data/chessbrain.db`, com migração automática do arquivo antigo da raiz. O servidor também passou a encerrar se o banco não abrir (parte do item 15).

### 2. `/api/score` aceita pontuação de qualquer usuário, sem autenticação
**Onde:** [server.js:103-119](../server.js#L103-L119), [script.js:545-563](../script.js#L545-L563)

A rota recebe `username` e `score` do corpo e grava sem verificar quem está chamando. Um `curl` com `{"username":"fulano","score":999999}` coloca qualquer usuário no topo do ranking. O "login" do front é só um objeto salvo no `localStorage`, sem token nem sessão.

**Proposta:**
- Emitir uma sessão (cookie `httpOnly` com `express-session`) ou um JWT no login/cadastro e exigir isso em `/api/score`, usando o usuário da sessão em vez do `username` do corpo.
- Validar `score` no servidor (inteiro, ≥ 0, dentro de limites plausíveis).
- A médio prazo, o servidor deve calcular os pontos: registrar o início e o fim do desafio e validar a solução no back‑end, em vez de confiar no total enviado pelo cliente.

> **Resolvido:** sessão própria (tabela `sessions` + cookie `HttpOnly`/`SameSite=Strict`, sem dependência nova), rotas `/api/me` e `/api/logout`, e `/api/score` grava só no usuário da sessão, com `score` inteiro entre 0 e 1.000.000. O cálculo dos pontos no servidor continua como evolução futura: um jogador logado ainda pode enviar um total inventado para a própria conta.

### 3. XSS armazenado no ranking
**Onde:** [script.js:582](../script.js#L582)

```js
li.innerHTML = `<span>${item.username}</span> <span>${item.score} pts</span>`;
```

Um usuário cadastrado com nome `<img src=x onerror=alert(1)>` executa JavaScript no navegador de todos que abrirem o ranking.

**Proposta:** montar os elementos com `textContent`. Também limitar no cadastro o tamanho e os caracteres permitidos no `username` (ex.: 3–20 caracteres, `[A-Za-z0-9_.-]`).

> **Resolvido:** ranking montado com `textContent` e cadastro restrito a 3–20 caracteres `[A-Za-z0-9_.-]`.

### 4. `chessbrain.db` e `node_modules` versionados no Git
**Onde:** raiz do repositório (não existe `.gitignore`)

O repositório tem cerca de 1.800 arquivos versionados, a maioria de `node_modules`, e o banco com dados reais de usuários (hashes de senha) está no histórico.

**Proposta:**
- Criar `.gitignore` com `node_modules/`, `*.db`, `.env`.
- `git rm -r --cached node_modules chessbrain.db`.
- Se o repositório for ou vier a ser público, avaliar a limpeza do histórico (`git filter-repo`) e pedir aos usuários existentes que troquem a senha.

> **Resolvido** no commit `6beef5c` (`.gitignore` + remoção do índice). O banco continua nos commits antigos (`b60c8ab`, `4d8c11c`); como o repositório é privado e os dados não são sensíveis, a limpeza do histórico não foi feita.

> **Decisão posterior:** o banco (`data/chessbrain.db`) voltou a ser versionado de propósito, para manter os placares junto com o projeto. Só os arquivos temporários do SQLite (`-journal`, `-wal`, `-shm`) ficam no `.gitignore`.

---

## 🟠 Alta

### 5. Puzzle "Mate em 3" é impossível de resolver
**Onde:** [challenges.js:202-223](../challenges.js#L202-L223)

Posição: rei preto em a3, rei branco em a1, torre em b1. O primeiro lance da solução (Tb1‑b2) deixa as pretas **afogadas**: a2 e b3 estão atacadas pela torre e b2 é protegida pelo rei branco. O jogo detecta o afogamento ([script.js:390-399](../script.js#L390-L399)) e reinicia o desafio, então o jogador nunca consegue concluí‑lo. A primeira resposta das pretas cadastrada (Ra3‑a2) também é ilegal, porque a casa fica ao lado do rei branco.

**Proposta:** substituir por um puzzle válido e criar um script ou teste que valide cada puzzle da base: lances legais, sem afogamento no meio e xeque‑mate no final.

> **Resolvido:** novo script [scripts/puzzles.js](../scripts/puzzles.js), que reproduz as regras do motor e faz busca exaustiva. `npm run check:puzzles` valida cada puzzle: posição legal, mate exato em N (sem mate mais rápido), lance da solução único em cada passo, respostas das pretas legais e de melhor defesa, sem afogamento e com xeque‑mate no fim. O validador também mostrou que o antigo "Mate em 2" tinha mate em 1 (Tc1‑c3), então toda a base foi substituída por puzzles gerados pelo próprio script (`npm run generate:puzzles`), sem peões enquanto não houver promoção (item 11).

### 6. Modos "Mate em 4" a "Mate em 10" carregam o puzzle de mate em 1
**Onde:** [index.html](../index.html) (opções `mate-4` a `mate-10`), [challenges.js:153-161](../challenges.js#L153-L161)

A base só tem puzzles para 1, 2 e 3 lances. Nos outros modos o código cai silenciosamente no puzzle de mate em 1 e mostra o título "Mate em 1 Jogada", o que confunde o jogador. Cada nível também tem só um puzzle, então "Próximo Desafio" repete sempre o mesmo.

**Proposta:** gerar as opções do `<select>` a partir das chaves de `MATE_PUZZLES_DATABASE` (ou esconder os modos vazios) e ampliar a base de puzzles. Num 3x3 é viável gerar e verificar puzzles automaticamente por busca exaustiva.

### 7. Jogador pode mover peças durante as esperas (`setTimeout`)
**Onde:** [script.js:396](../script.js#L396), [script.js:417](../script.js#L417), [script.js:424-426](../script.js#L424-L426)

- Depois de um lance errado, o tabuleiro só reinicia após 1,2 s. Nesse intervalo o jogador continua movendo e gera novas validações e mensagens.
- No mate em X, a resposta das pretas espera 600 ms. Se o jogador mover de novo antes disso, `moveHistory` sai de sincronia com a solução e o lance automático das pretas é aplicado sobre uma posição diferente.
- Se o jogador clicar em "Próximo Desafio" ou "Reiniciar" durante a espera, o `setTimeout` pendente age sobre o desafio novo: recarrega o desafio ou aplica o lance das pretas.

**Proposta:** adicionar um estado de "entrada bloqueada" (`isLocked`) durante as esperas e guardar os IDs dos timeouts para cancelá‑los com `clearTimeout` em `loadChallenge`.

### 8. Sem limite de tentativas de login e sem regras de senha
**Onde:** [server.js:50-101](../server.js#L50-L101)

Qualquer senha é aceita (até um único caractere) e não há limite de tentativas, o que permite força bruta.

**Proposta:** exigir senha mínima de 6 a 8 caracteres e limitar o tamanho máximo (o bcrypt ignora o que passa de 72 bytes). Aplicar `express-rate-limit` em `/api/login` e `/api/register`.

---

## 🟡 Média

### 9. Pontuação de login não é carregada; o placar recomeça em 0
**Onde:** [script.js:25](../script.js#L25), [script.js:651](../script.js#L651)

O login devolve `user.score`, mas `totalScore` continua em 0 e o painel "Pontuação" mostra só a sessão atual. O servidor guarda `MAX(score, novo)`, então o "recorde" é o melhor total de uma única sessão, regra que não aparece para o jogador. O logout também não zera o placar exibido.

**Proposta:** definir a regra de pontuação (acumulada para sempre ou recorde por sessão) e deixá‑la clara na interface, com "Recorde" e "Sessão" separados. Ao fazer login, carregar e mostrar a pontuação salva.

### 10. Mate validado só pela sequência exata, não por xeque‑mate real
**Onde:** [script.js:406-431](../script.js#L406-L431)

O jogo compara os lances com `solution`. Se o jogador encontrar outro mate válido, ele recebe "Jogada incorreta". O motor também nunca confirma que a posição final é de fato xeque‑mate.

**Proposta:** ao final da sequência (ou a cada lance), verificar `isKingInCheck(false) && !hasLegalMoves(false)`. Aceitar qualquer lance que mantenha o mate forçado no número de lances restantes, o que é viável de calcular num 3x3. A resposta das pretas também poderia ser calculada pelo motor, em vez de fixa.

### 11. Sem promoção de peão
**Onde:** [script.js:474-484](../script.js#L474-L484)

Um peão que chega à última linha continua peão e fica sem lances. Num tabuleiro de 3 linhas isso acontece logo no primeiro lance.

**Proposta:** promover automaticamente para Dama ou oferecer a escolha da peça. Ajustar também o gerador de desafios, que hoje nunca move o peão porque `getRawMoves` não trata `p` ([challenges.js:114-151](../challenges.js#L114-L151)).

### 12. Desafio de movimentação pode gerar alvo trivial ou igual ao inicial
**Onde:** [challenges.js:65-88](../challenges.js#L65-L88)

Os 5 movimentos aleatórios podem se desfazer (uma peça vai e volta), o que gera um alvo idêntico ou muito próximo da posição inicial. Os comentários falam em "4 a 7 movimentos", mas o valor está fixo em 5, e `numPieces` está fixo em 6. Além disso, o embaralhamento com `sort(() => Math.random() - 0.5)` é enviesado.

**Proposta:** descartar e gerar de novo quando o alvo for igual ao inicial, ou quando a distância mínima (via BFS) estiver abaixo do mínimo da dificuldade. Usar Fisher‑Yates. Expor a dificuldade (número de peças e de lances) como parâmetro e mostrar ao jogador o número mínimo de lances.

### 13. Lógica de movimento duplicada entre `script.js` e `challenges.js`
**Onde:** `Chess3x3.calculateRawMoves` ([script.js:449](../script.js#L449)) e `ChallengeGenerator.getRawMoves` ([challenges.js:114](../challenges.js#L114))

São duas implementações diferentes das mesmas regras: uma sem capturas e sem peão, a outra completa. A classe `Chess3x3` também mistura regras, UI, timer, pontuação e chamadas à API.

**Proposta:** extrair um módulo de regras puro (`engine.js`) que trabalhe sobre uma matriz recebida como parâmetro e não dependa do DOM. Esse módulo pode ser usado pelo front, pelo gerador, pelo validador de puzzles (item 5) e pelo servidor (item 2), e facilita os testes (item 17).

### 14. `bcrypt.hashSync` / `compareSync` bloqueiam o servidor
**Onde:** [server.js:58](../server.js#L58), [server.js:89](../server.js#L89)

As versões síncronas travam o event loop do Node a cada login ou cadastro.

**Proposta:** usar `await bcrypt.hash(...)` e `await bcrypt.compare(...)`.

### 15. Servidor sobe mesmo se o banco falhar ao abrir
**Onde:** [server.js:20-27](../server.js#L20-L27)

Se o SQLite não abrir, o erro só vai para o log e o servidor continua aceitando requisições, que vão falhar. As rotas também tratam `err` e "usuário não encontrado" do mesmo jeito no login, o que esconde falhas reais de banco.

**Proposta:** encerrar o processo (`process.exit(1)`) se o banco não abrir, ou só chamar `app.listen` depois do `initDatabase`. No login, devolver 500 quando houver `err`.

---

## 🟢 Baixa

### 16. Modal de login não envia com Enter
**Onde:** [index.html](../index.html) (`#auth-form`), [script.js:634-685](../script.js#L634-L685)

Os botões são `type="button"`, então Enter não faz nada. O modal também não fecha com Esc nem com clique fora, e o código de login e cadastro está duplicado.

**Proposta:** tratar o evento `submit` do formulário e extrair uma função `authenticate(endpoint)`.

### 17. Sem testes automatizados, lint ou formatação
Nada impede regressões nas regras de xadrez nem puzzles inválidos (item 5).

**Proposta:** adicionar testes do motor de regras com `node:test`, que já vem no Node sem dependência extra, e um teste que valida toda a `MATE_PUZZLES_DATABASE`. Configurar ESLint e Prettier, além de um script `npm run dev` com `node --watch server.js`.

### 18. Organização de pastas e pequenas inconsistências
- Front‑end e back‑end misturados na raiz. Sugestão: `public/` (HTML, CSS, JS do cliente), `src/` (servidor) e `data/` (banco).
- `package.json` está em `1.0.0`, mas os commits indicam `v0.5.0`.
- Os comentários de [server.js:11](../server.js#L11) e [server.js:135](../server.js#L135) dizem "porta 3006", mas o padrão é 3000.
- Bloco JSDoc duplicado e indentação quebrada em [challenges.js:12-20](../challenges.js#L12-L20).
- `COORDS` é uma variável global compartilhada entre os dois scripts por causa da ordem dos `<script>`. Isso se resolve com ES modules.
- `JSON.parse(localStorage.getItem(...))` quebra se o valor estiver corrompido. Envolver em `try/catch`.
- `id: Date.now()` como ID de desafio pode colidir. Não é crítico.

### 19. Acessibilidade do tabuleiro
O tabuleiro não funciona pelo teclado, as casas não têm `role` nem `aria-label` (ex.: "Torre branca em a3") e as mensagens de feedback não são anunciadas por leitores de tela (`aria-live`). As peças usam caracteres Unicode, cuja aparência varia entre sistemas. Vale considerar SVGs.

---

## Ideias de evolução (backlog)

- Modo "partida" contra o computador (minimax é trivial num 3x3).
- Ranking por modo de desafio e ranking semanal.
- Histórico de desafios resolvidos por usuário e estatísticas (tempo médio, sequência de acertos).
- Dicas (mostrar o primeiro lance com penalidade de pontos).
- Desafio diário igual para todos os jogadores.
- PWA ou modo offline para jogar sem login.
- Integração real dos espaços de anúncio, com política de privacidade e consentimento de cookies (LGPD).
