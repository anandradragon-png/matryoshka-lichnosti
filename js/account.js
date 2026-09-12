/* ================= ЛИЧНЫЙ КАБИНЕТ =================
   Экраны: вход, регистрация, кабинет, отзыв. Кнопка в шапке.

   Вход идёт двумя путями. Подключён сервер (window.ML_API_URL) — пароль
   проверяется там и в браузере не хранится вообще, а после входа дневник и
   журнал подтягиваются с сервера (js/sync.js). Сервер не подключён — работает
   прежняя проверка в localStorage: это заглушка прототипа, а не защита.

   Реестр людей — js/users.js, окно — js/modal.js, админка — js/admin-panel.js. */
import { escapeHtml } from './util.js';
import { openModal, closeModal, inModal, allInModal } from './modal.js';
import { loadUsers, saveUsers, findUser, currentUser, setSession, isAdmin } from './users.js';
import { loadEntries, computeStreak } from './organizer.js';
import { setPlan, planSwitcherHtml, bindPlanSwitcher } from './plan.js';
import { showAdminPanel, loadFeedback, saveFeedback } from './admin-panel.js';
import { apiOn, apiCall, setToken } from './api.js';
import { afterLogin } from './sync.js';

const authBtn = document.getElementById('authBtn');

/* Вход и регистрация через сервер. Профиль оттуда кладём в локальный список
   людей, чтобы кабинет рисовался прежним кодом. Пароля в нём нет. */
async function serverAuth(form, op, payload, showAgain) {
  const btn = form.querySelector('.am-submit');
  const label = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Подождите…';
  try {
    const res = await apiCall(op, payload);
    setToken(res.token);
    const u = res.user;
    saveUsers([...loadUsers().filter(x => x.login !== u.login),
      { name: u.name, login: u.login, role: u.role, created: u.createdAt, consent: u.consent, server: true }]);
    setPlan(u.plan, u.login);
    setSession(u.login);
    await afterLogin(u.login);
    renderAuthState();
    showCabinet();
  } catch (err) {
    btn.disabled = false;
    btn.textContent = label;
    showAgain(err.message);
  }
}

/* ---- Экран входа ---- */
function showLogin(msg) {
  openModal(`
    <button class="am-close" aria-label="Закрыть">×</button>
    <h3 class="am-title">Вход в личный кабинет</h3>
    <p class="am-sub">Введите логин и пароль, которые вы указали при регистрации.</p>
    ${msg ? `<div class="am-error">${escapeHtml(msg)}</div>` : ''}
    <form class="am-form" id="loginForm">
      <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
      <label>Пароль<input type="password" name="pass" autocomplete="current-password" required></label>
      <button type="submit" class="btn btn-primary btn-lg am-submit">Войти</button>
    </form>
    ${apiOn() ? '' : '<div class="am-demo">Demo-доступ для быстрого просмотра: логин <b>demo</b> · пароль <b>demo123</b></div>'}
    <div class="am-switch">Нет аккаунта? <button type="button" id="toRegister">Зарегистрироваться</button></div>
  `);
  inModal('.am-close').onclick = closeModal;
  inModal('#toRegister').onclick = () => showRegister();
  inModal('#loginForm').onsubmit = async e => {
    e.preventDefault();
    const login = e.target.login.value.trim();
    const pass = e.target.pass.value;
    if (apiOn()) { await serverAuth(e.target, 'auth.login', { login, password: pass }, showLogin); return; }
    const u = findUser(login);
    if (!u || u.pass !== pass) { showLogin('Неверный логин или пароль. Попробуйте ещё раз.'); return; }
    setSession(u.login);
    renderAuthState();
    showCabinet();
  };
}

