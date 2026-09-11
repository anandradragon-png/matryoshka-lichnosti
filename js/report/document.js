/* ================= ОТЧЁТ: ДОКУМЕНТ И ПЕЧАТЬ =================
   Собирает разделы в отдельный HTML-документ и открывает его в новой вкладке.
   Оттуда человек сохраняет PDF кнопкой «Сохранить в PDF» — это обычная печать
   браузера, на телефоне тоже есть пункт «Сохранить в PDF».

   ПОЧЕМУ ОТДЕЛЬНАЯ ВКЛАДКА, А НЕ БЛОК НА СТРАНИЦЕ. У документа своя таблица
   стилей report.css и ни одного класса приложения — отчёт не ломается от
   правок styles.css и не тянет в печать шапку, меню и баннеры.

   ПОЧЕМУ НЕ DOCX. В браузере без сборщика и без сервера DOCX нормально не
   собрать. PDF даёт тот же результат для человека и не требует библиотек.
   DOCX — задача на этап с бэкендом.

   Какие разделы попадают в отчёт, решает тариф: planAllows() — единственное
   место, где живёт это решение. */
import { escapeHtml } from '../util.js';
import { getPlan, planAllows, PLAN_LABEL } from '../plan.js';
import { collectReport, PERIODS } from './data.js';
import * as S from './sections.js';

/* Что человек увидит, если поднимет тариф. Текст без данных пользователя. */
const LOCKED_TEXT = {
  insights: 'Связь сна, энергии и настроения — что именно влияет на ваше состояние',
  dar: 'Ваш Дар и Поле силы: три грани характера и как возвращаться в ресурс',
  chat: 'Короткие выводы из разговоров с ассистентом',
  period: 'Отчёты за неделю и за месяц, а не только за день',
  trend: 'Динамика по неделям: куда движется ваше состояние',
  history: 'Вся история практик за всё время',
};

function bodyHtml(ctx, plan) {
  const parts = [S.cover(ctx, PLAN_LABEL[plan])];
  // Вдохновляющая строка нужна прежде всего короткому отчёту: на бесплатном
  // тарифе он должен поддерживать, а не выглядеть урезанным.
  if (!planAllows('report.insights', plan)) parts.push(S.inspiration(ctx));
  parts.push(S.mood(ctx), S.practices(ctx));
  if (planAllows('report.insights', plan)) parts.push(S.insights(ctx));
  if (planAllows('report.dar', plan)) parts.push(S.dar(ctx, planAllows('report.darFull', plan)));
  if (planAllows('report.chat', plan)) parts.push(S.chats(ctx));
  if (planAllows('report.trends', plan)) parts.push(S.trend(ctx));
  if (planAllows('report.practiceHistory', plan)) parts.push(S.practiceHistory(ctx));

  const locked = [];
  if (!planAllows('report.insights', plan)) locked.push(LOCKED_TEXT.insights);
  if (!planAllows('report.dar', plan)) locked.push(LOCKED_TEXT.dar);
  if (!planAllows('report.chat', plan)) locked.push(LOCKED_TEXT.chat);
  if (!planAllows('report.period', plan)) locked.push(LOCKED_TEXT.period);
  if (!planAllows('report.trends', plan)) locked.push(LOCKED_TEXT.trend);
  if (!planAllows('report.practiceHistory', plan)) locked.push(LOCKED_TEXT.history);
  parts.push(S.locked(locked), S.footer(ctx));
  return parts.filter(Boolean).join('\n');
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
  // Стили резолвим от адреса приложения: у новой вкладки адрес about:blank,
  // относительная ссылка на report.css из неё может не найтись.
  const cssHref = new URL('report.css', location.href).href;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle(ctx)}</title>
<link rel="stylesheet" href="${cssHref}">
</head>
<body>
<div class="r-bar">
  <button type="button" class="r-bar__btn" onclick="window.print()">⬇ Сохранить в PDF</button>
  <span class="r-bar__hint">Выберите «Сохранить как PDF» — эта полоса не печатается.</span>
</div>
<main class="r-doc">
${bodyHtml(ctx, plan)}
</main>
</body>
</html>`;
}

/* Открыть отчёт в новой вкладке. Вызывать только из обработчика клика —
   иначе браузер сочтёт окно всплывающим и заблокирует. */
export function openReport(period = 'day') {
  if (!PERIODS[period]) return false;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(buildReportHtml(period));
  win.document.close();
  win.focus();
  return true;
}
