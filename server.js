/**
 * ChessBrain - Servidor Web Node.js + API REST + Banco de Dados SQLite
 */

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const app = express();
// Configurado para rodar na porta 3006
const PORT = process.env.PORT || 3000;

// Middlewares para aceitar dados JSON nas requisições
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Conexão / Criação do Banco de Dados SQLite
const dbPath = path.join(__dirname, 'chessbrain.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('📦 Banco de Dados SQLite conectado com sucesso!');
    initDatabase();
  }
});

// Inicialização das Tabelas no Banco de Dados
function initDatabase() {
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
  });
}

// ==========================================
// 🚀 ENDPOINTS DA API REST
// ==========================================

// Rota 1: Cadastro de Usuário
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.trim() === '') {
    return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
  }

  // Criptografa a senha antes de salvar
  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
  db.run(query, [username.trim(), hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
      }
      return res.status(500).json({ error: 'Erro ao cadastrar usuário.' });
    }

    res.json({
      success: true,
      user: { id: this.lastID, username: username.trim(), score: 0 }
    });
  });
});

// Rota 2: Login de Usuário
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username.trim()], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    res.json({
      success: true,
      user: { id: user.id, username: user.username, score: user.score }
    });
  });
});

// Rota 3: Salvar / Atualizar Pontuação do Jogador
app.post('/api/score', (req, res) => {
  const { username, score } = req.body;

  if (!username || score === undefined) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  // Atualiza a pontuação apenas se a nova pontuação for maior que a cadastrada
  const query = `UPDATE users SET score = MAX(score, ?) WHERE username = ?`;
  db.run(query, [score, username], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar pontuação.' });
    }
    res.json({ success: true });
  });
});

// Rota 4: Obter Ranking Geral (Top 10)
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
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Inicialização do Servidor Escutando na Rede Local na porta 3006
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Servidor ChessBrain rodando na porta ${PORT}`);
  console.log(`💻 Acesso Local: http://localhost:${PORT}`);
  console.log(`📱 Acesso na Rede Local: http://<SEU_IP_LOCAL>:${PORT}`);
  console.log('====================================================');
});