/* ---- Экран регистрации ---- */
function showRegister(msg) {
  // Длина пароля должна совпадать с проверкой на сервере, иначе человек
  // получит отказ уже после нажатия кнопки и не поймёт, за что.
  const minPass = apiOn() ? 8 : 4;
  openModal(`
    <button class="am-close" aria-label="Закрыть">×</button>
    <h3 class="am-title">Регистрация</h3>
    <p class="am-sub">Придумайте логин и пароль — они понадобятся для входа в кабинет.</p>
    ${msg ? `<div class="am-error">${escapeHtml(msg)}</div>` : ''}
    <form class="am-form" id="regForm">
      <label>Как к вам обращаться<input type="text" name="name" autocomplete="name" required></label>
      <label>Логин или e-mail<input type="text" name="login" autocomplete="username" required></label>
      <label>Пароль (мин. ${minPass} символа)<input type="password" name="pass" autocomplete="new-password" minlength="${minPass}" required></label>
      <div class="am-consents">
        <label class="am-consent"><input type="checkbox" name="c_pdn">
          <span>Я даю <a href="docs/soglasie-pdn.html" target="_blank" rel="noopener">согласие на обработку персональных данных</a> <span class="am-consent-req">*</span></span></label>
        <label class="am-consent"><input type="checkbox" name="c_special">
          <span>Я даю <a href="docs/soglasie-spec-kategorii.html" target="_blank" rel="noopener">согласие на обработку специальных категорий данных</a> (о психоэмоциональном состоянии) <span class="am-consent-req">*</span></span></label>
        <label class="am-consent"><input type="checkbox" name="c_privacy">
          <span>Я ознакомлен(а) и принимаю <a href="docs/politika-konfidencialnosti.html" target="_blank" rel="noopener">Политику конфиденциальности</a> <span class="am-consent-req">*</span></span></label>
        <label class="am-consent"><input type="checkbox" name="c_terms">
          <span>Я принимаю <a href="docs/polzovatelskoe-soglashenie.html" target="_blank" rel="noopener">Пользовательское соглашение</a> <span class="am-consent-req">*</span></span></label>
      </div>
      <button type="submit" class="btn btn-primary btn-lg am-submit">Создать кабинет</button>
    </form>
    <div class="am-switch">Уже есть аккаунт? <button type="button" id="toLogin">Войти</button></div>
  `);
  inModal('.am-close').onclick = closeModal;
  inModal('#toLogin').onclick = () => showLogin();
  inModal('#regForm').onsubmit = async e => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    const login = e.target.login.value.trim();
    const pass = e.target.pass.value;
    const consent = { pdn: e.target.c_pdn.checked, special: e.target.c_special.checked,
      privacy: e.target.c_privacy.checked, terms: e.target.c_terms.checked };
    if (!consent.pdn || !consent.special || !consent.privacy || !consent.terms) {
      showRegister('Чтобы создать кабинет, отметьте все четыре обязательных согласия.'); return;
    }
    if (apiOn()) {
      await serverAuth(e.target, 'auth.register',
        { login, name, password: pass, consent: { policy: consent.pdn, special: consent.special, privacy: consent.privacy, terms: consent.terms } },
        showRegister);
      return;
    }
    if (findUser(login)) { showRegister('Такой логин уже занят. Выберите другой или войдите.'); return; }
    saveUsers([...loadUsers(), { name, login, pass, created: Date.now(),
      consent: { ...consent, at: new Date().toISOString() } }]);
    setSession(login);
    renderAuthState();
    showCabinet();
  };
}

