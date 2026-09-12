/* ================= ТЕСТ «КАК ВЫ ОБРАЩАЕТЕСЬ С ЧУВСТВАМИ» (экран) =================
   Состояние, обработчики и запись результата. Вопросы — в emotest-data.js,
   профили — в emotest-types.js, подсчёт — в emotest-score.js, разметка —
   в emotest-view.js.

   ПОРЯДОК ВОПРОСОВ ПЕРЕМЕШАН ПО ШКАЛАМ. В файле данных утверждения лежат
   группами — так их удобно править. Подряд человеку их показывать нельзя:
   десять вопросов об одном и том же он начинает отвечать одинаково, не читая.
   Поэтому на экран они идут по кругу — по одному от каждой шкалы.

   ОТВЕТЫ СОХРАНЯЮТСЯ НА КАЖДОМ КЛИКЕ. Сорок вопросов — это долго; закрыл
   вкладку или обновил страницу — вернулся туда же, а не начал заново. */
import { ML_KEYS } from './core.js';
import { safeParse } from './util.js';
import { scopedKey } from './scope.js';
import { SCALES, QUESTIONS, ANSWERS } from './emotest-data.js';
import { scoreTest, emptyAnswers, unanswered } from './emotest-score.js';
import { introHtml, runHtml, resultHtml, stepText } from './emotest-view.js';
import { EVENT, logEvent } from './journal.js';
import { scrollToPractices } from './practices.js';

const box = document.getElementById('emotestBox');
const opener = document.getElementById('emotestStart');

const PER_PAGE = 10;
const TOTAL = QUESTIONS.length;

/* Порядок показа: по одному утверждению от каждой шкалы, кругами. */
const ORDER = (() => {
  const lists = SCALES.map(s => QUESTIONS.reduce((acc, q, i) => {
    if (q.s === s.id) acc.push(i);
    return acc;
  }, []));
  const rounds = Math.max(...lists.map(l => l.length));
  const out = [];
  for (let r = 0; r < rounds; r++) lists.forEach(l => { if (r < l.length) out.push(l[r]); });
  return out;
})();
const PAGES = Math.ceil(ORDER.length / PER_PAGE);

/* ---------- Состояние и хранение ---------- */
const key = () => scopedKey(ML_KEYS.emotest);
let answers = emptyAnswers();
let page = -1; // -1 вступление, 0…PAGES-1 вопросы, PAGES результат
let doneFlag = false;

/* Флаг «пройден» из хранилища сам по себе ничего не доказывает: ключ правится
   руками, и `{"done":true}` без ответов рисовало человеку самый тяжёлый из
   шестнадцати профилей — «Закрытая дверь» — хотя тест он не проходил.
   Поэтому пройденным считается только полный набор ответов. */
function load() {
  const saved = safeParse(localStorage.getItem(key()), null);
  const list = saved && Array.isArray(saved.answers) ? saved.answers : [];
  answers = emptyAnswers().map((_, i) => (Number.isInteger(list[i]) ? list[i] : null));
  return Boolean(saved) && saved.done === true && unanswered(answers) === 0;
}

function save(done) {
  localStorage.setItem(key(), JSON.stringify({ answers, done, date: Date.now() }));
}

const pageSlice = () => ORDER.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
const filledCount = () => TOTAL - unanswered(answers);
const pageReady = () => pageSlice().every(i => Number.isInteger(answers[i]));

/* ---------- Отрисовка ---------- */
function render() {
  // Результат по неполным ответам не показываем даже по прямому требованию:
  // профиль по половине теста — выдумка, а человек прочтёт его про себя.
  if (page >= PAGES && unanswered(answers) > 0) page = -1;
  if (page < 0) { box.innerHTML = introHtml(doneFlag, PAGES, TOTAL); return; }
  if (page >= PAGES) { box.innerHTML = resultHtml(scoreTest(answers)); return; }
  box.innerHTML = runHtml({
    page, pages: PAGES, slice: pageSlice(), numFrom: page * PER_PAGE + 1,
    answers, filled: filledCount(), total: TOTAL, ready: pageReady(),
  });
}

