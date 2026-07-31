/* ================= КОРПОРАТИВНЫЙ КАБИНЕТ (HR / компания) =================
   Прототип. Один аккаунт = и личное использование, и роль HR. Переключатель
   «Я для себя ↔ Я представляю компанию» открывает панель компании: дерево
   отделов, приглашения сотрудников по ссылке, массовая загрузка и ОБЕЗЛИЧЕННАЯ
   аналитика благополучия.

   ГЛАВНЫЙ ПРИНЦИП ПРИВАТНОСТИ (152-ФЗ + обещание бренда об анонимности):
   HR НИКОГДА не видит эмоции конкретного человека. Он видит только сводку по
   подразделению и только если в нём не меньше THRESHOLD активных участников
   (k-анонимность) — иначе «средняя по 1-2 людям» = разоблачение. Индивидуальные
   данные остаются между сотрудником и оператором. Здесь, в панели HR, экрана с
   эмоциями конкретного сотрудника нет в принципе.

   Данные пока в localStorage (форма 1:1 ляжет в будущий PostgreSQL). */
import { ML_KEYS } from './core.js';
import { escapeHtml } from './util.js';

const THRESHOLD = 5; // порог анонимности: минимум участников в узле, чтобы показать статистику

/* ---------- Хранилище ---------- */
const loadCompanies = () => JSON.parse(localStorage.getItem(ML_KEYS.companies) || '[]');
const saveCompanies = c => localStorage.setItem(ML_KEYS.companies, JSON.stringify(c));
const sessionLogin = () => localStorage.getItem(ML_KEYS.session) || '';
const rid = p => p + Math.random().toString(36).slice(2, 9);

/* ---------- Демо-компания (посев один раз) ----------
   Чтобы кабинет был сразу «живым» и кликабельным: дерево отделов + сотрудники
   с синтетическими данными самочувствия, по которым считается аналитика.
   Владелец — гостевой аккаунт demo: войдя как demo, сразу видно наполненный HR-кабинет. */
(function seedDemoCompany() {
  const companies = loadCompanies();
  if (companies.some(c => c.demo)) return;
  const NAMES = ['Анна', 'Игорь', 'Мария', 'Пётр', 'Ольга', 'Дмитрий', 'Елена', 'Сергей',
    'Наталья', 'Алексей', 'Ирина', 'Владимир', 'Юлия', 'Роман', 'Ксения'];
  let ni = 0;
  const emp = (unitId, position) => {
    const stress = 2 + Math.floor(Math.random() * 4);          // 2..5 (выше — хуже)
    const energy = 2 + Math.floor(Math.random() * 4);          // 2..5 (выше — лучше)
    const prevStress = Math.min(5, stress + Math.floor(Math.random() * 2)); // раньше было чуть выше
    const emoPool = ['спокойствие', 'радость', 'тревога', 'усталость', 'вдохновение', 'раздражение', 'грусть'];
    const emotions = [emoPool[Math.floor(Math.random() * emoPool.length)]];
    if (Math.random() > 0.5) emotions.push(emoPool[Math.floor(Math.random() * emoPool.length)]);
    return {
      id: rid('e_'), name: NAMES[ni++ % NAMES.length], email: '', unitId, position,
      joined: true, wb: { stress, energy, prevStress, checkins: 5 + Math.floor(Math.random() * 24), emotions },
    };
  };
  const d1 = rid('u_'), d2 = rid('u_'), d3 = rid('u_'), s1 = rid('u_'), s2 = rid('u_');
  const company = {
    id: rid('c_'), demo: true, name: 'ООО «Ромашка»', ownerLogin: 'demo', threshold: THRESHOLD,
    units: [
      { id: d1, parentId: null, name: 'Отдел продаж' },
      { id: s1, parentId: d1, name: 'Группа B2B' },
      { id: s2, parentId: d1, name: 'Группа розницы' },
      { id: d2, parentId: null, name: 'Разработка' },
      { id: d3, parentId: null, name: 'Поддержка' },
    ],
    roster: [],
  };
  const push = (unit, count, pos) => { for (let i = 0; i < count; i++) company.roster.push(emp(unit, pos)); };
  push(s1, 4, 'Менеджер по продажам');
  push(s2, 4, 'Менеджер по продажам');
  push(d2, 6, 'Разработчик');
  push(d3, 2, 'Специалист поддержки'); // < THRESHOLD → аналитика по отделу будет скрыта (демонстрация анонимности)
  companies.push(company);
  saveCompanies(companies);
})();

