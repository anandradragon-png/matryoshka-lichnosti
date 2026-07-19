/* Общие утилиты. ES-модуль: экспортирует escapeHtml для модулей, которые её используют. */
export function escapeHtml(s){return s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