/* ---- Кабинет ---- */
function showCabinet() {
  const u = currentUser();
  if (!u) { showLogin(); return; }
  const entries = loadEntries();
  const streak = computeStreak(entries);
  const total = entries.length;
  const level = Math.min(5, 1 + Math.floor(total / 3));
  const last = total ? new Date(entries[total - 1].date).toLocaleDateString('ru-RU') : '—';
  const root = openModal(`
    <button class="am-close" aria-label="Закрыть">×</button>
    <div class="am-hello">
      <div class="am-avatar">${escapeHtml((u.name || u.login).slice(0, 1).toUpperCase())}</div>
      <div>
        <h3 class="am-title">Здравствуйте, ${escapeHtml(u.name || u.login)}!</h3>
        <p class="am-sub">Ваш личный кабинет Матрёшки</p>
      </div>
    </div>
    <div class="am-stats">
      <div class="am-stat"><b>${streak}</b><span>дней подряд</span></div>
      <div class="am-stat"><b>${total}</b><span>записей в дневнике</span></div>
      <div class="am-stat"><b>${level}/5</b><span>слой матрёшки</span></div>
    </div>
    <p class="am-last">Последняя отметка: <b>${last}</b></p>
    ${planSwitcherHtml(u.login)}
    <div class="am-actions">
      <button class="btn btn-primary" data-go="#organizer">📔 Дневник эмоций</button>
      <button class="btn btn-outline" data-go="#map">🪆 Карта личности</button>
      <button class="btn btn-outline" data-go="#practices">🧘 Практики</button>
      <button class="btn btn-outline" data-go="#bot">💬 Ассистент</button>
    </div>
    ${isAdmin(u) ? '<button class="btn btn-lg am-admin-btn" id="toAdmin">🛠 Панель разработчика</button>' : ''}
    <button class="btn btn-outline am-corp-btn" id="toCorp">🏢 Кабинет компании (HR)</button>
    <button class="btn btn-outline am-fb-btn" id="toFeedback">✍️ Оставить отзыв</button>
    <button class="am-logout" id="logoutBtn">Выйти из кабинета</button>
  `);
  inModal('.am-close').onclick = closeModal;
  bindPlanSwitcher(root, showCabinet);   // демо-переключатель тарифа
  allInModal('[data-go]').forEach(b => {
    b.onclick = () => {
      closeModal();
      const t = document.querySelector(b.dataset.go);
      if (t) t.scrollIntoView({ behavior: 'smooth' });
    };
  });
  const adminBtn = inModal('#toAdmin');
  if (adminBtn) adminBtn.onclick = () => showAdminPanel(showCabinet);
  inModal('#toCorp').onclick = () => {
    closeModal();
    document.dispatchEvent(new CustomEvent('ml:corp-open'));
  };
  inModal('#toFeedback').onclick = () => showFeedbackForm();
  inModal('#logoutBtn').onclick = () => {
    setToken('');
    setSession('');
    renderAuthState();
    closeModal();
  };
}

/* ---- Форма обратной связи ---- */
function showFeedbackForm(msg) {
  const u = currentUser();
  openModal(`
    <button class="am-close" aria-label="Закрыть">×</button>
    <h3 class="am-title">Обратная связь</h3>
    <p class="am-sub">Расскажите, что понравилось или что улучшить — это увидят разработчики.</p>
    ${msg ? `<div class="am-demo">${escapeHtml(msg)}</div>` : ''}
    <form class="am-form" id="fbForm">
      <label>Ваш отзыв<textarea name="text" rows="4" required placeholder="Ваши мысли, идеи, замечания…"></textarea></label>
      <button type="submit" class="btn btn-primary btn-lg am-submit">Отправить</button>
    </form>
    <button class="am-logout" id="fbBack">← Назад</button>
  `);
  inModal('.am-close').onclick = closeModal;
  inModal('#fbBack').onclick = () => showCabinet();
  inModal('#fbForm').onsubmit = e => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    saveFeedback([...loadFeedback(), { text, from: u ? (u.name || u.login) : 'аноним', date: Date.now() }]);
    showFeedbackForm('💜 Спасибо! Ваш отзыв сохранён.');
  };
}

/* ---- Состояние кнопки в шапке ---- */
function renderAuthState() {
  const u = currentUser();
  if (u) {
    authBtn.textContent = '🪆 ' + (u.name || u.login);
    authBtn.classList.add('logged');
  } else {
    authBtn.textContent = 'Войти';
    authBtn.classList.remove('logged');
  }
}

authBtn.addEventListener('click', () => {
  if (currentUser()) showCabinet();
  else showLogin();
});

const journeyFb = document.getElementById('journeyFeedbackBtn');
if (journeyFb) journeyFb.addEventListener('click', () => showFeedbackForm());

renderAuthState();