/* ---------- Помощники по дереву ---------- */
const childrenOf = (c, parentId) => c.units.filter(u => u.parentId === parentId);
const unitById = (c, id) => c.units.find(u => u.id === id);
function descendantsIncluding(c, unitId) {
  const acc = [unitId];
  const walk = pid => childrenOf(c, pid).forEach(u => { acc.push(u.id); walk(u.id); });
  walk(unitId);
  return acc;
}
const membersOf = (c, unitId) => {
  const ids = new Set(descendantsIncluding(c, unitId));
  return c.roster.filter(r => r.joined && ids.has(r.unitId));
};
const companyOwnedBy = login => loadCompanies().find(c => c.ownerLogin === login);

/* ---------- Модалка ---------- */
let modal = null;
function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'corp-modal';
  modal.innerHTML = '<div class="corp-backdrop"></div><div class="corp-box" role="dialog" aria-modal="true"></div>';
  document.body.appendChild(modal);
  modal.querySelector('.corp-backdrop').addEventListener('click', closeCorp);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeCorp(); });
  return modal;
}
function render(html) {
  ensureModal();
  modal.querySelector('.corp-box').innerHTML = html;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCorp() {
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

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
  render(`
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
  render(`
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
  if (activeTab === 'structure') renderStructure(c, body);
  else renderAnalytics(c, body);
}

/* ---------- Вкладка: структура и сотрудники ---------- */
function renderStructure(c, body) {
  const treeHtml = c.units.length
    ? renderTree(c, null)
    : '<p class="muted corp-empty">Пока нет ни одного отдела. Добавьте первый — например «Отдел продаж».</p>';
  body.innerHTML = `
    <div class="corp-actions-row">
      <button class="btn btn-primary btn-sm" id="addDept">＋ Добавить отдел</button>
      <button class="btn btn-outline btn-sm" id="massImport">⬆ Массовая загрузка</button>
    </div>
    <ul class="corp-tree">${treeHtml}</ul>
    <div class="corp-note">🔒 Сотрудники, которых вы подключаете, видят: работодатель не имеет доступа к их записям и переписке с ботом — только к обезличенной статистике по отделу от ${c.threshold} человек.</div>`;

  body.querySelector('#addDept').onclick = () => addUnit(c, null);
  body.querySelector('#massImport').onclick = () => showMassImport(c);
  bindTreeActions(c, body);
}

function renderTree(c, parentId) {
  return childrenOf(c, parentId).map(u => {
    const direct = c.roster.filter(r => r.joined && r.unitId === u.id);
    const sub = renderTree(c, u.id);
    const link = `${location.origin}${location.pathname}#join=${c.id}~${u.id}`;
    return `
      <li class="corp-unit">
        <div class="corp-unit-row">
          <span class="corp-unit-name">${escapeHtml(u.name)} <i class="corp-count">${membersOf(c, u.id).length}👥</i></span>
          <span class="corp-unit-btns">
            <button class="corp-ico" title="Добавить подотдел" data-act="addsub" data-u="${u.id}">＋отдел</button>
            <button class="corp-ico" title="Добавить сотрудника" data-act="addemp" data-u="${u.id}">＋человек</button>
            <button class="corp-ico" title="Скопировать ссылку-приглашение" data-act="link" data-link="${escapeHtml(link)}">🔗 ссылка</button>
            <button class="corp-ico" title="Переименовать" data-act="rename" data-u="${u.id}">✎</button>
            <button class="corp-ico danger" title="Удалить" data-act="del" data-u="${u.id}">🗑</button>
          </span>
        </div>
        ${direct.length ? `<div class="corp-roster">${direct.map(r =>
          `<span class="corp-emp">${escapeHtml(r.name)}${r.position ? ' · ' + escapeHtml(r.position) : ''}</span>`).join('')}</div>` : ''}
        ${sub ? `<ul class="corp-subtree">${sub}</ul>` : ''}
      </li>`;
  }).join('');
}

function bindTreeActions(c, body) {
  body.querySelectorAll('[data-act]').forEach(b => {
    b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'addsub') addUnit(c, b.dataset.u);
      else if (act === 'addemp') addEmployee(c, b.dataset.u);
      else if (act === 'rename') renameUnit(c, b.dataset.u);
      else if (act === 'del') deleteUnit(c, b.dataset.u);
      else if (act === 'link') copyLink(b.dataset.link, b);
    };
  });
}

