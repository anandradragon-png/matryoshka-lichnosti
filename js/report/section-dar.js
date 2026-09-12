/* ================= ОТЧЁТ: ДАР И ПОЛЕ СИЛЫ =================
   Раздел есть на всех тарифах. Глубина решает подробность:
     1 — код, имя Дара, одна фраза сути;
     2 — плюс три грани характера (свет и тень) и «как вернуться к себе»;
     3 — плюс физика поля целиком, слои, тени поля и среды, которые
         человеку противопоказаны.

   Данные глубокого уровня приходят в ctx.darMore — их собирает data.js из
   своей базы Даров. Нет базы — блока просто не будет, остальное на месте.

   БЕЗОПАСНОСТЬ. Дар лежит в журнале снимком (localStorage), значит это
   внешний ввод. Всё через escapeHtml. */
import { escapeHtml } from '../util.js';
import { NORMAL, FULL } from './depth.js';

const txt = v => escapeHtml(String(v || ''));

function empty() {
  return `
    <section class="r-block">
      <h2>Ваш Дар</h2>
      <p class="r-empty">За этот период вы не открывали расшифровку Дара. Рассчитайте его в разделе «Карта личности» — и он появится в отчёте.</p>
    </section>`;
}

function head(d) {
  return `
    <div class="r-dar-head">
      <span class="r-dar-code">${txt(d.code)}</span>
      <div>
        <h3>${txt(d.darName)}</h3>
        <p class="r-muted">${txt(d.darArch)}</p>
      </div>
    </div>
    ${d.fieldName ? `<p class="r-lead">Ведущее Поле: <b>${txt(d.fieldName)}</b>${d.fieldTheme ? ` — ${txt(d.fieldTheme)}` : ''}</p>` : ''}
    ${d.essence ? `<p>${txt(d.essence)}</p>` : ''}`;
}

/* Три грани характера. На полном разборе у каждой видно, из какого поля она
   растёт, — иначе непонятно, почему грани разные. */
function aspects(d, depth) {
  const list = Array.isArray(d.aspects) ? d.aspects : [];
  return list.map(a => `
    <article class="r-aspect">
      <h4>${txt(a.title)}${depth >= FULL && a.role ? ` <i class="r-muted">${txt(a.role)}</i>` : ''}</h4>
      <p>${txt(a.light)}</p>
      <p class="r-muted"><b>${txt(a.shadowTitle)}:</b> ${txt(a.shadow)}</p>
      ${depth >= FULL && a.fieldName ? `<p class="r-muted">Растёт из поля ${txt(a.fieldName)}.</p>` : ''}
    </article>`).join('');
}

function resource(d) {
  if (!d.resource) return '';
  return `
    <article class="r-aspect r-aspect--res">
      <h4>Как вернуться к себе</h4>
      <p>${txt(d.resource.signs)}</p>
      <p><b>Что помогает:</b> ${txt(d.resource.steps)}</p>
    </article>`;
}

/* Физика поля (полный разбор): как поле ощущается телом. Это своя система
   «Даров», а не медицина, — поэтому формулировки про ощущения, не про органы. */
function physics(more) {
  const p = more && more.physics;
  if (!p) return '';
  return `
    <h3>Физика вашего поля</h3>
    <ul class="r-list">
      <li><b>Стихия:</b> ${txt(p.element)}</li>
      <li><b>Где отзывается в теле:</b> ${txt(p.body)}</li>
      <li><b>Цвет струны:</b> ${txt(p.string)}</li>
      ${p.drawing ? `<li><b>Рисунок поля:</b> ${txt(p.drawing)}</li>` : ''}
      ${p.flow ? `<li><b>Как течёт энергия:</b> ${txt(p.flow)}</li>` : ''}
    </ul>
    ${p.layers ? `
      <p class="r-lead">Три слоя поля:</p>
      <ul class="r-list">
        <li><b>Потенциал:</b> ${txt(p.layers.ma)}</li>
        <li><b>Проявление:</b> ${txt(p.layers.zhi)}</li>
        <li><b>Результат:</b> ${txt(p.layers.kun)}</li>
      </ul>` : ''}`;
}

/* Тени поля и противопоказанные среды (полный разбор). Это самая полезная
   часть разбора: не «кто вы», а «где вам будет плохо, даже если работа
   хорошая». Формулировка мягкая намеренно: это про потенциал, не приговор. */
function shadows(more) {
  if (!more) return '';
  const s = more.shadow;
  const risks = more.risks || [];
  if (!s && !risks.length) return '';
  return `
    ${s ? `
      <h3>Куда вас уводит, когда силы кончаются</h3>
      <ul class="r-list">
        <li><b>Когда замираете:</b> ${txt(s.passive)}</li>
        <li><b>Когда перегибаете:</b> ${txt(s.active)}</li>
        <li><b>Когда связь с собой теряется:</b> ${txt(s.broken)}</li>
      </ul>` : ''}
    ${risks.length ? `
      <h3>Среды, в которых вам будет трудно</h3>
      <ul class="r-list">${risks.map(r => `<li>${txt(r)}</li>`).join('')}</ul>
      <p class="r-muted">Это не запрет, а предупреждение: в такой среде ваши сильные стороны работают против вас, и уставать вы будете быстрее.</p>` : ''}`;
}

export function dar(ctx, depth) {
  if (!ctx.dar) return empty();
  const d = ctx.dar;
  return `
    <section class="r-block">
      <h2>Ваш Дар и Поле силы</h2>
      ${head(d)}
      ${depth >= NORMAL ? aspects(d, depth) + resource(d) : ''}
      ${depth >= FULL ? physics(ctx.darMore) + shadows(ctx.darMore) : ''}
    </section>`;
}
