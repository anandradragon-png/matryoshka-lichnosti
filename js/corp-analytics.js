/* ================= АНАЛИТИКА БЛАГОПОЛУЧИЯ (обезличенно) =================
   Вкладка кабинета компании. Два слоя данных в каждой карточке отдела:
   — Дары подразделения (corp-dars.js) — НАСТОЯЩИЙ расчёт по датам рождения;
   — самочувствие (климат, выгорание, вовлечённость) — пока ПРИМЕР на
     синтетических данных: настоящие появятся, когда сотрудники начнут
     отмечаться в приложении. Пометка «пример» стоит прямо на блоке.
   Самочувствие показывается только при n ≥ threshold (k-анонимность),
   Дары — всегда: даты рождения работодатель знает и так, эмоций в них нет. */
import { escapeHtml } from './util.js';
import { childrenOf, membersOf } from './corp-store.js';
import { renderDarsBlock } from './corp-dars.js';

export function renderAnalytics(c, body) {
  const depts = childrenOf(c, null);
  if (!depts.length) {
    body.innerHTML = '<p class="muted corp-empty">Сначала создайте отделы и подключите сотрудников — появится обезличенная аналитика.</p>';
    return;
  }
  const cards = depts.map(d => {
    const members = membersOf(c, d.id);
    const n = members.length;
    const dars = renderDarsBlock(members);
    if (n < c.threshold) {
      return `<div class="corp-metric locked">
        <div class="corp-metric-head"><b>${escapeHtml(d.name)}</b><span class="corp-badge">${n}/${c.threshold}👥</span></div>
        ${dars}
        <p class="muted">🔒 Мало участников для обезличенной статистики самочувствия. Нужно ≥ ${c.threshold} активных сотрудников, иначе статистика раскрыла бы конкретных людей.</p>
      </div>`;
    }
    const avg = k => members.reduce((s, m) => s + m.wb[k], 0) / n;
    const stress = avg('stress'), energy = avg('energy'), prev = avg('prevStress');
    const climate = Math.round(((energy - 1) / 4 * 0.5 + (5 - stress) / 4 * 0.5) * 100);
    const burnScore = stress * 0.6 + (5 - energy) * 0.4;
    const burnout = burnScore >= 3.2 ? ['высокий', 'high'] : burnScore >= 2.4 ? ['средний', 'mid'] : ['низкий', 'low'];
    const engaged = Math.round(members.filter(m => m.wb.checkins >= 8).length / n * 100);
    const delta = prev > 0 ? Math.round((prev - stress) / prev * 100) : 0;
    const freq = {};
    members.forEach(m => (m.wb.emotions || []).forEach(e => (freq[e] = (freq[e] || 0) + 1)));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return `<div class="corp-metric">
      <div class="corp-metric-head"><b>${escapeHtml(d.name)}</b><span class="corp-badge ok">${n}👥 обезличенно</span></div>
      ${dars}
      <div class="corp-metric-head"><b>Самочувствие</b><span class="corp-badge">пример</span></div>
      <div class="corp-gauges">
        <div class="corp-gauge"><span class="corp-gauge-val">${climate}</span><span class="corp-gauge-lbl">индекс климата /100</span></div>
        <div class="corp-gauge"><span class="corp-gauge-val burn-${burnout[1]}">${burnout[0]}</span><span class="corp-gauge-lbl">риск выгорания</span></div>
        <div class="corp-gauge"><span class="corp-gauge-val">${engaged}%</span><span class="corp-gauge-lbl">вовлечённость</span></div>
        <div class="corp-gauge"><span class="corp-gauge-val ${delta >= 0 ? 'good' : 'bad'}">${delta >= 0 ? '↓' : '↑'} ${Math.abs(delta)}%</span><span class="corp-gauge-lbl">стресс за месяц</span></div>
      </div>
      ${top.length ? `<div class="corp-emos">${top.map(([e, k]) => `<span class="corp-emo-chip">${escapeHtml(e)} · ${k}</span>`).join('')}</div>` : ''}
    </div>`;
  }).join('');
  body.innerHTML = `
    <div class="corp-note">Здесь только обезличенные показатели по отделам. Данные конкретного сотрудника недоступны — так люди не боятся быть честными, а вы видите тенденцию. Блок «Самочувствие» — пример: он оживёт, когда сотрудники начнут отмечаться в приложении.</div>
    <div class="corp-metrics">${cards}</div>`;
}