/* ---------- Операции над деревом ---------- */
function mutate(cId, fn) {
  const companies = loadCompanies();
  const c = companies.find(x => x.id === cId);
  if (!c) return;
  fn(c);
  saveCompanies(companies);
  showPanel(cId);
}
function addUnit(c, parentId) {
  const name = prompt(parentId ? 'Название подотдела:' : 'Название отдела:', '');
  if (!name || !name.trim()) return;
  mutate(c.id, x => x.units.push({ id: rid('u_'), parentId, name: name.trim() }));
}
function renameUnit(c, unitId) {
  const u = unitById(c, unitId);
  const name = prompt('Новое название:', u ? u.name : '');
  if (!name || !name.trim()) return;
  mutate(c.id, x => { const t = unitById(x, unitId); if (t) t.name = name.trim(); });
}
function deleteUnit(c, unitId) {
  const ids = descendantsIncluding(c, unitId);
  const members = membersOf(c, unitId).length;
  if (!confirm(`Удалить «${unitById(c, unitId).name}»${members ? ` и открепить ${members} сотр.` : ''}? Подотделы внутри тоже удалятся.`)) return;
  mutate(c.id, x => {
    x.units = x.units.filter(u => !ids.includes(u.id));
    x.roster = x.roster.filter(r => !ids.includes(r.unitId));
  });
}
function addEmployee(c, unitId) {
  const name = prompt('Имя сотрудника:', '');
  if (!name || !name.trim()) return;
  const position = prompt('Должность (необязательно):', '') || '';
  mutate(c.id, x => x.roster.push({
    id: rid('e_'), name: name.trim(), email: '', unitId, position: position.trim(),
    joined: true, wb: synthWb(),
  }));
}
function synthWb() {
  const stress = 2 + Math.floor(Math.random() * 4);
  const energy = 2 + Math.floor(Math.random() * 4);
  return { stress, energy, prevStress: Math.min(5, stress + 1), checkins: 3 + Math.floor(Math.random() * 20), emotions: ['спокойствие'] };
}

/* ---------- Ссылка-приглашение ---------- */
function copyLink(link, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = '✓ скопировано'; setTimeout(() => (btn.textContent = t), 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, () => prompt('Скопируйте ссылку:', link));
  else prompt('Скопируйте ссылку:', link);
}

