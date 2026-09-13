/* ================= ПРИСОЕДИНЕНИЕ ПО ССЫЛКЕ-ПРИГЛАШЕНИЮ =================
   Обрабатывает #join=companyId~unitId: показывает приглашение, записывает
   человека в состав подразделения. Дата рождения — по желанию: по ней
   считается Дар в кабинете компании. */
import { escapeHtml } from './util.js';
import { render, bindClose } from './corp-modal.js';
import { loadCompanies, saveCompanies, unitById, rid, synthWb } from './corp-store.js';
import { parseBirth } from './corp-dars.js';

export function handleJoin() {
  const m = (location.hash || '').match(/^#join=([^~]+)~(.+)$/);
  if (!m) return;
  const [, companyId, unitId] = m;
  const companies = loadCompanies();
  const c = companies.find(x => x.id === companyId);
  const unit = c && unitById(c, unitId);
  history.replaceState(null, '', location.pathname); // убираем токен из адреса
  if (!c || !unit) return;
  const modal = render(`
    <button class="corp-close" aria-label="Закрыть">×</button>
    <h3 class="corp-title">Приглашение в «${escapeHtml(c.name)}»</h3>
    <p class="corp-sub">Вас приглашают присоединиться к подразделению <b>${escapeHtml(unit.name)}</b>.</p>
    <div class="corp-note">🔒 Работодатель НЕ увидит ваши записи, эмоции и переписку с ботом — только обезличенную статистику по отделу от ${c.threshold} человек. Ваш личный прогресс виден только вам.</div>
    <form class="corp-join-form" id="joinForm">
      <label>Как вас записать<input type="text" name="name" required placeholder="Имя и фамилия"></label>
      <label>Дата рождения — по ней считается ваш Дар (необязательно)<input type="text" name="birth" placeholder="ДД.ММ.ГГГГ" inputmode="numeric"></label>
      <button type="submit" class="btn btn-primary btn-lg">Присоединиться</button>
      <button type="button" class="btn btn-outline" data-close>Не сейчас</button>
    </form>`);
  bindClose();
  modal.querySelector('#joinForm').onsubmit = e => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return;
    const rawBirth = e.target.birth.value.trim();
    const birth = parseBirth(rawBirth) ? rawBirth : '';
    const cs = loadCompanies();
    const cc = cs.find(x => x.id === companyId);
    cc.roster.push({ id: rid('e_'), name, email: '', unitId, position: '', birth, joined: true, wb: synthWb() });
    saveCompanies(cs);
    render(`
      <button class="corp-close" aria-label="Закрыть">×</button>
      <h3 class="corp-title">Готово 🎉</h3>
      <p class="corp-sub">Вы присоединились к «${escapeHtml(cc.name)}» — подразделение «${escapeHtml(unit.name)}». Можно пользоваться Матрёшкой как обычно: дневник, практики, ассистент.</p>
      <button class="btn btn-primary btn-lg" data-close>Отлично</button>`);
    bindClose();
  };
}
