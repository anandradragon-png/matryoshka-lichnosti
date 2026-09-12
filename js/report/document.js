/* ================= ОТЧЁТ: ДОКУМЕНТ =================
   Собирает разделы в отдельный HTML-документ. Кто его показывает и печатает —
   дело print.js; здесь только текст документа.

   ПОЧЕМУ ОТДЕЛЬНЫЙ ДОКУМЕНТ, А НЕ БЛОК НА СТРАНИЦЕ. У него своя таблица
   стилей report.css и ни одного класса приложения — отчёт не ломается от
   правок styles.css и не тянет в печать шапку, меню и баннеры.

   ПОЧЕМУ НЕ DOCX. В браузере без сборщика и без сервера DOCX нормально не
   собрать. PDF даёт тот же результат для человека и не требует библиотек.
   DOCX — задача на этап с бэкендом.

   РАЗДЕЛЫ ОДИНАКОВЫЕ ДЛЯ ВСЕХ ТАРИФОВ. Тариф решает только глубину разбора
   (depth.js). Порядок разделов ниже — это порядок чтения: что было → что в
   этом заметно → что вы с этим делали → кто вы → о чём говорили → что дальше.
   Ни один раздел не пропускается: пустой раздел объясняет, чем его наполнить,
   и это полезнее его отсутствия. */
import { escapeHtml } from '../util.js';
import { getPlan, PLAN_LABEL } from '../plan.js';
import { depthFor } from './depth.js';
import { collectReport } from './data.js';
import { cover, inspiration, deeper, footer } from './section-frame.js';
import { mood } from './section-mood.js';
import { insights } from './section-insights.js';
import { practices } from './section-practices.js';
import { dar } from './section-dar.js';
import { chats } from './section-chats.js';
import { advice } from './section-advice.js';

function bodyHtml(ctx, plan, depth) {
  return [
    cover(ctx, PLAN_LABEL[plan], depth),
    inspiration(ctx),
    mood(ctx, depth),
    insights(ctx, depth),
    practices(ctx, depth),
    dar(ctx, depth),
    chats(ctx, depth),
    advice(ctx, depth),
    deeper(depth),
    footer(ctx),
  ].filter(Boolean).join('\n');
}

/* Имя вкладки = имя файла, которое браузер предложит при сохранении в PDF. */
function docTitle(ctx) {
  const d = new Date(ctx.generatedAt);
  const stamp = d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return escapeHtml('Матрёшка — отчёт ' + ctx.periodLabel + ' — ' + stamp);
}

export function buildReportHtml(period = 'day', plan = getPlan()) {
  const ctx = collectReport(period);
  const depth = depthFor(plan);
  // Стили резолвим от адреса приложения: у новой вкладки адрес about:blank,
  // относительная ссылка на report.css из неё может не найтись.
  const cssHref = new URL('report.css', location.href).href;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle(ctx)}</title>
<link rel="stylesheet" href="${escapeHtml(cssHref)}">
</head>
<body>
<div class="r-bar">
  <button type="button" class="r-bar__btn" onclick="window.print()">⬇ Сохранить в PDF</button>
  <span class="r-bar__hint">Выберите «Сохранить как PDF» — эта полоса не печатается.</span>
</div>
<main class="r-doc">
${bodyHtml(ctx, plan, depth)}
</main>
</body>
</html>`;
}
