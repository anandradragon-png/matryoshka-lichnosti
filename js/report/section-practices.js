/* ================= ОТЧЁТ: ПРАКТИКИ =================
   Что человек прошёл за период. Глубина решает подробность:
     1 — названия и сколько раз;
     2 — плюс описание и «когда применять»;
     3 — плюс полные шаги каждой практики и история за всё время.

   Полные шаги на глубоком разборе — это не «больше текста ради страниц».
   Отчёт с шагами становится рабочей тетрадью: его печатают и делают по нему,
   не открывая приложение.

   БЕЗОПАСНОСТЬ. Практика в отчёт приходит снимком из журнала (localStorage),
   а не из каталога, — значит это внешний ввод. Всё через escapeHtml. */
import { escapeHtml } from '../util.js';
import { NORMAL, FULL } from './depth.js';
import { date, plural } from './formatters.js';

function empty() {
  return `
    <section class="r-block">
      <h2>Практики</h2>
      <p class="r-empty">За этот период вы не отмечали пройденных практик. Откройте любую практику и нажмите «Я прошёл практику» — она попадёт в отчёт.</p>
    </section>`;
}

/* Краткий разбор: сколько и что. Без описаний — иначе одна практика съест
   треть двухстраничного отчёта. Список обрезан пятёркой по той же причине:
   активный месяц даёт двадцать практик, и краткий отчёт перестал бы быть
   кратким. */
const BRIEF_LIST = 5;

function brief(list) {
  const freq = {};
  list.forEach(p => { const k = String(p.title || 'Практика'); freq[k] = (freq[k] || 0) + 1; });
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const rest = sorted.length - BRIEF_LIST;
  return `
    <p class="r-lead">Пройдено: <b>${escapeHtml(plural(list.length, 'практика', 'практики', 'практик'))}</b>.</p>
    <ul class="r-list">${sorted.slice(0, BRIEF_LIST).map(([t, c]) =>
      `<li>${escapeHtml(t)}${c > 1 ? ` — ${escapeHtml(plural(c, 'раз', 'раза', 'раз'))}` : ''}</li>`).join('')}</ul>
    ${rest > 0 ? `<p class="r-muted">И ещё ${escapeHtml(plural(rest, 'практика', 'практики', 'практик'))} — они видны в подробном разборе.</p>` : ''}`;
}

function card(p, depth) {
  const steps = Array.isArray(p.steps) ? p.steps : [];
  return `
    <article class="r-practice">
      <h3>${escapeHtml(String(p.icon || '🧘'))} ${escapeHtml(String(p.title || 'Практика'))}</h3>
      <p class="r-practice-meta">${escapeHtml(String(p.cat || ''))} · ${escapeHtml(String(p.time || ''))} · ${escapeHtml(date(p.date))}</p>
      ${p.desc ? `<p>${escapeHtml(String(p.desc))}</p>` : ''}
      ${p.when ? `<p class="r-muted"><b>Когда применять:</b> ${escapeHtml(String(p.when))}</p>` : ''}
      ${depth >= FULL && steps.length ? `
        <ol class="r-steps">${steps.map(s => `<li>${escapeHtml(String(s))}</li>`).join('')}</ol>` : ''}
    </article>`;
}

/* История за всё время (полный разбор): что человек делает регулярно,
   а что попробовал однажды. Берётся вне периода намеренно. */
function history(ctx) {
  if (ctx.practicesAllTime.length <= ctx.practices.length) return '';
  const freq = {};
  ctx.practicesAllTime.forEach(p => { const k = String(p.title || ''); freq[k] = (freq[k] || 0) + 1; });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return `
    <h3>Все ваши практики за всё время</h3>
    <p class="r-lead">Отметок о пройденных практиках — <b>${escapeHtml(String(ctx.practicesAllTime.length))}</b>.</p>
    <ul class="r-list">${top.map(([t, c]) =>
      `<li>${escapeHtml(t)} — <b>${escapeHtml(plural(c, 'раз', 'раза', 'раз'))}</b></li>`).join('')}</ul>`;
}

export function practices(ctx, depth) {
  if (!ctx.practices.length) return empty();
  const list = ctx.practices.slice().reverse();
  return `
    <section class="r-block">
      <h2>Практики, которые вы прошли</h2>
      ${depth >= NORMAL
        ? list.map(p => card(p, depth)).join('')
        : brief(list)}
      ${depth >= FULL ? history(ctx) : ''}
    </section>`;
}
