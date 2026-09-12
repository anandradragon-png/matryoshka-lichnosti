/* Тесты на данные теста «Как вы обращаетесь с чувствами»: состав вопросов,
   шестнадцать профилей, связь с каталогом практик.

   Отдельно от emotest-score.test.js намеренно: здесь проверяется текст и его
   раскладка по шкалам — то, что правит человек, — а там арифметика. Падение
   в этом файле означает «правили данные», в том — «правили подсчёт». */
import { describe, test, expect } from 'vitest';
import { SCALES, QUESTIONS, ANSWERS, TOP, DEFAULT_REC, scaleMax } from '../js/emotest-data.js';
import { TYPES, typeByCode } from '../js/emotest-types.js';
import { PRACTICES } from '../js/practices-data.js';

const SCALE_IDS = SCALES.map(s => s.id);

describe('данные: количество и структура вопросов', () => {
  test('ровно 40 утверждений', () => {
    expect(QUESTIONS.length).toBe(40);
  });

  test('по 10 утверждений на каждую шкалу', () => {
    for (const id of SCALE_IDS) {
      const count = QUESTIONS.filter(q => q.s === id).length;
      expect(count, `шкала ${id}: ожидалось 10, получилось ${count}`).toBe(10);
    }
  });

  // Главная методическая проверка состава: ровно половина утверждений каждой
  // шкалы написана от обратного. Перекос здесь — и «согласен со всем» даёт
  // не середину, а профиль; тест начинает врать всем торопливым.
  test('по 5 полюса a и 5 полюса b на каждую шкалу', () => {
    for (const id of SCALE_IDS) {
      const qs = QUESTIONS.filter(q => q.s === id);
      const aCount = qs.filter(q => q.p === 'a').length;
      const bCount = qs.filter(q => q.p === 'b').length;
      expect(aCount, `шкала ${id}: полюсов a = ${aCount}, должно быть 5`).toBe(5);
      expect(bCount, `шкала ${id}: полюсов b = ${bCount}, должно быть 5`).toBe(5);
    }
  });

  test('все q.s ссылаются на существующие шкалы', () => {
    for (const q of QUESTIONS) {
      expect(SCALE_IDS, `неизвестная шкала ${q.s}`).toContain(q.s);
    }
  });

  test('у каждого вопроса есть текст (поле t)', () => {
    for (let i = 0; i < QUESTIONS.length; i++) {
      expect(QUESTIONS[i].t, `вопрос ${i} без текста`).toBeTruthy();
    }
  });

  test('тексты утверждений не повторяются', () => {
    const unique = new Set(QUESTIONS.map(q => q.t));
    expect(unique.size).toBe(QUESTIONS.length);
  });
});

describe('данные: шкала ответов', () => {
  test('четыре варианта, без нейтральной середины', () => {
    expect(ANSWERS.length).toBe(4);
  });

  test('значения идут от TOP до нуля без пропусков', () => {
    expect(ANSWERS.map(a => a.value)).toEqual([3, 2, 1, 0]);
    expect(TOP).toBe(3);
  });

  test('scaleMax для каждой шкалы — 30 (10 вопросов × TOP)', () => {
    for (const id of SCALE_IDS) {
      expect(scaleMax(id)).toBe(30);
    }
  });
});

describe('данные: профили', () => {
  test('ровно 16 профилей', () => {
    expect(TYPES.length).toBe(16);
  });

  test('коды профилей уникальны', () => {
    expect(new Set(TYPES.map(t => t.code)).size).toBe(16);
  });

  // Профиль должен найтись для любого исхода теста: шестнадцать сочетаний
  // букв — это и есть все возможные результаты. Дырка здесь означает, что
  // кто-то пройдёт тест и не увидит описания.
  test('для всех 2^4 = 16 сочетаний букв профиль находится', () => {
    const letters = SCALES.map(s => [s.a.letter, s.b.letter]);
    const allCodes = letters[0].flatMap(l0 =>
      letters[1].flatMap(l1 =>
        letters[2].flatMap(l2 => letters[3].map(l3 => l0 + l1 + l2 + l3))
      )
    );
    expect(allCodes.length).toBe(16);
    for (const code of allCodes) {
      expect(typeByCode(code), `профиль для кода ${code} не найден`).not.toBeNull();
    }
  });

  test('у каждого профиля заполнены все обязательные поля текста', () => {
    const FIELDS = ['code', 'name', 'lead', 'inside', 'strength', 'growth', 'step'];
    for (const t of TYPES) {
      for (const f of FIELDS) {
        expect(t[f], `профиль ${t.code}: поле ${f} пустое`).toBeTruthy();
      }
    }
  });

  test('typeByCode на несуществующем коде возвращает null, а не падает', () => {
    expect(typeByCode('ХХХХ')).toBeNull();
    expect(typeByCode('')).toBeNull();
    expect(typeByCode(undefined)).toBeNull();
  });
});

// Экран результата ведёт человека в практики по названию категории. Названия
// живут в двух файлах, и связь между ними — обычная строка: переименуют
// категорию в каталоге, и кнопка молча приведёт в пустой список.
describe('связь со каталогом практик', () => {
  const CATS = new Set(PRACTICES.map(p => p.cat));

  test('категория каждой шкалы есть в каталоге практик', () => {
    for (const s of SCALES) {
      expect(CATS, `шкала ${s.id}: категории «${s.rec}» нет в каталоге`).toContain(s.rec);
    }
  });

  test('категория по умолчанию есть в каталоге практик', () => {
    expect(CATS, `категории «${DEFAULT_REC}» нет в каталоге`).toContain(DEFAULT_REC);
  });
});
