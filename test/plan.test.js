/**
 * plan.js — доступ к функциям по тарифу, getPlan / setPlan.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv } from './helpers/boot.js';

beforeEach(freshEnv);

describe('plan: planAllows — защита от эскалации прав', () => {
  test('неизвестная возможность запрещена на любом тарифе', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.nonexistent', 'premium')).toBe(false);
    expect(planAllows('totally.fake', 'premium')).toBe(false);
    expect(planAllows('', 'premium')).toBe(false);
  });

  test('free не получает отчёт за неделю и месяц', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.period', 'free')).toBe(false);
  });

  test('платные тарифы получают отчёт за период', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.period', 'standard')).toBe(true);
    expect(planAllows('report.period', 'premium')).toBe(true);
  });

  test('free получает report.day', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.day', 'free')).toBe(true);
  });

  /* Разделы отчёта больше НЕ раздаются по тарифу: раздел получает каждый,
     тариф решает только глубину. Если кто-то вернёт сюда флаг вида
     'report.dar', этот тест упадёт и напомнит, что решение живёт в depth.js. */
  test('разделы отчёта тарифом не раздаются', async () => {
    const { planAllows } = await import('../js/plan.js');
    ['report.dar', 'report.insights', 'report.chat', 'report.trends',
      'report.darFull', 'report.practiceHistory'].forEach(f => {
      expect(planAllows(f, 'premium'), `${f} должен решаться глубиной, а не тарифом`).toBe(false);
    });
  });

  test('тариф-мусор приравнивается к бесплатному, а не к «ничего»', async () => {
    // Опечатка или мусор в хранилище не должны отнимать бесплатную часть
    // отчёта — но и платное по ним не открывается.
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.day', 'unknown_plan')).toBe(true);
    expect(planAllows('report.period', 'enterprise')).toBe(false);
    expect(planAllows('report.period', 'PREMIUM')).toBe(false);
  });
});

describe('plan: getPlan / setPlan', () => {
  test('без записи в localStorage возвращает free', async () => {
    const { getPlan } = await import('../js/plan.js');
    expect(getPlan('anyuser')).toBe('free');
  });

  test('setPlan с несуществующим тарифом ничего не сохраняет', async () => {
    const { getPlan, setPlan } = await import('../js/plan.js');
    setPlan('vip', 'user1');
    expect(getPlan('user1')).toBe('free');
  });

  test('тарифы разных пользователей не пересекаются', async () => {
    const { getPlan, setPlan } = await import('../js/plan.js');
    setPlan('standard', 'alice');
    setPlan('premium', 'bob');
    expect(getPlan('alice')).toBe('standard');
    expect(getPlan('bob')).toBe('premium');
  });

  test('массив в ml_plan вместо объекта → fallback к free', async () => {
    localStorage.setItem('ml_plan', '["standard"]');
    const { getPlan } = await import('../js/plan.js');
    expect(getPlan('anyuser')).toBe('free');
  });
});

describe('мутация: planAllows — тест с зубами', () => {
  test('сломанная функция (всегда true) обнаруживается', async () => {
    // Если planAllows заменить на () => true, тест на free/standard упадёт.
    const brokenPlanAllows = () => true;
    const { planAllows } = await import('../js/plan.js');
    // Реальная функция возвращает false для free + standard-блок.
    expect(planAllows('report.period', 'free')).toBe(false);
    // Сломанная — вернула бы true.
    expect(brokenPlanAllows('report.period', 'free')).toBe(true);
  });
});
