/**
 * report/depth.js — depthFor, deeperThan, константы.
 * Остальные тесты отчёта: report-sections.test.js (разделы + XSS),
 *                         report-empty.test.js (пустые данные).
 *
 * depth.js импортирует plan.js → plan.js импортирует core.js, у которого есть
 * сайд-эффект: он сразу лезет в document.getElementById('burger'). Поэтому
 * импортируем динамически — после freshEnv(), которая восстанавливает DOM.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv } from './helpers/boot.js';

beforeEach(freshEnv);

/* ================================================================
   ГРУППА 1: depthFor — мусорный ввод не роняет и не открывает FULL
   ================================================================ */
describe('depth: depthFor — безопасность на мусорных тарифах', () => {

  /* Опечатка в localStorage или намеренная подмена не должны ронять
     генерацию отчёта и не должны открывать FULL для тех, кто не платил. */
  test.each([
    ['пустая строка', ''],
    ['null', null],
    ['PREMIUM большими буквами', 'PREMIUM'],
    ['enterprise — несуществующий тариф', 'enterprise'],
    ['массив вместо строки', ['premium']],
    ['объект вместо строки', { plan: 'premium' }],
    ['undefined явно', undefined],
    ['число', 42],
  ])('мусорный тариф «%s» → BRIEF, без падения', async (_, plan) => {
    const { depthFor, BRIEF } = await import('../js/report/depth.js');
    expect(depthFor(plan)).toBe(BRIEF);
  });

  test('free → BRIEF', async () => {
    const { depthFor, BRIEF } = await import('../js/report/depth.js');
    expect(depthFor('free')).toBe(BRIEF);
  });

  test('standard → NORMAL', async () => {
    const { depthFor, NORMAL } = await import('../js/report/depth.js');
    expect(depthFor('standard')).toBe(NORMAL);
  });

  test('premium → FULL', async () => {
    const { depthFor, FULL } = await import('../js/report/depth.js');
    expect(depthFor('premium')).toBe(FULL);
  });

  /* Числа возрастают строго: сравнение depth >= NORMAL в секциях иначе даст мусор. */
  test('BRIEF < NORMAL < FULL по значению', async () => {
    const { BRIEF, NORMAL, FULL } = await import('../js/report/depth.js');
    expect(BRIEF).toBeLessThan(NORMAL);
    expect(NORMAL).toBeLessThan(FULL);
  });
});

/* ================================================================
   ГРУППА 2: deeperThan — граничные значения
   ================================================================ */
describe('depth: deeperThan — описание следующего уровня', () => {

  /* FULL — потолок. null здесь критичен: на нём строится решение, показывать
     ли блок «поднимите тариф». null = блок не рисуется. */
  test('deeperThan(FULL) === null', async () => {
    const { deeperThan, FULL } = await import('../js/report/depth.js');
    expect(deeperThan(FULL)).toBeNull();
  });

  test('deeperThan(BRIEF) описывает NORMAL', async () => {
    const { deeperThan, BRIEF, NORMAL, DEPTH_PAGES } = await import('../js/report/depth.js');
    const next = deeperThan(BRIEF);
    expect(next).not.toBeNull();
    expect(next.depth).toBe(NORMAL);
    expect(next.pages).toBe(DEPTH_PAGES[NORMAL]);
    expect(next.label).toBeTruthy();
  });

  test('deeperThan(NORMAL) описывает FULL', async () => {
    const { deeperThan, NORMAL, FULL, DEPTH_PAGES } = await import('../js/report/depth.js');
    const next = deeperThan(NORMAL);
    expect(next).not.toBeNull();
    expect(next.depth).toBe(FULL);
    expect(next.pages).toBe(DEPTH_PAGES[FULL]);
  });
});