/* ---------- Массовая загрузка ---------- */
function showMassImport(c) {
  render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <h3 class="corp-title">Массовая загрузка сотрудников</h3>
    <p class="corp-sub">Вставьте список по строкам в формате:<br><code>ФИО;отдел;подотдел;должность</code><br>Подотдел и должность необязательны. Отделы, которых ещё нет, создадутся автоматически.</p>
    <textarea class="corp-textarea" id="massText" rows="8" placeholder="Анна Иванова;Отдел продаж;Группа B2B;Менеджер&#10;Пётр Смирнов;Разработка;;Разработчик"></textarea>
    <p class="corp-err" id="massErr" hidden></p>
    <div class="corp-actions-row">
      <button class="btn btn-primary" id="massGo">Загрузить</button>
      <button class="btn btn-outline" id="massBack">← Назад</button>
    </div>`);
  bindClose();
  modal.querySelector('#massBack').onclick = () => showPanel(c.id, 'structure');
  modal.querySelector('#massGo').onclick = () => {
    const raw = modal.querySelector('#massText').value.trim();
    if (!raw) return;
    const rows = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let added = 0;
    const companies = loadCompanies();
    const cc = companies.find(x => x.id === c.id);
    const findOrCreateUnit = (name, parentId) => {
      const ex = cc.units.find(u => u.parentId === parentId && u.name.toLowerCase() === name.toLowerCase());
      if (ex) return ex.id;
      const id = rid('u_');
      cc.units.push({ id, parentId, name });
      return id;
    };
    rows.forEach(line => {
      const [fio, dept, sub, pos] = line.split(';').map(s => (s || '').trim());
      if (!fio || !dept) return;
      const deptId = findOrCreateUnit(dept, null);
      const unitId = sub ? findOrCreateUnit(sub, deptId) : deptId;
      cc.roster.push({ id: rid('e_'), name: fio, email: '', unitId, position: pos || '', joined: true, wb: synthWb() });
      added++;
    });
    saveCompanies(companies);
    if (!added) { const e = modal.querySelector('#massErr'); e.textContent = 'Не распознал ни одной строки. Проверьте формат «ФИО;отдел».'; e.hidden = false; return; }
    showPanel(c.id, 'structure');
  };
}

/* ---------- Вкладка: аналитика благополучия (обезличенно) ---------- */
function renderAnalytics(c, body) {
  const depts = childrenOf(c, null);
  if (!depts.length) {
    body.innerHTML = '<p class="muted corp-empty">Сначала создайте отделы и подключите сотрудников — появится обезличенная аналитика.</p>';
    return;
  }
  const cards = depts.map(d => {
    const members = membersOf(c, d.id);
    const n = members.length;
    if (n < c.threshold) {
      return `<div class="corp-metric locked">
        <div class="corp-metric-head"><b>${escapeHtml(d.name)}</b><span class="corp-badge">${n}/${c.threshold}👥</span></div>
        <p class="muted">🔒 Мало участников для обезличенной аналитики. Нужно ≥ ${c.threshold} активных сотрудников, иначе статистика раскрыла бы конкретных людей.</p>
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
    <div class="corp-note">Здесь только обезличенные показатели по отделам. Данные конкретного сотрудника недоступны — так люди не боятся быть честными, а вы видите тенденцию.</div>
    <div class="corp-metrics">${cards}</div>`;
}

/* ---------- Присоединение по ссылке-приглашению (#join=companyId~unitId) ---------- */
function handleJoin() {
  const m = (location.hash || '').match(/^#join=([^~]+)~(.+)$/);
  if (!m) return;
  const [, companyId, unitId] = m;
  const companies = loadCompanies();
  const c = companies.find(x => x.id === companyId);
  const unit = c && unitById(c, unitId);
  history.replaceState(null, '', location.pathname); // убираем токен из адреса
  if (!c || !unit) return;
  render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <h3 class="corp-title">Приглашение в «${escapeHtml(c.name)}»</h3>
    <p class="corp-sub">Вас приглашают присоединиться к подразделению <b>${escapeHtml(unit.name)}</b>.</p>
    <div class="corp-note">🔒 Работодатель НЕ увидит ваши записи, эмоции и переписку с ботом — только обезличенную статистику по отделу от ${c.threshold} человек. Ваш личный прогресс виден только вам.</div>
    <form class="corp-join-form" id="joinForm">
      <label>Как вас записать<input type="text" name="name" required placeholder="Имя и фамилия"></label>
      <button type="submit" class="btn btn-primary btn-lg">Присоединиться</button>
      <button type="button" class="btn btn-outline" data-close>Не сейчас</button>
    </form>`);
  bindClose();
  modal.querySelector('#joinForm').onsubmit = e => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return;
    const cs = loadCompanies();
    const cc = cs.find(x => x.id === companyId);
    cc.roster.push({ id: rid('e_'), name, email: '', unitId, position: '', joined: true, wb: synthWb() });
    saveCompanies(cs);
    render(`
      <button class="corp-close" aria-label="Закрыть">×</button>
      <h3 class="corp-title">Готово 🎉</h3>
      <p class="corp-sub">Вы присоединились к «${escapeHtml(cc.name)}» — подразделение «${escapeHtml(unit.name)}». Можно пользоваться Матрёшкой как обычно: дневник, практики, ассистент.</p>
      <button class="btn btn-primary btn-lg" data-close>Отлично</button>`);
    bindClose();
  };
}

/* ---------- Общее ---------- */
function bindClose() {
  modal.querySelectorAll('.corp-close, [data-close]').forEach(b => (b.onclick = closeCorp));
}

/* Открытие из личного кабинета (событие от account.js) и из шапки. */
document.addEventListener('ml:corp-open', openCorp);
document.addEventListener('click', e => {
  const t = e.target.closest('[data-corp-open]');
  if (t) { e.preventDefault(); openCorp(); }
});
window.addEventListener('hashchange', handleJoin);
handleJoin(); // если зашли сразу по ссылке-приглашению
