/* ================= ЖУРНАЛ ДНЯ =================
   Единая лента того, что человек делал в приложении: смотрел расшифровку
   Дара, прошёл практику, разговаривал с ассистентом, прошёл тест.

   ЗАЧЕМ ОН НУЖЕН. Дневник эмоций (ml_diary) хранит только отметки настроения.
   Всё остальное раньше нигде не сохранялось: Дар пересчитывался на экране,
   практики не отмечались, диалог с ботом жил в памяти страницы и умирал при
   перезагрузке. Без журнала ежедневный отчёт собирать не из чего.

   ПРИНЦИП: событие — исторический снимок, а не ссылка на каталог. В событие
   практики кладём её название и описание целиком, чтобы отчёт за прошлый
   месяц читался даже после того, как каталог практик изменится.

   Эмоции здесь НЕ дублируются: их источник остаётся один — ml_diary. */
import { ML_KEYS } from './core.js';
import { safeParse, dayKey } from './util.js';
import { scopedKey } from './scope.js';

/* Типы событий. Строки хранятся в localStorage, поэтому не переименовывать
   без переноса старых данных. */
export const EVENT = {
  dar: 'dar',           // смотрел персональную расшифровку Дара
  practice: 'practice', // отметил практику как пройденную
  chat: 'chat',         // диалог с ассистентом (одно событие на диалог, дополняется)
  test: 'test',         // результат теста типологии
};
const TYPES = Object.values(EVENT);

/* Лента подрезается: localStorage не резиновый (обычно ~5 МБ на домен), а
   события накапливаются вечно. 400 событий ≈ год активного использования. */
const MAX_EVENTS = 400;

// Ключ зависит от вошедшего пользователя — журнал одного не виден другому.
const key = () => scopedKey(ML_KEYS.journal);
const readRaw = () => safeParse(localStorage.getItem(key()), []);
const write = list => localStorage.setItem(key(), JSON.stringify(list));

/* Запись могла быть испорчена руками или обрывом записи — это граница системы,
   доверять её форме нельзя. Всё, что не похоже на событие, отбрасываем. */
function isValidEvent(e) {
  return !!e && typeof e === 'object'
    && typeof e.type === 'string' && TYPES.includes(e.type)
    && typeof e.date === 'number' && isFinite(e.date)
    && !!e.data && typeof e.data === 'object';
}

export function loadEvents() {
  return readRaw().filter(isValidEvent).sort((a, b) => a.date - b.date);
}

const newId = () =>
  'ev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* Записать событие. Возвращает событие (с id) или null, если тип неизвестен. */
export function logEvent(type, data = {}) {
  if (!TYPES.includes(type)) return null;
  const list = loadEvents();
  const event = { id: newId(), type, date: Date.now(), data };
  list.push(event);
  write(list.slice(-MAX_EVENTS));
  document.dispatchEvent(new CustomEvent('ml:journal', { detail: event }));
  return event;
}

/* Дополнить уже записанное событие — нужно диалогу с ассистентом: он идёт
   волнами, и плодить по событию на каждую реплику бессмысленно.
   Дата создания не меняется (день события фиксирован), пишем updated. */
export function updateEvent(id, data = {}) {
  const list = loadEvents();
  const event = list.find(e => e.id === id);
  if (!event) return null;
  event.data = { ...event.data, ...data };
  event.updated = Date.now();
  write(list.slice(-MAX_EVENTS));
  return event;
}

/* ---- Чтение ---- */

export function eventsOfDay(ts = Date.now()) {
  const key = dayKey(ts);
  return loadEvents().filter(e => dayKey(e.date) === key);
}

export function eventsInPeriod(from, to = Date.now()) {
  return loadEvents().filter(e => e.date >= from && e.date <= to);
}

/* Было ли сегодня такое же событие. Нужно, чтобы повторный просмотр того же
   Дара или повторная отметка той же практики не плодили одинаковые записи. */
export function hasToday(type, match) {
  return eventsOfDay().some(e => e.type === type && match(e.data));
}
