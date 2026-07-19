const js = require('@eslint/js');
const globals = require('globals');

// Плоская конфигурация ESLint 9.
// Прототип — классические браузерные скрипты (не ES-модули): dars-data.js и
// файлы js/*.js делят одну общую глобальную область и вызывают функции друг
// друга по имени. ESLint анализирует каждый файл отдельно и не видит эти связи,
// поэтому no-undef здесь дал бы массу ложных срабатываний и отключён именно для
// браузерных файлов. Остальные правила (no-unused-vars, no-redeclare,
// no-dupe-keys, no-cond-assign и т.д.) работают и ловят реальные ошибки.
// После перехода на настоящие ES-модули с import/export no-undef можно вернуть.
module.exports = [
  { ignores: ['node_modules/**', 'docs/**', '.git/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'dars-data.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: {
      'no-undef': 'off',
      // Верхнеуровневые значения часто «используются» из другого файла, поэтому
      // глобальные unused не считаем ошибкой — только локальные.
      'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }],
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
