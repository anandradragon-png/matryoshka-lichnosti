/* Тесты на emotest-score.js — подсчёт теста «Как вы обращаетесь с чувствами».
   Здесь только арифметика: обратные утверждения, крайние случаи, мусор на
   входе, граница флага «посередине». Состав вопросов и профили проверяются
   в emotest-data.test.js. */
import { describe, test, expect } from 'vitest';
import { QUESTIONS } from '../js/emotest-data.js';
import { emptyAnswers, unanswered, scoreTest } from '../js/emotest-score.js';

/** Заполнить все ответы одним значением */
function allValue(v) {
  return QUESTIONS.map(() => v);
}

// ─── Обратные вопросы — главная методическая проверка ─────────────────────
// Если это упало, тест перестал ловить бездумные ответы: «согласен со всем»
// начало давать профиль вместо середины.

describe('обратные вопросы: «согласен со всем» даёт середину', () => {
  test('все ответы 3 → score каждой шкалы равно 15 (половина от 30)', () => {
    const result = scoreTest(allValue(3));
    for (const s of result.scales) {
      expect(s.score, `шкала ${s.id}: score = ${s.score}, ожидалось 15`).toBe(15);
    }
  });

  test('все ответы 0 → score каждой шкалы равно 15 (половина от 30)', () => {
    const result = scoreTest(allValue(0));
    for (const s of result.scales) {
      expect(s.score, `шкала ${s.id}: score = ${s.score}, ожидалось 15`).toBe(15);
    }
  });

  test('все ответы 3 → percent каждой шкалы равно 50', () => {
    const result = scoreTest(allValue(3));
    for (const s of result.scales) {
      expect(s.percent, `шкала ${s.id}: percent = ${s.percent}, ожидалось 50`).toBe(50);
    }
  });

  test('все ответы 3 → флаг near поднят по всем шкалам (экран предупредит)', () => {
    const result = scoreTest(allValue(3));
    expect(result.scales.every(s => s.near)).toBe(true);
  });
});

// ─── Крайние случаи ───────────────────────────────────────────────────────

describe('крайние случаи: полный уклон в один полюс', () => {
  test('все ответы максимально в пользу a → код НТДЗ', () => {
    // Утверждение полюса a: даём 3 (max)
    // Утверждение полюса b: даём 0 (max в пользу a, так как TOP − 0 = 3)
    const result = scoreTest(QUESTIONS.map(q => (q.p === 'a' ? 3 : 0)));
    expect(result.code).toBe('НТДЗ');
    expect(result.weak.length).toBe(0);
    expect(result.strong.length).toBe(4);
  });

  test('все ответы максимально в пользу b → код ОУСК', () => {
    // Утверждение полюса a: даём 0 (ноль в пользу a)
    // Утверждение полюса b: даём 3 (TOP − 3 = 0, ноль в пользу a)
    const result = scoreTest(QUESTIONS.map(q => (q.p === 'a' ? 0 : 3)));
    expect(result.code).toBe('ОУСК');
    expect(result.weak.length).toBe(4);
    expect(result.strong.length).toBe(0);
  });

  test('score и percent не содержат NaN при полных ответах в пользу a', () => {
    const result = scoreTest(QUESTIONS.map(q => (q.p === 'a' ? 3 : 0)));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
      expect(Number.isNaN(s.percent)).toBe(false);
    }
  });
});

