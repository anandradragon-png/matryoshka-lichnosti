/* ================= ОТЧЁТ: РАЗГОВОРЫ С АССИСТЕНТОМ =================
   Раздел есть на всех тарифах. Глубина решает подробность:
     1 — сколько разговоров и о чём;
     2 — плюс темы и предложенные практики по каждому;
     3 — плюс собственные реплики человека.

   ЗАЧЕМ СВОИ РЕПЛИКИ, А НЕ СТЕНОГРАММА. Ответы ассистента человек уже читал,
   а свои слова, увиденные через месяц, — это и есть ценность: видно, что
   тогда беспокоило. Ответы бота в отчёт не переносим.

   БЕЗОПАСНОСТЬ. Реплики — текст, который человек напечатал сам, то есть
   внешний ввод в чистом виде. Только через escapeHtml. */
import { escapeHtml } from '../util.js';
import { NORMAL, FULL } from './depth.js';
import { date, plural } from './formatters.js';

const said = c => (Array.isArray(c.lines) ? c.lines : []).filter(l => l && l.role === 'user');

function empty() {
  return `
    <section class="r-block">
      <h2>Разговоры с ассистентом</h2>
      <p class="r-empty">За этот период разговоров не было. Ассистент — не замена специалисту, но помогает разложить состояние по полкам, когда трудно назвать его словами.</p>
    </section>`;
}

/* Краткий разбор: одна строка на весь раздел. */
function brief(list) {
  const topics = [...new Set(list.map(c => String(c.topic || '')).filter(Boolean))];
  return `
    <p class="r-lead">Разговоров за период — <b>${escapeHtml(plural(list.length, 'разговор', 'разговора', 'разговоров'))}</b>.</p>
    ${topics.length
      ? `<p>Темы: ${topics.map(t => escapeHtml(t)).join(', ')}.</p>`
      : '<p class="r-muted">Разговоры шли свободно, без заданной темы.</p>'}`;
}

function card(c, depth) {
  const lines = said(c).slice(-(depth >= FULL ? 6 : 2));
  return `
    <article class="r-chat">
      <p class="r-chat-head">${escapeHtml(date(c.date))} · ${c.topic
        ? `тема: <b>${escapeHtml(String(c.topic))}</b>`
        : 'свободный разговор'}</p>
      ${depth >= FULL && lines.length
        ? `<ul class="r-chat-said">${lines.map(l => `<li>«${escapeHtml(String(l.text))}»</li>`).join('')}</ul>`
        : ''}
      ${c.practice ? `<p class="r-muted">Ассистент предложил практику «${escapeHtml(String(c.practice))}».</p>` : ''}
    </article>`;
}

export function chats(ctx, depth) {
  if (!ctx.chats.length) return empty();
  const list = ctx.chats.slice().reverse();
  return `
    <section class="r-block">
      <h2>О чём вы говорили с ассистентом</h2>
      ${depth >= NORMAL ? list.map(c => card(c, depth)).join('') : brief(list)}
      ${depth >= FULL ? '<p class="r-muted">Здесь только ваши слова: ответы ассистента вы уже читали, а свои реплики через месяц читаются иначе.</p>' : ''}
    </section>`;
}
