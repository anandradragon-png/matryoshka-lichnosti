/* ================= ОТЧЁТ: НАСТРОЕНИЕ =================
   Раздел есть на всех тарифах. Глубина решает, сколько внутри:
     1 — четыре цифры и самые частые чувства;
     2 — плюс таблица всех отметок;
     3 — плюс разбор по дням, все заметки и то, какие чувства приходят вместе.

   БЕЗОПАСНОСТЬ. Заметки дневника и названия эмоций — это внешний ввод:
   хранилище правится руками и в него попадают импортированные файлы. Текст
   идёт через escapeHtml, цвет — через safeColor. Чужой CSS в этом проекте
   уже подставляли именно через названия эмоций. */
import { escapeHtml } from '../util.js';
import { safeColor } from '../organizer.js';
import { NORMAL, FULL } from './depth.js';
import { time, date, dayFull, num, plural } from './formatters.js';

function empty() {
  return `
    <section class="r-block">
      <h2>Настроение</h2>
      <p class="r-empty">За этот период отметок настроения нет. Отметьте состояние в органайзере — и здесь появится картина дня.</p>
    </section>`;
}

function figures(ctx) {
  return `
    <div class="r-figures">
      <div class="r-figure"><b>${escapeHtml(String(ctx.mood.count))}</b><span>отметок</span></div>
      <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgIntensity))}</b><span>сила чувства из 10</span></div>
      <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgSleep))}</b><span>сон из 10</span></div>
      <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgEnergy))}</b><span>энергия из 10</span></div>
    </div>`;
}

const tag = n => `<span class="r-tag" style="border-color:${safeColor(n.color)}">${escapeHtml(n.name)}</span>`;

/* Таблица всех отметок (подробный разбор и выше). */
function table(ctx) {
  const when = e => (ctx.period === 'day' ? time(e.date) : date(e.date) + ' ' + time(e.date));
  const rows = ctx.entries.slice().reverse().map(e => `
    <tr>
      <td class="r-nowrap">${escapeHtml(when(e))}</td>
      <td>${e.names.map(tag).join(' ')}
        ${e.compound ? `<span class="r-tag r-tag--comp">${escapeHtml(e.compound)}</span>` : ''}</td>
      <td class="r-center">${escapeHtml(String(e.intensity))}</td>
      <td class="r-center">${escapeHtml(num(e.sleep))}</td>
      <td class="r-center">${escapeHtml(num(e.energy))}</td>
      <td>${e.note ? escapeHtml(e.note) : '<i class="r-muted">без заметки</i>'}</td>
    </tr>`).join('');
  return `
    <table class="r-table">
      <thead><tr><th>Когда</th><th>Что чувствовали</th><th>Сила (1–10)</th><th>Сон</th><th>Энергия</th><th>Заметка</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

/* День за днём (полный разбор). Месяц в одной средней цифре — это месяц,
   которого человек не увидит. Здесь виден каждый день. */
function days(ctx) {
  if (ctx.byDay.length < 2) return '';
  return `
    <h3>День за днём</h3>
    <table class="r-table">
      <thead><tr><th>День</th><th>Отметок</th><th>Сила</th><th>Сон</th><th>Энергия</th><th>Чаще всего</th></tr></thead>
      <tbody>${ctx.byDay.map(d => `
        <tr>
          <td class="r-nowrap">${escapeHtml(dayFull(d.date))}</td>
          <td class="r-center">${escapeHtml(String(d.count))}</td>
          <td class="r-center">${escapeHtml(num(d.avgIntensity))}</td>
          <td class="r-center">${escapeHtml(num(d.avgSleep))}</td>
          <td class="r-center">${escapeHtml(num(d.avgEnergy))}</td>
          <td>${d.top.map(n => escapeHtml(n)).join(', ') || '—'}</td>
        </tr>`).join('')}</tbody>
    </table>`;
}

/* Чувства, которые приходят вместе (полный разбор). Самое содержательное,
   что можно сказать по отметкам: не «вы часто тревожитесь», а «тревога
   приходит к вам вместе с усталостью». */
function pairs(ctx) {
  if (!ctx.pairs.length) return '';
  return `
    <h3>Что вы чувствуете одновременно</h3>
    <ul class="r-list">${ctx.pairs.map(p =>
      `<li>${escapeHtml(p.names)} — ${escapeHtml(plural(p.count, 'раз', 'раза', 'раз'))}</li>`).join('')}</ul>
    <p class="r-muted">Пары, встреченные один раз, здесь не показаны: один случай — ещё не закономерность.</p>`;
}

/* Все заметки подряд (полный разбор): дневник своими словами читается иначе,
   чем те же заметки, размазанные по клеткам таблицы. */
function notes(ctx) {
  const all = ctx.byDay.flatMap(d => d.notes);
  if (!all.length) return '';
  return `
    <h3>Ваши заметки</h3>
    <div class="r-notes">${all.map(n => `
      <blockquote class="r-note">
        <p>${escapeHtml(n.note)}</p>
        <cite>${escapeHtml(dayFull(n.date))}, ${escapeHtml(time(n.date))}</cite>
      </blockquote>`).join('')}</div>`;
}

export function mood(ctx, depth) {
  if (!ctx.mood.count) return empty();
  const top = ctx.mood.top.length
    ? `<p class="r-lead">Чаще всего вы отмечали:
        ${ctx.mood.top.map(([n, c]) => `<b>${escapeHtml(n)}</b> (${escapeHtml(String(c))})`).join(', ')}.</p>`
    : '';
  return `
    <section class="r-block">
      <h2>Настроение</h2>
      ${figures(ctx)}
      ${top}
      ${depth >= NORMAL ? table(ctx) : ''}
      ${depth >= FULL ? days(ctx) + pairs(ctx) + notes(ctx) : ''}
    </section>`;
}
