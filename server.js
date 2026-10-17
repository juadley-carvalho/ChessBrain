/**
 * ChessBrain - Servidor Web Node.js + API REST + Banco de Dados SQLite
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
// Confia no proxy reverso local (Apache) para que req.secure reflita o HTTPS original
app.set('trust proxy', 'loopback');
const PORT = process.env.PORT || 3000;
// Em produção, atrás do Apache, use HOST=127.0.0.1 para não expor a porta diretamente
const HOST = process.env.HOST || '0.0.0.0';

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const SESSION_COOKIE = 'chessbrain_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// Regras de validação
const USERNAME_REGEX = /^[A-Za-z0-9_.-]{3,20}$/;
// Pontos de um único desafio (o jogo dá de 100 a 1000)
const MAX_POINTS_PER_CHALLENGE = 1000;

// Middlewares para aceitar dados JSON nas requisições
app.use(express.json({ limit: '10kb' }));
// Apenas a pasta public/ é servida; banco e código do servidor ficam inacessíveis
app.use(express.static(PUBLIC_DIR));

// Conexão / Criação do Banco de Dados SQLite (fora da pasta pública)
// DB_PATH permite usar outro arquivo (os testes usam um banco temporário)
const defaultDbPath = path.join(DATA_DIR, 'chessbrain.db');
const dbPath = process.env.DB_PATH || defaultDbPath;
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Migração: versões anteriores guardavam o banco na raiz do projeto
const legacyDbPath = path.join(__dirname, 'chessbrain.db');
if (dbPath === defaultDbPath && !fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  fs.renameSync(legacyDbPath, dbPath);
  console.log('📦 Banco movido de ./chessbrain.db para ./data/chessbrain.db');
}

const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
    process.exit(1);
  } else {
    console.log('📦 Banco de Dados SQLite conectado com sucesso!');
    initDatabase(startServer);
  }
});

// Inicialização das Tabelas no Banco de Dados; chama onReady quando tudo estiver criado
function initDatabase(onReady) {
  db.serialize(() => {
    // Tabela de Usuários
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de Sessões (token aleatório guardado em cookie httpOnly)
    db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at INTEGER NOT NULL
      )
    `);

    db.run(`DELETE FROM sessions WHERE expires_at < ?`, [Date.now()], err => {
      if (err) {
        console.error('Erro ao preparar o banco de dados:', err.message);
        process.exit(1);
      }
      onReady();
    });
  });
}

// ==========================================
// 🔐 SESSÕES
// ==========================================

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  });
  return cookies;
}

function createSession(req, res, userId, callback) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;

  db.run(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)`, [token, userId, expiresAt], err => {
    if (err) return callback(err);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'strict',
      secure: req.secure,
      maxAge: SESSION_TTL_MS,
      path: '/'
    });
    callback(null);
  });
}

// Carrega o usuário da sessão em req.user (ou null)
function loadSession(req, res, next) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  req.user = null;
  req.sessionToken = null;
  if (!token) return next();

  const query = `
    SELECT u.id, u.username, u.score
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `;
  db.get(query, [token, Date.now()], (err, user) => {
    if (err) return res.status(500).json({ error: 'Erro ao validar sessão.' });
    req.user = user || null;
    req.sessionToken = user ? token : null;
    next();
  });
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Faça login para continuar.' });
  }
  next();
}

app.use('/api', loadSession);

// ==========================================
// 🚀 ENDPOINTS DA API REST
// ==========================================

// Rota 1: Cadastro de Usuário
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }

  const cleanUsername = username.trim();
  if (!USERNAME_REGEX.test(cleanUsername)) {
    return res.status(400).json({
      error: 'O nome de usuário deve ter de 3 a 20 caracteres: letras, números, "_", "." ou "-".'
    });
  }

  // Criptografa a senha antes de salvar (versão assíncrona não trava o event loop)
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch {
    return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
  }

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(query, [cleanUsername, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }

    const userId = this.lastID;
    createSession(req, res, userId, sessionErr => {
      if (sessionErr) {
        return res.status(500).json({ error: 'Erro ao criar sessão.' });
      }
      res.json({
        success: true,
        user: { id: userId, username: cleanUsername, score: 0 }
      });
    });
  });
});

// Rota 2: Login de Usuário
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username.trim()], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao consultar usuário.' });
    }

    let passwordOk = false;
    try {
      passwordOk = !!user && (await bcrypt.compare(password, user.password));
    } catch {
      return res.status(500).json({ error: 'Erro ao validar senha.' });
    }
    if (!passwordOk) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    createSession(req, res, user.id, sessionErr => {
      if (sessionErr) {
        return res.status(500).json({ error: 'Erro ao criar sessão.' });
      }
      res.json({
        success: true,
        user: { id: user.id, username: user.username, score: user.score }
      });
    });
  });
});

// Rota 3: Usuário da sessão atual
app.get('/api/me', (req, res) => {
  res.json({ user: req.user });
});

// Rota 4: Logout (remove a sessão)
app.post('/api/logout', (req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  if (!req.sessionToken) return res.json({ success: true });

  db.run(`DELETE FROM sessions WHERE token = ?`, [req.sessionToken], err => {
    if (err) return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    res.json({ success: true });
  });
});

// Rota 5: Soma os pontos de um desafio concluído ao total do jogador logado
app.post('/api/score', requireAuth, (req, res) => {
  const { points } = req.body;

  if (!Number.isInteger(points) || points < 1 || points > MAX_POINTS_PER_CHALLENGE) {
    return res.status(400).json({ error: 'Pontuação inválida.' });
  }

  // A pontuação é acumulada: cada desafio soma ao total salvo
  const query = `UPDATE users SET score = score + ? WHERE id = ?`;
  db.run(query, [points, req.user.id], err => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar pontuação.' });
    }
    db.get(`SELECT score FROM users WHERE id = ?`, [req.user.id], (selectErr, row) => {
      if (selectErr || !row) {
        return res.status(500).json({ error: 'Erro ao ler pontuação.' });
      }
      res.json({ success: true, score: row.score });
    });
  });
});

// Rota 6: Obter Ranking Geral (Top 10)
app.get('/api/leaderboard', (req, res) => {
  const query = `SELECT username, score FROM users ORDER BY score DESC LIMIT 10`;
  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar ranking.' });
    }
    res.json(rows);
  });
});

// Servir a aplicação principal na rota raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Inicialização do Servidor Escutando na Rede Local (só depois que o banco estiver pronto)
function startServer() {
  app.listen(PORT, HOST, () => {
    console.log('====================================================');
    console.log(`🚀 Servidor ChessBrain rodando na porta ${PORT}`);
    console.log(`💻 Acesso Local: http://localhost:${PORT}`);
    console.log(`📱 Acesso na Rede Local: http://<SEU_IP_LOCAL>:${PORT}`);
    console.log('====================================================');
  });
}
