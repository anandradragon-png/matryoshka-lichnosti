/**
 * Разделение данных по вошедшему пользователю (js/scope.js).
 * Суть: за одним компьютером могут сидеть двое, и записи одного не должны
 * попадать в дневник и отчёт другого. Эмоции — специальная категория
 * персональных данных, случайное смешение здесь недопустимо.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { freshEnv } from './helpers/boot.js';

describe('scope: чьи это данные', () => {
  beforeEach(async () => { await freshEnv(); });

  test('гость работает с общим ключом, вошедший — со своим', async () => {
    const { scopedKey } = await import('../js/scope.js');
    expect(scopedKey('ml_diary')).toBe('ml_diary');
    localStorage.setItem('ml_session', 'anna');
    expect(scopedKey('ml_diary')).toBe('ml_diary__anna');
  });

  test('первый вошедший забирает накопленное гостем, копия не остаётся', async () => {
    const { scopedKey } = await import('../js/scope.js');
    localStorage.setItem('ml_diary', '[{"date":1000}]');
    localStorage.setItem('ml_session', 'sveta');

    expect(scopedKey('ml_diary')).toBe('ml_diary__sveta');
    expect(localStorage.getItem('ml_diary__sveta')).toBe('[{"date":1000}]');
    // Две копии — это две правды: непонятно, какая настоящая.
    expect(localStorage.getItem('ml_diary')).toBe(null);
  });

  test('второй пользователь не получает записи первого', async () => {
    const { scopedKey } = await import('../js/scope.js');
    localStorage.setItem('ml_diary', '[{"date":1000}]');
    localStorage.setItem('ml_session', 'sveta');
    scopedKey('ml_diary');                       // забрал гостевые себе

    localStorage.setItem('ml_session', 'anna');
    expect(scopedKey('ml_diary')).toBe('ml_diary__anna');
    expect(localStorage.getItem('ml_diary__anna')).toBe(null);
  });

  // Ответы теста чувств — такая же специальная категория, как эмоции дневника.
  // Человек начал тест без входа, потом зарегистрировался — сорок ответов
  // обязаны уехать к нему, а не остаться общими для всех за этим компьютером.
  test('ответы теста чувств переезжают к вошедшему и второму не видны', async () => {
    const { scopedKey } = await import('../js/scope.js');
    const { ML_KEYS } = await import('../js/core.js');
    const guest = JSON.stringify({ answers: [3, 2, 1], done: false, date: 1000 });
    localStorage.setItem(ML_KEYS.emotest, guest);

    localStorage.setItem('ml_session', 'sveta');
    expect(scopedKey(ML_KEYS.emotest)).toBe('ml_emotest__sveta');
    expect(localStorage.getItem('ml_emotest__sveta')).toBe(guest);
    expect(localStorage.getItem(ML_KEYS.emotest)).toBe(null);

    localStorage.setItem('ml_session', 'anna');
    expect(scopedKey(ML_KEYS.emotest)).toBe('ml_emotest__anna');
    expect(localStorage.getItem('ml_emotest__anna')).toBe(null);
  });

  test('дневник и журнал разделяются между пользователями целиком', async () => {
    await import('../js/core.js');
    await import('../js/practices.js');
    const org = await import('../js/organizer.js');
    const journal = await import('../js/journal.js');

    localStorage.setItem('ml_session', 'sveta');
    localStorage.setItem('ml_diary__sveta', JSON.stringify([
      { date: Date.now(), intensity: 5, emotions: [{ name: 'Радость', color: '#FBBF24' }] },
    ]));
    journal.logEvent(journal.EVENT.practice, { title: 'Дыхание' });
    expect(org.loadEntries().length).toBe(1);
    expect(journal.loadEvents().length).toBe(1);

    localStorage.setItem('ml_session', 'anna');
    expect(org.loadEntries()).toEqual([]);
    expect(journal.loadEvents()).toEqual([]);
  });
});
