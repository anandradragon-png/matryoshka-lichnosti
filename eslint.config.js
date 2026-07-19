const js = require('@eslint/js');
const globals = require('globals');

// Плоская конфигурация ESLint 9.
// Прототип — классические браузерные скрипты (не модули), файлы делят одну
// глобальную область: dars-data.js объявляет данные/функции, которые использует
// app.js. Поэтому эти имена объявлены как readonly-глобалы, чтобы no-undef не
// давал ложных срабатываний. После разбивки на ES-модули (пункт 7) эту секцию
// упростим.
module.exports = [
  { ignores: ['node_modules/**', 'docs/**', '.git/**'] },
  js.configs.recommended,
  {
    // Общие настройки для браузерных скриптов прототипа.
    files: ['app.js', 'dars-data.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      // На прототипе часть верхнеуровневых значений «используется» из другого
      // файла, поэтому глобальные unused не считаем ошибкой — только локальные.
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      'no-undef': 'error',
    },
  },
  {
    // app.js использует данные/функции, объявленные в dars-data.js.
    files: ['app.js'],
    languageOptions: {
      globals: {
        FIELDS: 'readonly',
        DARS: 'readonly',
        reduceDigit: 'readonly',
        sumDigits: 'readonly',
        calculateDar: 'readonly',
        detectType: 'readonly',
        getPersonalityCard: 'readonly',
      },
    },
  },
  {
    files: ['eslint.config.js', 'test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
