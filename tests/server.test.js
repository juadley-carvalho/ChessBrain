const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

// Sobe o servidor de verdade numa porta livre, com um banco temporário
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chessbrain-'));
let server;

test.before(async () => {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, PORT, HOST: '127.0.0.1', DB_PATH: path.join(tmpDir, 'test.db') },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  await new Promise((resolve, reject) => {
    server.stdout.on('data', chunk => {
      if (chunk.toString().includes('rodando')) resolve();
    });
    server.on('exit', code => reject(new Error(`servidor saiu com código ${code}`)));
  });
});

test.after(async () => {
  // No Windows o arquivo do banco fica bloqueado até o processo terminar
  const exited = new Promise(resolve => server.once('exit', resolve));
  server.kill();
  await exited;
  fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
});

const post = (route, body, cookie) =>
  fetch(BASE + route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body)
  });

test('não serve o banco nem o código do servidor', async () => {
  assert.equal((await fetch(`${BASE}/server.js`)).status, 404);
  assert.equal((await fetch(`${BASE}/data/chessbrain.db`)).status, 404);
  assert.equal((await fetch(`${BASE}/engine.js`)).status, 200);
});

test('cadastro, pontuação, sessão e logout', async () => {
  const res = await post('/api/register', { username: 'teste_1', password: 'x' });
  assert.equal(res.status, 200);
  const cookie = res.headers.get('set-cookie').split(';')[0];

  const me = await (await fetch(`${BASE}/api/me`, { headers: { Cookie: cookie } })).json();
  assert.equal(me.user.username, 'teste_1');

  const score1 = await (await post('/api/score', { points: 300 }, cookie)).json();
  const score2 = await (await post('/api/score', { points: 200 }, cookie)).json();
  assert.equal(score1.score, 300);
  assert.equal(score2.score, 500);

  const ranking = await (await fetch(`${BASE}/api/leaderboard`)).json();
  assert.deepEqual(
    ranking.find(r => r.username === 'teste_1'),
    { username: 'teste_1', score: 500 }
  );

  await post('/api/logout', {}, cookie);
  const after = await (await fetch(`${BASE}/api/me`, { headers: { Cookie: cookie } })).json();
  assert.equal(after.user, null);
});

test('login com senha errada e nome repetido são recusados', async () => {
  await post('/api/register', { username: 'teste_2', password: 'segredo' });
  assert.equal((await post('/api/login', { username: 'teste_2', password: 'errada' })).status, 401);
  assert.equal((await post('/api/login', { username: 'teste_2', password: 'segredo' })).status, 200);
  assert.equal((await post('/api/register', { username: 'teste_2', password: 'y' })).status, 400);
});

test('nome de usuário inválido é recusado', async () => {
  assert.equal((await post('/api/register', { username: '<img src=x>', password: 'x' })).status, 400);
  assert.equal((await post('/api/register', { username: 'ab', password: 'x' })).status, 400);
});

test('pontuação exige sessão e valores válidos', async () => {
  assert.equal((await post('/api/score', { points: 100 })).status, 401);

  const res = await post('/api/register', { username: 'teste_3', password: 'x' });
  const cookie = res.headers.get('set-cookie').split(';')[0];
  for (const points of [0, 1001, 1.5, '100', -5]) {
    assert.equal((await post('/api/score', { points }, cookie)).status, 400, `points = ${points}`);
  }
});

test('guarda a melhor pontuação de cada puzzle de mate', async () => {
  const res = await post('/api/register', { username: 'teste_best', password: 'x' });
  const cookie = res.headers.get('set-cookie').split(';')[0];

  assert.equal((await fetch(`${BASE}/api/puzzle-best`)).status, 401);

  const first = await (await post('/api/score', { points: 300, puzzleId: 214 }, cookie)).json();
  const worse = await (await post('/api/score', { points: 200, puzzleId: 214 }, cookie)).json();
  const better = await (await post('/api/score', { points: 450, puzzleId: 101 }, cookie)).json();
  assert.equal(first.best, 300);
  assert.equal(worse.best, 300);
  assert.equal(worse.score, 500);
  assert.equal(better.best, 450);

  const best = await (await fetch(`${BASE}/api/puzzle-best`, { headers: { Cookie: cookie } })).json();
  assert.deepEqual(best, { 101: 450, 214: 300 });

  assert.equal((await post('/api/score', { points: 100, puzzleId: 'x' }, cookie)).status, 400);
});
