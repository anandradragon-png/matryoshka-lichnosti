// Smoke-тесты прототипа: грузим настоящую index.html в jsdom, выполняем
// dars-data.js и app.js как классические скрипты (общая глобальная область —
// как в браузере) и проверяем, что критичные сценарии живы. Ловит регрессии
// вроде «страница падает при загрузке» или «сломалась кризисная проверка».
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

// Порядок совпадает с подключением скриптов в index.html.
const SCRIPTS = [
  'dars-data.js',
  'js/core.js',
  'js/util.js',
  'js/chat.js',
  'js/organizer.js',
  'js/map.js',
  'js/practices.js',
  'js/billing.js',
  'js/account.js',
  'js/cookie.js',
];
const scriptCode = SCRIPTS.map(read);

// Загружает страницу и скрипты. Возвращает { dom, errors }.
function boot() {
  // Убираем внешние <script src>, чтобы подключить код вручную в нужном порядке.
  const html = read('index.html').replace(
    /<script[^>]*\ssrc=["'][^"']*["'][^>]*><\/script>/g,
    ''
  );
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => errors.push(e));

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://localhost/',
    virtualConsole,
  });
  const { window } = dom;
  // Заглушки браузерных API, которых нет в jsdom.
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.scrollTo = function () {};

  const inject = code => {
    const s = window.document.createElement('script');
    s.textContent = code;
    window.document.body.appendChild(s);
  };
  scriptCode.forEach(inject);
  return { dom, errors };
}

test('страница загружается без ошибок, ключевые элементы на месте', () => {
  const { dom, errors } = boot();
  try {
    assert.deepStrictEqual(errors, [], 'при загрузке не должно быть ошибок JS');
    for (const id of ['chat', 'chatSend', 'chatInput', 'quickReplies', 'authBtn', 'cookieBanner']) {
      assert.ok(dom.window.document.getElementById(id), 'нет элемента #' + id);
    }
  } finally {
    dom.window.close();
  }
});

test('сид-аккаунты: sveta — админ с новым паролем (не старым)', () => {
  const { dom } = boot();
  try {
    const users = JSON.parse(dom.window.localStorage.getItem('ml_users') || '[]');
    const sveta = users.find(u => u.login === 'sveta');
    assert.ok(sveta, 'нет аккаунта sveta');
    assert.strictEqual(sveta.role, 'admin');
    assert.strictEqual(sveta.pass, 'Mtr$Sv-2026-q7Xk');
    assert.notStrictEqual(sveta.pass, 'sveta-admin-2026', 'старый пароль не должен остаться');
  } finally {
    dom.window.close();
  }
});

test('cookie-баннер виден при первом визите и прячется после согласия', () => {
  const { dom } = boot();
  try {
    const doc = dom.window.document;
    const banner = doc.getElementById('cookieBanner');
    assert.strictEqual(banner.hidden, false, 'баннер должен быть виден при первом визите');
    doc.getElementById('cookieAccept').click();
    assert.strictEqual(banner.hidden, true, 'после согласия баннер скрыт');
    assert.ok(dom.window.localStorage.getItem('ml_cookie_consent'), 'согласие сохранено');
  } finally {
    dom.window.close();
  }
});

test('кризисная фраза направляет на телефон доверия 8-800-2000-122', async () => {
  const { dom } = boot();
  try {
    const doc = dom.window.document;
    doc.getElementById('chatInput').value = 'я не хочу жить';
    doc.getElementById('chatSend').click();
    // Ответ бота добавляется через setTimeout(~750мс) внутри botSay.
    await new Promise(r => setTimeout(r, 1200));
    assert.match(doc.getElementById('chat').textContent, /8-800-2000-122/);
  } finally {
    dom.window.close();
  }
});