/* Ответ меняет ровно то, что изменилось: нажатую группу кнопок, полосу,
   счётчик и кнопку «Дальше». Перерисовывать весь шаг нельзя — старые кнопки
   при этом выбрасываются из документа вместе с фокусом, и человек, идущий
   по тесту с клавиатуры, после каждого ответа оказывается в начале страницы. */
function patchPick(qi) {
  box.querySelectorAll(`[data-et="pick"][data-qi="${qi}"]`).forEach(b => {
    const on = Number(b.dataset.v) === answers[qi];
    b.classList.toggle('is-on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const ready = pageReady();
  const bar = box.querySelector('.et-bar i');
  if (bar) bar.style.width = `${Math.round((100 * filledCount()) / TOTAL)}%`;
  const step = box.querySelector('.et-step');
  if (step) step.textContent = stepText(page, PAGES, filledCount(), TOTAL);
  const next = box.querySelector('[data-et="next"]');
  if (next) next.disabled = !ready;
  const hint = box.querySelector('.et-hint');
  if (hint) hint.hidden = ready;
}

/* ---------- Завершение ---------- */
/* Результат в журнал дня — отсюда его берёт отчёт. Снимок самодостаточный:
   код и название профиля лежат внутри события, поэтому старый результат
   читается и после правки описаний. */
function finish() {
  // В журнал дня попадают данные о психологическом состоянии человека.
  // Неполный набор ответов туда писать нельзя: запись останется навсегда
  // и уедет на сервер, когда его включат.
  if (unanswered(answers) > 0) { render(); return; }
  const r = scoreTest(answers);
  doneFlag = true;
  save(true);
  logEvent(EVENT.test, {
    test: 'Как вы обращаетесь с чувствами',
    code: r.code,
    name: r.type ? r.type.name : '',
    scales: r.scales.map(s => ({ title: s.title, percent: s.percent, pole: s.pole })),
  });
  page = PAGES;
  render();
}

/* ---------- Обработчики ---------- */
function onClick(e) {
  const el = e.target.closest('[data-et]');
  if (!el || !box.contains(el)) return;
  const act = el.dataset.et;
  if (act === 'pick') {
    // Номер утверждения и номер ответа приехали из атрибутов документа.
    // Рисовал их этот же код, но документ правится руками в отладчике, и
    // `data-qi="999"` записало бы в хранилище ответ на несуществующий вопрос.
    // Подсчёт такой мусор потом отбросит, но лежать он будет в личных данных.
    const qi = Number(el.dataset.qi);
    const v = Number(el.dataset.v);
    if (!Number.isInteger(qi) || qi < 0 || qi >= TOTAL) return;
    if (!ANSWERS.some(a => a.value === v)) return;
    answers[qi] = v;
    save(false);
    patchPick(qi);
    return;
  }
  // «Начать» и «Пройти заново» — одно действие: чистый лист.
  if (act === 'go' || act === 'restart') {
    answers = emptyAnswers();
    doneFlag = false;
    save(false);
    page = 0;
    render();
    return;
  }
  if (act === 'result') { page = PAGES; render(); return; }
  if (act === 'prev') { page = Math.max(0, page - 1); render(); box.scrollIntoView({ block: 'start' }); return; }
  if (act === 'next') {
    if (page === PAGES - 1) { finish(); } else { page += 1; render(); }
    box.scrollIntoView({ block: 'start' });
    return;
  }
  if (act === 'practices') scrollToPractices(el.dataset.cat);
}

function init() {
  doneFlag = load();
  render();
  box.addEventListener('click', onClick);
  opener.addEventListener('click', () => {
    box.hidden = false;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // Сменился человек — ответы другого показывать нельзя.
  document.addEventListener('ml:session', () => {
    doneFlag = load();
    page = -1;
    render();
  });
}

// Запуск в самом низу: init() трогает ORDER, PAGES и состояние, а они
// объявлены выше через const/let — до этой строки их ещё нет.
if (box && opener) init();
