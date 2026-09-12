/* ================= ОТЧЁТ: ЧТО ДЕЛАТЬ ДАЛЬШЕ =================
   Новый раздел. Отчёт заканчивался цифрами — а человеку нужно понимать, что
   с этим делать. Советы подобраны под его самые частые чувства за период:
   у каждой эмоции в гиде есть поддерживающий текст и категория практик,
   которая с ней работает.

   Глубина решает подробность:
     1 — один совет и название практики;
     2 — три совета с описанием практик;
     3 — плюс полные шаги, чтобы делать прямо по распечатке.

   Советы приходят готовыми в ctx.advice — их собирает data.js. Здесь только
   вёрстка: подбирать практики в модуле вёрстки значит спрятать логику там,
   где её никто не найдёт.

   ВАЖНО: это самопомощь, а не назначение. Формулировки — приглашение
   попробовать, без «вам необходимо». */
import { escapeHtml } from '../util.js';
import { NORMAL, FULL } from './depth.js';

const txt = v => escapeHtml(String(v || ''));

function empty() {
  return `
    <section class="r-block">
      <h2>Что делать дальше</h2>
      <p class="r-empty">Отметьте в дневнике, что чувствуете, — и в следующем отчёте здесь появятся практики, подобранные под ваше состояние.</p>
    </section>`;
}

function practice(p, depth) {
  // Шаги проверяем так же, как в section-practices.js: практика без шагов
  // печатается без списка, а не роняет весь отчёт.
  const steps = Array.isArray(p.steps) ? p.steps : [];
  return `
    <div class="r-advice-practice">
      <h4>${txt(p.icon)} ${txt(p.title)}${p.time ? ` <i class="r-muted">${txt(p.time)}</i>` : ''}</h4>
      ${depth >= NORMAL && p.desc ? `<p>${txt(p.desc)}</p>` : ''}
      ${depth >= NORMAL && p.when ? `<p class="r-muted"><b>Когда:</b> ${txt(p.when)}</p>` : ''}
      ${depth >= FULL && steps.length
        ? `<ol class="r-steps">${steps.map(s => `<li>${txt(s)}</li>`).join('')}</ol>`
        : ''}
    </div>`;
}

function block(a, depth) {
  const list = depth >= NORMAL ? a.practices : a.practices.slice(0, 1);
  return `
    <article class="r-advice">
      <h3>${txt(a.emoji)} ${txt(a.emotion)}</h3>
      <p>${txt(a.text)}</p>
      ${a.repeat && depth >= NORMAL
        ? '<p class="r-muted">Эти практики вы уже проходили — тем и хороши: тело помнит, повтор даётся легче первого раза.</p>'
        : ''}
      ${list.map(p => practice(p, depth)).join('')}
    </article>`;
}

export function advice(ctx, depth) {
  if (!ctx.advice.length) return empty();
  const list = depth >= NORMAL ? ctx.advice : ctx.advice.slice(0, 1);
  return `
    <section class="r-block">
      <h2>Что делать дальше</h2>
      <p class="r-lead">Практики подобраны под то, что вы чаще всего отмечали за этот период. Это приглашение попробовать, а не назначение: берите то, что откликается.</p>
      ${list.map(a => block(a, depth)).join('')}
      ${depth >= FULL
        ? '<p class="r-muted">Шаги приведены полностью — распечатанный отчёт можно использовать как рабочую тетрадь, не открывая приложение.</p>'
        : ''}
    </section>`;
}
