const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // Servidor, scripts e testes rodam no Node (CommonJS)
    files: ['server.js', 'scripts/**/*.js', 'tests/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node }
  },
  {
    // Front-end: scripts clássicos que compartilham globais pela ordem dos <script>
    files: ['public/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, module: 'readonly' }
    }
  },
  // Globais que cada script usa dos carregados antes dele
  { files: ['public/challenges.js'], languageOptions: { globals: { ChessEngine: 'readonly' } } },
  {
    files: ['public/script.js'],
    languageOptions: {
      globals: { ChessEngine: 'readonly', ChessPieces: 'readonly', ChallengeGenerator: 'readonly' }
    }
  },
  {
    rules: {
      'no-unused-vars': ['error', { caughtErrors: 'none' }]
    }
  }
];
