/* ================= ДИАЛОГ → ЖУРНАЛ ДНЯ =================
   Превращает разговор с ассистентом в короткую запись для отчёта: тема,
   рекомендованная практика и последние реплики. Не вся переписка — в отчёт
   идёт вывод, а не стенограмма.

   ПОЧЕМУ ВЫВОД СОБИРАЕТСЯ ЗДЕСЬ, А НЕ МОДЕЛЬЮ. Попросить YandexGPT написать
   резюме — это платный запрос после каждого диалога. Тема разговора и так
   известна: её определяет сценарий бота (flow.feel), а реплики есть в памяти.

   Один диалог = одно событие журнала, которое дополняется по ходу разговора,
   иначе на каждую реплику появлялась бы отдельная запись. */
import { EVENT, logEvent, updateEvent } from './journal.js';

const LINES_KEPT = 6;   // сколько последних реплик держим
const LINE_MAX = 300;   // обрезка реплики: localStorage не резиновый

let eventId = null;
let userSpoke = false;
let topic = '';
let practice = '';
const lines = [];

/* Реплики бота содержат <b> и <br> — в журнал кладём чистый текст. */
const plainText = s =>
  String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LINE_MAX);

/* Тема диалога и практика, которую бот порекомендовал. */
export function setChatTopic(newTopic, recommended = '') {
  topic = String(newTopic || '');
  practice = String(recommended || '');
}

export function logChatLine(role, text) {
  const t = plainText(text);
  if (!t) return;
  if (role === 'user') userSpoke = true;
  // Приветствие бота при загрузке страницы — ещё не диалог. Иначе в отчёте
  // появилась бы строка «говорили с ассистентом» у человека, который молчал.
  else if (!userSpoke) return;
  lines.push({ role, text: t });
  if (lines.length > LINES_KEPT) lines.shift();
  const data = { topic, practice, lines: lines.slice() };
  // Событие могло быть вытеснено из ленты её обрезкой — тогда пишем новое.
  if (eventId && updateEvent(eventId, data)) return;
  const ev = logEvent(EVENT.chat, data);
  eventId = ev ? ev.id : null;
}
