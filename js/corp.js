/* ================= КОРПОРАТИВНЫЙ КАБИНЕТ (HR / компания) =================
   Точка входа и композиция. Один аккаунт = и личное использование, и роль HR.
   Переключатель «Я для себя ↔ Я представляю компанию» открывает панель
   компании: дерево отделов, приглашения по ссылке, массовая загрузка и
   ОБЕЗЛИЧЕННАЯ аналитика (Дары — настоящие, самочувствие — пример).

   Части кабинета: corp-store.js (данные и дерево), corp-modal.js (окно),
   corp-demo.js (посев демо-компании), corp-structure.js (вкладка структуры),
   corp-analytics.js (вкладка аналитики), corp-dars.js (расчёт Даров),
   corp-join.js (присоединение по ссылке). Принцип приватности — в corp-store.js. */
import { escapeHtml } from './util.js';
import { render, closeCorp, bindClose } from './corp-modal.js';
import { loadCompanies, saveCompanies, sessionLogin, companyOwnedBy, rid, THRESHOLD } from './corp-store.js';
import { seedDemoCompany } from './corp-demo.js';
import { renderStructure } from './corp-structure.js';
import { renderAnalytics } from './corp-analytics.js';
import { handleJoin } from './corp-join.js';

seedDemoCompany();

/* ---------- Вход в корпоративный режим (переключатель роли) ---------- */
function openCorp() {
  const login = sessionLogin();
  if (!login) {
    render(`
      <button class="corp-close" aria-label="Закрыть">×</button>
      <h3 class="corp-title">Кабинет компании</h3>
      <p class="corp-sub">Чтобы вести компанию, сначала войдите в личный кабинет.</p>
      <button class="btn btn-outline corp-back" data-close>Понятно</button>`);
    bindClose();
    return;
  }
  const company = companyOwnedBy(login);
  if (company) return showPanel(company.id);
  // Ещё не HR — предлагаем переключить роль и создать компанию.
  const modal = render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <h3 class="corp-title">Как вы используете Матрёшку?</h3>
    <p class="corp-sub">Переключите роль. Это можно изменить в любой момент.</p>
    <div class="corp-roles">
      <button class="corp-role" data-close>
        <span class="corp-role-emo">🧘</span><b>Я для себя</b>
        <span class="muted">Личный кабинет: дневник, практики, ассистент</span>
      </button>
      <button class="corp-role primary" id="beHr">
        <span class="corp-role-emo">🏢</span><b>Я представляю компанию (HR)</b>
        <span class="muted">Подключить сотрудников и видеть обезличенную аналитику</span>
      </button>
    </div>`);
  bindClose();
  modal.querySelector('#beHr').onclick = () => {
    const name = prompt('Название вашей компании:', '');
    if (!name || !name.trim()) return;
    const companies = loadCompanies();
    const fresh = {
      id: rid('c_'), name: name.trim(), ownerLogin: login, threshold: THRESHOLD,
      units: [], roster: [],
    };
    companies.push(fresh);
    saveCompanies(companies);
    showPanel(fresh.id);
  };
}

/* ---------- Панель компании (вкладки) ---------- */
let activeTab = 'structure';
function showPanel(companyId, tab) {
  if (tab) activeTab = tab;
  const c = loadCompanies().find(x => x.id === companyId);
  if (!c) { closeCorp(); return; }
  const modal = render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <div class="corp-head">
      <div class="corp-logo">🏢</div>
      <div>
        <h3 class="corp-title">${escapeHtml(c.name)}</h3>
        <p class="corp-sub">Кабинет компании · вы вошли как HR</p>
      </div>
      <button class="corp-switch" id="toSelf" title="Вернуться к личному использованию">🧘 Я для себя</button>
    </div>
    <div class="corp-tabs">
      <button class="corp-tab ${activeTab === 'structure' ? 'on' : ''}" data-tab="structure">Структура и сотрудники</button>
      <button class="corp-tab ${activeTab === 'analytics' ? 'on' : ''}" data-tab="analytics">Аналитика благополучия</button>
    </div>
    <div class="corp-body" id="corpBody"></div>`);
  bindClose();
  modal.querySelector('#toSelf').onclick = closeCorp;
  modal.querySelectorAll('.corp-tab').forEach(b => b.onclick = () => showPanel(companyId, b.dataset.tab));
  const body = modal.querySelector('#corpBody');
  if (activeTab === 'structure') renderStructure(c, body, showPanel);
  else renderAnalytics(c, body);
}

/* Открытие из личного кабинета (событие от account.js) и из шапки. */
document.addEventListener('ml:corp-open', openCorp);
document.addEventListener('click', e => {
  const t = e.target.closest('[data-corp-open]');
  if (t) { e.preventDefault(); openCorp(); }
});
window.addEventListener('hashchange', handleJoin);
handleJoin(); // если зашли сразу по ссылке-приглашению