// Ответы приезжают из localStorage — это внешний ввод: ключ правится руками
// и в него попадают импортированные файлы. Подсчёт обязан выдержать любую
// форму мусора и не выдать NaN, иначе человек увидит «NaN%» вместо результата.
describe('крайние случаи: невалидный ввод не бросает исключений', () => {
  test('пустой массив — не падает, left > 0', () => {
    expect(() => scoreTest([])).not.toThrow();
    expect(scoreTest([]).left).toBeGreaterThan(0);
  });

  test('null вместо массива — не падает', () => {
    expect(() => scoreTest(null)).not.toThrow();
  });

  test('массив короче 40 — не падает, left > 0', () => {
    const short = Array(20).fill(2);
    expect(() => scoreTest(short)).not.toThrow();
    expect(scoreTest(short).left).toBeGreaterThan(0);
  });

  test('массив длиннее 40 — лишние значения не влияют на подсчёт', () => {
    const long = [...allValue(3), 3, 3, 3, 3, 3];
    const result = scoreTest(long);
    for (const s of result.scales) {
      expect(s.score).toBe(15);
    }
  });

  test('строки внутри массива — isAnswer отвергает их, score не NaN', () => {
    const result = scoreTest(QUESTIONS.map(() => 'да'));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
    }
  });

  test('отрицательные значения — isAnswer отвергает (-1), score не NaN', () => {
    const result = scoreTest(QUESTIONS.map(() => -1));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
    }
  });

  test('значения больше TOP (99) — isAnswer отвергает, score не NaN', () => {
    const result = scoreTest(QUESTIONS.map(() => 99));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
    }
  });

  test('дробные значения (2.5) — isAnswer отвергает (не integer), score не NaN', () => {
    const result = scoreTest(QUESTIONS.map(() => 2.5));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
    }
  });

  test('NaN внутри массива — isAnswer отвергает, score не NaN', () => {
    const result = scoreTest(QUESTIONS.map(() => NaN));
    for (const s of result.scales) {
      expect(Number.isNaN(s.score)).toBe(false);
    }
  });
});

// ─── unanswered и left ────────────────────────────────────────────────────

describe('unanswered', () => {
  test('пустой набор из emptyAnswers — 40 без ответа', () => {
    expect(unanswered(emptyAnswers())).toBe(40);
  });

  test('полный корректный набор — 0 без ответа', () => {
    expect(unanswered(allValue(2))).toBe(0);
  });

  test('половина ответов null — 20 без ответа', () => {
    expect(unanswered(QUESTIONS.map((_, i) => (i % 2 === 0 ? 2 : null)))).toBe(20);
  });

  test('невалидные значения считаются как нет ответа', () => {
    expect(unanswered(QUESTIONS.map(() => -1))).toBe(40);
  });

  test('scoreTest.left совпадает с unanswered для неполного набора', () => {
    const partial = QUESTIONS.map((_, i) => (i < 30 ? 1 : null));
    const result = scoreTest(partial);
    expect(result.left).toBe(unanswered(partial));
    expect(result.left).toBe(10);
  });
});

// ─── Флаг near ────────────────────────────────────────────────────────────
// EDGE = 3, mid = 15 (max = 30). near = |score − 15| < 3, то есть 13…17.
// Граница строгая: 12 и 18 — уже не «посередине».

describe('флаг near', () => {
  /* Точный score на одной шкале набирается сдвигом от allValue(3), где он
     равен 15: один a-вопрос с 3 на 1 даёт −2, один b-вопрос с 3 на 1 даёт +2
     (его балл считается как TOP − ответ). */
  function tweakNaming(pole, newValue) {
    const answers = allValue(3);
    const i = QUESTIONS.findIndex(q => q.s === 'naming' && q.p === pole);
    answers[i] = newValue;
    return answers;
  }

  const naming = answers => scoreTest(answers).scales.find(s => s.id === 'naming');

  test('score=15 → near=true (ровно середина)', () => {
    expect(naming(allValue(3)).near).toBe(true);
  });

  test('score=13 → near=true (|13−15|=2 < EDGE=3)', () => {
    const s = naming(tweakNaming('a', 1));
    expect(s.score).toBe(13);
    expect(s.near).toBe(true);
  });

  test('score=12 → near=false (|12−15|=3, не строго меньше EDGE=3)', () => {
    const s = naming(tweakNaming('a', 0));
    expect(s.score).toBe(12);
    expect(s.near).toBe(false);
  });

  test('score=17 → near=true (|17−15|=2 < EDGE=3)', () => {
    const s = naming(tweakNaming('b', 1));
    expect(s.score).toBe(17);
    expect(s.near).toBe(true);
  });

  test('score=18 → near=false (|18−15|=3, не строго меньше EDGE=3)', () => {
    const s = naming(tweakNaming('b', 0));
    expect(s.score).toBe(18);
    expect(s.near).toBe(false);
  });
});
