/* ================= ОТЧЁТ: БЛОКИ =================
   Каждая функция возвращает готовый HTML одного раздела отчёта. Данные
   приходят из data.js, решение «какие разделы включить» — в document.js.

   БЕЗОПАСНОСТЬ. Всё, что тут выводится, пришло из localStorage: заметки
   дневника, реплики ассистента, названия практик, имя Дара. Хранилище можно
   править руками и в него попадают импортированные файлы — это внешний ввод.
   Поэтому любой текст идёт через escapeHtml, а цвет — через safeColor: в
   прошлый раз чужой CSS подставили именно через названия эмоций. */
import { escapeHtml } from '../util.js';
import { safeColor } from '../organizer.js';

const time = ts => new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const date = ts => new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
const num = v => (v == null ? '—' : String(v));

/* ---- Титульная страница ---- */
export function cover(ctx, planLabel) {
  return `
    <header class="r-cover">
      <div class="r-doll">🪆</div>
      <p class="r-brand">Матрёшка Личности</p>
      <h1 class="r-title">Отчёт ${escapeHtml(ctx.periodLabel)}</h1>
      <p class="r-date">${escapeHtml(ctx.dayLabel)}</p>
      ${ctx.userName ? `<p class="r-who">${escapeHtml(ctx.userName)}</p>` : ''}
      <p class="r-plan">Тариф: ${escapeHtml(planLabel)}</p>
    </header>`;
}

/* ---- Вдохновляющая строка (нужна прежде всего короткому отчёту) ---- */
export function inspiration(ctx) {
  const lines = [];
  if (ctx.streak >= 3) lines.push(`Вы отмечаетесь ${ctx.streak} дней подряд. Это и есть та самая привычка, с которой начинаются перемены.`);
  if (ctx.practices.length) lines.push('Сегодня вы не просто заметили состояние — вы с ним поработали. Это разные вещи, и вторая даётся труднее.');
  if (ctx.mood.count > 1) lines.push('Вы отметились несколько раз за день. Состояние меняется внутри дня, и вы это увидели.');
  lines.push('Каждая отметка — маленький шаг к тому, чтобы понимать себя лучше. Завтра будет ещё одна.');
  return `<section class="r-inspire"><p>${escapeHtml(lines[0])}</p></section>`;
}

