/* ================= ДАРЫ В КАБИНЕТЕ КОМПАНИИ =================
   Считает Дары сотрудников по датам рождения — тем же расчётом, что и карта
   личности (window.YupDar из dars-data.js), — и собирает по подразделению
   реальную картину: какие Поля представлены и чего команде не хватает.
   Это единственные НАСТОЯЩИЕ данные HR-аналитики: дата рождения известна
   работодателю и так, эмоций и записей сотрудников здесь нет.
   Используется из corp.js. */
import { escapeHtml } from './util.js';

/* «ДД.ММ.ГГГГ» (допускаем и «/») → {d, m, y} либо null. */
export function parseBirth(str) {
  const m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec((str || '').trim());
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = +m[3];
  if (d < 1 || d > 31 || mo < 1 || mo > 12 || y < 1900 || y > 2100) return null;
  return { d, m: mo, y };
}

/* Карта Дара сотрудника или null (нет даты / нет window.YupDar). */
export function darCard(emp) {
  if (!window.YupDar) return null;
  const b = parseBirth(emp && emp.birth);
  if (!b) return null;
  return window.YupDar.getPersonalityCard(b.d, b.m, b.y);
}

/* Короткая подпись для списка сотрудников: «Хранитель Очага · 4-7-2». */
export function darLabel(emp) {
  const c = darCard(emp);
  return c ? `${c.darArch} · ${c.code}` : '';
}

/* Блок «Дары подразделения» для карточки аналитики.
   Показывает распределение по девяти Полям (ведущее поле — КУН, результат)
   и подсказку: какое поле в команде опора, каких нет совсем. */
export function renderDarsBlock(members) {
  if (!window.YupDar) return '';
  const { FIELDS } = window.YupDar;
  const counts = {};
  let dated = 0;
  members.forEach(m => {
    const c = darCard(m);
    if (!c) return;
    dated++;
    counts[c.kun] = (counts[c.kun] || 0) + 1;
  });
  const noDate = members.length - dated;
  if (!dated) {
    return `<div class="corp-dars">
      <div class="corp-metric-head"><b>Дары подразделения</b></div>
      <p class="muted">Чтобы увидеть Дары команды, укажите сотрудникам даты рождения —
      при добавлении или массовой загрузкой (пятая колонка «дата рождения»).</p>
    </div>`;
  }
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const chips = rows.map(([k, n]) => {
    const f = FIELDS[k];
    return `<span class="corp-emo-chip">${f.icon} ${escapeHtml(f.name)} · ${n}</span>`;
  }).join('');
  const top = FIELDS[rows[0][0]];
  const missing = Object.keys(FIELDS).filter(k => !counts[k]);
  const missingNote = missing.length && missing.length <= 4
    ? ` Не представлены: ${missing.map(k => escapeHtml(FIELDS[k].name)).join(', ').toLowerCase()}.`
    : '';
  return `<div class="corp-dars">
    <div class="corp-metric-head"><b>Дары подразделения</b><span class="corp-badge ok">по датам рождения</span></div>
    <div class="corp-emos">${chips}</div>
    <p class="muted">Опора команды — поле «${escapeHtml(top.name)}» (${escapeHtml(top.theme)}).${missingNote}${
      noDate ? ` Без даты рождения: ${noDate} чел.` : ''}</p>
  </div>`;
}
