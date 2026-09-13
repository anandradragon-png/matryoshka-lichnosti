/* ================= СТРУКТУРА И СОТРУДНИКИ =================
   Вкладка кабинета компании: дерево отделов, добавление и переименование,
   сотрудники (с датой рождения — по ней считается Дар), ссылки-приглашения,
   массовая загрузка. Перерисовку панели получает колбэком showPanel —
   импортировать её из corp.js нельзя, выйдет кольцо импортов. */
import { escapeHtml } from './util.js';
import { render, bindClose } from './corp-modal.js';
import { childrenOf, unitById, descendantsIncluding, membersOf, mutate, rid, synthWb, loadCompanies, saveCompanies } from './corp-store.js';
import { parseBirth, darLabel } from './corp-dars.js';

export function renderStructure(c, body, showPanel) {
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

  body.querySelector('#addDept').onclick = () => addUnit(c, null, showPanel);
  body.querySelector('#massImport').onclick = () => showMassImport(c, showPanel);
  bindTreeActions(c, body, showPanel);
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
        ${direct.length ? `<div class="corp-roster">${direct.map(r => {
          const dar = darLabel(r);
          return `<span class="corp-emp">${escapeHtml(r.name)}${r.position ? ' · ' + escapeHtml(r.position) : ''}${
            dar ? ` <i class="corp-count">${escapeHtml(dar)}</i>` : ''}</span>`;
        }).join('')}</div>` : ''}
        ${sub ? `<ul class="corp-subtree">${sub}</ul>` : ''}
      </li>`;
  }).join('');
}

function bindTreeActions(c, body, showPanel) {
  body.querySelectorAll('[data-act]').forEach(b => {
    b.onclick = () => {
      const act = b.dataset.act;
      if (act === 'addsub') addUnit(c, b.dataset.u, showPanel);
      else if (act === 'addemp') addEmployee(c, b.dataset.u, showPanel);
      else if (act === 'rename') renameUnit(c, b.dataset.u, showPanel);
      else if (act === 'del') deleteUnit(c, b.dataset.u, showPanel);
      else if (act === 'link') copyLink(b.dataset.link, b);
    };
  });
}

/* ---------- Операции над деревом ---------- */
function addUnit(c, parentId, showPanel) {
  const name = prompt(parentId ? 'Название подотдела:' : 'Название отдела:', '');
  if (!name || !name.trim()) return;
  mutate(c.id, x => x.units.push({ id: rid('u_'), parentId, name: name.trim() }));
  showPanel(c.id);
}

function renameUnit(c, unitId, showPanel) {
  const u = unitById(c, unitId);
  const name = prompt('Новое название:', u ? u.name : '');
  if (!name || !name.trim()) return;
  mutate(c.id, x => { const t = unitById(x, unitId); if (t) t.name = name.trim(); });
  showPanel(c.id);
}

function deleteUnit(c, unitId, showPanel) {
  const ids = descendantsIncluding(c, unitId);
  const members = membersOf(c, unitId).length;
  if (!confirm(`Удалить «${unitById(c, unitId).name}»${members ? ` и открепить ${members} сотр.` : ''}? Подотделы внутри тоже удалятся.`)) return;
  mutate(c.id, x => {
    x.units = x.units.filter(u => !ids.includes(u.id));
    x.roster = x.roster.filter(r => !ids.includes(r.unitId));
  });
  showPanel(c.id);
}

function addEmployee(c, unitId, showPanel) {
  const name = prompt('Имя сотрудника:', '');
  if (!name || !name.trim()) return;
  const position = prompt('Должность (необязательно):', '') || '';
  const rawBirth = prompt('Дата рождения ДД.ММ.ГГГГ — по ней считается Дар (необязательно):', '') || '';
  const birth = parseBirth(rawBirth) ? rawBirth.trim() : '';
  mutate(c.id, x => x.roster.push({
    id: rid('e_'), name: name.trim(), email: '', unitId, position: position.trim(),
    birth, joined: true, wb: synthWb(),
  }));
  showPanel(c.id);
}

/* ---------- Ссылка-приглашение ---------- */
function copyLink(link, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = '✓ скопировано'; setTimeout(() => (btn.textContent = t), 1500); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, () => prompt('Скопируйте ссылку:', link));
  else prompt('Скопируйте ссылку:', link);
}

/* ---------- Массовая загрузка ---------- */
function showMassImport(c, showPanel) {
  const modal = render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <h3 class="corp-title">Массовая загрузка сотрудников</h3>
    <p class="corp-sub">Вставьте список по строкам в формате:<br><code>ФИО;отдел;подотдел;должность;дата рождения</code><br>Подотдел, должность и дата необязательны. По дате рождения (ДД.ММ.ГГГГ) считается Дар. Отделы, которых ещё нет, создадутся автоматически.</p>
    <textarea class="corp-textarea" id="massText" rows="8" placeholder="Анна Иванова;Отдел продаж;Группа B2B;Менеджер;14.03.1988&#10;Пётр Смирнов;Разработка;;Разработчик"></textarea>
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
      const [fio, dept, sub, pos, rawBirth] = line.split(';').map(s => (s || '').trim());
      if (!fio || !dept) return;
      const deptId = findOrCreateUnit(dept, null);
      const unitId = sub ? findOrCreateUnit(sub, deptId) : deptId;
      const birth = parseBirth(rawBirth) ? rawBirth : '';
      cc.roster.push({ id: rid('e_'), name: fio, email: '', unitId, position: pos || '', birth, joined: true, wb: synthWb() });
      added++;
    });
    saveCompanies(companies);
    if (!added) { const e = modal.querySelector('#massErr'); e.textContent = 'Не распознал ни одной строки. Проверьте формат «ФИО;отдел».'; e.hidden = false; return; }
    showPanel(c.id, 'structure');
  };
}
