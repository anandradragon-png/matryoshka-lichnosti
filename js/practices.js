import { trapFocus } from './util.js';
import { EVENT, logEvent, hasToday } from './journal.js';
import { PRACTICES } from './practices-data.js';

/* ================= ПРАКТИКИ =================
   Здесь — показ каталога и модалка. Сами практики лежат в practices-data.js. */
const CATS = ['все', 'дыхание', 'рисование', 'звучание', 'тело', 'медитация', 'письмо', 'мышление'];
const CAT_COLOR = { 'дыхание':'#22D3EE','рисование':'#EC4899','звучание':'#8B5CF6','тело':'#10B981','медитация':'#FBBF24','письмо':'#6366F1','мышление':'#F97316' };

const filtersWrap = document.getElementById('practiceFilters');
const grid = document.getElementById('practicesGrid');
let activeCat = null;   // практики появляются только после клика по разделу

CATS.forEach(c => {
  const b = document.createElement('button');
  b.textContent = c[0].toUpperCase() + c.slice(1);
  b.onclick = () => filterPractices(c);
  b.dataset.cat = c;
  b.setAttribute('aria-pressed', 'false');
  filtersWrap.appendChild(b);
});

export function filterPractices(cat) {
  activeCat = cat;
  document.querySelectorAll('#practiceFilters button').forEach(b => {
    const on = b.dataset.cat === cat;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  renderPractices();
}
function renderPractices() {
  if (!activeCat) {
    grid.innerHTML = `<p class="practices-hint">👆 Выберите раздел выше, чтобы увидеть практики этого направления.</p>`;
    return;
  }
  const list = activeCat === 'все' ? PRACTICES : PRACTICES.filter(p => p.cat === activeCat);
  grid.innerHTML = list.map((p, i) => `
    <article class="card practice-card" style="--c:${CAT_COLOR[p.cat]}" data-idx="${PRACTICES.indexOf(p)}" tabindex="0" role="button">
      <div class="p-icon">${p.icon}</div>
      <h3>${p.title}</h3>
      <p>${p.desc}</p>
      <div class="practice-meta">
        <span class="practice-cat">#${p.cat}</span>
        <span>⏱ ${p.time}</span>
      </div>
      <span class="practice-open">Открыть практику →</span>
    </article>`).join('');
  grid.querySelectorAll('.practice-card').forEach(card => {
    const open = () => openPractice(PRACTICES[+card.dataset.idx]);
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  });
}
renderPractices();

/* --- Модальное окно с пошаговой инструкцией практики --- */
let releaseFocusTrap = null; // функция снятия ловушки фокуса текущей модалки
export function openPractice(p) {
  if (!p) return;
  let modal = document.getElementById('practiceModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'practiceModal';
    modal.className = 'practice-modal';
    modal.innerHTML = '<div class="pm-backdrop"></div><div class="pm-box" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(modal);
    modal.querySelector('.pm-backdrop').addEventListener('click', closePractice);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closePractice(); });
  }
  const box = modal.querySelector('.pm-box');
  box.style.setProperty('--c', CAT_COLOR[p.cat]);
  box.innerHTML = `
    <button class="pm-close" aria-label="Закрыть">✕</button>
    <div class="pm-head">
      <span class="pm-icon">${p.icon}</span>
      <div><h3>${p.title}</h3><span class="pm-cat">#${p.cat} · ⏱ ${p.time}</span></div>
    </div>
    <p class="pm-desc">${p.desc}</p>
    ${p.when ? `<p class="pm-when"><b>Когда применять:</b> ${p.when}</p>` : ''}
    <h4 class="pm-steps-title">Как выполнять</h4>
    <ol class="pm-steps">${p.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    <p class="pm-foot">Прожить эмоцию — значит дать ей завершиться. Будьте к себе бережны. 💜</p>
    <div class="pm-actions">
      <button type="button" class="btn btn-primary pm-done">✓ Я прошёл практику</button>
      <a href="#organizer" class="btn btn-outline pm-diary" data-nav>Записать состояние в дневник</a>
    </div>`;
  box.querySelector('.pm-close').addEventListener('click', closePractice);
  box.querySelector('.pm-diary').addEventListener('click', closePractice);
  bindPracticeDone(box.querySelector('.pm-done'), p);
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  releaseFocusTrap = trapFocus(box); // ловушка фокуса + возврат при закрытии
}
/* Отметка «прошёл практику» → в журнал дня, оттуда практика попадает в отчёт.
   В событие кладём название и описание целиком: отчёт за прошлый месяц должен
   читаться и после того, как каталог практик изменится. */
function bindPracticeDone(btn, p) {
  if (!btn) return;
  const done = () => {
    // Кнопка гаснет — экранный диктор должен услышать, что отметка прошла.
    btn.setAttribute('aria-live', 'polite');
    btn.textContent = '✓ Отмечено в журнале дня';
    btn.disabled = true;
    btn.classList.add('pm-done--on');
  };
  if (hasToday(EVENT.practice, d => d.title === p.title)) { done(); return; }
  btn.onclick = () => {
    logEvent(EVENT.practice, {
      title: p.title, cat: p.cat, icon: p.icon, time: p.time, desc: p.desc, when: p.when || '',
    });
    done();
  };
}

function closePractice() {
  const modal = document.getElementById('practiceModal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
  if (releaseFocusTrap) { releaseFocusTrap(); releaseFocusTrap = null; }
}
export function scrollToPractices(cat) {
  const t = document.getElementById('practices');
  if (t) t.scrollIntoView({ behavior: 'smooth' });
  if (cat) filterPractices(cat);
}
