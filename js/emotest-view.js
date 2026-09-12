/* ================= ТЕСТ «КАК ВЫ ОБРАЩАЕТЕСЬ С ЧУВСТВАМИ» (вёрстка) =================
   Только HTML. Состояние, обработчики и запись результата — в emotest.js,
   подсчёт — в emotest-score.js. Разделение то же, что в отчёте: модуль,
   который собирает разметку, не должен знать, на каком человек шаге.

   Все функции здесь чистые: что передали — то и нарисовали. Из-за этого их
   видно в отладчике целиком и можно проверить, не открывая браузер. */
import { escapeHtml } from './util.js';
import { QUESTIONS, ANSWERS, DEFAULT_REC } from './emotest-data.js';

const txt = v => escapeHtml(String(v == null ? '' : v));

export const stepText = (page, pages, filled, total) =>
  `Шаг ${page + 1} из ${pages} · отвечено ${filled} из ${total}`;

export function introHtml(done, pages, total) {
  return `
    <div class="et-intro">
      <p class="et-lead">Сорок утверждений о том, как вы обходитесь со своими чувствами: замечаете ли их, слышите ли телом, разрешаете ли себе и доходят ли они до конца.</p>
      <p class="et-note">Это не тест «кто вы» — кем вы родились, говорит ваш Дар, и это не меняется. Здесь другое: как вы обращаетесь с чувствами сейчас. Навык, а не характер: пройдите заново через месяц и увидите, что сдвинулось.</p>
      <ul class="et-facts">
        <li>${total} утверждений, ${pages} шага, около семи минут</li>
        <li>Правильных ответов нет, отвечайте первым движением</li>
        <li>Ответы остаются в вашем браузере</li>
      </ul>
      <button class="btn btn-primary" data-et="go">${done ? 'Пройти заново' : 'Начать тест'}</button>
      ${done ? '<button class="btn btn-outline" data-et="result">Показать прошлый результат</button>' : ''}
    </div>`;
}

function questionHtml(qi, num, picked) {
  return `
    <fieldset class="et-q">
      <legend><span class="et-num">${num}</span> ${txt(QUESTIONS[qi].t)}</legend>
      <div class="et-opts">
        ${ANSWERS.map(a => `
          <button type="button" class="et-opt${picked === a.value ? ' is-on' : ''}"
                  data-et="pick" data-qi="${qi}" data-v="${a.value}"
                  aria-pressed="${picked === a.value ? 'true' : 'false'}">${txt(a.label)}</button>`).join('')}
      </div>
    </fieldset>`;
}

/* Экран прохождения. `slice` — номера утверждений этого шага, `numFrom` —
   с какого числа их нумеровать: человек должен видеть «11-е из 40», а не
   снова «1-е», иначе непонятно, сколько пройдено. */
export function runHtml({ page, pages, slice, numFrom, answers, filled, total, ready }) {
  return `
    <div class="et-run">
      <div class="et-bar"><i style="width:${Math.round((100 * filled) / total)}%"></i></div>
      <p class="et-step">${stepText(page, pages, filled, total)}</p>
      ${slice.map((qi, n) => questionHtml(qi, numFrom + n, answers[qi])).join('')}
      <div class="et-nav">
        ${page > 0 ? '<button class="btn btn-outline" data-et="prev">Назад</button>' : ''}
        <button class="btn btn-primary" data-et="next"${ready ? '' : ' disabled'}>${page === pages - 1 ? 'Посмотреть результат' : 'Дальше'}</button>
      </div>
      <p class="et-hint"${ready ? ' hidden' : ''}>Ответьте на все утверждения этого шага, чтобы идти дальше.</p>
    </div>`;
}

/* Шаг, который пока не получается, помечен и словом, а не только янтарной
   полосой: цвет без подписи читается двояко — то ли предупреждение, то ли
   просто другой акцент, — а по цвету вообще ориентируется не каждый. */
function scaleHtml(s) {
  return `
    <div class="et-scale${s.pole === 'b' ? ' is-weak' : ''}">
      <div class="et-scale-head">
        <b>${txt(s.title)}${s.pole === 'b' ? '<span class="et-weak-label">пока сложнее</span>' : ''}</b>
        <span>${s.percent}%</span>
      </div>
      <div class="et-bar"><i style="width:${s.percent}%"></i></div>
      <p>${txt(s.short)}${s.near ? ' — но тут у вас почти пополам, шаг то получается, то нет' : ''}</p>
    </div>`;
}

/* Ровно середина по всем шкалам — след бездумного «согласен со всем»:
   обратные утверждения погасили прямые, и результат обнулился. Молча выдать
   такому человеку самый благополучный профиль нельзя, поэтому говорим прямо. */
function flatWarning(r) {
  if (r.scales.filter(s => s.near).length < r.scales.length) return '';
  return `
    <p class="et-warn">По всем четырём шкалам у вас вышло ровно посередине. Так получается, когда отвечают быстро и подряд соглашаются: половина утверждений здесь написана от обратного, и они погасили друг друга. Профиль ниже показан, но опираться на него не стоит — пройдите тест ещё раз, не торопясь.</p>`;
}

/* Профиля может не быть (`r.type === null`), если шкалы правили, а описания
   нет. Тогда человек видит свои шкалы без текста — это честнее, чем чужое
   описание, и заметнее, чем тихое молчание. */
/* Код профиля стоит не первым, а последним. Четыре заглавные буквы до
   названия человек читает как техническую ошибку; после названия и шкал они
   становятся понятной пометкой, по которой он найдёт свой профиль снова. */
export function resultHtml(r) {
  const t = r.type;
  // Категория практик берётся у первой шкалы, которая не получается. Всё
  // получается — поддерживаем, а не исправляем.
  const cat = r.weak.length ? r.weak[0].rec : DEFAULT_REC;
  return `
    <div class="et-result">
      ${flatWarning(r)}
      ${t ? `<h3>${txt(t.name)}</h3><p class="et-lead">${txt(t.lead)}</p>` : ''}
      <div class="et-scales">${r.scales.map(scaleHtml).join('')}</div>
      ${t ? `
        <p>${txt(t.inside)}</p>
        <p><b>На что опереться.</b> ${txt(t.strength)}</p>
        <p><b>Что пока даётся трудно.</b> ${txt(t.growth)}</p>
        <p class="et-first"><b>С чего начать.</b> ${txt(t.step)}</p>` : ''}
      <p class="et-code">Ваш код: ${txt(r.code)}</p>
      <div class="et-nav">
        <button class="btn btn-primary" data-et="practices" data-cat="${txt(cat)}">Практики: ${txt(cat)}</button>
        <button class="btn btn-outline" data-et="restart">Пройти заново</button>
      </div>
      <p class="et-note">Это снимок на сегодня, а не приговор и не диагноз. Тест не заменяет разговора со специалистом: если тяжело долго и всерьёз, дойдите до психолога или врача.</p>
    </div>`;
}
