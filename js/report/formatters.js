/* ================= ОТЧЁТ: ФОРМАТ ДАТ И ЧИСЕЛ =================
   Мелочи, которыми пользуются все разделы отчёта: время, дата, прочерк
   вместо пустого числа.

   ПОЧЕМУ НЕ В util.js. util.js — общий модуль приложения, он про отчёт
   ничего не знает и знать не должен. Формат даты в отчёте (его печатают на
   бумаге и читают глазами) и формат даты в органайзере — разные вещи, и им
   нужно расходиться свободно, не ломая друг друга. */

/* 14:05 */
export const time = ts =>
  new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

/* 12 сент. */
export const date = ts =>
  new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });

/* понедельник, 12 сентября */
export const dayFull = ts =>
  new Date(ts).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });

/* Прочерк вместо пустоты: в таблице пустая клетка читается как ошибка,
   а прочерк — как «человек это не отмечал». */
export const num = v => (v == null ? '—' : String(v));

/* «7 отметок» / «1 отметка» / «3 отметки» — без этого в тексте появляется
   «1 отметок» или уродливое «1 раз(а)». */
export function plural(n, one, few, many) {
  const last = n % 10;
  const tens = n % 100;
  if (tens >= 11 && tens <= 14) return n + ' ' + many;
  if (last === 1) return n + ' ' + one;
  if (last >= 2 && last <= 4) return n + ' ' + few;
  return n + ' ' + many;
}
