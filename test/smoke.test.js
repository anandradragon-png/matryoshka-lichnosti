// Smoke-тесты прототипа на Vitest (jsdom-окружение).
// Приложение переведено на ES-модули, поэтому тест грузит их настоящим
// динамическим import() против реальной разметки index.html — так проверяется
// и работа секций, и корректность связей import/export между модулями.
// Перед каждым тестом: свежий DOM из index.html, чистый localStorage и
// vi.resetModules() — чтобы модули переинициализировались с нуля.
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
// Тело страницы без <script> — скрипты подключим настоящим import() ниже.
const bodyInner = html
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script[\s\S]*?<\/script>/gi, '');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Порядок импорта — как в js/main.js (зависимости раньше зависящих модулей).
const MODULES = [
  '../js/core.js',
  '../js/util.js',
  '../js/practices.js',
  '../js/organizer.js',
  '../js/chat.js',
  '../js/map.js',
  '../js/billing.js',
  '../js/account.js',
  '../js/cookie.js',
];

async function boot() {
  document.body.innerHTML = bodyInner;
  localStorage.clear();
  // Заглушки браузерных API, которых нет в jsdom.
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.scrollTo = function () {};
  vi.resetModules();
  for (const m of MODULES) {
    await import(m);
  }
}

beforeEach(boot);
afterEach(() => {
  document.body.innerHTML = '';
});

describe('smoke', () => {
  test('страница инициализируется, ключевые элементы и секции на месте', () => {
    for (const id of ['chat', 'chatSend', 'chatInput', 'quickReplies', 'authBtn', 'cookieBanner']) {
      expect(document.getElementById(id), 'нет элемента #' + id).toBeTruthy();
    }
    // Секции построены модулями:
    expect(document.querySelectorAll('#practiceFilters button').length).toBe(8);
    expect(document.querySelectorAll('#emotions .emotion').length).toBe(24);
  });

  test('сид-аккаунты: sveta — админ с актуальным паролем (не старым)', () => {
    const users = JSON.parse(localStorage.getItem('ml_users') || '[]');
    const sveta = users.find(u => u.login === 'sveta');
    expect(sveta, 'нет аккаунта sveta').toBeTruthy();
    expect(sveta.role).toBe('admin');
    expect(sveta.pass).toBe('Mtr$Sv-2026-q7Xk');
    expect(sveta.pass).not.toBe('sveta-admin-2026');
  });

  test('cookie-баннер виден при первом визите и прячется после согласия', () => {
    const banner = document.getElementById('cookieBanner');
    expect(banner.hidden).toBe(false);
    document.getElementById('cookieAccept').click();
    expect(banner.hidden).toBe(true);
    expect(localStorage.getItem('ml_cookie_consent')).toBeTruthy();
  });

  test('кризисная фраза направляет на телефон доверия 8-800-2000-122', async () => {
    document.getElementById('chatInput').value = 'я не хочу жить';
    document.getElementById('chatSend').click();
    // Ответ бота добавляется через setTimeout(~750мс) внутри botSay.
    await sleep(1200);
    expect(document.getElementById('chat').textContent).toMatch(/8-800-2000-122/);
  });

  test('связка chat→practices: обычная эмоция → рекомендация практики', async () => {
    document.getElementById('chatInput').value = 'мне очень тревожно';
    document.getElementById('chatSend').click();
    // Два последовательных botSay (~750мс каждый) до текста рекомендации.
    await sleep(2600);
    expect(document.getElementById('chat').textContent).toMatch(/Рекомендую практику/);
    const showBtn = [...document.querySelectorAll('#quickReplies button')].find(b =>
      /Показать практику/.test(b.textContent)
    );
    expect(showBtn, 'нет кнопки «Показать практику»').toBeTruthy();
    showBtn.click();
    expect(document.querySelector('#practiceModal.open')).toBeTruthy();
  });
});
