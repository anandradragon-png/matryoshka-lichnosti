const js = require('@eslint/js');
const globals = require('globals');

// Плоская конфигурация ESLint 9.
// Приложение «Матрёшка» переведено на настоящие ES-модули (import/export),
// поэтому для js/**/*.js включён no-undef — ESLint видит связи через импорты и
// ловит обращения к необъявленным именам. dars-data.js — собственная независимая
// база «Матрёшки» (проект YupDar): классический скрипт, задающий window.YupDar;
// для него сохранён sourceType 'script' и no-undef выключен (файл самодостаточен).
module.exports = [
  { ignores: ['node_modules/**', 'docs/**', '.git/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none' }],
    },
  },
  {
    files: ['dars-data.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'vitest.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
  {
    // Тесты — ES-модули (import), исполняются в jsdom: нужны и node-, и
    // браузерные глобалы. Vitest-хелперы импортируются из 'vitest' явно.
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
