/* ================= ТЕСТ «КАК ВЫ ОБРАЩАЕТЕСЬ С ЧУВСТВАМИ» (подсчёт) =================
   Превращает сорок ответов в четыре шкалы и профиль. Ни одной строчки про DOM:
   подсчёт — то место, где ошибка тише всего и дороже всего, поэтому он живёт
   отдельно от экрана и проверяется тестами напрямую.

   КАК СЧИТАЕТСЯ. Баллы всегда идут в пользу полюса `a` — того, где шаг
   получается. Утверждение полюса `a` даёт столько баллов, сколько человек
   выбрал; утверждение полюса `b` — наоборот, `макс − выбранное`. Поэтому
   «согласен со всем» даёт ровно середину по каждой шкале, и это видно.

   ЧТО ТАКОЕ «ПОСЕРЕДИНЕ». Если результат отстоит от середины меньше чем
   на EDGE, полюс всё равно назначается (иначе не будет профиля), но рядом
   поднимается флаг `near`. Экран обязан его показать: разница в один ответ —
   это не разница, и честнее сказать человеку, что тут у него пополам. */
import { SCALES, QUESTIONS, EDGE, TOP, scaleMax } from './emotest-data.js';
import { typeByCode } from './emotest-types.js';

/* Пустой набор ответов: по одному месту на каждое утверждение. */
export function emptyAnswers() {
  return QUESTIONS.map(() => null);
}

/* Сколько утверждений ещё без ответа. Экран не даёт смотреть результат,
   пока это не ноль: профиль по половине ответов — выдумка. */
export function unanswered(answers) {
  return QUESTIONS.reduce((n, q, i) => (isAnswer(answers[i]) ? n : n + 1), 0);
}

function isAnswer(v) {
  return Number.isInteger(v) && v >= 0 && v <= TOP;
}

/* Балл одного утверждения в пользу полюса `a`. */
function points(question, value) {
  return question.p === 'a' ? value : TOP - value;
}

function scaleResult(scale, answers) {
  const max = scaleMax(scale.id);
  const mid = max / 2;
  let score = 0;
  QUESTIONS.forEach((q, i) => {
    if (q.s !== scale.id || !isAnswer(answers[i])) return;
    score += points(q, answers[i]);
  });
  // Ровно середина отдаётся полюсу `a` — но вместе с флагом `near`, поэтому
  // человек увидит не «у вас получается», а «по этой шкале пополам».
  const pole = score >= mid ? 'a' : 'b';
  const side = scale[pole];
  return {
    id: scale.id,
    title: scale.title,
    question: scale.question,
    score, max,
    percent: Math.round((100 * score) / max),
    pole,
    near: Math.abs(score - mid) < EDGE,
    letter: side.letter,
    name: side.name,
    short: side.short,
    rec: scale.rec,
  };
}

/* Главная функция. На вход — массив ответов длиной в число утверждений,
   на выход — шкалы, код и профиль. Профиль может оказаться null, если шкалы
   правили, а описания нет: экран тогда покажет шкалы без профиля, а не
   чужой текст. */
export function scoreTest(answers) {
  const list = Array.isArray(answers) ? answers : [];
  const scales = SCALES.map(s => scaleResult(s, list));
  const code = scales.map(s => s.letter).join('');
  return {
    scales,
    code,
    type: typeByCode(code),
    // Шаги, которые пока не получаются, — в порядке шкал. Отсюда экран берёт
    // категории практик: они прописаны у шкалы, а не у профиля, чтобы совет
    // не расходился с результатом.
    weak: scales.filter(s => s.pole === 'b'),
    strong: scales.filter(s => s.pole === 'a'),
    left: unanswered(list),
  };
}
