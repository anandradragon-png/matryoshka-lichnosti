/**
 * journal.js — базовые операции и устойчивость к битым данным.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { freshEnv } from './helpers/boot.js';

beforeEach(freshEnv);

describe('journal: logEvent / loadEvents', () => {
  test('logEvent возвращает событие с id и сохраняет в localStorage', async () => {
    const { logEvent, loadEvents } = await import('../js/journal.js');
    const ev = logEvent('dar', { field: 1 });
    expect(ev).not.toBeNull();
    expect(typeof ev.id).toBe('string');
    expect(ev.type).toBe('dar');
    const loaded = loadEvents();
    expect(loaded.length).toBe(1);
    expect(loaded[0].id).toBe(ev.id);
  });

  test('logEvent с неизвестным типом возвращает null и ничего не пишет', async () => {
    const { logEvent, loadEvents } = await import('../js/journal.js');
    const ev = logEvent('unknown_type', { x: 1 });
    expect(ev).toBeNull();
    expect(loadEvents().length).toBe(0);
  });
});

describe('journal: битые данные в localStorage', () => {
  test('строка вместо массива — loadEvents возвращает []', async () => {
    localStorage.setItem('ml_journal', '"это строка"');
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('null в localStorage — loadEvents возвращает []', async () => {
    localStorage.setItem('ml_journal', 'null');
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('невалидный JSON — loadEvents возвращает []', async () => {
    localStorage.setItem('ml_journal', '{broken:json}');
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('null внутри массива отфильтровывается', async () => {
    const { logEvent, loadEvents } = await import('../js/journal.js');
    const good = logEvent('practice', { name: 'Дыхание' });
    const raw = JSON.parse(localStorage.getItem('ml_journal'));
    raw.push(null);
    raw.push({ type: 'chat', date: Date.now() }); // нет data
    localStorage.setItem('ml_journal', JSON.stringify(raw));
    const events = loadEvents();
    expect(events.length).toBe(1);
    expect(events[0].id).toBe(good.id);
  });

  test('событие без data отфильтровывается', async () => {
    const broken = { id: 'ev_bad', type: 'dar', date: Date.now() };
    localStorage.setItem('ml_journal', JSON.stringify([broken]));
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('событие с date-строкой (не числом) отфильтровывается', async () => {
    const broken = { id: 'ev_str', type: 'dar', date: '2026-01-01', data: { x: 1 } };
    localStorage.setItem('ml_journal', JSON.stringify([broken]));
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('событие с неизвестным type отфильтровывается', async () => {
    const broken = { id: 'ev_unk', type: 'mystery', date: Date.now(), data: {} };
    localStorage.setItem('ml_journal', JSON.stringify([broken]));
    const { loadEvents } = await import('../js/journal.js');
    expect(loadEvents()).toEqual([]);
  });

  test('logEvent после битых данных сохраняет только валидные + новое', async () => {
    localStorage.setItem('ml_journal', '[null,{"broken":true}]');
    const { logEvent, loadEvents } = await import('../js/journal.js');
    logEvent('test', { score: 42 });
    const events = loadEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('test');
  });
});

describe('journal: обрезка MAX_EVENTS=400', () => {
  test('после 401 события самое старое уходит, самое новое остаётся', async () => {
    const { logEvent, loadEvents } = await import('../js/journal.js');
    vi.useFakeTimers();
    const ids = [];
    for (let i = 0; i < 400; i++) {
      vi.setSystemTime(1_000_000 + i * 1000);
      ids.push(logEvent('dar', { i }).id);
    }
    vi.setSystemTime(1_000_000 + 400 * 1000);
    const newest = logEvent('practice', { name: 'Последняя' });
    vi.useRealTimers();

    const events = loadEvents();
    expect(events.length).toBe(400);
    expect(events.find(e => e.id === ids[0])).toBeUndefined();
    expect(events.find(e => e.id === newest.id)).toBeTruthy();
  });
});

describe('journal: границы периодов', () => {
  test('23:59 и 00:01 попадают в разные дни', async () => {
    const { logEvent, eventsOfDay } = await import('../js/journal.js');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T23:59:00').getTime());
    const evNight = logEvent('dar', { x: 1 });
    vi.setSystemTime(new Date('2026-01-02T00:01:00').getTime());
    const evMorning = logEvent('dar', { x: 2 });
    vi.useRealTimers();

    const day1 = eventsOfDay(new Date('2026-01-01T12:00:00').getTime());
    expect(day1.map(e => e.id)).toContain(evNight.id);
    expect(day1.map(e => e.id)).not.toContain(evMorning.id);

    const day2 = eventsOfDay(new Date('2026-01-02T12:00:00').getTime());
    expect(day2.map(e => e.id)).toContain(evMorning.id);
    expect(day2.map(e => e.id)).not.toContain(evNight.id);
  });

  test('eventsInPeriod включает граничные события (from и to включительно)', async () => {
    const { logEvent, eventsInPeriod } = await import('../js/journal.js');
    vi.useFakeTimers();
    const from = 1_000_000;
    const to = 2_000_000;

    vi.setSystemTime(from);
    const evFrom = logEvent('dar', { boundary: 'from' });
    vi.setSystemTime(to);
    const evTo = logEvent('dar', { boundary: 'to' });
    vi.setSystemTime(from - 1);
    const evBefore = logEvent('practice', { boundary: 'before' });
    vi.setSystemTime(to + 1);
    const evAfter = logEvent('practice', { boundary: 'after' });
    vi.useRealTimers();

    const inPeriod = eventsInPeriod(from, to);
    expect(inPeriod.map(e => e.id)).toContain(evFrom.id);
    expect(inPeriod.map(e => e.id)).toContain(evTo.id);
    expect(inPeriod.map(e => e.id)).not.toContain(evBefore.id);
    expect(inPeriod.map(e => e.id)).not.toContain(evAfter.id);
  });
});
