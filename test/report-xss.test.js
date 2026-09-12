/**
 * XSS: внешний ввод в отчёте экранируется через escapeHtml.
 *
 * Данные отчёта приходят из localStorage — хранилище правится руками
 * и в него попадают импортированные файлы. В этом проекте уже подставляли
 * чужой CSS через название эмоции (коммит aa878f7). Каждый тест — одно место
 * ввода, один вектор атаки.
 *
 * Все импорты динамические: статический import depth.js тянет core.js,
 * который при загрузке модуля обращается к DOM и падает без freshEnv.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv, bootDomModules } from './helpers/boot.js';

beforeEach(freshEnv);

const XSS_TAG  = '<script>alert(1)</script>';
const XSS_ATTR = '" onmouseover="alert(1)';
const ESCAPED  = '&lt;script&gt;';

describe('XSS: внешний ввод экранируется в каждом разделе', () => {

  /* Название эмоции — именно этот вектор уже применялся в реальной атаке. */
  test('название эмоции: <script> не попадает в HTML', async () => {
    await bootDomModules();
    localStorage.setItem('ml_diary', JSON.stringify([{
      id: 'en_xss_emo',
      date: Date.now(),
      emotion: XSS_TAG,
      emotions: [{ name: XSS_TAG, color: '#ff0000' }],
      intensity: 5,
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { mood } = await import('../js/report/section-mood.js');
    const html = mood(collectReport('day'), 3);
    expect(html).not.toContain(XSS_TAG);
    expect(html).toContain(ESCAPED);
  });

  /* Заметка дневника: свободный текст, высокий риск. */
  test('заметка дневника: <script> экранируется', async () => {
    await bootDomModules();
    localStorage.setItem('ml_diary', JSON.stringify([{
      id: 'en_xss_note',
      date: Date.now(),
      emotion: 'Тревога',
      emotions: [{ name: 'Тревога', color: '#818cf8' }],
      intensity: 5,
      note: XSS_TAG,
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { mood } = await import('../js/report/section-mood.js');
    const html = mood(collectReport('day'), 3);
    expect(html).not.toContain(XSS_TAG);
    expect(html).toContain(ESCAPED);
  });

  /* Реплика чата: пользователь печатает что угодно — самый открытый ввод. */
  test('реплика чата: <script> экранируется', async () => {
    await bootDomModules();
    const { EVENT } = await import('../js/journal.js');
    localStorage.setItem('ml_journal', JSON.stringify([{
      id: 'ev_xss_chat',
      type: EVENT.chat,
      date: Date.now(),
      data: { topic: 'тест', lines: [{ role: 'user', text: XSS_TAG }] },
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { chats } = await import('../js/report/section-chats.js');
    const html = chats(collectReport('day'), 3);
    expect(html).not.toContain(XSS_TAG);
    expect(html).toContain(ESCAPED);
  });

  /* Название практики: приходит снимком из localStorage, не из каталога. */
  test('название практики: <script> экранируется', async () => {
    await bootDomModules();
    const { EVENT } = await import('../js/journal.js');
    localStorage.setItem('ml_journal', JSON.stringify([{
      id: 'ev_xss_prac',
      type: EVENT.practice,
      date: Date.now(),
      data: { title: XSS_TAG, steps: [] },
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { practices } = await import('../js/report/section-practices.js');
    const html = practices(collectReport('day'), 3);
    expect(html).not.toContain(XSS_TAG);
    expect(html).toContain(ESCAPED);
  });

  /* Название Дара: лежит в журнале снимком. */
  test('название Дара: <script> экранируется', async () => {
    await bootDomModules();
    const { EVENT } = await import('../js/journal.js');
    localStorage.setItem('ml_journal', JSON.stringify([{
      id: 'ev_xss_dar',
      type: EVENT.dar,
      date: Date.now(),
      data: { darName: XSS_TAG, code: '1-1-1', fieldName: 'Поле' },
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { dar } = await import('../js/report/section-dar.js');
    const html = dar(collectReport('day'), 3);
    expect(html).not.toContain(XSS_TAG);
    expect(html).toContain(ESCAPED);
  });

  /* Кавычки в названии эмоции — инъекция в атрибут style (был реальный баг).
     safeColor зачищает цвет, название обязано выйти через escapeHtml. */
  test('кавычки в названии эмоции: не ломают атрибут', async () => {
    await bootDomModules();
    localStorage.setItem('ml_diary', JSON.stringify([{
      id: 'en_xss_quote',
      date: Date.now(),
      emotion: XSS_ATTR,
      emotions: [{ name: XSS_ATTR, color: '#ff0000' }],
      intensity: 5,
    }]));
    const { collectReport } = await import('../js/report/data.js');
    const { mood } = await import('../js/report/section-mood.js');
    const html = mood(collectReport('day'), 2);
    expect(html).not.toContain('onmouseover="alert(1)"');
    expect(html).toContain('&quot;');
  });

  /* section-advice: обращение к p.steps.length без проверки на undefined.
     data.js гарантирует массив при нормальном пути, но вёрстка должна
     выдержать и прямой вызов с неполным объектом — иначе нельзя тестировать
     секцию изолированно. */
  test('advice с практикой без поля steps: нет TypeError на FULL', async () => {
    await bootDomModules();
    const { advice } = await import('../js/report/section-advice.js');
    const ctx = {
      advice: [{
        emotion: 'Тревога',
        emoji: '😰',
        text: 'Тревога сигнализирует о важном.',
        repeat: false,
        practices: [{
          title: 'Дыхание', icon: '🌬️', time: '5 мин',
          desc: 'Успокаивает', when: 'Всегда',
          // steps намеренно отсутствует
        }],
      }],
    };
    let html;
    expect(() => { html = advice(ctx, 3); }).not.toThrow();
    expect(html).toContain('Тревога');
  });
});
