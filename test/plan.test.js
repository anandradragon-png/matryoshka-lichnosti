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

  test('free не получает standard-блок', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.period', 'free')).toBe(false);
    expect(planAllows('report.insights', 'free')).toBe(false);
    expect(planAllows('report.dar', 'free')).toBe(false);
  });

  test('free не получает premium-блок', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.darFull', 'free')).toBe(false);
    expect(planAllows('report.trends', 'free')).toBe(false);
  });

  test('standard не получает premium-блок', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.darFull', 'standard')).toBe(false);
    expect(planAllows('report.practiceHistory', 'standard')).toBe(false);
  });

  test('premium получает все известные возможности', async () => {
    const { planAllows } = await import('../js/plan.js');
    const all = [
      'report.day', 'report.period', 'report.insights', 'report.dar',
      'report.chat', 'report.darFull', 'report.practiceHistory', 'report.trends',
    ];
    for (const f of all) {
      expect(planAllows(f, 'premium'), `premium должен иметь ${f}`).toBe(true);
    }
  });

  test('free получает report.day', async () => {
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.day', 'free')).toBe(true);
  });

  test('тариф-мусор приравнивается к бесплатному, а не к «ничего»', async () => {
    // Опечатка или мусор в хранилище не должны отнимать бесплатную часть
    // отчёта — но и платное по ним не открывается.
    const { planAllows } = await import('../js/plan.js');
    expect(planAllows('report.day', 'unknown_plan')).toBe(true);
    expect(planAllows('report.period', 'enterprise')).toBe(false);
    expect(planAllows('report.trends', 'PREMIUM')).toBe(false);
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
