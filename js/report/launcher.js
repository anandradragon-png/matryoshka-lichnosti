/* ================= ОТЧЁТ: КНОПКА И ВЫБОР ПЕРИОДА =================
   Кнопка живёт в органайзере, рядом с экспортом дневника. Перед сборкой
   спрашиваем период: за сегодня доступно всем и каждый день, неделя и месяц —
   на платных тарифах.

   Разделы отчёта одинаковые на всех тарифах, поэтому здесь честно называем
   единственную настоящую разницу — глубину разбора и объём в страницах. */
import { trapFocus } from '../util.js';
import { getPlan, PLAN_LABEL, planAllows } from '../plan.js';
import { depthFor, DEPTH_LABEL, DEPTH_PAGES, deeperThan } from './depth.js';
import { PERIODS } from './data.js';
import { printReport } from './print.js';

const PERIOD_TITLE = { day: 'За сегодня', week: 'За неделю', month: 'За месяц' };
const PERIOD_NOTE = {
  day: 'День целиком: настроение, практики, разговоры',
  week: 'Семь дней и связи между сном, энергией и состоянием',
  month: 'Месяц и общие тенденции',
};

let modal = null;
let releaseTrap = null;

function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'rep-modal';
  modal.innerHTML = '<div class="rep-backdrop"></div><div class="rep-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(modal);
  modal.querySelector('.rep-backdrop').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('open')) close();
  });
  return modal;
}

function close() {
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  if (releaseTrap) { releaseTrap(); releaseTrap = null; }
}

function open() {
  ensureModal();
  const plan = getPlan();
  const depth = depthFor(plan);
  const next = deeperThan(depth);
  const allowed = p => (p === 'day' ? planAllows('report.day', plan) : planAllows('report.period', plan));
  const box = modal.querySelector('.rep-box');
  box.innerHTML = `
    <button class="rep-close" aria-label="Закрыть">×</button>
    <h3 class="rep-title">Отчёт в PDF</h3>
    <p class="rep-sub">В отчёте будет всё: настроение, что заметно в ваших данных, практики, ваш Дар, разговоры с ассистентом и что делать дальше.</p>
    <p class="rep-depth">Тариф «${PLAN_LABEL[plan]}» — ${DEPTH_LABEL[depth]}, примерно ${DEPTH_PAGES[depth]}.${next
      ? ` На следующем тарифе те же разделы разобраны подробнее: ${next.pages}.`
      : ''}</p>
    <div class="rep-periods">
      ${Object.keys(PERIODS).map(p => `
        <button type="button" class="rep-period${allowed(p) ? '' : ' locked'}" data-period="${p}" ${allowed(p) ? '' : 'disabled'}>
          <b>${PERIOD_TITLE[p]}</b>
          <span>${PERIOD_NOTE[p]}</span>
          ${allowed(p) ? '' : '<i class="rep-lock">на платном тарифе</i>'}
        </button>`).join('')}
    </div>
    <p class="rep-err" id="repErr" hidden></p>
    <p class="rep-hint">Откроется окно печати — выберите «Сохранить в PDF».</p>
    ${plan === 'premium' ? '' : '<a href="#pricing" class="rep-up" data-nav>Посмотреть тарифы →</a>'}`;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  releaseTrap = trapFocus(box);

  box.querySelector('.rep-close').onclick = close;
  const up = box.querySelector('.rep-up');
  if (up) up.onclick = close;
  box.querySelectorAll('[data-period]').forEach(b => {
    b.onclick = async () => {
      // Сборка занимает мгновение, но кнопка обязана отозваться сразу:
      // молчащая кнопка — то же самое, что сломанная.
      const label = b.innerHTML;
      b.disabled = true;
      b.innerHTML = '<b>Готовлю отчёт…</b>';
      const ok = await printReport(b.dataset.period);
      b.disabled = false;
      b.innerHTML = label;
      if (ok) { close(); return; }
      const err = box.querySelector('#repErr');
      err.textContent = 'Не получилось собрать отчёт. Обновите страницу и попробуйте ещё раз.';
      err.hidden = false;
    };
  });
}

const btn = document.getElementById('reportBtn');
if (btn) btn.addEventListener('click', open);
