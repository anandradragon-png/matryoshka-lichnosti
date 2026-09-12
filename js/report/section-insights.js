/* ================= ОТЧЁТ: ЧТО ЗАМЕТНО В ДАННЫХ =================
   Наблюдения, а не оценки. Глубина решает, сколько их:
     1 — одно, самое сильное;
     2 — четыре;
     3 — плюс таблица динамики по неделям.

   ВНИМАНИЕ. Наблюдения — это готовая разметка (внутри фразы нужен <b>),
   она вставляется в <li> как есть. Всё, что кладётся в список, экранируется
   В МОМЕНТЕ сборки строки. Не добавлять сюда текст человека без escapeHtml. */
import { escapeHtml } from '../util.js';
import { NORMAL, FULL } from './depth.js';
import { num } from './formatters.js';

/* Наблюдения в порядке силы: первое — самое содержательное из того, что
   вообще удалось заметить. Краткий отчёт берёт только его. */
function lines(ctx) {
  const out = [];
  if (ctx.sleepInsight) out.push(`В дни, когда вы спали лучше, тяжёлых эмоций было на <b>${escapeHtml(String(ctx.sleepInsight))}%</b> меньше. Сон для вас — рабочий инструмент, а не мелочь.`);
  if (ctx.mood.negShare != null) out.push(`Доля тяжёлых состояний за период — <b>${escapeHtml(String(ctx.mood.negShare))}%</b>. Это наблюдение, а не оценка: тяжёлые эмоции нужны так же, как остальные.`);
  if (ctx.mood.avgEnergy != null) out.push(`Средний уровень энергии — <b>${escapeHtml(num(ctx.mood.avgEnergy))}</b> из 10.`);
  if (ctx.activeDays) out.push(`Дней с отметками за период — <b>${escapeHtml(String(ctx.activeDays))}</b>. Всего отметок в дневнике — ${escapeHtml(String(ctx.totalEntries))}, открыт слой матрёшки ${escapeHtml(String(ctx.layer))} из 5.`);
  return out;
}

/* Динамика по неделям (полный разбор). Меньше двух недель данных — тренда
   нет, и рисовать таблицу из одной строки нечестно. */
function trend(ctx) {
  if (ctx.trend.length < 2) return '';
  return `
    <h3>Динамика по неделям</h3>
    <table class="r-table">
      <thead><tr><th>Неделя с</th><th>Отметок</th><th>Сила чувства</th><th>Доля тяжёлых состояний</th></tr></thead>
      <tbody>${ctx.trend.map(w => `
        <tr>
          <td class="r-nowrap">${escapeHtml(w.label)}</td>
          <td class="r-center">${escapeHtml(String(w.count))}</td>
          <td class="r-center">${escapeHtml(num(w.avgIntensity))}</td>
          <td class="r-center">${escapeHtml(String(w.negShare))}%</td>
        </tr>`).join('')}</tbody>
    </table>
    <p class="r-muted">Тренд считается по последним 8 неделям — по тем дням, когда вы отмечались.</p>`;
}

export function insights(ctx, depth) {
  const all = lines(ctx);
  if (!all.length) {
    return `
      <section class="r-block">
        <h2>Что заметно в ваших данных</h2>
        <p class="r-empty">Пока отметок мало, чтобы что-то заметить. Наблюдения появятся, когда в дневнике наберётся несколько дней — особенно если отмечать сон и энергию.</p>
      </section>`;
  }
  const shown = depth >= NORMAL ? all : all.slice(0, 1);
  return `
    <section class="r-block">
      <h2>Что заметно в ваших данных</h2>
      <ul class="r-insights">${shown.map(t => `<li>${t}</li>`).join('')}</ul>
      ${depth >= FULL ? trend(ctx) : ''}
    </section>`;
}
