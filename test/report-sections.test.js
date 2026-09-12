/**
 * Главное обещание модели: все разделы присутствуют на каждой из трёх глубин.
 * Плюс мутационная проверка — доказывает, что тест не декоративный.
 *
 * Если кто-то снова спрячет раздел за тариф — тест упадёт до того,
 * как пользователь это увидит.
 *
 * Все импорты — динамические внутри тестов: статический import depth.js
 * потянул бы plan.js → core.js, который в момент загрузки модуля обращается
 * к document.getElementById('burger') и падает без DOM из index.html.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv, bootDomModules } from './helpers/boot.js';

beforeEach(freshEnv);

/* Заголовки <h2>, которые ОБЯЗАНЫ быть в любом отчёте на любой глубине. */
const REQUIRED_H2 = [
  'Настроение',
  'Что заметно в ваших данных',
  'Практики',
  'Ваш Дар',
  'Разговоры с ассистентом',
  'Что делать дальше',
];

function extractH2(html) {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => m[1].trim());
}

/* ================================================================
   ГРУППА 1: все разделы на всех трёх глубинах
   ================================================================ */
describe('sections: все разделы присутствуют на каждой глубине', () => {

  /* Пустые данные — худший случай: именно тогда раздел мог бы «исчезнуть»,
     если внутри нет контента. Каждый раздел обязан отдать хотя бы заглушку. */
  test.each([
    ['BRIEF (free)', 1],
    ['NORMAL (standard)', 2],
    ['FULL (premium)', 3],
  ])('пустые данные, глубина %s — все разделы на месте', async (_, depth) => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const [
      { mood }, { insights }, { practices }, { dar }, { chats }, { advice },
    ] = await Promise.all([
      import('../js/report/section-mood.js'),
      import('../js/report/section-insights.js'),
      import('../js/report/section-practices.js'),
      import('../js/report/section-dar.js'),
      import('../js/report/section-chats.js'),
      import('../js/report/section-advice.js'),
    ]);

    const ctx = collectReport('day');
    const html = [mood, insights, practices, dar, chats, advice]
      .map(fn => fn(ctx, depth))
      .join('\n');

    const found = extractH2(html);
    for (const expected of REQUIRED_H2) {
      expect(found, `Раздел «${expected}» пропал на глубине ${depth}`).toContain(expected);
    }
  });
});

/* ================================================================
   ГРУППА 2: мутационная проверка — тест с зубами
   ================================================================
   Мутируем одну секцию в пустую строку и убеждаемся, что extractH2
   действительно не находит её заголовок. Это доказывает, что тесты
   группы 1 не декоративные — они поймали бы такую ситуацию. */
describe('мутация: тест разделов обнаруживает пропажу раздела', () => {

  test('если dar() возвращает пустую строку — «Ваш Дар» в H2 не найден', async () => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const { mood }      = await import('../js/report/section-mood.js');
    const { insights }  = await import('../js/report/section-insights.js');
    const { practices } = await import('../js/report/section-practices.js');
    const { chats }     = await import('../js/report/section-chats.js');
    const { advice }    = await import('../js/report/section-advice.js');

    const brokenDar = () => '';   // мутация: раздел скрыт

    const ctx = collectReport('day');
    const html = [
      mood(ctx, 1), insights(ctx, 1), practices(ctx, 1),
      brokenDar(ctx, 1),
      chats(ctx, 1), advice(ctx, 1),
    ].join('\n');

    expect(extractH2(html)).not.toContain('Ваш Дар');
  });
});
