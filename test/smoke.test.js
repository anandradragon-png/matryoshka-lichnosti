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
  window.alert = function () {};
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

  test('живой ИИ-бот: ответ прослойки приходит и отображается в чате', async () => {
    // BOT_API_URL задан (прод) → обычное сообщение идёт в живой YandexGPT
    // через серверную прослойку. Сеть мокаем, проверяем отображение ответа.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ reply: 'Слышу вас. Что вы сейчас чувствуете?' }) }))
    );
    document.getElementById('chatInput').value = 'мне очень тревожно';
    document.getElementById('chatSend').click();
    await sleep(300);
    expect(document.getElementById('chat').textContent).toMatch(/Слышу вас/);
    vi.unstubAllGlobals();
  });

  test('ввод пользователя экранируется (защита от XSS)', () => {
    document.getElementById('chatInput').value = '<img src=x onerror=alert(1)>';
    document.getElementById('chatSend').click();
    const userMsg = document.querySelector('#chat .msg.user');
    expect(userMsg, 'нет сообщения пользователя').toBeTruthy();
    // Тег НЕ должен стать реальным элементом — только текстом.
    expect(document.querySelectorAll('#chat .msg.user img').length).toBe(0);
    expect(userMsg.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  test('расширенная кризисная детекция: «хочу умереть» → телефон доверия', async () => {
    document.getElementById('chatInput').value = 'иногда хочется умереть';
    document.getElementById('chatSend').click();
    await sleep(1200);
    expect(document.getElementById('chat').textContent).toMatch(/8-800-2000-122/);
  });

  test('живой ИИ-бот: HTML в ответе прослойки экранируется (защита от XSS)', async () => {
    // Ответ сервера не доверяем: вставляется через escapeHtml, тег не должен ожить.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ reply: '<img src=x onerror=alert(1)>' }) }))
    );
    document.getElementById('chatInput').value = 'привет';
    document.getElementById('chatSend').click();
    await sleep(300);
    expect(document.querySelectorAll('#chat img').length).toBe(0);
    vi.unstubAllGlobals();
  });

  test('импорт дневника: валидные записи добавляются, дубли и мусор отсеиваются', async () => {
    // Одна запись уже в дневнике — она не должна задублироваться при импорте.
    const existing = { emotions: [{ name: 'Радость', color: '#FBBF24' }], emotion: 'Радость', intensity: 5, date: 1000 };
    localStorage.setItem('ml_diary', JSON.stringify([existing]));
    const importInput = document.getElementById('diaryImportInput');
    expect(importInput, 'нет input импорта').toBeTruthy();
    const fileJson = JSON.stringify({
      app: 'matryoshka', kind: 'diary', version: 1,
      entries: [
        existing, // дубль по date=1000 → игнор
        { emotions: [{ name: 'Грусть', color: '#6366F1' }], emotion: 'Грусть', intensity: 7, date: 2000 }, // новая
        { emotion: 'Гнев', intensity: 3, date: 3000 }, // старый формат — тоже валидна
        { note: 'без даты и эмоций' }, // мусор → отсев
      ],
    });
    const file = new File([fileJson], 'd.json', { type: 'application/json' });
    Object.defineProperty(importInput, 'files', { value: [file], configurable: true });
    importInput.dispatchEvent(new Event('change'));
    await sleep(50); // FileReader асинхронный
    const saved = JSON.parse(localStorage.getItem('ml_diary'));
    expect(saved.length).toBe(3); // было 1 + 2 новых
    expect(saved.map(e => e.date)).toEqual([1000, 2000, 3000]); // отсортировано по дате
  });
});
