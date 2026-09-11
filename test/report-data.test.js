/**
 * report/data.js — отчёт на пустых данных и weeklyTrend с выравниванием.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv, bootDomModules } from './helpers/boot.js';

beforeEach(freshEnv);

describe('report/data: пустые данные — нет NaN и падений', () => {
  test('отчёт за день без записей: mood без NaN', async () => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('day');
    expect(r.mood.count).toBe(0);
    expect(r.mood.avgIntensity).toBeNull();
    expect(r.mood.avgSleep).toBeNull();
    expect(r.mood.avgEnergy).toBeNull();
    expect(r.mood.negShare).toBeNull();
    expect(r.mood.top).toEqual([]);
  });

  test('отчёт за неделю без записей: не падает, streak=0, layer=1', async () => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('week');
    expect(r.period).toBe('week');
    expect(r.entries).toEqual([]);
    expect(r.streak).toBe(0);
    expect(r.layer).toBe(1);
    expect(r.activeDays).toBe(0);
  });

  test('отчёт за месяц без записей: trend — пустой массив', async () => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('month');
    expect(Array.isArray(r.trend)).toBe(true);
    expect(r.trend.length).toBe(0);
  });

  test('неизвестный period — не падает, mood возвращается', async () => {
    await bootDomModules();
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('quarterly');
    expect(r.period).toBe('quarterly');
    expect(r.mood).toBeTruthy();
  });
});

describe('report/data: weeklyTrend — выравнивание на понедельник', () => {
  // trend берёт записи за последние 56 дней от Date.now().
  // Используем даты внутри этого окна, чтобы тест не зависел от системного времени.

  /** Возвращает метку начала ближайшего прошедшего понедельника. */
  function lastMonday() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const offset = (d.getDay() + 6) % 7; // 0=пн … 6=вс
    d.setDate(d.getDate() - offset);
    return d.getTime();
  }

  test('воскресная запись попадает в ту же неделю, что предшествующий понедельник', async () => {
    await bootDomModules();
    const monday = lastMonday();
    const sunday = monday + 6 * 864e5; // +6 дней = воскресенье той же недели
    localStorage.setItem('ml_diary', JSON.stringify([
      { emotions: [{ name: 'Радость', color: '#FBBF24' }], emotion: 'Радость', intensity: 5, date: monday },
      { emotions: [{ name: 'Грусть', color: '#6366F1' }], emotion: 'Грусть', intensity: 3, date: sunday },
    ]));
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('month');
    expect(r.trend.length).toBe(1);
    expect(r.trend[0].count).toBe(2);
  });

  test('понедельник и следующий понедельник — две разные недели', async () => {
    await bootDomModules();
    // Используем две недели в прошлом, чтобы обе влезли в окно 56 дней.
    const monday1 = lastMonday() - 7 * 864e5; // позапрошлая неделя
    const monday2 = lastMonday();              // прошедший понедельник
    localStorage.setItem('ml_diary', JSON.stringify([
      { emotions: [{ name: 'Радость', color: '#FBBF24' }], emotion: 'Радость', intensity: 5, date: monday1 },
      { emotions: [{ name: 'Грусть', color: '#6366F1' }], emotion: 'Грусть', intensity: 3, date: monday2 },
    ]));
    const { collectReport } = await import('../js/report/data.js');
    const r = collectReport('month');
    expect(r.trend.length).toBe(2);
    expect(r.trend[0].count).toBe(1);
    expect(r.trend[1].count).toBe(1);
  });
});
