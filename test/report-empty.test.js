/**
 * Отчёт на полностью пустых данных — нет NaN, нет «undefined», нет «null».
 * Плюс: практика без поля steps не роняет полный разбор.
 *
 * Почему важно: localStorage правится руками, и пустые данные — первый
 * реальный сценарий нового пользователя. Артефакты вроде «NaN из 10»
 * или пустых тегов <ol> — это баги, видимые пользователю.
 *
 * Все импорты динамические: статический import depth.js тянет core.js,
 * который при загрузке модуля обращается к DOM и падает без freshEnv.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv, bootDomModules } from './helpers/boot.js';

beforeEach(freshEnv);

/* ================================================================
   ГРУППА 1: пустые данные не дают мусора в HTML
   ================================================================ */
describe('report: пустые данные не дают NaN/undefined/null в тексте', () => {

  test.each([
    ['BRIEF', 1],
    ['NORMAL', 2],
    ['FULL', 3],
  ])('глубина %s — нет строк NaN / undefined / null', async (_, depth) => {
    await bootDomModules();

    const { collectReport } = await import('../js/report/data.js');
    const [
      { mood }, { insights }, { practices }, { dar }, { chats }, { advice },
      { cover, inspiration, deeper, footer },
    ] = await Promise.all([
      import('../js/report/section-mood.js'),
      import('../js/report/section-insights.js'),
      import('../js/report/section-practices.js'),
      import('../js/report/section-dar.js'),
      import('../js/report/section-chats.js'),
      import('../js/report/section-advice.js'),
      import('../js/report/section-frame.js'),
    ]);
    const { PLAN_LABEL } = await import('../js/plan.js');

    const ctx = collectReport('day');
    const html = [
      cover(ctx, PLAN_LABEL['free'], depth),
      inspiration(ctx),
      mood(ctx, depth),
      insights(ctx, depth),
      practices(ctx, depth),
      dar(ctx, depth),
      chats(ctx, depth),
      advice(ctx, depth),
      deeper(depth),
      footer(ctx),
    ].filter(Boolean).join('\n');

    // NaN в числовой ячейке читается пользователем как ошибка приложения
    expect(html, 'NaN не должен попасть в HTML').not.toContain('NaN');
    // undefined и null — артефакты String(undefined) / String(null)
    expect(html).not.toContain('>undefined<');
    expect(html).not.toMatch(/>null</);
  });
});

/* ================================================================
   ГРУППА 2: практика без поля steps не роняет полный разбор
   ================================================================
   Старые записи журнала (до добавления steps) не имеют этого поля.
   Отчёт должен их переварить: ни падения, ни пустого <ol>. */
describe('report: старая практика без steps — нет краша, нет пустого <ol>', () => {

  test('практика без поля steps — FULL не падает', async () => {
    await bootDomModules();
    const { EVENT } = await import('../js/journal.js');
    localStorage.setItem('ml_journal', JSON.stringify([{
      id: 'ev_no_steps',
      type: EVENT.practice,
      date: Date.now(),
      data: {
        title: 'Дыхание 4-7-8',
        icon: '🌬️',
        cat: 'Дыхание',
        time: '5 мин',
        desc: 'Успокаивающая техника',
        when: 'Перед сном',
        // steps намеренно отсутствует — старая запись
      },
    }]));

    const { collectReport } = await import('../js/report/data.js');
    const { practices } = await import('../js/report/section-practices.js');
    const ctx = collectReport('day');
    let html;
    expect(() => { html = practices(ctx, 3); }).not.toThrow();
    // Пустой <ol> — верстальный мусор, его не должно быть
    expect(html).not.toMatch(/<ol[^>]*>\s*<\/ol>/);
  });

  test('практика со steps=null — нет падения, нет пустого <ol>', async () => {
    await bootDomModules();
    const { EVENT } = await import('../js/journal.js');
    localStorage.setItem('ml_journal', JSON.stringify([{
      id: 'ev_null_steps',
      type: EVENT.practice,
      date: Date.now(),
      data: { title: 'Медитация', steps: null },
    }]));

    const { collectReport } = await import('../js/report/data.js');
    const { practices } = await import('../js/report/section-practices.js');
    const ctx = collectReport('day');
    let html;
    expect(() => { html = practices(ctx, 3); }).not.toThrow();
    expect(html).not.toMatch(/<ol[^>]*>\s*<\/ol>/);
  });
});
