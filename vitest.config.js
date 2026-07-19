const { defineConfig } = require('vitest/config');

// Тесты гоняются в jsdom-окружении: модули приложения обращаются к document,
// window, localStorage как к глобалям браузера. include ограничен test/**,
// чтобы Vitest не пытался исполнять сами модули приложения как тесты.
module.exports = defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.js'],
  },
});
