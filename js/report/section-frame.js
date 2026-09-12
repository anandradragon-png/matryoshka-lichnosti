/* ================= ОТЧЁТ: РАМКА ДОКУМЕНТА =================
   Титульная страница, поддерживающая строка, приглашение к более глубокому
   разбору и подвал с предупреждением. Всё, что обрамляет содержание.

   БЕЗОПАСНОСТЬ. Имя человека и подписи приходят из localStorage — это
   внешний ввод, хранилище правится руками. Любой текст — через escapeHtml. */
import { escapeHtml } from '../util.js';
import { DEPTH_PAGES, DEPTH_LABEL, deeperThan } from './depth.js';
import { plural } from './formatters.js';

export function cover(ctx, planLabel, depth) {
  return `
    <header class="r-cover">
      <div class="r-doll">🪆</div>
      <p class="r-brand">Матрёшка Личности</p>
      <h1 class="r-title">Отчёт ${escapeHtml(ctx.periodLabel)}</h1>
      <p class="r-date">${escapeHtml(ctx.dayLabel)}</p>
      ${ctx.userName ? `<p class="r-who">${escapeHtml(ctx.userName)}</p>` : ''}
      <p class="r-plan">Тариф «${escapeHtml(planLabel)}» — ${escapeHtml(DEPTH_LABEL[depth])},
        ${escapeHtml(DEPTH_PAGES[depth])}</p>
      <p class="r-cover-sum">${escapeHtml(coverLine(ctx))}</p>
    </header>`;
}

/* Одна строка на титуле: что вообще есть в этом отчёте. Человек должен
   понимать объём до того, как начнёт читать. */
function coverLine(ctx) {
  const bits = [];
  if (ctx.mood.count) bits.push(plural(ctx.mood.count, 'отметка', 'отметки', 'отметок') + ' настроения');
  if (ctx.practices.length) bits.push(plural(ctx.practices.length, 'практика', 'практики', 'практик'));
  if (ctx.chats.length) bits.push(plural(ctx.chats.length, 'разговор', 'разговора', 'разговоров') + ' с ассистентом');
  if (ctx.dar) bits.push('расшифровка Дара');
  if (!bits.length) return 'За этот период записей нет — отчёт подскажет, с чего начать.';
  return bits.join(', ') + '.';
}

/* Поддерживающая строка. Нужна прежде всего краткому отчёту: он должен
   поддерживать, а не выглядеть недоданным. */
export function inspiration(ctx) {
  const lines = [];
  if (ctx.streak >= 3) lines.push(`Вы отмечаетесь ${ctx.streak} дней подряд. Это и есть та самая привычка, с которой начинаются перемены.`);
  if (ctx.practices.length) lines.push('Вы не просто заметили состояние — вы с ним поработали. Это разные вещи, и вторая даётся труднее.');
  if (ctx.mood.count > 1) lines.push('Вы отметились несколько раз. Состояние меняется внутри дня, и вы это увидели.');
  lines.push('Каждая отметка — маленький шаг к тому, чтобы понимать себя лучше. Завтра будет ещё одна.');
  return `<section class="r-inspire"><p>${escapeHtml(lines[0])}</p></section>`;
}

/* Приглашение к более глубокому разбору. Раньше здесь был список «чего вам
   не отдали» — это обижало. Теперь честная формулировка: разделы те же,
   разобраны подробнее. */
export function deeper(depth) {
  const next = deeperThan(depth);
  if (!next) return '';
  return `
    <section class="r-block r-deeper">
      <h2>Этот же отчёт можно разобрать глубже</h2>
      <p class="r-lead">Разделы не изменятся — изменится подробность. Сейчас у вас
        ${escapeHtml(DEPTH_LABEL[depth])} на ${escapeHtml(DEPTH_PAGES[depth])};
        следующий уровень — ${escapeHtml(next.label)} на ${escapeHtml(next.pages)}.</p>
      <ul class="r-list">
        <li>Настроение: не только средние цифры, но каждая отметка, каждый день и то, какие чувства приходят к вам вместе.</li>
        <li>Дар и Поле силы: все три грани характера, тени, физика поля и то, как возвращаться в ресурс.</li>
        <li>Практики: не только названия, но описания и полные шаги — отчёт становится рабочей тетрадью.</li>
        <li>Что делать дальше: подбор практик под ваши чувства с готовыми шагами.</li>
      </ul>
      <p class="r-muted">Уровень меняется вместе с тарифом в личном кабинете.</p>
    </section>`;
}

export function footer(ctx) {
  return `
    <footer class="r-foot">
      <p>Отчёт сформирован ${escapeHtml(new Date(ctx.generatedAt).toLocaleString('ru-RU'))} в приложении «Матрёшка Личности».</p>
      <p>Материалы отчёта — инструмент самопознания и не являются медицинской диагностикой, диагнозом или назначением лечения. Если состояние тяжёлое и не проходит — обратитесь к специалисту. Круглосуточный телефон доверия: 8-800-2000-122.</p>
    </footer>`;
}