/* ---- Настроение: отметки дня и средние по периоду ---- */
export function mood(ctx) {
  if (!ctx.mood.count) {
    return `
      <section class="r-block">
        <h2>Настроение</h2>
        <p class="r-empty">За этот период отметок настроения нет. Отметьте состояние в органайзере — и здесь появится картина дня.</p>
      </section>`;
  }
  const rows = ctx.entries.slice().reverse().map(e => `
    <tr>
      <td class="r-nowrap">${escapeHtml(ctx.period === 'day' ? time(e.date) : date(e.date) + ' ' + time(e.date))}</td>
      <td>${e.names.map(n => `<span class="r-tag" style="border-color:${safeColor(n.color)}">${escapeHtml(n.name)}</span>`).join(' ')}
        ${e.compound ? `<span class="r-tag r-tag--comp">${escapeHtml(e.compound)}</span>` : ''}</td>
      <td class="r-center">${escapeHtml(String(e.intensity))}</td>
      <td class="r-center">${escapeHtml(num(e.sleep))}</td>
      <td class="r-center">${escapeHtml(num(e.energy))}</td>
      <td>${e.note ? escapeHtml(e.note) : '<i class="r-muted">без заметки</i>'}</td>
    </tr>`).join('');
  return `
    <section class="r-block">
      <h2>Настроение</h2>
      <div class="r-figures">
        <div class="r-figure"><b>${escapeHtml(String(ctx.mood.count))}</b><span>отметок</span></div>
        <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgIntensity))}</b><span>сила чувства из 10</span></div>
        <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgSleep))}</b><span>сон из 10</span></div>
        <div class="r-figure"><b>${escapeHtml(num(ctx.mood.avgEnergy))}</b><span>энергия из 10</span></div>
      </div>
      ${ctx.mood.top.length ? `<p class="r-lead">Чаще всего вы отмечали:
        ${ctx.mood.top.map(([n, c]) => `<b>${escapeHtml(n)}</b> (${escapeHtml(String(c))})`).join(', ')}.</p>` : ''}
      <table class="r-table">
        <thead><tr><th>Когда</th><th>Что чувствовали</th><th>Сила (1–10)</th><th>Сон</th><th>Энергия</th><th>Заметка</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

/* ---- Практики: что человек прошёл, с описанием ---- */
export function practices(ctx) {
  if (!ctx.practices.length) {
    return `
      <section class="r-block">
        <h2>Практики</h2>
        <p class="r-empty">За этот период вы не отмечали пройденных практик. Откройте любую практику и нажмите «Я прошёл практику» — она попадёт в отчёт.</p>
      </section>`;
  }
  return `
    <section class="r-block">
      <h2>Практики, которые вы прошли</h2>
      ${ctx.practices.slice().reverse().map(p => `
        <article class="r-practice">
          <h3>${escapeHtml(String(p.icon || '🧘'))} ${escapeHtml(String(p.title || 'Практика'))}</h3>
          <p class="r-practice-meta">${escapeHtml(String(p.cat || ''))} · ${escapeHtml(String(p.time || ''))} · ${escapeHtml(date(p.date))}</p>
          ${p.desc ? `<p>${escapeHtml(String(p.desc))}</p>` : ''}
          ${p.when ? `<p class="r-muted"><b>Когда применять:</b> ${escapeHtml(String(p.when))}</p>` : ''}
        </article>`).join('')}
    </section>`;
}

/* ---- Инсайты: связь сна, энергии и настроения (стандарт и выше) ----
   ВНИМАНИЕ: itemsHtml — уже готовая разметка, она вставляется в <li> как есть
   (нужен <b> внутри фразы). Всё, что кладётся сюда, экранируется В МОМЕНТЕ
   сборки строки. Не добавлять сюда текст пользователя без escapeHtml. */
export function insights(ctx) {
  const itemsHtml = [];
  if (ctx.sleepInsight) itemsHtml.push(`В дни, когда вы спали лучше, тяжёлых эмоций было на <b>${escapeHtml(String(ctx.sleepInsight))}%</b> меньше. Сон для вас — рабочий инструмент, а не мелочь.`);
  if (ctx.mood.avgEnergy != null) itemsHtml.push(`Средний уровень энергии — <b>${escapeHtml(num(ctx.mood.avgEnergy))}</b> из 10.`);
  if (ctx.mood.negShare != null) itemsHtml.push(`Доля тяжёлых состояний за период — <b>${escapeHtml(String(ctx.mood.negShare))}%</b>. Это наблюдение, а не оценка: тяжёлые эмоции нужны так же, как остальные.`);
  if (ctx.activeDays) itemsHtml.push(`Дней с отметками за период — <b>${escapeHtml(String(ctx.activeDays))}</b>. Всего отметок в дневнике — ${escapeHtml(String(ctx.totalEntries))}, открыт слой матрёшки ${escapeHtml(String(ctx.layer))} из 5.`);
  if (!itemsHtml.length) return '';
  return `
    <section class="r-block">
      <h2>Что заметно в ваших данных</h2>
      <ul class="r-insights">${itemsHtml.map(t => `<li>${t}</li>`).join('')}</ul>
    </section>`;
}

/* ---- Дар и Поле. full=true — расширенная расшифровка (премиум) ---- */
export function dar(ctx, full) {
  if (!ctx.dar) {
    return `
      <section class="r-block">
        <h2>Ваш Дар</h2>
        <p class="r-empty">За этот период вы не открывали расшифровку Дара. Рассчитайте его в разделе «Карта личности» — и он появится в отчёте.</p>
      </section>`;
  }
  const d = ctx.dar;
  const aspects = Array.isArray(d.aspects) ? d.aspects : [];
  return `
    <section class="r-block">
      <h2>Ваш Дар и Поле силы</h2>
      <div class="r-dar-head">
        <span class="r-dar-code">${escapeHtml(String(d.code || ''))}</span>
        <div>
          <h3>${escapeHtml(String(d.darName || ''))}</h3>
          <p class="r-muted">${escapeHtml(String(d.darArch || ''))}</p>
        </div>
      </div>
      ${d.fieldName ? `<p class="r-lead">Ведущее Поле: <b>${escapeHtml(String(d.fieldName))}</b>${d.fieldTheme ? ` — ${escapeHtml(String(d.fieldTheme))}` : ''}</p>` : ''}
      ${d.essence ? `<p>${escapeHtml(String(d.essence))}</p>` : ''}
      ${aspects.map(a => `
        <article class="r-aspect">
          <h4>${escapeHtml(String(a.title || ''))}${full && a.role ? ` <i class="r-muted">${escapeHtml(String(a.role))}</i>` : ''}</h4>
          <p>${escapeHtml(String(a.light || ''))}</p>
          <p class="r-muted"><b>${escapeHtml(String(a.shadowTitle || ''))}:</b> ${escapeHtml(String(a.shadow || ''))}</p>
          ${full && a.fieldName ? `<p class="r-muted">Поле: ${escapeHtml(String(a.fieldName))}</p>` : ''}
        </article>`).join('')}
      ${d.resource ? `
        <article class="r-aspect r-aspect--res">
          <h4>Как вернуться к себе</h4>
          <p>${escapeHtml(String(d.resource.signs || ''))}</p>
          <p><b>Что помогает:</b> ${escapeHtml(String(d.resource.steps || ''))}</p>
        </article>` : ''}
      ${full && d.physics ? `<p class="r-muted r-phys">Стихия: ${escapeHtml(String(d.physics.element || '—'))} ·
        Тело: ${escapeHtml(String(d.physics.body || '—'))} ·
        Цвет струны: ${escapeHtml(String(d.physics.string || '—'))}</p>` : ''}
    </section>`;
}

/* ---- Диалоги с ассистентом: короткие выводы, не стенограмма ---- */
export function chats(ctx) {
  if (!ctx.chats.length) return '';
  return `
    <section class="r-block">
      <h2>О чём вы говорили с ассистентом</h2>
      ${ctx.chats.slice().reverse().map(c => {
        const said = (Array.isArray(c.lines) ? c.lines : []).filter(l => l && l.role === 'user').slice(-2);
        return `
        <article class="r-chat">
          <p class="r-chat-head">${escapeHtml(date(c.date))} · ${c.topic ? `тема: <b>${escapeHtml(String(c.topic))}</b>` : 'свободный разговор'}</p>
          ${said.length ? `<ul class="r-chat-said">${said.map(l => `<li>«${escapeHtml(String(l.text))}»</li>`).join('')}</ul>` : ''}
          ${c.practice ? `<p class="r-muted">Ассистент предложил практику «${escapeHtml(String(c.practice))}».</p>` : ''}
        </article>`;
      }).join('')}
    </section>`;
}

/* ---- Динамика по неделям (премиум) ---- */
export function trend(ctx) {
  if (ctx.trend.length < 2) return '';
  return `
    <section class="r-block">
      <h2>Динамика по неделям</h2>
      <table class="r-table">
        <thead><tr><th>Неделя с</th><th>Отметок</th><th>Сила чувства</th><th>Доля тяжёлых состояний</th></tr></thead>
        <tbody>${ctx.trend.map(w => `
          <tr>
            <td class="r-nowrap">${escapeHtml(w.label)}</td>
            <td class="r-center">${escapeHtml(String(w.count))}</td>
            <td class="r-center">${escapeHtml(num(w.avgIntensity))}</td>
            <td class="r-center">${escapeHtml(String(w.negShare))}%</td>
          </tr>`).join('')}</tbody>
      </table>
      <p class="r-muted">Тренд считается по последним 8 неделям — по тем дням, когда вы отмечались.</p>
    </section>`;
}

/* ---- Вся история практик (премиум) ---- */
export function practiceHistory(ctx) {
  if (!ctx.practicesAllTime.length) return '';
  const freq = {};
  ctx.practicesAllTime.forEach(p => { const k = String(p.title || ''); freq[k] = (freq[k] || 0) + 1; });
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return `
    <section class="r-block">
      <h2>Все ваши практики за всё время</h2>
      <p class="r-lead">Отметок о пройденных практиках — <b>${escapeHtml(String(ctx.practicesAllTime.length))}</b>.</p>
      <ul class="r-list">${top.map(([t, c]) =>
        `<li>${escapeHtml(t)} — <b>${escapeHtml(String(c))}</b> раз</li>`).join('')}</ul>
    </section>`;
}

/* ---- Что откроется на следующем тарифе (вместо платных блоков) ---- */
export function locked(list) {
  if (!list.length) return '';
  return `
    <section class="r-block r-locked">
      <h2>Что будет в расширенном отчёте</h2>
      <ul class="r-list">${list.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
      <p class="r-muted">Эти разделы открываются на платных тарифах в приложении.</p>
    </section>`;
}

export function footer(ctx) {
  return `
    <footer class="r-foot">
      <p>Отчёт сформирован ${escapeHtml(new Date(ctx.generatedAt).toLocaleString('ru-RU'))} в приложении «Матрёшка Личности».</p>
      <p>Материалы отчёта — инструмент самопознания и не являются медицинской диагностикой, диагнозом или назначением лечения. Если состояние тяжёлое и не проходит — обратитесь к специалисту. Круглосуточный телефон доверия: 8-800-2000-122.</p>
    </footer>`;
}
